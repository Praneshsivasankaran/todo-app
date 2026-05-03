import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  Check, Plus, Search, Home, Calendar as CalIcon, Flame,
  ChevronLeft, ChevronRight, Trash2, X, User as UserIcon,
  BookOpen, Film, Gamepad2, Layers, Sparkles, Settings,
  Sun, Moon, LogOut, Edit2, TrendingUp, Award, Target, ListChecks,
} from 'lucide-react';

// ───── localStorage wrapper (matches the artifact storage API shape) ──
const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? { value } : null;
    } catch (e) { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return { value }; }
    catch (e) { return null; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return { deleted: true }; }
    catch (e) { return null; }
  },
};

// ───── helpers ──────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const dateToKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dateToKey(new Date());
const keyToDate = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatLong = (key) =>
  keyToDate(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const formatShort = (key) =>
  keyToDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatMonthYear = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const formatTaskDay = (key) => {
  const t = todayKey();
  if (key === t) return 'Today';
  const diff = Math.round((keyToDate(key) - keyToDate(t)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return keyToDate(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['S','M','T','W','T','F','S'];
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ───── theme palettes ──────────────────────────────────────
const LIGHT = {
  pageBg: '#d4ecda',
  pageGlow: 'rgba(155,93,229,0.08)',
  pageHi: 'rgba(255,255,255,0.7)',
  surface: '#ffffff',
  surfaceAlt: '#f4faf6',
  surfaceAlt2: '#eaf5ee',
  border: '#e1ede5',
  borderHi: '#c5dccd',
  text: '#1a1f36',
  textMid: '#3d4866',
  dim: '#7a8499',
  faint: '#b8c2d4',
  primary: '#10b981',
  primaryLight: '#d1fae5',
  primaryGrad: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  danger: '#ef476f',
  success: '#06b884',
  shadow: '0 8px 32px rgba(16, 185, 129, 0.12)',
  shadowSoft: '0 1px 3px rgba(15, 23, 42, 0.04)',
  watermark: 'rgba(255,255,255,0.5)',
  overlay: 'rgba(15, 23, 42, 0.45)',
  taskColors: [
    { bg: '#d1fae5', fg: '#10b981' },
    { bg: '#fde4ec', fg: '#ef476f' },
    { bg: '#f1e3fb', fg: '#9b5de5' },
    { bg: '#fff0dc', fg: '#f0883e' },
    { bg: '#e0f2fe', fg: '#0ea5e9' },
  ],
  heatStops: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

const DARK = {
  pageBg: '#000000',
  pageGlow: 'rgba(255, 122, 61, 0.04)',
  pageHi: 'rgba(52, 211, 153, 0.04)',
  surface: '#000000',
  surfaceAlt: '#0a0a0b',
  surfaceAlt2: '#121214',
  border: '#1f1f22',
  borderHi: '#2e2e32',
  text: '#f2f2f4',
  textMid: '#c8c8cc',
  dim: '#7c7c82',
  faint: '#48484c',
  primary: '#34d399',
  primaryLight: '#0f2e22',
  primaryGrad: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  danger: '#ff4d6d',
  success: '#34d399',
  shadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  shadowSoft: '0 1px 3px rgba(0, 0, 0, 0.4)',
  watermark: 'rgba(255,255,255,0.025)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  taskColors: [
    { bg: '#0f2e22', fg: '#34d399' },
    { bg: '#3a1620', fg: '#ff4d6d' },
    { bg: '#291a3a', fg: '#b885ee' },
    { bg: '#3a2410', fg: '#ff9d4a' },
    { bg: '#0f2030', fg: '#38bdf8' },
  ],
  heatStops: ['#15151a', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

const TASK_ICONS = [Layers, BookOpen, Film, Gamepad2, Sparkles];

const colorFor = (str, T) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const idx = h % T.taskColors.length;
  return { ...T.taskColors[idx], Icon: TASK_ICONS[idx] };
};

const heatColor = (count, isFuture, T) => {
  if (isFuture) return 'transparent';
  if (count === 0) return T.heatStops[0];
  if (count === 1) return T.heatStops[1];
  if (count <= 3) return T.heatStops[2];
  if (count <= 5) return T.heatStops[3];
  return T.heatStops[4];
};

// ───── Theme Context ──────────────────────────────────────
const ThemeCtx = createContext(LIGHT);
const useT = () => useContext(ThemeCtx);

// ═════════════════════════════════════════════════════════
//   ROOT
// ═════════════════════════════════════════════════════════
export default function TodoApp() {
  const [username, setUsername] = useState(null);
  const [memberSince, setMemberSince] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const T = isDark ? DARK : LIGHT;

  // load persisted state
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const u = await storage.get('todo-user-v3');
        if (on && u?.value) {
          const p = JSON.parse(u.value);
          setUsername(p.name || null);
          setMemberSince(p.memberSince || null);
        }
      } catch (e) { /* first run */ }
      try {
        const th = await storage.get('todo-theme-v3');
        if (on && th?.value === 'dark') setIsDark(true);
      } catch (e) {}
      try {
        const t = await storage.get('todo-tasks-v3');
        if (on && t?.value) setTasks(JSON.parse(t.value));
      } catch (e) {}
      if (on) setLoaded(true);
    })();
    return () => { on = false; };
  }, []);

  // inject fonts + custom CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      .tdo-root *, .tdo-root *::before, .tdo-root *::after {
        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      }
      .tdo-root { -webkit-font-smoothing: antialiased; }

      .tdo-tap { transition: transform 0.1s, background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s; }
      .tdo-tap:active { transform: scale(0.97); }

      .tdo-input::placeholder { color: var(--tdo-faint); }
      .tdo-input:focus { outline: none; }

      .tdo-row { transition: background 0.15s, border-color 0.15s; }
      .tdo-row:hover .tdo-del { opacity: 1; }
      .tdo-del { opacity: 0; transition: opacity 0.15s, color 0.15s; }

      .tdo-cal-cell { transition: all 0.15s; }
      .tdo-cal-cell:hover { transform: scale(1.05); }

      .tdo-heat-cell { transition: transform 0.15s; }
      .tdo-heat-cell:hover { transform: scale(1.7); z-index: 5; position: relative; }

      .tdo-create-btn { transition: all 0.18s; }
      .tdo-create-btn:active { transform: scale(0.98); }

      .tdo-fade { animation: tdoFade 0.25s ease-out; }
      @keyframes tdoFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .tdo-pop { animation: tdoPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes tdoPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      .tdo-overlay { animation: tdoOverlay 0.2s ease-out; }
      @keyframes tdoOverlay { from { opacity: 0; } to { opacity: 1; } }

      .tdo-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
      .tdo-scroll::-webkit-scrollbar-thumb { background: var(--tdo-border-hi); border-radius: 3px; }
      .tdo-scroll::-webkit-scrollbar-track { background: transparent; }

      .tdo-watermark {
        position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%);
        font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800;
        font-size: clamp(14vh, 22vh, 320px); color: var(--tdo-watermark);
        letter-spacing: -0.04em; pointer-events: none; user-select: none; z-index: 0;
      }
      @media (max-width: 640px) { .tdo-watermark { display: none; } }

      .tdo-toggle-track { transition: background 0.2s; }
      .tdo-toggle-thumb { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }

      .tdo-checkbox { position: relative; }
      .tdo-check-icon { animation: tdoCheckIn 0.45s cubic-bezier(0.34, 1.6, 0.64, 1); }
      @keyframes tdoCheckIn {
        0%   { transform: scale(0) rotate(-25deg); }
        60%  { transform: scale(1.5) rotate(0deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      .tdo-check-burst { animation: tdoBoxPulse 0.5s ease-out; }
      @keyframes tdoBoxPulse {
        0%   { transform: scale(1); }
        25%  { transform: scale(0.85); }
        55%  { transform: scale(1.18); }
        100% { transform: scale(1); }
      }
      .tdo-ring {
        position: absolute; inset: -5px; border-radius: 12px;
        border: 2px solid currentColor;
        pointer-events: none;
        animation: tdoRing 0.55s ease-out forwards;
      }
      @keyframes tdoRing {
        0%   { transform: scale(0.6); opacity: 0.85; }
        100% { transform: scale(2);   opacity: 0; }
      }
      .tdo-spark {
        position: absolute;
        width: 4px; height: 4px; border-radius: 50%;
        top: 50%; left: 50%;
        pointer-events: none;
        animation: tdoSpark 0.6s ease-out forwards;
      }
      @keyframes tdoSpark {
        0%   { transform: translate(-50%, -50%) rotate(var(--a)) translateY(0)     scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) rotate(var(--a)) translateY(-22px) scale(0); opacity: 0; }
      }
      .tdo-row-flash { animation: tdoRowFlash 0.6s ease-out; }
      @keyframes tdoRowFlash {
        0%   { background-color: var(--tdo-flash); }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      try { document.head.removeChild(link); } catch (e) {}
      try { document.head.removeChild(style); } catch (e) {}
    };
  }, []);

  const handleLogin = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ts = new Date().toISOString();
    setUsername(trimmed);
    setMemberSince(ts);
    try {
      await storage.set('todo-user-v3', JSON.stringify({ name: trimmed, memberSince: ts }));
    } catch (e) { console.error(e); }
  };

  const handleUpdateUsername = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    try {
      await storage.set('todo-user-v3', JSON.stringify({ name: trimmed, memberSince }));
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    setUsername(null);
    setMemberSince(null);
    try { await storage.delete('todo-user-v3'); } catch (e) {}
  };

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try { await storage.set('todo-theme-v3', next ? 'dark' : 'light'); }
    catch (e) {}
  };

  // CSS vars on root
  const cssVars = {
    '--tdo-faint': T.faint,
    '--tdo-border-hi': T.borderHi,
    '--tdo-watermark': T.watermark,
    '--tdo-flash': T.primaryLight,
  };

  if (!loaded) {
    return (
      <ThemeCtx.Provider value={T}>
        <div
          className="tdo-root w-full min-h-screen flex items-center justify-center"
          style={{ background: T.pageBg, color: T.dim, fontSize: 14, ...cssVars }}
        >
          Loading…
        </div>
      </ThemeCtx.Provider>
    );
  }

  return (
    <ThemeCtx.Provider value={T}>
      <div
        className="tdo-root w-full min-h-screen flex items-stretch sm:items-center justify-center relative"
        style={{
          background: T.pageBg,
          backgroundImage: `radial-gradient(circle at 15% 10%, ${T.pageHi}, transparent 60%), radial-gradient(circle at 90% 90%, ${T.pageGlow}, transparent 50%)`,
          ...cssVars,
        }}
      >
        <div className="tdo-watermark">DoNow</div>

        {/* phone card */}
        <div
          className="relative w-full sm:max-w-[420px] sm:my-8 sm:rounded-[36px] flex flex-col overflow-hidden"
          style={{
            background: T.surface,
            boxShadow: T.shadow,
            height: '100vh',
            maxHeight: '100vh',
            zIndex: 1,
          }}
        >
          {!username ? (
            <LoginScreen onLogin={handleLogin} />
          ) : (
            <MainApp
              username={username}
              memberSince={memberSince}
              tasks={tasks}
              setTasks={setTasks}
              isDark={isDark}
              toggleTheme={toggleTheme}
              onUpdateUsername={handleUpdateUsername}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

// ═════════════════════════════════════════════════════════
//   LOGIN SCREEN
// ═════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const T = useT();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = name.trim().length > 0;

  const submit = () => {
    setTouched(true);
    if (valid) onLogin(name);
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-14 pb-8 tdo-fade">
      <div className="flex-1 flex flex-col justify-center">
        {/* logo mark */}
        <div className="flex items-center gap-2 mb-10">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: T.primaryGrad }}
          >
            <ListChecks size={22} color="#fff" strokeWidth={2.25} />
          </div>
          <div>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
              todo
            </div>
            <div style={{ color: T.dim, fontSize: 11, fontWeight: 500 }}>
              your daily logbook
            </div>
          </div>
        </div>

        <h1 style={{ color: T.text, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Welcome.
        </h1>
        <p style={{ color: T.dim, fontSize: 15, fontWeight: 500, marginTop: 6, lineHeight: 1.5 }}>
          What should we call you?
        </p>

        <div className="mt-7">
          <label style={{ color: T.dim, fontSize: 11, fontWeight: 700 }} className="uppercase tracking-wider">
            Username
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Enter your name"
            className="tdo-input w-full mt-2 px-4 py-3.5 rounded-xl"
            style={{
              background: T.surfaceAlt,
              border: `1.5px solid ${touched && !valid ? T.danger : T.border}`,
              color: T.text,
              fontSize: 15,
              fontWeight: 500,
            }}
          />
          {touched && !valid && (
            <div style={{ color: T.danger, fontSize: 12, fontWeight: 500 }} className="mt-1.5">
              Please enter a name to continue.
            </div>
          )}
        </div>

        <button
          onClick={submit}
          className="tdo-tap w-full mt-6 py-3.5 rounded-xl"
          style={{
            background: T.primaryGrad,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.28)',
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//   MAIN APP (logged in)
// ═════════════════════════════════════════════════════════
function MainApp({ username, memberSince, tasks, setTasks, isDark, toggleTheme, onUpdateUsername, onLogout }) {
  const T = useT();
  const [tab, setTab] = useState('today');
  const [newTaskText, setNewTaskText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState(todayKey());
  const [addPickerMonth, setAddPickerMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showEditName, setShowEditName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(username);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const persist = async (next) => {
    setTasks(next);
    try { await storage.set('todo-tasks-v3', JSON.stringify(next)); }
    catch (e) { console.error(e); }
  };

  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 1800);
  };

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const t = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      date: addDate,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    persist([...tasks, t]);
    setNewTaskText('');
    setShowDatePicker(false);
    setShowAdd(false);
  };

  const openAdd = () => {
    const today = todayKey();
    const initial = (tab === 'calendar' && selectedDate >= today) ? selectedDate : today;
    setAddDate(initial);
    const d = keyToDate(initial);
    setAddPickerMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setShowDatePicker(false);
    setNewTaskText('');
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setShowDatePicker(false);
    setNewTaskText('');
  };

  const toggleTask = (id) => {
    persist(tasks.map(t => t.id === id ? {
      ...t,
      completed: !t.completed,
      completedAt: !t.completed ? new Date().toISOString() : null,
    } : t));
  };

  const deleteTask = (id) => {
    const t = tasks.find(x => x.id === id);
    persist(tasks.filter(x => x.id !== id));
    setConfirmDelete(null);
    flashSuccess(`Deleted "${t?.text || 'task'}"`);
  };

  // ── derived ──────────────────────────────────────────────
  const todaysTasks = useMemo(() => {
    return tasks.filter(t => t.date === todayKey())
      .filter(t => !searchTerm || t.text.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.createdAt.localeCompare(b.createdAt));
  }, [tasks, searchTerm]);

  const upcomingTasks = useMemo(() => {
    const today = todayKey();
    return tasks.filter(t => t.date > today)
      .filter(t => !searchTerm || t.text.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  }, [tasks, searchTerm]);

  const todayDoneCount = tasks.filter(t => t.date === todayKey() && t.completed).length;
  const todayTotalCount = tasks.filter(t => t.date === todayKey()).length;

  const calendarCells = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) {
      const key = dateToKey(new Date(y, m, d));
      const dayTasks = tasks.filter(t => t.date === key);
      cells.push({
        day: d, key,
        total: dayTasks.length,
        done: dayTasks.filter(t => t.completed).length,
      });
    }
    return cells;
  }, [calMonth, tasks]);

  const selectedTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDate)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.createdAt.localeCompare(b.createdAt));
  }, [tasks, selectedDate]);

  const heatmap = useMemo(() => {
    const completedByDay = {};
    tasks.filter(t => t.completed && t.completedAt).forEach(t => {
      const key = dateToKey(new Date(t.completedAt));
      completedByDay[key] = (completedByDay[key] || 0) + 1;
    });
    const today = new Date(); today.setHours(0,0,0,0);
    const cols = 27;
    const totalDays = cols * 7;
    const startOffset = totalDays - 1 - today.getDay();
    const start = new Date(today);
    start.setDate(start.getDate() - startOffset);

    const grid = [];
    const monthLabels = [];
    let lastMonth = -1;
    for (let w = 0; w < cols; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start);
        cur.setDate(cur.getDate() + w * 7 + d);
        const key = dateToKey(cur);
        col.push({
          key,
          count: completedByDay[key] || 0,
          isFuture: cur > today,
          date: cur,
        });
      }
      const top = col[0].date;
      if (top.getMonth() !== lastMonth && top.getDate() <= 7) {
        monthLabels.push({ col: w, label: MONTHS[top.getMonth()] });
        lastMonth = top.getMonth();
      }
      grid.push(col);
    }
    return { grid, monthLabels };
  }, [tasks]);

  const stats = useMemo(() => {
    const completedDays = new Set(
      tasks.filter(t => t.completed && t.completedAt)
        .map(t => dateToKey(new Date(t.completedAt)))
    );
    const today = new Date(); today.setHours(0,0,0,0);

    let current = 0;
    let cur = new Date(today);
    if (!completedDays.has(dateToKey(cur))) cur.setDate(cur.getDate() - 1);
    while (completedDays.has(dateToKey(cur))) {
      current++;
      cur.setDate(cur.getDate() - 1);
    }

    const sorted = [...completedDays].sort();
    let longest = 0, run = 0, prev = null;
    for (const day of sorted) {
      if (prev) {
        const next = keyToDate(prev); next.setDate(next.getDate() + 1);
        run = dateToKey(next) === day ? run + 1 : 1;
      } else run = 1;
      longest = Math.max(longest, run);
      prev = day;
    }

    const completedTasks = tasks.filter(t => t.completed);
    const totalCompleted = completedTasks.length;
    const totalCreated = tasks.length;
    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

    // most productive day-of-week
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    completedTasks.forEach(t => {
      if (t.completedAt) dowCounts[new Date(t.completedAt).getDay()]++;
    });
    const maxDow = dowCounts.indexOf(Math.max(...dowCounts));
    const bestDay = totalCompleted > 0 ? DOW_FULL[maxDow] : '—';

    return {
      currentStreak: current,
      longestStreak: longest,
      totalCompleted,
      totalCreated,
      completionRate,
      activeDays: completedDays.size,
      bestDay,
    };
  }, [tasks]);

  const tabTitle = tab === 'today' ? 'Today' : tab === 'calendar' ? 'Calendar' : tab === 'streak' ? 'Streak' : 'Profile';
  const initial = (username[0] || '?').toUpperCase();

  return (
    <>
      {/* header */}
      <header className="flex items-center justify-center px-5 py-3">
        <h1 style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>{tabTitle}</h1>
      </header>

      {/* main scroll area */}
      <div className="flex-1 overflow-y-auto tdo-scroll px-5 pb-24 tdo-fade" key={tab}>

        {/* ───── TODAY ───── */}
        {tab === 'today' && (
          <>
            <div className="mb-5">
              <div style={{ color: T.dim, fontSize: 13, fontWeight: 500 }}>
                {(() => {
                  const h = new Date().getHours();
                  if (h < 12) return 'Good morning,';
                  if (h < 17) return 'Good afternoon,';
                  return 'Good evening,';
                })()}
              </div>
              <div style={{ color: T.text, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {username} 👋
              </div>
            </div>

            <button
              onClick={() => setTab('streak')}
              className="tdo-tap w-full text-left rounded-2xl p-4 mb-5"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.primaryLight, color: T.primary }}
                  >
                    <Flame size={16} strokeWidth={2.25} />
                  </div>
                  <div>
                    <div style={{ color: T.text, fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
                      {stats.currentStreak}-day streak
                    </div>
                    <div style={{ fontSize: 11.5, color: T.dim, fontWeight: 500, marginTop: 1 }}>
                      {stats.currentStreak === 0
                        ? 'Complete a task to start one'
                        : `Longest: ${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}`}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: T.faint, marginTop: 10, flexShrink: 0 }} />
              </div>

              <div className="flex justify-center" style={{ gap: 3 }}>
                {heatmap.grid.slice(-16).map((col, w) => (
                  <div key={w} className="flex flex-col" style={{ gap: 3 }}>
                    {col.map((cell) => (
                      <div
                        key={cell.key}
                        title={`${cell.count} task${cell.count === 1 ? '' : 's'} · ${formatShort(cell.key)}`}
                        style={{
                          width: 15, height: 15,
                          background: heatColor(cell.count, cell.isFuture, T),
                          borderRadius: 3.5,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </button>

            <div className="flex items-baseline justify-between mb-3">
              <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>Tasks</h2>
              <div style={{ color: T.dim, fontSize: 13, fontWeight: 500 }}>
                <span style={{ color: T.primary, fontWeight: 700 }}>{todayDoneCount}</span>
                <span> / {todayTotalCount} done</span>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
            >
              <Search size={15} style={{ color: T.dim }} strokeWidth={2} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks"
                className="tdo-input flex-1 bg-transparent border-0 text-sm"
                style={{ color: T.text }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ color: T.dim }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mb-3 flex items-baseline gap-2">
              <span style={{ color: T.text, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
              <span style={{ color: T.dim, fontSize: 13, fontWeight: 500 }}>
                · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {todaysTasks.length === 0 ? (
              <EmptyState
                text={searchTerm ? 'No tasks match your search.' : 'No tasks yet for today.'}
                hint={searchTerm ? null : 'Tap the + button to add one.'}
              />
            ) : (
              <ul className="space-y-2">
                {todaysTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggleTask(t.id)}
                    onDelete={() => setConfirmDelete(t)}
                  />
                ))}
              </ul>
            )}

            {upcomingTasks.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-baseline gap-2">
                  <span style={{ color: T.text, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
                    Upcoming
                  </span>
                  <span style={{ color: T.dim, fontSize: 12, fontWeight: 500 }}>
                    · {upcomingTasks.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {upcomingTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => toggleTask(t.id)}
                      onDelete={() => setConfirmDelete(t)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ───── CALENDAR ───── */}
        {tab === 'calendar' && (
          <>
            <div
              className="flex items-center justify-between p-4 rounded-2xl mb-4"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
            >
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="tdo-tap w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: T.surface, color: T.textMid, border: `1px solid ${T.border}` }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>
                  {FULL_MONTHS[calMonth.getMonth()]}
                </div>
                <div style={{ color: T.dim, fontSize: 12 }}>{calMonth.getFullYear()}</div>
              </div>
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="tdo-tap w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: T.surface, color: T.textMid, border: `1px solid ${T.border}` }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DOW.map((d, i) => (
                  <div key={i} style={{ color: T.faint, fontSize: 11, fontWeight: 600 }} className="text-center py-1 uppercase">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((c, i) => {
                  if (!c) return <div key={i} />;
                  const isSel = c.key === selectedDate;
                  const isTd = c.key === todayKey();
                  const allDone = c.total > 0 && c.done === c.total;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(c.key)}
                      className="tdo-cal-cell aspect-square flex flex-col items-center justify-center rounded-xl relative"
                      style={{
                        background: isSel ? T.primary : isTd ? T.primaryLight : T.surface,
                        border: `1px solid ${isSel ? T.primary : isTd ? T.primary : T.border}`,
                        color: isSel ? '#fff' : T.text,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: isSel || isTd ? 700 : 500 }}>{c.day}</div>
                      {c.total > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(Math.min(c.total, 3))].map((_, dotI) => (
                            <div
                              key={dotI}
                              style={{
                                width: 3, height: 3, borderRadius: '50%',
                                background: isSel ? '#fff' : (allDone ? T.success : T.primary),
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div style={{ color: T.dim, fontSize: 11, fontWeight: 600 }} className="uppercase tracking-wider">
                    {selectedDate === todayKey() ? 'Today' : 'Selected'}
                  </div>
                  <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>
                    {formatLong(selectedDate)}
                  </div>
                </div>
                {selectedTasks.length > 0 && (
                  <div style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>
                    {selectedTasks.filter(t => t.completed).length}/{selectedTasks.length}
                  </div>
                )}
              </div>

              {selectedTasks.length === 0 ? (
                <EmptyState text="Nothing scheduled for this day." compact />
              ) : (
                <ul className="space-y-2">
                  {selectedTasks.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      compact
                      onToggle={() => toggleTask(t.id)}
                      onDelete={() => setConfirmDelete(t)}
                    />
                  ))}
                </ul>
              )}

              <button
                onClick={openAdd}
                className="tdo-create-btn w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                style={{
                  background: T.surface,
                  border: `1.5px dashed ${T.borderHi}`,
                  color: T.dim,
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add to {formatShort(selectedDate)}</span>
              </button>
            </div>
          </>
        )}

        {/* ───── STREAK ───── */}
        {tab === 'streak' && (
          <>
            <div
              className="rounded-3xl p-5 mb-5 relative overflow-hidden"
              style={{ background: T.primaryGrad, color: '#fff' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Flame size={14} strokeWidth={2.25} />
                <span style={{ fontSize: 11, fontWeight: 700 }} className="uppercase tracking-wider">Current Streak</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 56, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {stats.currentStreak}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>
                  {stats.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, fontWeight: 500 }}>
                {stats.currentStreak === 0
                  ? 'Complete a task today to start a streak.'
                  : stats.currentStreak === stats.longestStreak && stats.currentStreak > 1
                  ? "You're on your longest streak yet 🔥"
                  : 'Keep it going.'}
              </div>
              <div
                className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <MiniStat label="Longest" value={stats.longestStreak} unit="d" />
              <MiniStat label="Done" value={stats.totalCompleted} unit="" />
              <MiniStat label="Active" value={stats.activeDays} unit="d" />
            </div>

            <div
              className="rounded-2xl p-4 mb-3"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>Activity</div>
                  <div style={{ color: T.dim, fontSize: 11 }}>Last 6 months</div>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ color: T.faint, fontSize: 9, fontWeight: 600 }} className="uppercase">less</span>
                  {T.heatStops.map((c, i) => (
                    <div key={i} style={{ background: c, width: 9, height: 9, borderRadius: 2 }} />
                  ))}
                  <span style={{ color: T.faint, fontSize: 9, fontWeight: 600 }} className="uppercase">more</span>
                </div>
              </div>

              <div className="overflow-x-auto tdo-scroll">
                <div className="inline-block">
                  <div className="flex mb-1.5" style={{ height: 11, marginLeft: 14 }}>
                    {heatmap.grid.map((_, w) => {
                      const lbl = heatmap.monthLabels.find(m => m.col === w);
                      return (
                        <div key={w} style={{ width: 13, color: T.dim, fontSize: 9, fontWeight: 600 }}>
                          {lbl?.label || ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex">
                    <div className="flex flex-col mr-1" style={{ gap: 2 }}>
                      {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                        <div key={i} style={{ height: 11, color: T.dim, fontSize: 9, lineHeight: 1, fontWeight: 600 }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex" style={{ gap: 2 }}>
                      {heatmap.grid.map((col, w) => (
                        <div key={w} className="flex flex-col" style={{ gap: 2 }}>
                          {col.map((cell) => (
                            <div
                              key={cell.key}
                              title={`${cell.count} task${cell.count === 1 ? '' : 's'} · ${formatShort(cell.key)}`}
                              className="tdo-heat-cell"
                              style={{
                                width: 11, height: 11,
                                background: heatColor(cell.count, cell.isFuture, T),
                                borderRadius: 2.5,
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ color: T.dim, fontSize: 11, fontWeight: 500 }} className="text-center px-4 pb-2">
              Each square is one day. Brighter = more tasks completed.
            </div>
          </>
        )}

        {/* ───── USER / PROFILE ───── */}
        {tab === 'user' && (
          <>
            {/* profile header card */}
            <div
              className="rounded-3xl p-5 mb-5 relative overflow-hidden"
              style={{ background: T.primaryGrad, color: '#fff' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.35)',
                    fontSize: 26, fontWeight: 800,
                  }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }} className="truncate">
                    {username}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
                    Member since {memberSince ? formatMonthYear(memberSince) : '—'}
                  </div>
                </div>
              </div>
              <div
                className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)' }}
              />
            </div>

            {/* Stats */}
            <div className="mb-5">
              <SectionLabel>Your Stats</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <BigStat Icon={ListChecks} label="Tasks Created" value={stats.totalCreated} />
                <BigStat Icon={Check} label="Tasks Done" value={stats.totalCompleted} />
                <BigStat Icon={TrendingUp} label="Completion" value={`${stats.completionRate}%`} />
                <BigStat Icon={Target} label="Active Days" value={stats.activeDays} />
                <BigStat Icon={Flame} label="Current" value={stats.currentStreak} suffix="d" highlight />
                <BigStat Icon={Award} label="Longest" value={stats.longestStreak} suffix="d" />
              </div>
              <div
                className="mt-2 rounded-2xl p-3 flex items-center gap-3"
                style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.primaryLight, color: T.primary }}
                >
                  <CalIcon size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: T.dim, fontSize: 11, fontWeight: 600 }} className="uppercase tracking-wider">
                    Most Productive Day
                  </div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>
                    {stats.bestDay}
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="mb-3">
              <SectionLabel>Settings</SectionLabel>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
              >
                {/* theme toggle */}
                <SettingRow
                  Icon={isDark ? Moon : Sun}
                  iconBg={isDark ? '#291a3a' : '#fff0dc'}
                  iconFg={isDark ? '#b885ee' : '#f0883e'}
                  label="Theme"
                  description={isDark ? 'Dark mode' : 'Light mode'}
                  rightSlot={<Toggle on={isDark} onChange={toggleTheme} />}
                  divider
                />
                {/* edit name */}
                <SettingRow
                  Icon={Edit2}
                  iconBg={T.primaryLight}
                  iconFg={T.primary}
                  label="Username"
                  description={username}
                  onClick={() => { setEditNameVal(username); setShowEditName(true); }}
                  divider
                />
                {/* logout */}
                <SettingRow
                  Icon={LogOut}
                  iconBg={isDark ? '#3a1620' : '#fde4ec'}
                  iconFg={T.danger}
                  label="Log Out"
                  description="Reset your profile on this device"
                  onClick={() => setConfirmLogout(true)}
                  destructive
                />
              </div>
            </div>

            <div style={{ color: T.faint, fontSize: 11, fontWeight: 500 }} className="text-center mt-2 pb-2">
              All data stays on this device.
            </div>
          </>
        )}
      </div>

      {/* ───── FLOATING ADD BUTTON ───── */}
      {(tab === 'today' || tab === 'calendar') && (
        <button
          onClick={openAdd}
          className="tdo-tap absolute flex items-center justify-center"
          style={{
            right: 18,
            bottom: 84,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: T.primaryGrad,
            color: '#fff',
            boxShadow: '0 10px 28px rgba(16, 185, 129, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 30,
            border: 'none',
          }}
          aria-label="Add task"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* ───── BOTTOM NAV ───── */}
      <nav
        className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-3 py-3"
        style={{
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <NavBtn id="today" label="Today" Icon={Home} active={tab === 'today'} onClick={setTab} />
        <NavBtn id="calendar" label="Calendar" Icon={CalIcon} active={tab === 'calendar'} onClick={setTab} />
        <NavBtn id="streak" label="Streak" Icon={Flame} active={tab === 'streak'} onClick={setTab} />
        <NavBtn id="user" label="Profile" Icon={UserIcon} active={tab === 'user'} onClick={setTab} />
      </nav>

      {/* ───── ADD TASK MODAL ───── */}
      {showAdd && (
        <Modal onClose={closeAdd}>
          <div className="mb-3" style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>
            New Task
          </div>
          <input
            autoFocus
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showDatePicker) addTask();
              if (e.key === 'Escape') closeAdd();
            }}
            placeholder="What's the task?"
            className="tdo-input w-full px-4 py-3 rounded-xl mb-3"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.text, fontSize: 15 }}
          />

          {/* date selector */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setAddDate(todayKey()); setShowDatePicker(false); }}
              className="tdo-tap px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{
                background: addDate === todayKey() ? T.primaryLight : T.surfaceAlt,
                color: addDate === todayKey() ? T.primary : T.textMid,
                border: `1px solid ${addDate === todayKey() ? T.primary : T.border}`,
                fontSize: 13, fontWeight: 600,
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setShowDatePicker(s => !s)}
              className="tdo-tap px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{
                background: addDate !== todayKey() ? T.primaryLight : T.surfaceAlt,
                color: addDate !== todayKey() ? T.primary : T.textMid,
                border: `1px solid ${addDate !== todayKey() ? T.primary : T.border}`,
                fontSize: 13, fontWeight: 600,
              }}
            >
              <CalIcon size={13} strokeWidth={2.2} />
              {addDate === todayKey() ? 'Pick a date' : formatTaskDay(addDate)}
            </button>
          </div>

          {/* inline calendar */}
          {showDatePicker && (
            <div className="mb-3 p-3 rounded-xl" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setAddPickerMonth(new Date(addPickerMonth.getFullYear(), addPickerMonth.getMonth() - 1, 1))}
                  className="tdo-tap w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: T.surface, color: T.textMid, border: `1px solid ${T.border}` }}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>
                  {FULL_MONTHS[addPickerMonth.getMonth()]} {addPickerMonth.getFullYear()}
                </div>
                <button
                  type="button"
                  onClick={() => setAddPickerMonth(new Date(addPickerMonth.getFullYear(), addPickerMonth.getMonth() + 1, 1))}
                  className="tdo-tap w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: T.surface, color: T.textMid, border: `1px solid ${T.border}` }}
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DOW.map((d, i) => (
                  <div key={i} style={{ color: T.faint, fontSize: 10, fontWeight: 600 }} className="text-center py-0.5 uppercase">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {(() => {
                  const y = addPickerMonth.getFullYear();
                  const m = addPickerMonth.getMonth();
                  const startDow = new Date(y, m, 1).getDay();
                  const daysIn = new Date(y, m + 1, 0).getDate();
                  const today = todayKey();
                  const cells = [];
                  for (let i = 0; i < startDow; i++) cells.push(<div key={`b${i}`} />);
                  for (let d = 1; d <= daysIn; d++) {
                    const key = dateToKey(new Date(y, m, d));
                    const isPast = key < today;
                    const isSel = key === addDate;
                    const isTd = key === today;
                    cells.push(
                      <button
                        key={key}
                        type="button"
                        disabled={isPast}
                        onClick={() => { setAddDate(key); setShowDatePicker(false); }}
                        className="aspect-square flex items-center justify-center rounded-md"
                        style={{
                          background: isSel ? T.primary : isTd ? T.primaryLight : 'transparent',
                          color: isPast ? T.faint : isSel ? '#fff' : isTd ? T.primary : T.text,
                          fontSize: 12,
                          fontWeight: isSel || isTd ? 700 : 500,
                          opacity: isPast ? 0.4 : 1,
                          cursor: isPast ? 'not-allowed' : 'pointer',
                          border: isSel ? `1px solid ${T.primary}` : '1px solid transparent',
                        }}
                      >
                        {d}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={closeAdd}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{ background: T.surfaceAlt, color: T.textMid, fontWeight: 600, fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              onClick={addTask}
              disabled={!newTaskText.trim()}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{
                background: newTaskText.trim() ? T.primary : T.borderHi,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                opacity: newTaskText.trim() ? 1 : 0.6,
              }}
            >
              Add
            </button>
          </div>
        </Modal>
      )}

      {/* ───── DELETE CONFIRM ───── */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <div className="flex items-start justify-between mb-1">
            <div style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>Delete Task</div>
            <button onClick={() => setConfirmDelete(null)} style={{ color: T.dim }} className="tdo-tap">
              <X size={18} />
            </button>
          </div>
          <div style={{ color: T.dim, fontSize: 14, fontWeight: 500 }} className="mb-5">
            Do you want to delete{' '}
            <span style={{ color: T.text, fontWeight: 700 }}>"{confirmDelete.text}"</span>?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{ background: T.surfaceAlt, color: T.primary, fontWeight: 600, fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteTask(confirmDelete.id)}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{
                background: T.surface,
                border: `1.5px solid ${T.danger}`,
                color: T.danger,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* ───── EDIT NAME ───── */}
      {showEditName && (
        <Modal onClose={() => setShowEditName(false)}>
          <div className="mb-1" style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>
            Edit Username
          </div>
          <div style={{ color: T.dim, fontSize: 13, fontWeight: 500 }} className="mb-4">
            What should we call you?
          </div>
          <input
            autoFocus
            value={editNameVal}
            onChange={(e) => setEditNameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editNameVal.trim()) {
                onUpdateUsername(editNameVal);
                setShowEditName(false);
                flashSuccess('Username updated');
              }
              if (e.key === 'Escape') setShowEditName(false);
            }}
            className="tdo-input w-full px-4 py-3 rounded-xl mb-4"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.text, fontSize: 15 }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditName(false)}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{ background: T.surfaceAlt, color: T.textMid, fontWeight: 600, fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (editNameVal.trim()) {
                  onUpdateUsername(editNameVal);
                  setShowEditName(false);
                  flashSuccess('Username updated');
                }
              }}
              disabled={!editNameVal.trim()}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{
                background: editNameVal.trim() ? T.primary : T.borderHi,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                opacity: editNameVal.trim() ? 1 : 0.6,
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* ───── LOGOUT CONFIRM ───── */}
      {confirmLogout && (
        <Modal onClose={() => setConfirmLogout(false)}>
          <div className="flex items-start justify-between mb-1">
            <div style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>Log Out?</div>
            <button onClick={() => setConfirmLogout(false)} style={{ color: T.dim }} className="tdo-tap">
              <X size={18} />
            </button>
          </div>
          <div style={{ color: T.dim, fontSize: 14, fontWeight: 500 }} className="mb-5">
            This will reset your profile. Your tasks will stay saved.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmLogout(false)}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{ background: T.surfaceAlt, color: T.primary, fontWeight: 600, fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onLogout(); setConfirmLogout(false); }}
              className="tdo-tap flex-1 py-3 rounded-xl"
              style={{
                background: T.surface,
                border: `1.5px solid ${T.danger}`,
                color: T.danger,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Log Out
            </button>
          </div>
        </Modal>
      )}

      {/* ───── SUCCESS TOAST ───── */}
      {successMsg && (
        <Modal onClose={() => setSuccessMsg(null)} small>
          <div className="flex flex-col items-center text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: T.success }}
            >
              <Check size={22} strokeWidth={3} color="#fff" />
            </div>
            <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }} className="mb-1">
              Success!
            </div>
            <div style={{ color: T.dim, fontSize: 13, fontWeight: 500 }} className="mb-3">
              {successMsg}
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              style={{ color: T.primary, fontSize: 14, fontWeight: 600 }}
              className="tdo-tap"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
//   SUBCOMPONENTS
// ═════════════════════════════════════════════════════════
function TaskRow({ task, onToggle, onDelete, compact = false }) {
  const T = useT();
  const [burst, setBurst] = useState(false);

  const handleToggle = () => {
    if (!task.completed) {
      setBurst(true);
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
      setTimeout(() => setBurst(false), 650);
    }
    onToggle();
  };

  return (
    <li
      className={`tdo-row flex items-center gap-3 rounded-2xl ${burst ? 'tdo-row-flash' : ''}`}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: compact ? '10px 14px' : '12px 16px',
        boxShadow: T.shadowSoft,
      }}
    >
      <button
        onClick={handleToggle}
        className={`tdo-tap tdo-checkbox flex items-center justify-center flex-shrink-0 ${burst ? 'tdo-check-burst' : ''}`}
        style={{
          width: 22, height: 22, borderRadius: 7,
          border: `2px solid ${task.completed ? T.primary : T.borderHi}`,
          background: task.completed ? T.primary : 'transparent',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          color: T.primary,
        }}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && (
          <span className="tdo-check-icon" style={{ display: 'flex' }}>
            <Check size={12} strokeWidth={3.5} color="#fff" />
          </span>
        )}
        {burst && (
          <>
            <span className="tdo-ring" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <span
                key={a}
                className="tdo-spark"
                style={{ background: T.primary, '--a': `${a}deg` }}
              />
            ))}
          </>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          style={{
            color: task.completed ? T.faint : T.text,
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            textDecoration: task.completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {task.text}
        </div>
      </div>

      {!compact && (
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded-md"
          style={{
            background: T.surfaceAlt2,
            color: T.textMid,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {formatTaskDay(task.date)}
        </div>
      )}

      <button
        onClick={onDelete}
        className="tdo-del tdo-tap p-1"
        style={{ color: T.faint }}
        aria-label="Delete"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </li>
  );
}

function MiniStat({ label, value, unit }) {
  const T = useT();
  return (
    <div
      className="rounded-2xl p-3 text-center"
      style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
    >
      <div style={{ color: T.dim, fontSize: 10, fontWeight: 600 }} className="uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span style={{ color: T.text, fontSize: 22, fontWeight: 800 }}>{value}</span>
        {unit && <span style={{ color: T.dim, fontSize: 11, fontWeight: 600 }}>{unit}</span>}
      </div>
    </div>
  );
}

function BigStat({ Icon, label, value, suffix, highlight }) {
  const T = useT();
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: highlight ? T.primaryLight : T.surfaceAlt,
        border: `1px solid ${highlight ? T.primary : T.border}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} style={{ color: highlight ? T.primary : T.dim }} strokeWidth={2.25} />
        <span style={{ color: T.dim, fontSize: 10, fontWeight: 600 }} className="uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span style={{ color: highlight ? T.primary : T.text, fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {suffix && <span style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function NavBtn({ id, label, Icon, active, onClick }) {
  const T = useT();
  return (
    <button
      onClick={() => onClick(id)}
      className="tdo-tap flex flex-col items-center gap-1 px-3 py-1"
      style={{ color: active ? T.primary : T.dim }}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} fill={active ? T.primaryLight : 'none'} />
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function EmptyState({ text, hint, compact }) {
  const T = useT();
  return (
    <div
      className="text-center rounded-2xl"
      style={{
        background: T.surface,
        border: `1.5px dashed ${T.border}`,
        padding: compact ? '20px 16px' : '36px 20px',
      }}
    >
      <div style={{ color: T.dim, fontSize: 13, fontWeight: 500 }}>{text}</div>
      {hint && <div style={{ color: T.faint, fontSize: 12, fontWeight: 500 }} className="mt-1">{hint}</div>}
    </div>
  );
}

function Modal({ children, onClose, small }) {
  const T = useT();
  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-6 tdo-overlay"
      style={{
        background: T.overlay,
        backdropFilter: 'blur(2px)',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-2xl p-5 tdo-pop"
        style={{
          background: T.surface,
          maxWidth: small ? 280 : 340,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  const T = useT();
  return (
    <div style={{ color: T.dim, fontSize: 11, fontWeight: 700 }} className="uppercase tracking-wider mb-2 px-1">
      {children}
    </div>
  );
}

function SettingRow({ Icon, iconBg, iconFg, label, description, rightSlot, onClick, divider, destructive }) {
  const T = useT();
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !rightSlot}
      className="tdo-tap w-full flex items-center gap-3 px-4 py-3 text-left"
      style={{
        borderBottom: divider ? `1px solid ${T.border}` : 'none',
        background: 'transparent',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconFg }}
      >
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ color: destructive ? T.danger : T.text, fontSize: 14, fontWeight: 700 }}>
          {label}
        </div>
        {description && (
          <div style={{ color: T.dim, fontSize: 12, fontWeight: 500 }} className="truncate">
            {description}
          </div>
        )}
      </div>
      {rightSlot ? (
        <div onClick={(e) => e.stopPropagation()}>{rightSlot}</div>
      ) : onClick ? (
        <ChevronRight size={16} style={{ color: T.faint }} />
      ) : null}
    </button>
  );
}

function Toggle({ on, onChange }) {
  const T = useT();
  return (
    <button
      onClick={onChange}
      className="tdo-toggle-track tdo-tap relative flex-shrink-0"
      style={{
        width: 44, height: 26,
        borderRadius: 13,
        background: on ? T.primary : T.borderHi,
        padding: 2,
      }}
      aria-checked={on}
      role="switch"
    >
      <div
        className="tdo-toggle-thumb"
        style={{
          width: 22, height: 22,
          borderRadius: '50%',
          background: '#fff',
          transform: `translateX(${on ? 18 : 0}px)`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

