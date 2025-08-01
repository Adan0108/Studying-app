import React, { useState } from 'react';
import { apiFetch }         from '../../utils/apiClient';

export default function Login({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [error, setError] = useState('');

  async function submit() {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password: pass }
      });
      // data = { user, accessToken, refreshToken }
      onLogin(data);
    } catch (e) {
      setError('Login failed. Please check your credentials.');
    }
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="message">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={pass}
        onChange={e => setPass(e.target.value)}
      />
      <button onClick={submit}>Login</button>
      <div
        className="link-switch"
        onClick={onSwitch}
      >
        Don’t have an account? Register
      </div>
    </div>
  );
}
