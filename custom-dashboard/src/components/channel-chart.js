/**
 * Channel Chart Component
 * Renders a donut chart showing ticket distribution by creation channel
 */
import Chart from 'chart.js/auto';

let channelChartInstance = null;

export function renderChannelChart(tickets, articleTypes = [], days = 7, priorityFilter = 'all') {
    const canvas = document.getElementById('channel-chart');
    if (!canvas) return;

    // Create a map of article type ID to Name
    const typeMap = {};
    if (Array.isArray(articleTypes)) {
        articleTypes.forEach(type => {
            typeMap[type.id] = type.name;
        });
    }

    // Zammad stores channel info in create_article_type_id or we infer from article data
    // Common channel types: email, phone, web, note, twitter, facebook, telegram, sms
    const channelCounts = {};

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    tickets.forEach((ticket) => {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < cutoffDate) return;

        // Use create_article_type_id if available, mapped from typeMap, otherwise default
        let channel = typeMap[ticket.create_article_type_id] || ticket.create_article_type || 'unknown';

        // Normalize channel names with FontAwesome unicodes and explicit names
        channel = channel.toLowerCase().trim();
        if (channel.includes('email') || channel.includes('mail')) channel = 'Email|\uF0E0';
        else if (channel.includes('phone') || channel.includes('call')) channel = 'Call|\uF095';
        else if (channel.includes('chat') || channel.includes('telegram') || channel.includes('sms')) channel = 'Chat|\uF086';
        else channel = 'Others|\uF12E';

        // Apply local channel filter
        if (priorityFilter !== 'all') { // Still called priorityFilter in signature due to earlier replacement, but acts as channelFilter
            let fName = channel.split('|')[0].toLowerCase().trim();
            // User dropdown sends "others", not "other"
            if (priorityFilter === 'others' && fName !== 'others') return;
            if (priorityFilter !== 'others' && !fName.includes(priorityFilter.toLowerCase().trim())) return;
        }


        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });

    const labels = Object.keys(channelCounts);
    const data = Object.values(channelCounts);

    // Color palette for channels
    const channelColors = {
        'Email|\uF0E0': '#3b82f6',
        'Phone|\uF095': '#10b981',
        'Web Form|\uF0AC': '#8b5cf6',
        'Chat|\uF086': '#06b6d4',
        'Twitter|\uF099': '#1d9bf0',
        'Facebook|\uF09A': '#1877f2',
        'Telegram|\uF2C6': '#0088cc',
        'SMS|\uF3CD': '#f59e0b',
        'Note|\uF249': '#6b7280',
        'Other|\uF12E': '#ef4444',
    };

    const colors = labels.map(l => channelColors[l] || '#8b8fa7');

    if (channelChartInstance) {
        channelChartInstance.destroy();
    }

    channelChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
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
                    backgroundColor: 'rgba(18, 21, 33, 0.95)',
                    titleColor: '#f1f3f9',
                    bodyColor: '#8b8fa7',
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        title: function (context) {
                            const label = context[0].label;
                            return label.split('|')[0];
                        },
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                            return ` ${context.parsed.y} Tickets (${pct}%)`;
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
