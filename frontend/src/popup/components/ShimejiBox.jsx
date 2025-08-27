import React, { useEffect, useState } from 'react';

export default function ShimejiBox() {
  const [enabled, setEnabled] = useState(false);
  const [randomOn, setRandomOn] = useState(true);

  useEffect(() => {
    chrome.storage.local.get('settings', (s) => {
      setEnabled(!!s?.settings?.shimejiEnabled);
      setRandomOn(s?.settings?.shimejiRandom ?? true);
    });
  }, []);

  const saveSettings = (next) => {
    chrome.storage.local.get('settings', (s) => {
      const settings = { ...(s.settings || {}), ...next };
      chrome.storage.local.set({ settings });
    });
  };

  const sendToActive = (message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs?.[0]?.id;
      if (id) chrome.tabs.sendMessage(id, message);
    });
  };

  const spawn = () => {
    setEnabled(true);
    saveSettings({ shimejiEnabled: true });
    sendToActive({ type: 'SHIMEJI_SPAWN' });
  };

  const despawn = () => {
    setEnabled(false);
    saveSettings({ shimejiEnabled: false });
    sendToActive({ type: 'SHIMEJI_DESPAWN' });
  };

  const toggleRandom = () => {
    const next = !randomOn;
    setRandomOn(next);
    saveSettings({ shimejiRandom: next });
    sendToActive({ type: 'SHIMEJI_TOGGLE_RANDOM', value: next });
  };

  const resetGround = () => {
    sendToActive({ type: 'SHIMEJI_RESET_GROUND' });
  };

  const Btn = ({ onClick, children, style }) => (
    <button
      onClick={onClick}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid #ddd',
        color: '#111827',
        background: '#fff',
        cursor: 'pointer',
        marginRight: 8,
        marginTop: 8,
        ...style
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      background: '#fafafa'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Shimeji</strong>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: enabled ? '#DCFCE7' : '#F3F4F6',
          color: enabled ? '#065f46' : '#6b7280',
          fontSize: 12
        }}>
          {enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {!enabled
          ? <Btn onClick={spawn} style={{ background: '#10B981', color: 'white', borderColor: '#059669' }}>
              Spawn
            </Btn>
          : <>
              <Btn onClick={despawn} style={{ background: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }}>
                Despawn
              </Btn>
              <Btn onClick={toggleRandom}>
                Random: {randomOn ? 'On' : 'Off'}
              </Btn>
              <Btn onClick={resetGround}>Reset to Ground</Btn>
            </>
        }
      </div>

      <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
        Left-drag to move. Right-click on the character for behaviors (idle/walk/climb/cling).
      </p>
    </div>
  );
}
