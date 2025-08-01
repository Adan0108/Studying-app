import React, { useState, useEffect } from 'react';
import Login          from './components/Login';
import Register       from './components/Register';
import MainDashboard  from './components/MainDashboard';
import { apiFetch }   from '../utils/apiClient';

export default function App() {
  const [user, setUser]   = useState(null);
  const [view, setView]   = useState('login');

  // On mount, restore user/token if present
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setView('main');
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Called by Login.jsx on success
  async function handleLogin({ user: u, accessToken, refreshToken }) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setView('main');
  }

  // Called on clicking Logout
  function handleLogout() {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setView('login');
  }

  if (user) {
    return <MainDashboard user={user} onLogout={handleLogout} />;
  }

  return view === 'login'
    ? <Login    onLogin={handleLogin} onSwitch={() => setView('register')} />
    : <Register onRegister={() => setView('login')} onSwitch={() => setView('login')} />;
}
