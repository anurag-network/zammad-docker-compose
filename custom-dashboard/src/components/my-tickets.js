export function renderMyTickets(tickets, states, priorities, currentUser, baseUrl) {
    const tbody = document.getElementById('my-tickets-body');
    if (!tbody || !currentUser) return;

    // Build lookup maps
    const stateMap = {};
    states.forEach((s) => {
        stateMap[s.id] = s.name;
    });

    const priorityMap = {};
    priorities.forEach((p) => {
        priorityMap[p.id] = p.name;
    });

    // Filter tickets assigned to the current user (excluding closed/merged)
    let myTickets = tickets.filter(t => t.owner_id === currentUser.id);

    // Optional: filter out closed ones if we only want active ones. Let's keep all recent ones if they are still assigned, but usually agents want to see their *open* assigned tickets.
    myTickets = myTickets.filter(t => {
        const stateName = (stateMap[t.state_id] || '').toLowerCase();
        return stateName !== 'closed' && stateName !== 'merged';
    });

    myTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (myTickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No tickets assigned to you 🏝️</td></tr>';
        return;
    }

    tbody.innerHTML = myTickets.slice(0, 10).map((ticket) => {
        let stateName = stateMap[ticket.state_id] || 'Unknown';
        if (stateName.toLowerCase() === 'new') {
            // It's assigned to us, so consider it Open
            stateName = 'Open';
        }

        const priorityName = priorityMap[ticket.priority_id] || 'Normal';
        const stateClass = getStateClass(stateName);
        const priorityClass = getPriorityClass(priorityName);
        const createdDate = formatDate(ticket.created_at);
        const ticketUrl = `${baseUrl}/#ticket/zoom/${ticket.id}`;

        return `
      <tr onclick="window.open('${ticketUrl}', '_blank')" title="Open ticket #${ticket.number}">
        <td><span class="ticket-number">#${ticket.number}</span></td>
        <td><span class="ticket-title">${escapeHtml(ticket.title)}</span></td>
        <td><span class="state-badge ${stateClass}">${stateName}</span></td>
        <td><span class="priority-badge ${priorityClass}">${cleanPriorityName(priorityName)}</span></td>
        <td>${createdDate}</td>
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
    return name.replace(/^\\d+\\s+/, '');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
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
