import React from 'react';
import { apiFetch } from '../../../utils/apiClient';

export default function TodoItem({ todo, onChange }) {
  function markComplete() {
    apiFetch(`/api/todos/${todo._id}/complete`, { method: 'PATCH' })
      .then(onChange);
  }
  function del() {
    apiFetch(`/api/todos/${todo._id}`, { method: 'DELETE' })
      .then(onChange);
  }

  return (
    <div className="todo-item">
      <img
        className="todo-checkbox"
        src={
          todo.completed
            ? 'assets/images/checkbox-checked.png'
            : 'assets/images/checkbox-unchecked.png'
        }
        onClick={markComplete}
        alt="toggle complete"
      />
      <span className="todo-text">{todo.title}</span>
      <img
        className="todo-delete"
        src="assets/images/delete.png"
        onClick={del}
        alt="delete task"
      />
    </div>
  );
}
