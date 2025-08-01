console.log('%ctimerBar injected!', 'background: #409eff; color: white; padding:2px');
console.log('⏱️ timerBar content script injected on', location.href);
const BAR_ID = 'extension-timer-bar';

function formatTime(secs) {
  const m = String(Math.floor(secs/60)).padStart(2,'0');
  const s = String(secs%60).padStart(2,'0');
  return `${m}:${s}`;
}

let startTs = null;
let interval = null;

function createBar() {
  if (document.getElementById(BAR_ID)) return;
  const bar = document.createElement('div');
  bar.id = BAR_ID;
  Object.assign(bar.style, {
    position:       'fixed',
    top:            '48px',           // push down from the very top
    right:          '16px',           // push in from the right edge
    padding:        '4px 10px',       // some breathing room
    backgroundColor:'#409eff',
    color:           '#fff',
    borderRadius:    '6px',           // pill shape
    fontFamily:     'sans-serif',
    fontSize:       '12px',
    zIndex:          '2147483647',    // highest z-index
    boxShadow:      '0 2px 6px rgba(0,0,0,0.2)',
    cursor:         'default',
    userSelect:     'none'
  });
  document.body.appendChild(bar);
}

// remove the bar
function removeBar() {
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.remove();
}

// start updating the bar text
function startBar(ts) {
  startTs = ts;
  createBar();
  updateBar();
  interval = setInterval(updateBar, 1000);
}

// clear updates
function stopBar() {
  clearInterval(interval);
  removeBar();
}

// write elapsed time into the bar
function updateBar() {
  const now = Date.now();
  const secs = Math.floor((now - startTs)/1000);
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.textContent = `Studying: ${formatTime(secs)}`;
}

// listen for storage changes
chrome.storage.local.onChanged.addListener(changes => {
  if (changes.timerRunning) {
    if (changes.timerRunning.newValue) {
      const ts = changes.timerStart.newValue;
      startBar(ts);
    } else {
      stopBar();
    }
  }
});

// on initial load, check if running
chrome.storage.local.get(['timerRunning','timerStart'], data => {
  if (data.timerRunning && data.timerStart) {
    startBar(data.timerStart);
  }
});
