// SaaS Admin & Analytics Engine for Veil
const API_BASE = 'http://localhost:8080/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation SPA Logic
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const sections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');

            // Specific View Refresh
            if (viewId === 'dashboard') renderDashboardStats();
            if (viewId === 'fleet') renderFleet();
            if (viewId === 'rules') renderRules();
            if (viewId === 'feedback') renderFullFeedback();
            if (viewId === 'config') simulateRpcLogs();
        });
    });

    // 2. Feedback Submission (Landing Page)
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    }

    // 3. Initialize Startup View
    renderDashboardStats();
    setInterval(renderDashboardStats, 10000); // Polling global stats
});

async function renderDashboardStats() {
    try {
        // Fetch Global Stats from SaaS API
        const response = await fetch(`${API_BASE}/admin/stats`);
        const globalData = await response.json();

        document.getElementById('global-user-count').textContent = globalData.totalUsers.toLocaleString();
        document.getElementById('global-block-count').textContent = globalData.globalFindings.toLocaleString();

        // Feed logic
        const allFeedback = JSON.parse(localStorage.getItem('veil_feedback') || '[]');
        document.getElementById('total-feedback-count').textContent = allFeedback.length;

        const feedEl = document.getElementById('dashboard-feed');
        if (feedEl) {
            feedEl.innerHTML = allFeedback.slice(0, 3).map(fb => `
                <div class="feed-item">
                    <div class="feed-header">
                        <span style="font-weight: 700; color: #fff;">${fb.name}</span>
                        <span class="tag ${fb.type === 'rule' ? 'tag-rule' : 'tag-feature'}">${fb.type}</span>
                    </div>
                    <div class="feed-content">${fb.message.substring(0, 45)}...</div>
                </div>
            `).join('');
        }

        // Real Data Chart if available
        const localStats = window.veilStats || JSON.parse(localStorage.getItem('veil.userStats') || '{}');
        if (localStats.history) {
            updateTrendsChart(localStats.history);
        } else {
            initializeStaticCharts();
        }
    } catch (e) {
        console.warn('SaaS API offline, showing local fallback.');
    }
}

async function renderFleet() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`);
        const users = await response.json();

        const tbody = document.getElementById('fleet-tbody');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td style="font-family: monospace; font-size: 0.8rem; color: var(--accent-cyan); font-weight: 600;">
                    ${u.userId.substring(0, 18)}...
                </td>
                <td>
                    <span class="status-badge status-active">Online</span>
                </td>
                <td style="font-weight: 700;">${u.totalFindings}</td>
                <td style="opacity: 0.6; font-size: 0.8rem;">
                    ${new Date(u.lastSeen).toLocaleTimeString()}
                </td>
                <td>
                    <div style="width: 100px; height: 4px; background: #222; border-radius: 2px;">
                        <div style="width: ${Math.min(100, (u.totalFixed / (u.totalFindings || 1)) * 100)}%; height: 100%; background: var(--accent-emerald); border-radius: 2px;"></div>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        document.getElementById('fleet-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center; opacity: 0.5;">Unable to reach SaaS Aggregator API.</td></tr>';
    }
}

function handleFeedbackSubmit(e) {
    e.preventDefault();
    const feedback = {
        id: Date.now(),
        name: document.getElementById('fb-name').value,
        email: document.getElementById('fb-email').value,
        type: document.getElementById('fb-type').value,
        message: document.getElementById('fb-message').value,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'New'
    };
    const allFeedback = JSON.parse(localStorage.getItem('veil_feedback') || '[]');
    allFeedback.unshift(feedback);
    localStorage.setItem('veil_feedback', JSON.stringify(allFeedback));
    document.getElementById('feedback-form').style.display = 'none';
    document.getElementById('fb-success').style.display = 'block';
}

function renderFullFeedback() {
    const listEl = document.getElementById('full-feedback-list');
    const allFeedback = JSON.parse(localStorage.getItem('veil_feedback') || '[]');
    listEl.innerHTML = allFeedback.map(fb => `
        <div class="stat-card-pro" style="margin-bottom: 20px;">
            <div class="feed-header" style="margin-bottom: 15px;">
                <h4 style="font-size: 1.2rem; color: #fff;">${fb.name} <small style="opacity: 0.5; font-weight: 400;">(${fb.email})</small></h4>
                <span class="tag ${fb.type === 'rule' ? 'tag-rule' : 'tag-feature'}">${fb.type.toUpperCase()}</span>
            </div>
            <p style="font-size: 1rem; line-height: 1.6; color: rgba(255,255,255,0.7);">${fb.message}</p>
            <div style="margin-top: 15px; font-size: 0.8rem; opacity: 0.4;">Received on ${fb.date}</div>
        </div>
    `).join('');
}

function renderRules() {
    const rules = [
        { id: "hardcoded-secrets", desc: "Detection of API keys, Private keys, and high-entropy strings.", status: "Active", impact: "Critical" },
        { id: "sql-injection", desc: "Analysis of dynamic query generation and unsafe string formatting.", status: "Active", impact: "High" },
        { id: "xss-prevention", desc: "Cross-site scripting detection in template rendering and DOM sinks.", status: "Active", impact: "Medium" },
        { id: "command-injection", desc: "Flagging insecure shelf execution and system subprocess calls.", status: "Active", impact: "High" },
        { id: "weak-crypto", desc: "Identification of broken or deprecated hashing and encryption algos.", status: "Active", impact: "High" }
    ];
    const tbody = document.getElementById('rules-tbody');
    tbody.innerHTML = rules.map(r => `
        <tr>
            <td style="font-family: monospace; font-weight: 600; color: var(--accent-cyan);">${r.id}</td>
            <td style="opacity: 0.7;">${r.desc}</td>
            <td><span class="status-badge status-active">${r.status}</span></td>
            <td style="font-weight: 700; color: ${r.impact === 'Critical' ? '#ff4d4d' : '#f1f1f1'};">${r.impact}</td>
        </tr>
    `).join('');
}

function simulateRpcLogs() {
    const logEl = document.getElementById('rpc-logs');
    const logs = [
        `[${new Date().toLocaleTimeString()}] INFO: SaaS Aggregator Connection: SUCCESS`,
        `[${new Date().toLocaleTimeString()}] DEBUG: Spawning local engine (v1.0.4)`,
        `[${new Date().toLocaleTimeString()}] INFO: Listening on JSON-RPC 2.0`,
        `[${new Date().toLocaleTimeString()}] SUCCESS: System ready for real-time analysis.`
    ];
    logEl.innerHTML = logs.map(l => `<div>${l}</div>`).join('');
}

function updateTrendsChart(history) {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setHours(now.getHours() - i);
        const day = d.toISOString().split('T')[0];
        const key = `${day}-${d.getHours()}`;
        labels.push(`${d.getHours()}:00`);
        data.push(history.hourly[key] || 0);
    }
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Security Obstructions', data: data, borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#06b6d4', pointRadius: 4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.3)', stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)' } } } }
    });
}

function initializeStaticCharts() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, { type: 'line', data: { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'], datasets: [{ label: 'Global Risks', data: [12, 19, 3, 5, 2, 3, 15], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)' } } } } });
}
