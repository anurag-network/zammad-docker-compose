/**
 * Priority Distribution Donut Chart
 */

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let priorityChart = null;

export function renderPriorityChart(tickets, priorities, days = 7, priorityFilter = 'all') {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;

    if (priorityChart) {
        priorityChart.destroy();
        priorityChart = null;
    }

    const ctx = canvas.getContext('2d');

    // Build priority map
    const priorityMap = {};
    priorities.forEach((p) => {
        priorityMap[p.id] = p.name;
    });

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Count tickets per priority
    const priorityCounts = {};
    tickets.forEach((ticket) => {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < cutoffDate) return;

        let name = priorityMap[ticket.priority_id] || 'Unknown';

        if (priorityFilter !== 'all') {
            let filterName = name.toLowerCase().trim();
            if (!filterName.includes(priorityFilter)) return;
        }

        const lower = name.toLowerCase().trim();
        if (lower.includes('low')) name = 'Low|\uF111';
        else if (lower.includes('medium')) name = 'Medium|\uF111';
        else if (lower.includes('high')) name = 'High|\uF111';
        else if (lower.includes('critical')) name = 'Critical|\uF111';
        else name = name.charAt(0).toUpperCase() + name.slice(1) + '|\uF12E';

        priorityCounts[name] = (priorityCounts[name] || 0) + 1;
    });

    const labels = Object.keys(priorityCounts);
    const data = Object.values(priorityCounts);

    const colorMap = {
        'low|\uf111': '#10b981',      // Green
        'medium|\uf111': '#3b82f6',   // Blue
        'high|\uf111': '#f97316',     // Orange
        'critical|\uf111': '#ef4444', // Red
    };

    const defaultColors = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];
    const colors = labels.map((label, i) => {
        const lower = label.toLowerCase().trim();
        return colorMap[lower] || defaultColors[i % defaultColors.length];
    });

    priorityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderRadius: 50,
                borderSkipped: false,
                barPercentage: 0.4,
                maxBarThickness: 24,
            }],
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
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
                    callbacks: {
                        title: function (context) {
                            const label = context[0].label;
                            return label.split('|')[0];
                        },
                        label: function (context) {
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return ` ${context.raw} Tickets (${percentage}%)`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    position: 'bottom',
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: '#8b8fa7',
                        font: { family: "'Inter', sans-serif", size: 12 },
                        callback: function (val, index) {
                            const label = this.getLabelForValue(val);
                            return label.split('|')[0] || label;
                        },
                        maxRotation: 0,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                    ticks: {
                        display: true,
                        color: '#8b8fa7',
                        font: { family: "'Inter', sans-serif", size: 12 },
                        stepSize: 10
                    },
                    border: { display: false }
                }
            }
        },
        plugins: [{
            id: 'topIcons',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.font = '900 16px "Font Awesome 6 Free", "Font Awesome 6 Brands"';

                chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                    const label = data.labels[index];
                    const icon = label.split('|')[1];
                    if (icon) {
                        ctx.fillStyle = datapoint.options.backgroundColor;
                        ctx.fillText(icon, datapoint.x, datapoint.y - 8);
                    }
                });
                ctx.restore();
            }
        }]
    });
}

export function destroyPriorityChart() {
    if (priorityChart) {
        priorityChart.destroy();
        priorityChart = null;
    }
}
