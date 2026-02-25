/**
 * KPI Cards Component
 * Calculates and renders key performance indicators from ticket data
 */

export function calculateKPIData(tickets, states) {
    const stateMap = {};
    states.forEach((s) => {
        stateMap[s.id] = s.name.toLowerCase();
    });

    let openCount = 0;
    let closedCount = 0;
    let pendingCount = 0;
    let newCount = 0;

    tickets.forEach((ticket) => {
        let stateName = stateMap[ticket.state_id] || '';
        const isAssigned = ticket.owner_id && ticket.owner_id !== 1;

        if (stateName === 'new' && isAssigned) {
            stateName = 'open';
        }

        if (stateName === 'open') openCount++;
        else if (stateName === 'closed') closedCount++;
        else if (stateName.includes('pending')) pendingCount++;
        else if (stateName === 'new') newCount++;
    });

    return { openCount, closedCount, pendingCount, newCount, total: tickets.length };
}

export function renderKPICards(data) {
    const elements = {
        open: document.getElementById('kpi-open-value'),
        closed: document.getElementById('kpi-closed-value'),
        pending: document.getElementById('kpi-pending-value'),
        new: document.getElementById('kpi-new-value'),
    };

    animateValue(elements.open, data.openCount);
    animateValue(elements.closed, data.closedCount);
    animateValue(elements.pending, data.pendingCount);
    animateValue(elements.new, data.newCount);
}

function animateValue(element, targetValue) {
    element.classList.add('animate');
    const duration = 600;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (targetValue - startValue) * eased);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}
