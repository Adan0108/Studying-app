import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function Options() {
  const [blockList, setBlockList] = useState([]);

  useEffect(() => {
    chrome.storage.local.get('blockList', d => 
      setBlockList(d.blockList || [])
    );
  }, []);

  function add() {
    const url = document.getElementById('block-input').value;
    chrome.storage.local.set(
      { blockList: [...blockList, url] },
      () => setBlockList([...blockList, url])
    );
  }

  return (
    <div style={{padding:'10px'}}>
      <h2>Web-Block Settings</h2>
      <input id="block-input" placeholder="URL pattern" style={{width:'80%'}}/>
      <button onClick={add}>Add</button>
      <ul>
        {blockList.map((u,i) => <li key={i}>{u}</li>)}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Options />);
