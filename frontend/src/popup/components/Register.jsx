import React, { useState } from 'react';
import { apiFetch } from '../../utils/apiClient';

export default function Register({ onRegister, onSwitch }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [msg,   setMsg]   = useState('');

  async function submit() {
    try {
      const user = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { email, password: pass }
      });
      setMsg('Registered! Please log in.');
      onRegister();
    } catch {
      setMsg('Registration failed');
    }
  }

  return (
    <div className="register-container">
      <h2>Register</h2>
      {msg && <div>{msg}</div>}
      <input placeholder="Email"    value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
      <button onClick={submit}>Register</button>
      <p onClick={onSwitch}>Already have an account? Login</p>
    </div>
  );
}
