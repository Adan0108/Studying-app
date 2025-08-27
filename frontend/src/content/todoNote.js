// src/content/todoNote.js
// Draggable sticky-note To-Do overlay injected on every page.

const NOTE_ID = "se-todo-sticky";
const POS_KEY = "todoNote.position";


// Be robust to cross-origin iframes
const IS_TOP = (() => {
  try { return window.top === window; } catch { return false; }
})();

let state = {
  open: false,
  showHistory: false,
  items: [],
  loading: false,
  error: "",
  page: 1,
  totalPages: 1,
  history: [],
  historyLoading: false,
  historyError: "",
};

let root, header, body, historyEl;
let pos = { x: 32, y: null }; // null => bottom:32
let reattacher; // MutationObserver
let isMounting = false;

function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of ['entries', 'items', 'todos', 'data', 'results', 'list']) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
}


// ---- background proxy so we reuse tokens/refresh flow
function apiFetchCS(path, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "TODO_API", path, options }, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!resp) return reject(new Error("No response"));
      if (resp.status === 401) return reject(new Error("Unauthorized"));
      resolve(resp.data);
    });
  });
}

// ---------- DOM helpers
function attachHost() {
  let host = document.getElementById(NOTE_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = NOTE_ID;
    Object.assign(host.style, {
      position: "fixed",
      inset: "auto auto 32px 32px",
      zIndex: 2147483646,
      pointerEvents: "auto",
      display: "block",
      visibility: "visible",
    });
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    (document.body || document.documentElement).appendChild(host);
  }
  // (Re)attach shadow
  return host.shadowRoot || host.attachShadow({ mode: "open" });
}

function injectStyles(shadow) {
  const style = document.createElement("style");
  style.textContent = `
  :host { all: initial; }
  .note {
    width: 320px; max-height: 60vh; background: #fff8b5; border: 1px solid #e4d26a;
    box-shadow: 0 10px 30px rgba(0,0,0,.2); border-radius: 10px; overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    color: #3b3b2e; user-select: none;
  }
  .note__header {
    background: linear-gradient(#fff2a1, #ffe36b);
    padding: 10px 12px; cursor: grab; display:flex; align-items:center; gap:8px;
  }
  .note__title { font-weight: 700; font-size: 14px; letter-spacing: .3px; }
  .spacer { flex: 1 }
  .icon-btn { border:none; background:transparent; padding:4px 8px; border-radius:6px; font-size:12px; cursor:pointer; }
  .icon-btn:hover { background: rgba(0,0,0,.06) }
  .note__body { padding:10px 12px; overflow:auto; max-height: 44vh; }
  .add-row { display:flex; gap:8px; margin-bottom:8px; }
  .add-row input { flex:1; padding:8px; border-radius:6px; border:1px solid #c9b858; background:#fffbe1; }
  .add-row button { padding:8px 10px; border-radius:6px; border:1px solid #c9b858; background:#fff4a3; cursor:pointer; }
  .todo-item { display:flex; align-items:center; gap:8px; padding:6px 4px; border-bottom:1px dashed #e9d97a; }
  .todo-item:last-child { border-bottom:none; }
  .todo-text { flex:1; font-size:13px; line-height:1.3; }
  .todo-text.done { text-decoration: line-through; opacity:.6; }
  .todo-actions { display:flex; gap:6px; }
  .chip { font-size:11px; padding:2px 6px; border-radius:999px; border:1px solid #c9b858; background:#fff4a3; }
  .muted { opacity:.7; font-size:12px }
  .history { border-top:1px solid #e4d26a; padding:8px 12px; max-height: 40vh; overflow:auto; background:#fffbe1; }
  .row { display:flex; align-items:center; gap:8px; padding:4px 0 }
  .row .title { flex:1; font-size:13px }
  .pagination { display:flex; justify-content: space-between; align-items:center; padding:6px 0; }
  .dragging .note__header { cursor: grabbing; }
  `;
  shadow.appendChild(style);
}

function setPosition(host) {
  const { x, y } = pos || {};
  host.style.left = `${x ?? 32}px`;
  if (y == null) {
    host.style.bottom = `32px`;
    host.style.top = `auto`;
  } else {
    host.style.top = `${y}px`;
    host.style.bottom = `auto`;
  }
}

