import React, { useEffect, useState } from 'react';
import { apiFetch }    from '../../utils/apiClient';
import StudyTimer      from './StudyTimer';
import ToggleSwitch    from './ToggleSwitch';
import TodoList        from './TodoList/TodoList';
import BlockList       from './BlockList';
import ShimejiBox from './ShimejiBox';

export default function MainDashboard({ user, onLogout }) {
  const [totalToday, setTotalToday] = useState(0);
  const [showBlocks, setShowBlocks] = useState(false);

  const loadToday = () => {
    apiFetch('/api/time?page=1').then(data => {
      const today = new Date().toISOString().slice(0,10);
      const sum = data.entries
        .filter(e => e.createdAt.slice(0,10) === today)
        .reduce((acc,e) => acc + e.workingDuration, 0);
      setTotalToday(sum);
    });
  };

  useEffect(loadToday, []);

  return (
    <div style={{ position: 'relative', paddingBottom: 20 }}>
      <button className="logout-btn" onClick={onLogout}>Logout</button>
      <h2>Dashboard</h2>

      <StudyTimer onRecorded={loadToday} />

      {/* Toggle to show/hide the blocklist manager */}
      <button
        style={{
          display:'block',
          margin:'8px auto',
          padding:'6px 12px',
          background:'#409eff',
          color:'#fff',
          border:'none',
          borderRadius:'4px',
          cursor:'pointer'
        }}
        onClick={() => setShowBlocks(b => !b)}
      >
        {showBlocks ? 'Hide Blocklist' : 'Manage Blocklist'}
      </button>

      {showBlocks && <BlockList />}

      <h3>To-Do</h3>
      <TodoList />
      <h3>Companion</h3>
      <ShimejiBox/>
    </div>
  );
}
