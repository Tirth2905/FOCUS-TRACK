// FocusTrack Popup
const API_BASE = 'http://localhost:5000/api';

// --- Utilities ---
function formatTime(seconds) {
  if (!seconds || seconds < 60) return seconds + 's';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

// --- Tab Navigation ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'report') renderReport();
    if (tab.dataset.tab === 'account') renderAccount();
  });
});

// --- Dashboard ---
async function loadDashboard() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_TODAY_DATA' });
  const data = response.data || {};

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');

  document.getElementById('totalTime').textContent = total > 0 ? formatTime(total) : '0m';
  document.getElementById('totalSites').textContent = entries.length;
  document.getElementById('blockedCount').textContent = blockedSites.length;

  const list = document.getElementById('siteList');
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-state">No data yet today</div>';
    return;
  }

  list.innerHTML = entries.slice(0, 8).map(([site, secs]) => {
    const pct = total > 0 ? (secs / total * 100).toFixed(1) : 0;
    return `
      <div class="site-row">
        <div class="site-row-header">
          <span class="site-name">${site}</span>
          <span class="site-time">${formatTime(secs)}</span>
        </div>
        <div class="site-bar"><div class="site-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

document.getElementById('clearTodayBtn').addEventListener('click', async () => {
  if (confirm('Clear all tracking data for today?')) {
    await chrome.runtime.sendMessage({ type: 'CLEAR_TODAY' });
    loadDashboard();
  }
});

// --- Block Tab ---
async function loadBlockedSites() {
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  renderBlockedList(blockedSites);
  updatePresetStates(blockedSites);
}

function renderBlockedList(sites) {
  const list = document.getElementById('blockedList');
  if (sites.length === 0) {
    list.innerHTML = '<div class="empty-state">No sites blocked</div>';
    return;
  }
  list.innerHTML = sites.map(site => `
    <div class="blocked-row">
      <span class="blocked-domain">${site}</span>
      <button class="remove-btn" data-site="${site}">×</button>
    </div>`).join('');

  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeSite(btn.dataset.site));
  });
}

function updatePresetStates(sites) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const presets = btn.dataset.sites.split(',');
    const allBlocked = presets.every(s => sites.includes(s));
    btn.classList.toggle('active', allBlocked);
  });
}

async function addSite(domain) {
  domain = domain.trim().toLowerCase().replace('www.', '').replace('https://', '').replace('http://', '').split('/')[0];
  if (!domain) return;
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  if (!blockedSites.includes(domain)) {
    const updated = [...blockedSites, domain];
    await chrome.storage.local.set({ blockedSites: updated });
    await chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED', sites: updated });
    renderBlockedList(updated);
    updatePresetStates(updated);
  }
}

async function removeSite(domain) {
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  const updated = blockedSites.filter(s => s !== domain);
  await chrome.storage.local.set({ blockedSites: updated });
  await chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED', sites: updated });
  renderBlockedList(updated);
  updatePresetStates(updated);
}

document.getElementById('addBlockBtn').addEventListener('click', () => {
  const val = document.getElementById('blockInput').value;
  if (val) { addSite(val); document.getElementById('blockInput').value = ''; }
});

document.getElementById('blockInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    const val = e.target.value;
    if (val) { addSite(val); e.target.value = ''; }
  }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
    const presets = btn.dataset.sites.split(',');
    const allBlocked = presets.every(s => blockedSites.includes(s));
    let updated;
    if (allBlocked) {
      updated = blockedSites.filter(s => !presets.includes(s));
    } else {
      updated = [...new Set([...blockedSites, ...presets])];
    }
    await chrome.storage.local.set({ blockedSites: updated });
    await chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED', sites: updated });
    renderBlockedList(updated);
    updatePresetStates(updated);
  });
});

// --- Report Tab ---
async function renderReport() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
  const allData = response.data || {};

  // Last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayData = allData[key] || {};
    const total = Object.values(dayData).reduce((a, b) => a + b, 0);
    days.push({ key, label: d.toLocaleDateString('en', { weekday: 'short' }), total, data: dayData });
  }

  drawBarChart(days);

  // Aggregate top sites for the week
  const aggregate = {};
  days.forEach(({ data }) => {
    Object.entries(data).forEach(([site, time]) => {
      aggregate[site] = (aggregate[site] || 0) + time;
    });
  });

  const topSites = Object.entries(aggregate).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const weekTotal = topSites.reduce((s, [, v]) => s + v, 0);

  const container = document.getElementById('weeklyTopSites');
  if (topSites.length === 0) {
    container.innerHTML = '<div class="empty-state">No data this week</div>';
    return;
  }
  container.innerHTML = topSites.map(([site, secs]) => {
    const pct = weekTotal > 0 ? (secs / weekTotal * 100).toFixed(1) : 0;
    return `
      <div class="site-row">
        <div class="site-row-header">
          <span class="site-name">${site}</span>
          <span class="site-time">${formatTime(secs)}</span>
        </div>
        <div class="site-bar"><div class="site-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function drawBarChart(days) {
  const canvas = document.getElementById('barChart');
  const ctx = canvas.getContext('2d');
  const W = 300, H = 120;
  canvas.width = W; canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...days.map(d => d.total), 1);
  const barW = 28;
  const gap = (W - days.length * barW) / (days.length + 1);
  const maxBarH = 65;
  const baseY = 90;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  days.forEach((day, i) => {
    const x = gap + i * (barW + gap);
    const barH = (day.total / max) * maxBarH;
    const y = baseY - barH;

    // Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(x, baseY - maxBarH, barW, maxBarH);

    ctx.fillStyle = day.total > 0 ? '#d0d0d0' : '#2a2a2a';
    ctx.fillRect(x, y, barW, barH);

    // Label
    ctx.fillStyle = '#555';
    ctx.font = '8px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(day.label.toUpperCase(), x + barW / 2, baseY + 14);

    // Time label on bar
    if (day.total > 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '7px IBM Plex Mono, monospace';
      ctx.fillText(formatTime(day.total), x + barW / 2, y - 4);
    }
  });
}