function render(shadow) {
  // Clear but keep previously appended <style> nodes
  const styles = Array.from(shadow.querySelectorAll('style'));
  shadow.innerHTML = "";
  styles.forEach(s => shadow.appendChild(s));

  const note = document.createElement("div");
  note.className = "note";

  header = document.createElement("div");
  header.className = "note__header";
  const title = document.createElement("div");
  title.className = "note__title";
  title.textContent = "To-Do";

  const spacer = document.createElement("div"); spacer.className = "spacer";

  const histBtn = document.createElement("button");
  histBtn.className = "icon-btn";
  histBtn.textContent = state.showHistory ? "Hide History" : "History";
  histBtn.addEventListener("click", () => {
    state.showHistory = !state.showHistory;
    if (state.showHistory) loadHistory(1);
    mount();
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => closeNote());

  header.append(title, spacer, histBtn, closeBtn);

  body = document.createElement("div");
  body.className = "note__body";

  const addRow = document.createElement("div");
  addRow.className = "add-row";
  const input = document.createElement("input");
  input.placeholder = "New task…";
  input.maxLength = 200;
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  async function submitAdd() {
    const t = input.value.trim();
    if (!t) return;
    input.disabled = addBtn.disabled = true;
    try {
      await apiFetchCS("/api/todos", { method: "POST", body: { title: t } });
      input.value = "";
      await loadIncomplete();
    } finally {
      input.disabled = addBtn.disabled = false;
    }
  }
  addBtn.addEventListener("click", submitAdd);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAdd(); });
  addRow.append(input, addBtn);
  body.append(addRow);

  if (state.error) {
    const err = document.createElement("div");
    err.className = "muted";
    err.textContent = state.error;
    body.append(err);
  }

  if (state.loading) {
    const ld = document.createElement("div");
    ld.className = "muted";
    ld.textContent = "Loading…";
    body.append(ld);
  } else {
    const items = Array.isArray(state.items) ? state.items : normalizeListPayload(state.items);
    items.forEach(todo => {
      const row = document.createElement("div");
      row.className = "todo-item";
      const todoId = todo._id || todo.id;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!todo.completedAt;
      cb.addEventListener("change", async () => {
        if (!todoId) return;
        await apiFetchCS(`/api/todos/${todoId}/complete`, { method: "PATCH" });
        await loadIncomplete();
      });

      const text = document.createElement("span");
      text.className = "todo-text" + (todo.completedAt ? " done" : "");
      text.textContent = todo.title;

      // inline edit
      text.addEventListener("dblclick", () => {
        const inp = document.createElement("input");
        inp.value = todo.title;
        inp.className = "todo-text";
        inp.style.background = "#fffbe1";
        inp.style.border = "1px solid #c9b858";
        row.replaceChild(inp, text);
        inp.focus();
        const save = async () => {
          const v = inp.value.trim();
          row.replaceChild(text, inp);
          if (v && v !== todo.title) {
            if (!todoId) return;
            await apiFetchCS(`/api/todos/${todoId}`, { method: "PATCH", body: { title: v } });
            await loadIncomplete();
          }
        };
        inp.addEventListener("keydown", e => { if (e.key === "Enter") save(); if (e.key === "Escape") row.replaceChild(text, inp); });
        inp.addEventListener("blur", save);
      });

      const actions = document.createElement("div");
      actions.className = "todo-actions";

      const del = document.createElement("button");
      del.className = "icon-btn";
      del.title = "Delete";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        if (!todoId) return;
        await apiFetchCS(`/api/todos/${todoId}`, { method: "DELETE" });
        await loadIncomplete();
      });

      actions.append(del);

      row.append(cb, text, actions);
      body.append(row);
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No pending tasks. Nice!";
      body.append(empty);
    }
  }

  historyEl = document.createElement("div");
  if (state.showHistory) {
    historyEl.className = "history";
    const ht = document.createElement("div"); ht.innerHTML = `<span class="chip">History</span>`;
    historyEl.appendChild(ht);

    if (state.historyError) {
      const e = document.createElement("div"); e.className = "muted"; e.textContent = state.historyError;
      historyEl.appendChild(e);
    } else if (state.historyLoading) {
      const e = document.createElement("div"); e.className = "muted"; e.textContent = "Loading…";
      historyEl.appendChild(e);
    } else if (state.history && state.history.length) {
      state.history.forEach(t => {
        const row = document.createElement("div");
        row.className = "row";
        const check = document.createElement("span"); check.textContent = t.completedAt ? "✓" : "•";
        const span = document.createElement("span"); span.className = "title"; span.textContent = t.title;
        const when = document.createElement("span"); when.className = "muted";
        const d = new Date(t.updatedAt || t.createdAt); when.textContent = d.toLocaleString();
        row.append(check, span, when);
        historyEl.appendChild(row);
      });
      const pg = document.createElement("div");
      pg.className = "pagination";
      const prev = document.createElement("button");
      prev.className = "icon-btn"; prev.textContent = "◀ Prev";
      prev.disabled = state.page <= 1;
      prev.addEventListener("click", () => loadHistory(Math.max(1, state.page - 1)));
      const info = document.createElement("span"); info.className = "muted"; info.textContent = `Page ${state.page} / ${state.totalPages}`;
      const next = document.createElement("button");
      next.className = "icon-btn"; next.textContent = "Next ▶";
      next.disabled = state.page >= state.totalPages;
      next.addEventListener("click", () => loadHistory(Math.min(state.totalPages, state.page + 1)));
      pg.append(prev, info, next);
      historyEl.appendChild(pg);
    } else {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No history yet.";
      historyEl.appendChild(empty);
    }
  }

  note.append(header, body, historyEl);
  shadow.appendChild(note);
}

