function normalize(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .toLowerCase();
}

// ID for the overlay element
const OVERLAY_ID = 'blocking-overlay';

// The exact path under dist/
const BLOCK_IMG_PATH = 'assets/images/webblocking.png';

// Check if current page should be blocked
function checkBlock() {
  chrome.storage.local.get('blockList', ({ blockList = [] }) => {
    const current = normalize(location.href);
    const shouldBlock = blockList.some(raw => current.includes(normalize(raw)));
    updateOverlay(shouldBlock);
  });
}

// Create or remove the overlay
function updateOverlay(blocked) {
  let overlay = document.getElementById(OVERLAY_ID);

  if (blocked) {
    // If it’s already there, do nothing
    if (overlay) return;

    // Create the full-screen dark overlay
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 999999,
      pointerEvents: 'all'
    });

    // Central content container
    const content = document.createElement('div');
    Object.assign(content.style, {
      color: '#fff',
      fontSize: '24px',
      textAlign: 'center',
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    });

    // Message
    const msg = document.createElement('div');
    msg.textContent = 'Your focus timer is running — site blocked!';
    content.appendChild(msg);

    // Debug log: what URL are we requesting?
    console.log('⏱️ WebBlocker image src =', chrome.runtime.getURL(BLOCK_IMG_PATH));

    // Image
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL(BLOCK_IMG_PATH);
    img.alt = 'Blocked';
    Object.assign(img.style, {
      marginTop: '20px',
      width: '100px',
      height: 'auto'
    });
    content.appendChild(img);

    // “Give Up” button
    const btn = document.createElement('button');
    btn.textContent = 'Give Up';
    Object.assign(btn.style, {
      marginTop: '20px',
      padding: '10px 20px',
      fontSize: '18px',
      background: 'transparent',
      color: '#fff',
      border: '2px solid #fff',
      cursor: 'pointer'
    });
    btn.onclick = () => {
      chrome.runtime.sendMessage({ action: 'stop' });
      removeOverlay();
    };
    content.appendChild(btn);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Prevent background scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } else {
    removeOverlay();
  }
}

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

// Initial check if timer is already running
chrome.storage.local.get('timerRunning', ({ timerRunning }) => {
  if (timerRunning) checkBlock();
});

// Re-check whenever timerRunning flips
chrome.storage.local.onChanged.addListener(changes => {
  if (changes.timerRunning) {
    if (changes.timerRunning.newValue) {
      checkBlock();
    } else {
      removeOverlay();
    }
  }
});