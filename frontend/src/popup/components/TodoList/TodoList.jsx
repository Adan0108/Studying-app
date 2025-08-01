import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../utils/apiClient';
import TodoItem      from './TodoItem';
import AddTaskButton from './AddTaskButton';

export default function TodoList() {
  const [todos, setTodos] = useState([]);

  function load() {
    apiFetch('/api/todos/incomplete')
      .then(setTodos)
      .catch(() => {});
  }

  useEffect(load, []);

  return (
    <div>
      {todos.map(t => <TodoItem key={t._id} todo={t} onChange={load}/>)}
      <AddTaskButton onAdd={load}/>
    </div>
  );
}
