/**
 * Escalated Tickets Table Component
 * Renders tickets that have been escalated (have escalation_at set and not closed)
 */

export function renderEscalatedTickets(tickets, states, priorities, baseUrl) {
    const tbody = document.getElementById('escalated-tickets-body');
    if (!tbody) return;

    // Build lookup maps
    const stateMap = {};
    states.forEach((s) => {
        stateMap[s.id] = s.name;
    });

    const priorityMap = {};
    priorities.forEach((p) => {
        priorityMap[p.id] = p.name;
    });

    // Filter escalated tickets:
    //  - Has escalation_at set AND escalation_at is in the past
    //  - OR has pending_time that has passed
    //  - Exclude closed/merged tickets
    const now = new Date();
    const escalated = tickets.filter((ticket) => {
        let stateName = (stateMap[ticket.state_id] || '').toLowerCase();
        const isAssigned = ticket.owner_id && ticket.owner_id !== 1;
        if (stateName === 'new' && isAssigned) {
            stateName = 'open';
        }

        if (stateName === 'closed' || stateName === 'merged') return false;

        // Check escalation_at
        if (ticket.escalation_at) {
            const escalationDate = new Date(ticket.escalation_at);
            if (escalationDate <= now) return true;
        }

        return false;
    }).sort((a, b) => new Date(a.escalation_at) - new Date(b.escalation_at));

    // Update the KPI card
    const kpiEl = document.getElementById('kpi-escalated-value');
    if (kpiEl) {
        kpiEl.textContent = escalated.length;
        kpiEl.classList.add('animate');
    }

    if (escalated.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No escalated tickets 🎉</td></tr>';
        return;
    }

    tbody.innerHTML = escalated.slice(0, 10).map((ticket) => {
        let stateName = stateMap[ticket.state_id] || 'Unknown';
        const isAssigned = ticket.owner_id && ticket.owner_id !== 1;

        if (stateName.toLowerCase() === 'new' && isAssigned) {
            stateName = 'Open';
        }

        const priorityName = priorityMap[ticket.priority_id] || 'Normal';
        const stateClass = getStateClass(stateName);
        const priorityClass = getPriorityClass(priorityName);
        const escalatedAgo = formatTimeSince(ticket.escalation_at);
        const ticketUrl = `${baseUrl}/#ticket/zoom/${ticket.id}`;

        return `
      <tr onclick="window.open('${ticketUrl}', '_blank')" title="Open ticket #${ticket.number}">
        <td><span class="ticket-number">#${ticket.number}</span></td>
        <td><span class="ticket-title">${escapeHtml(ticket.title)}</span></td>
        <td><span class="state-badge ${stateClass}">${stateName}</span></td>
        <td><span class="priority-badge ${priorityClass}">${cleanPriorityName(priorityName)}</span></td>
        <td><span class="escalation-time">${escalatedAgo}</span></td>
      </tr>
    `;
    }).join('');
}

function getStateClass(stateName) {
    const lower = stateName.toLowerCase();
    if (lower === 'new') return 'state-new';
    if (lower === 'open') return 'state-open';
    if (lower === 'closed') return 'state-closed';
    if (lower.includes('pending')) return 'state-pending';
    if (lower === 'merged') return 'state-merged';
    return 'state-open';
}

function getPriorityClass(priorityName) {
    const lower = priorityName.toLowerCase();
    if (lower.includes('low')) return 'priority-low';
    if (lower.includes('normal')) return 'priority-normal';
    if (lower.includes('high') && !lower.includes('very')) return 'priority-high';
    if (lower.includes('urgent') || lower.includes('very high')) return 'priority-urgent';
    return 'priority-normal';
}

function cleanPriorityName(name) {
    return name.replace(/^\d+\s+/, '');
}

function formatTimeSince(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
