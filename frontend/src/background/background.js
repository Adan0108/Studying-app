const BASE_URL = 'http://localhost:4000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ timeLog: {}, blockList: [] });
});

// helper to get tokens
function getTokens() {
  return new Promise(res => {
    chrome.storage.local.get(['accessToken','refreshToken'], obj => res(obj));
  });
}

let activeTab, startTime;

chrome.tabs.onActivated.addListener(info => {
  if (activeTab != null && startTime) {
    recordTime(activeTab, Date.now() - startTime);
  }
  activeTab = info.tabId;
  startTime = Date.now();
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === activeTab && startTime) {
    recordTime(tabId, Date.now() - startTime);
  }
});

async function recordTime(tabId, dur) {
  // only record ≥120s
  if (dur < 120000) return;
  // update local log
  chrome.storage.local.get('timeLog', d => {
    const log = d.timeLog || {};
    log[tabId] = (log[tabId] || 0) + dur;
    chrome.storage.local.set({ timeLog: log });
  });

  // send to API
  const { accessToken, refreshToken } = await getTokens();
  const res = await fetch(BASE_URL + '/api/time', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-refresh-token': refreshToken
    },
    body: JSON.stringify({ workingDuration: Math.floor(dur/1000) })
  });
  // handle new token
  const newAccess = res.headers.get('x-access-token');
  if (newAccess) chrome.storage.local.set({ accessToken: newAccess });
}

// daily alarm
chrome.alarms.create('dailySummary', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'dailySummary') {
    chrome.runtime.sendMessage({ type: 'SEND_DAILY_SUMMARY' });
  }
});
