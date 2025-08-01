import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiClient';

export default function ToggleSwitch({ type, label }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    apiFetch(`/api/settings/${type}`)
      .then(d => setOn(d.enabled))
      .catch(() => {});
  }, []);

  function toggle() {
    apiFetch(`/api/settings/${type}`, {
      method: 'POST',
      body: { enabled: !on }
    }).then(() => setOn(!on));
  }

  return (
    <label style={{display:'block', margin:'8px 0'}}>
      <input type="checkbox" checked={on} onChange={toggle}/>
      {' '}{label}
    </label>
  );
}