async function loadIncomplete() {
  try {
    state.loading = true; state.error = ""; mount();
    const data = await apiFetchCS("/api/todos/incomplete");
    state.items = normalizeListPayload(data);
  } catch (e) {
    state.error = e.message || "Failed to load items.";
  } finally {
    state.loading = false; mount();
  }
}

async function loadHistory(page = 1) {
  try {
    state.historyLoading = true; state.historyError = ""; mount();
    const data = await apiFetchCS(`/api/todos?page=${page}`);
    const list = normalizeListPayload(data);
    state.history = list;
    state.page = (data && (data.page || data.currentPage)) || page;
    const total = data && (data.total || data.totalCount || data.count);
    const size = data && (data.pageSize || data.limit || list.length || 1);
    state.totalPages = (total && size) ? Math.max(1, Math.ceil(total / size)) : (data?.totalPages || 1);
  } catch (e) {
    state.historyError = e.message || "Failed to load history.";
  } finally {
    state.historyLoading = false; mount();
  }
}

// ---- Drag
function enableDrag(host) {
  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;

  const onDown = (e) => {
    dragging = true;
    host.classList.add("dragging");
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    const rect = host.getBoundingClientRect();
    baseX = rect.left; baseY = rect.top;
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    pos.x = Math.max(8, Math.min(window.innerWidth - 328, Math.round(baseX + dx)));
    pos.y = Math.max(8, Math.min(window.innerHeight - 160, Math.round(baseY + dy)));
    setPosition(host);
  };

  const onUp = async () => {
    if (!dragging) return;
    dragging = false;
    host.classList.remove("dragging");
    await chrome.storage.local.set({ [POS_KEY]: pos });
  };

  header.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);

  header.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);
}

// ---- Mount/Reattach
function mount() {
  if (!root) return;
  render(root);
  setPosition(root.host);
}

async function openNote() {
  if (isMounting || state.open) return;
  isMounting = true;
  try {
    const obj = await chrome.storage.local.get([POS_KEY]); // position only
    if (obj && obj[POS_KEY]) pos = obj[POS_KEY];

    root = attachHost();
    if (!root.querySelector('style')) injectStyles(root);
    render(root);
    setPosition(root.host);
    enableDrag(root.host);
    state.open = true;

    if (!reattacher) {
      reattacher = new MutationObserver(() => {
        const host = document.getElementById(NOTE_ID);
        if (!host && state.open) {
          root = attachHost();
          if (!root.querySelector('style')) injectStyles(root);
          mount();
          setPosition(root.host);
          enableDrag(root.host);
        }
      });
      reattacher.observe(document.documentElement, { childList: true, subtree: true });
    }

    await loadIncomplete();
  } finally {
    isMounting = false;
  }
}

async function closeNote() {
  const host = document.getElementById(NOTE_ID);
  if (host) host.remove();
  state.open = false;
}



if (IS_TOP) {
  // Ask background if this tab should have the note open (survives SPA reloads)
  chrome.runtime.sendMessage({ type: 'PING_TODO_STATE' }, (resp) => {
    if (resp && resp.open) openNote();
  });

  // Message bus from popup/background
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'OPEN_TODO_NOTE') openNote();
    if (msg.type === 'CLOSE_TODO_NOTE') closeNote();
  });

  // Keep-alive against aggressive DOM wipes (first few seconds)
  let keepAliveUntil = Date.now() + 8000; // 8s after first open
  const keep = setInterval(() => {
    if (!state.open) return;
    if (Date.now() > keepAliveUntil) { clearInterval(keep); return; }
    if (!document.getElementById(NOTE_ID)) openNote();
  }, 400);

}
