/* ============================================================
   app.js  –  Personal Dashboard
   Challenges implemented: Light/Dark Mode, Custom Name, Prevent Duplicates, Sort Tasks, Change Pomodoro Time
   ============================================================ */

'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(msg, type = 'default') {
  const toast = qs('#toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ================================================================
   1. THEME  (Light / Dark Mode — Challenge)
   ================================================================ */
(function initTheme() {
  const btn   = qs('#themeToggle');
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    btn.innerHTML = t === 'dark'
      ? '<span class="icon">☀️</span> Light Mode'
      : '<span class="icon">🌙</span> Dark Mode';
  }
})();

/* ================================================================
   2. GREETING  (time, date, custom name — Challenge)
   ================================================================ */
(function initGreeting() {
  const timeEl    = qs('#greetTime');
  const dateEl    = qs('#greetDate');
  const msgEl     = qs('#greetMsg');
  const nameInput = qs('#nameInput');
  const saveBtn   = qs('#saveName');

  // Load saved name
  nameInput.value = localStorage.getItem('userName') || '';

  saveBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });

  function saveName() {
    const n = nameInput.value.trim();
    localStorage.setItem('userName', n);
    showToast(n ? `Name saved as "${n}"!` : 'Name cleared.', 'success');
    updateGreeting();
  }

  function updateGreeting() {
    const now  = new Date();
    const hour = now.getHours();
    const min  = now.getMinutes().toString().padStart(2, '0');
    const sec  = now.getSeconds().toString().padStart(2, '0');

    // Time
    const h12  = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    timeEl.textContent = `${h12}:${min}:${sec} ${ampm}`;

    // Date
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(undefined, opts);

    // Greeting
    const name = (localStorage.getItem('userName') || '').trim();
    const suffix = name ? `, ${name}` : '';
    let salutation;
    if      (hour >= 5  && hour < 12) salutation = '🌅 Good morning';
    else if (hour >= 12 && hour < 17) salutation = '☀️ Good afternoon';
    else if (hour >= 17 && hour < 21) salutation = '🌆 Good evening';
    else                              salutation = '🌙 Good night';
    msgEl.textContent = `${salutation}${suffix}!`;
  }

  updateGreeting();
  setInterval(updateGreeting, 1000);
})();

/* ================================================================
   3. FOCUS TIMER  (custom Pomodoro time — Challenge)
   ================================================================ */
(function initTimer() {
  const displayEl  = qs('#timerDisplay');
  const labelEl    = qs('#timerLabel');
  const progressBar = qs('#timerProgressBar');
  const startBtn   = qs('#timerStart');
  const stopBtn    = qs('#timerStop');
  const resetBtn   = qs('#timerReset');
  const minInput   = qs('#timerMinutes');

  let totalSeconds  = 25 * 60;
  let remaining     = totalSeconds;
  let intervalId    = null;
  let isRunning     = false;

  // Load saved custom duration
  const savedMin = parseInt(localStorage.getItem('timerMinutes'), 10);
  if (savedMin && savedMin > 0) {
    minInput.value = savedMin;
    totalSeconds   = savedMin * 60;
    remaining      = totalSeconds;
  }

  render();

  startBtn.addEventListener('click', () => {
    if (isRunning) return;
    isRunning = true;
    displayEl.classList.add('running');
    displayEl.classList.remove('finished');
    intervalId = setInterval(tick, 1000);
  });

  stopBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    isRunning = false;
    displayEl.classList.remove('running');
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    isRunning = false;
    const mins = parseInt(minInput.value, 10);
    if (mins > 0 && mins <= 120) {
      totalSeconds = mins * 60;
      localStorage.setItem('timerMinutes', mins);
    }
    remaining = totalSeconds;
    displayEl.classList.remove('running', 'finished');
    render();
  });

  minInput.addEventListener('change', () => {
    if (isRunning) return;
    const mins = parseInt(minInput.value, 10);
    if (mins > 0 && mins <= 120) {
      totalSeconds = mins * 60;
      remaining    = totalSeconds;
      localStorage.setItem('timerMinutes', mins);
      render();
    }
  });

  function tick() {
    if (remaining <= 0) {
      clearInterval(intervalId);
      isRunning = false;
      displayEl.classList.remove('running');
      displayEl.classList.add('finished');
      labelEl.textContent = '🎉 Session complete!';
      showToast('⏰ Focus session complete!', 'success');
      return;
    }
    remaining--;
    render();
  }

  function render() {
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    displayEl.textContent = `${m}:${s}`;

    const pct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
    progressBar.style.width = `${pct}%`;

    if (!displayEl.classList.contains('finished')) {
      const totalMin = Math.round(totalSeconds / 60);
      labelEl.textContent = isRunning ? '⏳ Focus session in progress…' : `${totalMin}-minute focus session`;
    }
  }
})();

