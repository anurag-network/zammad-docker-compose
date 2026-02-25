import './style.css';
import { ZammadAPI } from './api/zammad.js';
import { calculateKPIData, renderKPICards } from './components/kpi-cards.js';
import { renderTicketTrendsChart } from './components/ticket-chart.js';
import { renderPriorityChart } from './components/priority-chart.js';
import { renderAgentStatus } from './components/agent-performance.js';
import { renderRecentTickets } from './components/recent-tickets.js';
import { renderEscalatedTickets } from './components/escalated-tickets.js';
import { renderMyTickets } from './components/my-tickets.js';
import { renderChannelChart } from './components/channel-chart.js';

// ─── State ───
let api = null;
let refreshTimer = null;
let currentTickets = [];
let currentStates = [];
let knownTicketIds = new Set();
let isFirstLoad = true;
let dashboardUnreadCount = 0;

// ─── Init ───
async function init() {
    setupEventListeners();
    await connectAndLoad();
}

// ─── Connect using Zammad session ───
async function connectAndLoad() {
    showLoading();

    api = new ZammadAPI();
    const result = await api.testConnection();

    if (result.success) {
        // Check if user is an agent or admin (not just a customer)
        const roleIds = result.user.role_ids || [];
        const isAgentOrAdmin = roleIds.includes(1) || roleIds.includes(2); // 1=Admin, 2=Agent

        if (!isAgentOrAdmin) {
            // Customer — redirect back to Zammad customer portal
            window.location.href = '/#ticket/view';
            return;
        }

        // Update user info in sidebar
        updateUserInfo(result.user);
        setConnectionStatus(true);
        await loadDashboardData();
        startAutoRefresh();
    } else {
        // Not logged in — redirect to Zammad login
        window.location.href = '/#login';
    }
}

// ─── Update sidebar user info dynamically ───
function updateUserInfo(user) {
    if (!user) return;

    const firstName = user.firstname || '';
    const lastName = user.lastname || '';
    const fullName = `${firstName} ${lastName}`.trim() || user.login || 'User';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

    // Determine role
    let role = 'Agent';
    if (user.role_ids && user.role_ids.includes(1)) {
        role = 'Admin';
    }

    const avatarEl = document.querySelector('.user-avatar');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = role;
}

