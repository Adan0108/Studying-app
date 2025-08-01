import React, { useState } from 'react';
import { apiFetch } from '../../../utils/apiClient';

export default function AddTaskButton({ onAdd }) {
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    apiFetch('/api/todos', {
      method: 'POST',
      body: { title: text }
    }).then(() => {
      setText('');
      onAdd();
    });
  }

  return (
    <div className="add-task">
      <input
        placeholder="New task"
        value={text}
        onChange={e => setText(e.target.value)}
        style={{width:'70%'}}
      />
      <button onClick={add} style={{marginLeft:'8px'}}>+</button>
    </div>
  );
}