/* ================================================================
   4. TO-DO LIST  (add, edit, done, delete, localStorage, prevent duplicates, sort — Challenges)
   ================================================================ */
(function initTodo() {
  const input      = qs('#todoInput');
  const addBtn     = qs('#todoAdd');
  const listEl     = qs('#todoList');
  const countEl    = qs('#todoCount');
  const sortSel    = qs('#todoSort');
  const dupWarn    = qs('#dupWarning');

  let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  // Migrate old format if needed
  tasks = tasks.map(t => typeof t === 'string'
    ? { id: Date.now() + Math.random(), text: t, done: false, createdAt: Date.now() }
    : t
  );

  render();

  addBtn.addEventListener('click', addTask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  input.addEventListener('input', () => {
    const dup = isDuplicate(input.value.trim());
    dupWarn.classList.toggle('show', dup && input.value.trim() !== '');
  });

  sortSel.addEventListener('change', render);

  function isDuplicate(text) {
    if (!text) return false;
    return tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  }

  function addTask() {
    const text = input.value.trim();
    if (!text) return;
    if (isDuplicate(text)) {
      dupWarn.classList.add('show');
      showToast('⚠️ Task already exists!', 'warning');
      return;
    }
    tasks.push({ id: Date.now(), text, done: false, createdAt: Date.now() });
    save();
    render();
    input.value = '';
    dupWarn.classList.remove('show');
    showToast('Task added!', 'success');
  }

  function toggleDone(id) {
    const t = tasks.find(t => t.id === id);
    if (t) { t.done = !t.done; save(); render(); }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
    showToast('Task removed.');
  }

  function startEdit(id) {
    const item = qs(`[data-id="${id}"]`);
    if (!item) return;
    const t    = tasks.find(t => t.id === id);
    const span = item.querySelector('.todo-text');
    const inp  = document.createElement('input');
    inp.className = 'todo-edit-input';
    inp.value     = t.text;
    span.replaceWith(inp);
    inp.focus();

    const saveEdit = () => {
      const newText = inp.value.trim();
      if (!newText) { render(); return; }
      // Prevent duplicate on edit (allow keeping same text)
      if (newText.toLowerCase() !== t.text.toLowerCase() && isDuplicate(newText)) {
        showToast('⚠️ Another task with this name exists!', 'warning');
        inp.focus();
        return;
      }
      t.text = newText;
      save();
      render();
      showToast('Task updated!', 'success');
    };

    inp.addEventListener('blur', saveEdit);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { inp.blur(); }
      if (e.key === 'Escape') { render(); }
    });

    // Swap edit icon to save icon
    const editBtn = item.querySelector('.btn-icon.edit');
    if (editBtn) {
      editBtn.textContent = '💾';
      editBtn.classList.replace('edit', 'save');
      editBtn.onclick = () => inp.blur();
    }
  }

  function getSorted() {
    const mode = sortSel.value;
    const copy = [...tasks];
    if      (mode === 'az')      copy.sort((a, b) => a.text.localeCompare(b.text));
    else if (mode === 'za')      copy.sort((a, b) => b.text.localeCompare(a.text));
    else if (mode === 'done')    copy.sort((a, b) => a.done - b.done);
    else if (mode === 'undone')  copy.sort((a, b) => b.done - a.done);
    // default: newest first
    else copy.sort((a, b) => b.createdAt - a.createdAt);
    return copy;
  }

  function render() {
    listEl.innerHTML = '';
    const sorted  = getSorted();
    const done    = tasks.filter(t => t.done).length;
    countEl.textContent = `${done}/${tasks.length} done`;

    if (tasks.length === 0) {
      listEl.innerHTML = '<li class="empty-state">No tasks yet. Add one above! ✨</li>';
      return;
    }

    sorted.forEach(t => {
      const li = document.createElement('li');
      li.className = `todo-item${t.done ? ' done' : ''}`;
      li.dataset.id = t.id;
      li.innerHTML = `
        <div class="todo-check" data-action="check"></div>
        <span class="todo-text">${escapeHtml(t.text)}</span>
        <div class="todo-item-actions">
          <button class="btn-icon edit" data-action="edit" title="Edit">✏️</button>
          <button class="btn-icon del"  data-action="del"  title="Delete">🗑️</button>
        </div>`;

      li.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset?.action;
        if (action === 'check') toggleDone(t.id);
        if (action === 'edit')  startEdit(t.id);
        if (action === 'del')   deleteTask(t.id);
      });

      listEl.appendChild(li);
    });
  }

  function save() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();

