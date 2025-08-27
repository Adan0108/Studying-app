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

// Centralized API fetcher for content scripts (handles tokens & refresh).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {


  if (msg && msg.type === 'TODO_API') {
    (async () => {
      try {
        const { accessToken, refreshToken } = await getTokens();
        const headers = {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(refreshToken ? { 'x-refresh-token': refreshToken } : {}),
          ...(msg.options && msg.options.headers ? msg.options.headers : {})
        };
        const opts = {
          method: (msg.options && msg.options.method) || 'GET',
          headers,
        };
        if (msg.options && msg.options.body != null) {
          opts.body = typeof msg.options.body === 'string'
            ? msg.options.body
            : JSON.stringify(msg.options.body);
        }
        const res = await fetch(BASE_URL + msg.path, opts);
        const newAccess = res.headers.get('x-access-token');
        if (newAccess) {
          await chrome.storage.local.set({ accessToken: newAccess });
        }
        let data = null;
        try { data = await res.json(); } catch (_){}
        sendResponse({ status: res.status, data });
      } catch (e) {
        sendResponse({ status: 500, data: { error: e.message }});
      }
    })();
    return true; // keep channel open for async response
  }
});

// --- To-Do sticky open state per tab (no storage; avoids races)
const todoOpenByTab = new Map(); // tabId -> boolean

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'OPEN_TODO_NOTE') {
    const tabId = msg.tabId ?? sender?.tab?.id;
    if (tabId != null) {
      todoOpenByTab.set(tabId, true);
      chrome.tabs.sendMessage(tabId, { type: 'OPEN_TODO_NOTE' });
    }
    sendResponse?.({ ok: true });
    return true;
  }
  if (msg.type === 'CLOSE_TODO_NOTE') {
    const tabId = msg.tabId ?? sender?.tab?.id;
    if (tabId != null) {
      todoOpenByTab.set(tabId, false);
      chrome.tabs.sendMessage(tabId, { type: 'CLOSE_TODO_NOTE' });
    }
    sendResponse?.({ ok: true });
    return true;
  }
  if (msg.type === 'PING_TODO_STATE') {
    const tabId = sender?.tab?.id;
    sendResponse?.({ open: tabId != null ? !!todoOpenByTab.get(tabId) : false });
    return true;
  }
});

// Keep state across reloads within the same tab (SPA/nav). Re-assert after load.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete' && todoOpenByTab.get(tabId)) {
    chrome.tabs.sendMessage(tabId, { type: 'OPEN_TODO_NOTE' });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  todoOpenByTab.delete(tabId);
});

