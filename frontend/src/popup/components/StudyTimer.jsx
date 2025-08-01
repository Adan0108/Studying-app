import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiClient';

export default function StudyTimer({ onRecorded }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const intervalRef = useRef(null);

  // On mount, restore any in-progress session
  useEffect(() => {
    chrome.storage.local.get(['timerRunning','timerStart'], ({ timerRunning, timerStart }) => {
      if (timerRunning && timerStart) {
        startRef.current = timerStart;
        setRunning(true);
        setElapsed(Math.floor((Date.now() - timerStart) / 1000));
      }
    });
  }, []);

  // When `running` toggles, start or clear interval
  useEffect(() => {
    if (running) {
      // Begin counting
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleClick = async () => {
    if (running) {
      // STOP
      clearInterval(intervalRef.current);
      setRunning(false);
      // remove persisted state
      chrome.storage.local.remove(['timerRunning','timerStart']);
      // send to backend
      try {
        await apiFetch('/api/time', {
          method: 'POST',
          body: { workingDuration: elapsed }
        });
        onRecorded?.();
      } catch (e) {
        console.error('Failed to record session', e);
      }
    } else {
      // START
      const now = Date.now();
      startRef.current = now;
      setElapsed(0);
      setRunning(true);
      // persist across popup unloads
      chrome.storage.local.set({ timerRunning: true, timerStart: now });
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div
      onClick={handleClick}
      className ="timer-circle"
    >
      <div style={{ textAlign: 'center' }}>
        {running ? `${mm}:${ss}` : 'Click to start'}
        <br/>
        <small>{running ? 'Stop timer' : ''}</small>
      </div>
    </div>
  );
}
