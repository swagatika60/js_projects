/**
 * TaskFlow — structured To-Do app
 * Sections: Config · Storage · Dates · Render · Reminders · Events · Init
 */

/* ========== Config ========== */
const STORAGE_KEY = 'todos-v2';
const STORAGE_KEY_LEGACY = 'todos-v1';
const REMINDER_CHECK_MS = 30_000;

const REMINDER_BLOCKS = [
  { id: 'overdue', title: 'Overdue', modifier: 'overdue' },
  { id: 'today', title: 'Today', modifier: 'today' },
  { id: 'upcoming', title: 'Upcoming', modifier: 'upcoming' },
];

/* ========== DOM ========== */
const dom = {
  addForm: document.getElementById('add-form'),
  search: document.getElementById('search-input'),
  reminderBlocks: document.getElementById('reminder-blocks'),
  regularBlock: document.getElementById('regular-block'),
  clearCompleted: document.getElementById('clear-completed'),
  saveStatus: document.getElementById('save-status'),
  saveNow: document.getElementById('save-now'),
  exportBtn: document.getElementById('export-data'),
  importInput: document.getElementById('import-data'),
  enableNotify: document.getElementById('enable-notify'),
  toast: document.getElementById('toast'),
  statActive: document.getElementById('stat-active'),
  statDone: document.getElementById('stat-done'),
  statReminders: document.getElementById('stat-reminders'),
  statOverdue: document.getElementById('stat-overdue'),
};

/* ========== State ========== */
let todos = loadTodos();
let lastSavedAt = null;

/* ========== Storage ========== */
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeTodo(raw) {
  return {
    id: raw.id || uid(),
    text: String(raw.text || '').trim(),
    done: Boolean(raw.done),
    remindAt: raw.remindAt || null,
    notified: Boolean(raw.notified),
  };
}

function migrateLegacy(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((t) =>
      normalizeTodo({ ...t, remindAt: null, notified: false })
    );
  } catch {
    return null;
  }
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeTodo).filter((t) => t.text);
      }
    }
  } catch {
    /* ignore */
  }

  const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacy) {
    const migrated = migrateLegacy(legacy);
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      return migrated;
    }
  }

  return [
    { id: uid(), text: 'play mariokart', done: false, remindAt: null, notified: false },
    { id: uid(), text: 'defeat ganon in zelda', done: false, remindAt: null, notified: false },
    { id: uid(), text: 'make a veggie pie', done: false, remindAt: null, notified: false },
  ];
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  lastSavedAt = new Date();
  updateSaveStatus();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(todos, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded');
  updateSaveStatus(true);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      todos = parsed.map(normalizeTodo).filter((t) => t.text);
      saveTodos();
      render();
      showToast(`Imported ${todos.length} task(s)`);
    } catch {
      showToast('Import failed — use a valid backup file', true);
    }
    dom.importInput.value = '';
  };
  reader.readAsText(file);
}

/* ========== Dates ========== */
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getReminderBucket(todo) {
  if (!todo.remindAt || todo.done) return 'regular';
  const at = new Date(todo.remindAt);
  if (Number.isNaN(at.getTime())) return 'regular';
  const now = new Date();
  if (at < now) return 'overdue';
  if (at >= startOfDay(now) && at <= endOfDay(now)) return 'today';
  return 'upcoming';
}

function formatRemindAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function parseDatetimeInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ========== UI helpers ========== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, isError = false) {
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  dom.toast.classList.add('is-visible');
  dom.toast.style.borderColor = isError ? 'var(--danger)' : '';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    dom.toast.classList.remove('is-visible');
    setTimeout(() => {
      dom.toast.hidden = true;
    }, 300);
  }, 2800);
}

function updateSaveStatus(flash = false) {
  if (!lastSavedAt && localStorage.getItem(STORAGE_KEY)) {
    lastSavedAt = new Date();
  }
  const time = lastSavedAt
    ? lastSavedAt.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
  dom.saveStatus.textContent = `Saved locally · ${time}`;
  dom.saveStatus.classList.toggle('save-flash', flash);
  if (flash) {
    setTimeout(() => dom.saveStatus.classList.remove('save-flash'), 600);
  }
}

function updateStats(grouped) {
  const active = todos.filter((t) => !t.done).length;
  const done = todos.filter((t) => t.done).length;
  const reminders = todos.filter((t) => t.remindAt && !t.done).length;
  const overdue = grouped.overdue.length;

  dom.statActive.textContent = active;
  dom.statDone.textContent = done;
  dom.statReminders.textContent = reminders;
  dom.statOverdue.textContent = overdue;
  dom.clearCompleted.disabled = done === 0;
}

function matchesSearch(todo, term) {
  return !term || todo.text.toLowerCase().includes(term);
}

/* ========== Render ========== */
function renderTaskCard(todo, term) {
  const hidden = matchesSearch(todo, term) ? '' : ' filtered';
  const bucket = getReminderBucket(todo);
  const metaClass =
    bucket === 'overdue'
      ? 'task-card__meta--overdue'
      : bucket === 'today'
        ? 'task-card__meta--today'
        : bucket === 'upcoming'
          ? 'task-card__meta--upcoming'
          : '';

  const remindValue = todo.remindAt
    ? new Date(todo.remindAt).toISOString().slice(0, 16)
    : '';

  const meta = todo.remindAt
    ? `<p class="task-card__meta ${metaClass}">⏰ ${escapeHtml(formatRemindAt(todo.remindAt))}</p>`
    : '';

  return `<article class="task-card${hidden}" data-id="${todo.id}">
    <input type="checkbox" class="task-card__check toggle-done" ${todo.done ? 'checked' : ''} aria-label="Mark complete">
    <div class="task-card__body">
      <p class="task-card__title ${todo.done ? 'is-done' : ''}">${escapeHtml(todo.text)}</p>
      ${meta}
    </div>
    <div class="task-card__actions">
      <input type="datetime-local" class="input task-card__remind-input edit-remind" value="${remindValue}" aria-label="Edit reminder" title="Set reminder">
      ${todo.remindAt ? '<button type="button" class="btn btn--ghost btn--sm clear-remind">Clear</button>' : ''}
      <button type="button" class="btn btn--icon delete-btn" aria-label="Delete">×</button>
    </div>
  </article>`;
}