/* ================================================================
   5. QUICK LINKS
   ================================================================ */
(function initLinks() {
  const nameInput = qs('#linkName');
  const urlInput  = qs('#linkUrl');
  const addBtn    = qs('#linkAdd');
  const grid      = qs('#linksGrid');

  let links = JSON.parse(localStorage.getItem('quickLinks') || '[]');
  // Default links for first-time users
  if (links.length === 0) {
    links = [
      { id: 1, name: 'GitHub',  url: 'https://github.com' },
      { id: 2, name: 'YouTube', url: 'https://youtube.com' },
      { id: 3, name: 'Google',  url: 'https://google.com' },
    ];
    save();
  }
  render();

  addBtn.addEventListener('click', addLink);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

  function addLink() {
    let url  = urlInput.value.trim();
    const nm = nameInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    links.push({ id: Date.now(), name: nm || hostnameOf(url), url });
    save();
    render();
    nameInput.value = '';
    urlInput.value  = '';
    showToast('Link added!', 'success');
  }

  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    save();
    render();
    showToast('Link removed.');
  }

  function hostnameOf(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  }

  function faviconUrl(url) {
    try { const { origin } = new URL(url); return `${origin}/favicon.ico`; }
    catch { return ''; }
  }

  function render() {
    grid.innerHTML = '';
    if (links.length === 0) {
      grid.innerHTML = '<span class="links-empty">No links yet. Add one above!</span>';
      return;
    }
    links.forEach(link => {
      const chip = document.createElement('span');
      chip.className = 'link-chip';

      const fav = document.createElement('img');
      fav.className = 'favicon';
      fav.src   = faviconUrl(link.url);
      fav.alt   = '';
      fav.onerror = () => fav.remove();

      const lbl = document.createElement('span');
      lbl.textContent = link.name;

      const anchor = document.createElement('a');
      anchor.href   = link.url;
      anchor.target = '_blank';
      anchor.rel    = 'noopener noreferrer';
      anchor.style.cssText = 'display:contents; color:inherit; text-decoration:none;';
      anchor.appendChild(fav);
      anchor.appendChild(lbl);

      const del = document.createElement('button');
      del.className = 'del-link';
      del.textContent = '✕';
      del.title = 'Remove';
      del.addEventListener('click', e => { e.stopPropagation(); deleteLink(link.id); });

      chip.appendChild(anchor);
      chip.appendChild(del);
      grid.appendChild(chip);
    });
  }

  function save() {
    localStorage.setItem('quickLinks', JSON.stringify(links));
  }
})();
