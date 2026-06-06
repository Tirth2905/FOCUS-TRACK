// FocusTrack Background Worker
const API_BASE = 'http://localhost:5000/api';

let activeTab = null;
let activeStart = null;
let trackingData = {};
let blockedSites = [];
let userToken = null;

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['blockedSites', 'trackingData', 'userToken']);
  blockedSites = data.blockedSites || [];
  trackingData = data.trackingData || {};
  userToken = data.userToken || null;
  setupAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['blockedSites', 'trackingData', 'userToken']);
  blockedSites = data.blockedSites || [];
  trackingData = data.trackingData || {};
  userToken = data.userToken || null;
});

// Setup daily reset alarm
function setupAlarms() {
  chrome.alarms.create('dailyReset', { when: getNextMidnight(), periodInMinutes: 1440 });
  chrome.alarms.create('syncData', { periodInMinutes: 5 });
}

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    generateDailyReport();
    resetDailyData();
  } else if (alarm.name === 'syncData') {
    syncToBackend();
  }
});

// Tab tracking
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await saveCurrentTabTime();
  const tab = await chrome.tabs.get(tabId);
  startTracking(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await saveCurrentTabTime();
    startTracking(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await saveCurrentTabTime();
    activeTab = null;
    activeStart = null;
  } else {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs.length > 0) startTracking(tabs[0]);
  }
});

function startTracking(tab) {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    activeTab = null;
    activeStart = null;
    return;
  }
  activeTab = getDomain(tab.url);
  activeStart = Date.now();

  // Check if site is blocked
  if (isBlocked(activeTab)) {
    chrome.tabs.update(tab.id, {
      url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(activeTab)
    });
  }
}

async function saveCurrentTabTime() {
  if (!activeTab || !activeStart) return;
  const elapsed = Math.floor((Date.now() - activeStart) / 1000);
  if (elapsed < 2) return;

  const today = getTodayKey();
  if (!trackingData[today]) trackingData[today] = {};
  if (!trackingData[today][activeTab]) trackingData[today][activeTab] = 0;
  trackingData[today][activeTab] += elapsed;

  await chrome.storage.local.set({ trackingData });
  activeTab = null;
  activeStart = null;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function isBlocked(domain) {
  return blockedSites.some(site => domain.includes(site.replace('www.', '')));
}

// Generate daily report
async function generateDailyReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = yesterday.toISOString().split('T')[0];
  const data = trackingData[key] || {};

  const totalTime = Object.values(data).reduce((a, b) => a + b, 0);
  const topSites = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'FocusTrack Daily Report',
    message: `Yesterday: ${formatTime(totalTime)} tracked. Top site: ${topSites[0]?.[0] || 'none'}`
  });
}

function resetDailyData() {
  // Keep only last 30 days
  const keys = Object.keys(trackingData).sort();
  if (keys.length > 30) {
    keys.slice(0, keys.length - 30).forEach(k => delete trackingData[k]);
    chrome.storage.local.set({ trackingData });
  }
}

// Sync to backend
async function syncToBackend() {
  const token = userToken;
  if (!token) return;

  try {
    const today = getTodayKey();
    const todayData = trackingData[today] || {};

    await fetch(`${API_BASE}/tracking/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ date: today, data: todayData })
    });
  } catch (e) {
    // Offline mode — data saved locally
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Message handler from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    await saveCurrentTabTime();
    const data = await chrome.storage.local.get(['trackingData', 'blockedSites', 'userToken']);
    trackingData = data.trackingData || {};
    blockedSites = data.blockedSites || [];
    userToken = data.userToken || null;

    if (msg.type === 'GET_TODAY_DATA') {
      const today = getTodayKey();
      sendResponse({ data: trackingData[today] || {}, date: today });
    } else if (msg.type === 'GET_ALL_DATA') {
      sendResponse({ data: trackingData });
    } else if (msg.type === 'UPDATE_BLOCKED') {
      blockedSites = msg.sites;
      sendResponse({ ok: true });
    } else if (msg.type === 'SET_TOKEN') {
      userToken = msg.token;
      sendResponse({ ok: true });
    } else if (msg.type === 'CLEAR_TODAY') {
      const today = getTodayKey();
      delete trackingData[today];
      await chrome.storage.local.set({ trackingData });
      sendResponse({ ok: true });
    }
  })();
  return true;
});
