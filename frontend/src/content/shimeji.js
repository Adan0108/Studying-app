chrome.storage.local.get('settings', s => {
  if (!s.settings?.shimeji) return;
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('assets/shimeji/run_01.png');
  img.style.position = 'fixed';
  img.style.bottom   = '0';
  img.style.right    = '0';
  img.style.cursor   = 'grab';
  document.body.appendChild(img);

  img.onmousedown = e => {
    e.preventDefault();
    document.onmousemove = m => {
      img.style.left = m.pageX + 'px';
      img.style.top  = m.pageY + 'px';
    };
    document.onmouseup = () => document.onmousemove = null;
  };
});
