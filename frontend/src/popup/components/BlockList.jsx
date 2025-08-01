import React, { useState, useEffect } from 'react';

export default function BlockList() {
  const [list, setList] = useState([]);
  const [pattern, setPattern] = useState('');

  useEffect(() => {
    chrome.storage.local.get('blockList', data => {
      setList(data.blockList || []);
    });
  }, []);

  const add = () => {
    if (!pattern.trim() || list.includes(pattern)) return;
    const updated = [...list, pattern.trim()];
    setList(updated);
    chrome.storage.local.set({ blockList: updated });
    setPattern('');
  };

  const remove = p => {
    const updated = list.filter(x => x !== p);
    setList(updated);
    chrome.storage.local.set({ blockList: updated });
  };

  return (
    <div className="todo-section">
      <h3>Manage Blocklist</h3>

      <div className="todo-list">
        <ul style={{ margin:0, padding:0, listStyle:'none' }}>
          {list.map((p,i) => (
            <li key={i} className="todo-item">
              <span className="todo-text">{p}</span>
              <button className="btn-remove" onClick={() => remove(p)}>
                Remove
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li style={{ textAlign:'center', color:'#666', fontSize:'13px' }}>
              No URLs blocked
            </li>
          )}
        </ul>
      </div>

      <div className="add-task">
        <input
          type="text"
          placeholder="Enter URL pattern"
          value={pattern}
          onChange={e => setPattern(e.target.value)}
        />
        <button onClick={add}>Add</button>
      </div>
    </div>
  );
}
