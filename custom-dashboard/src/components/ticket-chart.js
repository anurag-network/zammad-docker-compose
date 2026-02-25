/**
 * Ticket Trends Chart Component
 * Area chart showing ticket creation over time
 */

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let trendsChart = null;

export function renderTicketTrendsChart(tickets, states = [], days = 7) {
    const canvas = document.getElementById('ticket-trends-chart');
    if (!canvas) return;

    // Destroy existing chart
    if (trendsChart) {
        trendsChart.destroy();
        trendsChart = null;
    }

    const ctx = canvas.getContext('2d');

    const stateMap = {};
    states.forEach(s => {
        stateMap[s.id] = s.name.toLowerCase();
    });

    // Group tickets by date
    const now = new Date();
    const dateLabels = [];
    const createdData = [];
    const closedData = [];
    const inProgressData = [];
    const reopenedData = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateLabels.push(formatDateLabel(date, days));

        const createdCount = tickets.filter((t) => {
            if (!t.created_at) return false;
            const ticketDate = t.created_at.split('T')[0];
            return ticketDate === dateStr;
        }).length;

        const closedCount = tickets.filter((t) => {
            if (!t.close_at) return false;
            const ticketDate = t.close_at.split('T')[0];
            return ticketDate === dateStr;
        }).length;

        const inProgressCount = tickets.filter((t) => {
            const stateName = stateMap[t.state_id] || '';
            const isAssigned = t.owner_id && t.owner_id !== 1;
            const isWorkingState = stateName === 'open' || stateName === 'new' || stateName.includes('progress');

            // It is currently active
            const isActive = isAssigned && isWorkingState;

            if (!t.created_at) return false;
            const createdDate = t.created_at.split('T')[0];

            // To plot a pseudo-historical line for an ongoing state without an audit log,
            // we say: if it was created on or before this graph day, and it is STILL active today, 
            // it was active on that graph day.
            return isActive && createdDate <= dateStr;
        }).length;

        const reopenedCount = tickets.filter((t) => {
            const stateName = stateMap[t.state_id] || '';
            const isReopened = stateName.includes('reopen');
            if (!t.updated_at) return false;
            const ticketDate = t.updated_at.split('T')[0];
            return isReopened && ticketDate === dateStr;
        }).length;

        createdData.push(createdCount);
        closedData.push(closedCount);
        inProgressData.push(inProgressCount);
        reopenedData.push(reopenedCount);
    }

    // Create gradient
    const gradientCreated = ctx.createLinearGradient(0, 0, 0, 260);
    gradientCreated.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradientCreated.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

    const gradientClosed = ctx.createLinearGradient(0, 0, 0, 260);
    gradientClosed.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradientClosed.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    const gradientInProgress = ctx.createLinearGradient(0, 0, 0, 260);
    gradientInProgress.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradientInProgress.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const gradientReopened = ctx.createLinearGradient(0, 0, 0, 260);
    gradientReopened.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
    gradientReopened.addColorStop(1, 'rgba(249, 115, 22, 0.01)');

    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [
                {
                    label: 'Created',
                    data: createdData,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradientCreated,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#0a0b10',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Closed',
                    data: closedData,
                    borderColor: '#10b981',
                    backgroundColor: gradientClosed,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#0a0b10',
                    pointBorderWidth: 2,
                },
                {
                    label: 'In Progress',
                    data: inProgressData,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientInProgress,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#0a0b10',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Reopened',
                    data: reopenedData,
                    borderColor: '#f97316',
                    backgroundColor: gradientReopened,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f97316',
                    pointBorderColor: '#0a0b10',
                    pointBorderWidth: 2,
                }
            ],
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#8b8fa7',
                        font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 3,
                        useBorderRadius: true,
                        padding: 16,
                    },
                },
                tooltip: {
                    backgroundColor: '#1a1d2e',
                    titleColor: '#f1f3f9',
                    bodyColor: '#8b8fa7',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: { family: "'Inter', sans-serif", weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif" },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                    ticks: {
                        color: '#555873',
                        font: { family: "'Inter', sans-serif", size: 11 },
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                    ticks: {
                        color: '#555873',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        precision: 0,
                    },
                },
            },
        },
    });
}

function formatDateLabel(date, days) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (days <= 7) {
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return weekdays[date.getDay()];
    }
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function destroyTrendsChart() {
    if (trendsChart) {
        trendsChart.destroy();
        trendsChart = null;
    }
}