function renderReminderBlocks(grouped, term) {
  dom.reminderBlocks.innerHTML = REMINDER_BLOCKS.map((block) => {
    const items = grouped[block.id];
    const visible = term
      ? items.filter((t) => matchesSearch(t, term)).length
      : items.length;
    const cards = items.map((t) => renderTaskCard(t, term)).join('');

    return `<div class="task-block task-block--${block.modifier}" data-block="${block.id}">
      <header class="task-block-header">
        <h3 class="task-block-title">${block.title}</h3>
        <span class="task-block-badge">${visible}</span>
      </header>
      <div class="task-block-body">
        ${cards || '<p class="task-block-empty">No tasks</p>'}
      </div>
    </div>`;
  }).join('');
}

function renderRegularBlock(grouped, term) {
  const items = grouped.regular;
  const cards = items.map((t) => renderTaskCard(t, term)).join('');
  dom.regularBlock.innerHTML =
    cards || '<p class="task-block-empty">No general tasks — add one above</p>';
}

function render() {
  const term = dom.search.value.trim().toLowerCase();
  const grouped = { overdue: [], today: [], upcoming: [], regular: [] };

  todos.forEach((todo) => {
    grouped[getReminderBucket(todo)].push(todo);
  });

  renderReminderBlocks(grouped, term);
  renderRegularBlock(grouped, term);
  updateStats(grouped);
}

/* ========== Reminders ========== */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser', true);
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    dom.enableNotify.textContent = 'Reminders enabled';
    dom.enableNotify.disabled = true;
    new Notification('TaskFlow', {
      body: 'You will be alerted when reminders are due.',
    });
    showToast('Notifications enabled');
  } else if (permission === 'denied') {
    showToast('Notifications blocked in browser settings', true);
  }
}

function fireReminder(todo) {
  const body = todo.text;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('TaskFlow reminder', { body });
  }
}

function checkReminders() {
  const now = new Date();
  let changed = false;

  todos.forEach((todo) => {
    if (todo.done || !todo.remindAt || todo.notified) return;
    const at = new Date(todo.remindAt);
    if (Number.isNaN(at.getTime()) || at > now) return;
    fireReminder(todo);
    todo.notified = true;
    changed = true;
  });

  if (changed) {
    saveTodos();
    render();
  }
}

/* ========== Task actions ========== */
function addTodo(text, remindAt) {
  todos.push({
    id: uid(),
    text,
    done: false,
    remindAt,
    notified: false,
  });
  saveTodos();
  render();
  showToast('Task added');
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function toggleTodo(id, done) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = done;
  if (done) todo.notified = true;
  saveTodos();
  render();
}

function setReminder(id, isoOrNull) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.remindAt = isoOrNull;
  todo.notified = false;
  saveTodos();
  render();
}

function clearCompleted() {
  const count = todos.filter((t) => t.done).length;
  todos = todos.filter((t) => !t.done);
  saveTodos();
  render();
  showToast(`Removed ${count} completed task(s)`);
}

/* ========== Events ========== */
function bindEvents() {
  dom.addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = dom.addForm.add.value.trim();
    if (!text) return;
    const remindAt = parseDatetimeInput(dom.addForm.remindAt.value);
    addTodo(text, remindAt);
    dom.addForm.reset();
  });

  const handleListClick = (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.classList.contains('delete-btn')) {
      deleteTodo(id);
      return;
    }
    if (e.target.classList.contains('toggle-done')) {
      toggleTodo(id, e.target.checked);
      return;
    }
    if (e.target.classList.contains('clear-remind')) {
      setReminder(id, null);
    }
  };

  const handleListChange = (e) => {
    if (!e.target.classList.contains('edit-remind')) return;
    const card = e.target.closest('.task-card');
    if (!card) return;
    setReminder(card.dataset.id, parseDatetimeInput(e.target.value));
  };

  dom.reminderBlocks.addEventListener('click', handleListClick);
  dom.reminderBlocks.addEventListener('change', handleListChange);
  dom.regularBlock.addEventListener('click', handleListClick);
  dom.regularBlock.addEventListener('change', handleListChange);

  dom.clearCompleted.addEventListener('click', clearCompleted);
  dom.search.addEventListener('input', render);
  dom.saveNow.addEventListener('click', () => {
    saveTodos();
    updateSaveStatus(true);
    showToast('Saved to browser storage');
  });
  dom.exportBtn.addEventListener('click', exportBackup);
  dom.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importBackup(file);
  });
  dom.enableNotify.addEventListener('click', requestNotificationPermission);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkReminders();
  });
}

/* ========== Init ========== */
function init() {
  if ('Notification' in window && Notification.permission === 'granted') {
    dom.enableNotify.textContent = 'Reminders enabled';
    dom.enableNotify.disabled = true;
  }

  bindEvents();
  saveTodos();
  render();
  setInterval(checkReminders, REMINDER_CHECK_MS);
  checkReminders();
}

init();