// ─── Load Dashboard Data ───
async function loadDashboardData() {
    try {
        const [ticketsRaw, statesRaw, prioritiesRaw, usersRaw, articleTypesRaw, currentUser] = await Promise.all([
            api.getAllTickets(),
            api.getTicketStates(),
            api.getTicketPriorities(),
            api.getUsers(),
            api.getTicketArticleTypes(),
            api.getCurrentUser(),
        ]);

        const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : Object.values(ticketsRaw || {}).filter(v => typeof v === 'object' && v !== null && v.id);
        const states = Array.isArray(statesRaw) ? statesRaw : [];
        const priorities = Array.isArray(prioritiesRaw) ? prioritiesRaw : [];
        const users = Array.isArray(usersRaw) ? usersRaw : [];
        const articleTypes = Array.isArray(articleTypesRaw) ? articleTypesRaw : [];

        // Notifications Logic
        const newTicketIds = new Set(tickets.map(t => t.id));
        if (!isFirstLoad) {
            const newTicketsCount = tickets.filter(t => !knownTicketIds.has(t.id)).length;
            if (newTicketsCount > 0) {
                showNotification('Ticket Alert 🔔', `${newTicketsCount} new ticket(s) have arrived on the portal.`);

                dashboardUnreadCount += newTicketsCount;
                const badge = document.getElementById('notification-badge');
                if (badge) {
                    badge.textContent = dashboardUnreadCount;
                    badge.style.display = 'block';
                }

                // Play global pop-up sound
                const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                notifSound.play().catch(e => console.log('Dashboard Audio Autoplay Blocked:', e));
            }
        }
        knownTicketIds = newTicketIds;
        isFirstLoad = false;

        currentTickets = tickets;
        currentStates = states;
        window.currentPriorities = priorities;
        window.currentArticleTypes = articleTypes;

        // Setup global priority map to resolve IDs into normalized names
        window.priorityMap = {};
        priorities.forEach((p) => {
            window.priorityMap[p.id] = p.name ? p.name.toLowerCase().trim() : 'unknown';
        });

        hideLoading();
        showDashboard();

        // Render components
        const kpiData = calculateKPIData(tickets, states);
        renderKPICards(kpiData);

        const trendsBtn = document.querySelector('#trends-filter .filter-btn.active');
        const trendsDays = trendsBtn ? parseInt(trendsBtn.dataset.days) || 7 : 7;
        renderTicketTrendsChart(tickets, currentStates, trendsDays);

        const priorityBtn = document.querySelector('#priority-filter .filter-btn.active');
        const priorityDays = priorityBtn ? parseInt(priorityBtn.dataset.days) || 7 : 7;
        const priorityFilterVal = document.getElementById('local-priority-filter-priority')?.value || 'all';
        renderPriorityChart(tickets, priorities, priorityDays, priorityFilterVal);

        const channelBtn = document.querySelector('#channel-filter .filter-btn.active');
        const channelDays = channelBtn ? parseInt(channelBtn.dataset.days) || 7 : 7;
        const channelFilterVal = document.getElementById('local-channel-filter')?.value || 'all';
        renderChannelChart(tickets, articleTypes, channelDays, channelFilterVal);

        renderAgentStatus(tickets, users, states);
        renderRecentTickets(tickets, states, priorities, api.getExternalUrl());
        renderMyTickets(tickets, states, priorities, currentUser, api.getExternalUrl());
        renderEscalatedTickets(tickets, states, priorities, api.getExternalUrl());

        updateRefreshTime();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        if (error.message === 'Not authenticated') return; // Already redirecting
        hideLoading();
        showError('Failed to load data. Please try refreshing.');
    }
}

// ─── Auto Refresh ───
function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
        if (!api || document.hidden) return; // Wait until tab is active to refresh
        try {
            await loadDashboardData();
        } catch (e) {
            console.error('Auto-refresh failed:', e);
        }
    }, 15000);
}

// ─── UI State Management ───
function showLoading() {
    document.getElementById('loading-state')?.classList.remove('hidden');
    document.getElementById('setup-prompt')?.classList.add('hidden');
    document.getElementById('kpi-section')?.classList.add('hidden');
    document.getElementById('charts-section')?.classList.add('hidden');
    document.getElementById('bottom-section')?.classList.add('hidden');
    document.getElementById('escalated-section')?.classList.add('hidden');
    document.getElementById('my-tickets-section')?.classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading-state')?.classList.add('hidden');
}

function showDashboard() {
    document.getElementById('setup-prompt')?.classList.add('hidden');
    document.getElementById('kpi-section')?.classList.remove('hidden');
    document.getElementById('charts-section')?.classList.remove('hidden');
    document.getElementById('bottom-section')?.classList.remove('hidden');
    document.getElementById('escalated-section')?.classList.remove('hidden');
    document.getElementById('my-tickets-section')?.classList.remove('hidden');
}

function showError(message) {
    const setupPrompt = document.getElementById('setup-prompt');
    if (setupPrompt) {
        setupPrompt.querySelector('h2').textContent = 'Connection Issue';
        setupPrompt.querySelector('p').textContent = message;
        setupPrompt.querySelector('button').textContent = 'Retry';
        setupPrompt.classList.remove('hidden');
    }
}

function setConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    statusEl.classList.toggle('connected', connected);
    statusEl.querySelector('.status-text').textContent = connected ? 'Connected' : 'Disconnected';
}

