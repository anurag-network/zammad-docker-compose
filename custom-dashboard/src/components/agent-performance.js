export function renderAgentStatus(tickets, users, states) {
    const tbody = document.getElementById('agent-status-body');
    if (!tbody) return;

    // Create a map of active state IDs
    const activeStates = new Set();
    states.forEach(state => {
        const stateName = state.name.toLowerCase();
        // Typically 'open', 'new', 'in_progress' are active states. Closed/Merged/Removed are not.
        if (!['closed', 'merged', 'removed'].includes(stateName)) {
            activeStates.add(state.id);
        }
    });

    // Extract agents (users with roles including agent or assigned tickets)
    // Here we'll map owner IDs
    const userMap = {};
    users.forEach((u) => {
        if (u.id === 1) return; // Skip system/admin
        userMap[u.id] = {
            name: u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : u.email || `User ${u.id}`,
            activeTickets: 0
        };
    });

    // Count active tickets per owner/agent
    tickets.forEach((ticket) => {
        if (ticket.owner_id && ticket.owner_id !== 1 && activeStates.has(ticket.state_id)) {
            if (!userMap[ticket.owner_id]) {
                userMap[ticket.owner_id] = { name: `Agent ${ticket.owner_id}`, activeTickets: 0 };
            }
            userMap[ticket.owner_id].activeTickets += 1;
        }
    });

    // Convert map to array and sort by active tickets descending, but prioritize keeping known agents in list
    let agentsList = Object.values(userMap);

    // We only want actual agents. So we filter for those who have tickets OR are explicitly marked as agents
    // If user list is too large, we just show those with active tickets to stay relevant:
    agentsList = agentsList.filter(a => a.activeTickets > 0);

    // If no agents are actively assigned tickets:
    if (agentsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Everyone is Idle ☕</td></tr>`;
        return;
    }

    // Sort heavily loaded agents first
    agentsList.sort((a, b) => b.activeTickets - a.activeTickets);

    tbody.innerHTML = '';

    agentsList.forEach(agent => {
        const isWorking = agent.activeTickets > 0;
        const statusHTML = isWorking
            ? `<span class="px-2 py-1 rounded text-xs font-medium" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">Working 💻</span>`
            : `<span class="px-2 py-1 rounded text-xs font-medium" style="background: rgba(139, 143, 167, 0.15); color: #8b8fa7;">Idle ☕</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium text-white">${agent.name}</td>
            <td>${statusHTML}</td>
            <td class="text-right font-medium" style="color: ${isWorking ? '#f1f3f9' : '#8b8fa7'};">${agent.activeTickets}</td>
        `;
        tbody.appendChild(row);
    });
}