// Export
document.getElementById('exportBtn').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
  const allData = response.data || {};
  let csv = 'Date,Site,Seconds,Time\n';
  Object.entries(allData).forEach(([date, sites]) => {
    Object.entries(sites).forEach(([site, secs]) => {
      csv += `${date},${site},${secs},${formatTime(secs)}\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'focustrack-data.csv' }).catch(() => {
    const a = document.createElement('a');
    a.href = url; a.download = 'focustrack-data.csv'; a.click();
  });
});

document.getElementById('exportJsonBtn').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
  const json = JSON.stringify(response.data || {}, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'focustrack-data.json'; a.click();
});

// --- Account Tab ---
async function renderAccount() {
  const { userToken, userEmail } = await chrome.storage.local.get(['userToken', 'userEmail']);
  if (userToken && userEmail) {
    showAccountSection(userEmail);
    checkApiStatus();
  } else {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('accountSection').style.display = 'none';
  }
}

function showAccountSection(email) {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('accountSection').style.display = 'block';
  document.getElementById('accountEmail').textContent = email;
  document.getElementById('accountAvatar').textContent = email[0].toUpperCase();
}

async function checkApiStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    document.getElementById('apiStatus').textContent = res.ok ? '● Online' : '● Error';
    document.getElementById('apiStatus').style.color = res.ok ? '#aaffaa' : '#ff4444';
  } catch {
    document.getElementById('apiStatus').textContent = '● Offline';
    document.getElementById('apiStatus').style.color = '#ff4444';
  }
  const { lastSync } = await chrome.storage.local.get('lastSync');
  document.getElementById('lastSync').textContent = lastSync
    ? new Date(lastSync).toLocaleTimeString() : 'Never';
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  await doAuth('login');
});

document.getElementById('registerBtn').addEventListener('click', async () => {
  await doAuth('register');
});

async function doAuth(mode) {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const msg = document.getElementById('authMsg');

  if (!email || !password) {
    msg.textContent = 'Email and password required.';
    msg.className = 'auth-msg error';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Auth failed');

    await chrome.storage.local.set({ userToken: data.token, userEmail: email });
    await chrome.runtime.sendMessage({ type: 'SET_TOKEN', token: data.token });
    msg.textContent = '';
    showAccountSection(email);
    checkApiStatus();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'auth-msg error';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['userToken', 'userEmail']);
  await chrome.runtime.sendMessage({ type: 'SET_TOKEN', token: null });
  renderAccount();
});

// Sync button
document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.style.transform = 'rotate(360deg)';
  btn.style.transition = 'transform 0.5s';
  setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 500);

  const { userToken } = await chrome.storage.local.get('userToken');
  if (!userToken) { alert('Sign in to sync data.'); return; }

  const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' });
  const allData = response.data || {};

  try {
    const res = await fetch(`${API_BASE}/tracking/sync-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ data: allData })
    });
    if (res.ok) {
      await chrome.storage.local.set({ lastSync: new Date().toISOString() });
      alert('Sync complete!');
    }
  } catch {
    alert('Sync failed. Is the backend running?');
  }
});

// --- Init ---
loadDashboard();
loadBlockedSites();