function updateRefreshTime() {
    const refreshEl = document.getElementById('last-refresh');
    if (refreshEl) {
        const now = new Date();
        refreshEl.textContent = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
}

// ─── Event Listeners ───
function setupEventListeners() {
    // Handle tab visibility to avoid rendering glitches when coming back from background tab
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && api) {
            loadDashboardData();
        }
    });

    // Request notification permission on first interaction if needed
    if ("Notification" in window && Notification.permission === "default") {
        document.body.addEventListener('click', () => {
            if (Notification.permission === "default") Notification.requestPermission();
        }, { once: true });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('spinning');
            await loadDashboardData();
            setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
        });
    }

    // Notification bell reset
    const notifBtn = document.getElementById('notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            dashboardUnreadCount = 0;
            const badge = document.getElementById('notification-badge');
            if (badge) badge.style.display = 'none';
        });
    }

    // Setup retry button — redirect to Zammad login
    const setupBtn = document.getElementById('setup-btn');
    if (setupBtn) {
        setupBtn.addEventListener('click', () => {
            window.location.href = '/#login';
        });
    }

    // View All Tickets link
    const viewAllBtn = document.getElementById('view-all-tickets');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/#ticket/view';
        });
    }

    // View All Escalated Tickets link
    const viewAllEscalated = document.getElementById('view-all-escalated');
    if (viewAllEscalated) {
        viewAllEscalated.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/#ticket/view';
        });
    }

    // Local Priority Filter dropdowns
    const priorityChartDropdown = document.getElementById('local-priority-filter-priority');
    if (priorityChartDropdown) {
        priorityChartDropdown.addEventListener('change', () => {
            const priorityBtn = document.querySelector('#priority-filter .filter-btn.active');
            const priorityDays = priorityBtn ? parseInt(priorityBtn.dataset.days) || 7 : 7;
            if (window.currentPriorities) renderPriorityChart(currentTickets, window.currentPriorities, priorityDays, priorityChartDropdown.value);
        });
    }

    const channelChartDropdown = document.getElementById('local-channel-filter');
    if (channelChartDropdown) {
        channelChartDropdown.addEventListener('change', () => {
            const channelBtn = document.querySelector('#channel-filter .filter-btn.active');
            const channelDays = channelBtn ? parseInt(channelBtn.dataset.days) || 7 : 7;
            if (window.currentArticleTypes) renderChannelChart(currentTickets, window.currentArticleTypes, channelDays, channelChartDropdown.value);
        });
    }

    // Chart period filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterContainer = btn.closest('.chart-filter');
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const days = parseInt(btn.dataset.days) || 7;
            const targetChart = filterContainer.id;

            if (targetChart === 'trends-filter') {
                renderTicketTrendsChart(currentTickets, currentStates, days);
            } else if (targetChart === 'priority-filter') {
                const priorityFilterVal = document.getElementById('local-priority-filter-priority')?.value || 'all';
                if (window.currentPriorities) renderPriorityChart(currentTickets, window.currentPriorities, days, priorityFilterVal);
            } else if (targetChart === 'channel-filter') {
                const channelFilterVal = document.getElementById('local-channel-filter')?.value || 'all';
                if (window.currentArticleTypes) renderChannelChart(currentTickets, window.currentArticleTypes, days, channelFilterVal);
            }
        });
    });

    // Sidebar navigation — active state
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (api) {
                await api.logout();
            } else {
                window.location.href = '/#login';
            }
        });
    }
}

// ─── Notifications ───
function showNotification(title, body) {
    // Native OS Push Notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
    }

    // In-App Toast Notification
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'bg-sh-card border border-sh-border rounded-lg shadow-lg p-4 flex items-start gap-3 w-80 transform transition-all duration-300 translate-y-4 opacity-0';
    toast.innerHTML = `
        <div class="text-blue-500 mt-0.5" style="font-size: 1.25rem;">🔔</div>
        <div>
            <div class="font-medium text-sh-text-primary text-sm">${title}</div>
            <div class="text-xs text-sh-text-secondary mt-1">${body}</div>
        </div>
        <button class="ml-auto text-sh-text-secondary hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    // Auto remove after 5s
    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ─── Start ───
document.addEventListener('DOMContentLoaded', init);
