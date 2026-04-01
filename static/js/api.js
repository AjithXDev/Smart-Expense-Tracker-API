/* ============================================================
   api.js  –  All HTTP calls to the FastAPI backend
   ============================================================ */

const BASE_URL = '';

// ─── Auth helpers ───
function setToken(t)  { localStorage.setItem('sw_token', t); }
function getToken()   { return localStorage.getItem('sw_token'); }
function clearToken() { localStorage.removeItem('sw_token'); localStorage.removeItem('sw_user'); }
function setUser(n)   { localStorage.setItem('sw_user', n); }
function getUser()    { return localStorage.getItem('sw_user') || 'User'; }

// ─── Core fetch ───
async function req(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

// ─── API ───
const API = {
  register: (u, p, e, n) => 
  
  req('POST', '/register', { username: u, password: p, mail: e, name: n }),
  login: async (u, p)   => {
    const d = await req('POST', '/login', { username: u, password: p });
    setToken(d.access_token);
    setUser(u);
    return d;
  },
  addExpense:    (e)        => req('POST',   '/add-expense', e, true),
  addRecurringExpense: (e)  => req('POST',   '/add-recurring-expense', e, true),
  getExpenses:   (s,so,pg,lim) => {
    const p = new URLSearchParams({ sort: so, page: pg, limit: lim });
    if (s) p.append('search', s);
    return req('GET', `/expenses?${p}`, null, true);
  },
  getRecurringExpenses: ()  => req('GET',    '/recurring-expenses', null, true),
  updateExpense: (id, e)    => req('PUT',    `/update/${id}`, e, true),
  deleteExpense: (id)       => req('DELETE', `/delete/${id}`, null, true),
  deleteRecurringExpense: (id) => req('DELETE', `/delete-recurring/${id}`, null, true),
  totalExpense:  ()         => req('GET',    '/total_expense',   null, true),
  categoryExpense: ()       => req('GET',    '/category_expense', null, true),
  dailyExpense:  (date)     => req('GET',    `/daily_expense/${date}`, null, true),
  monthlyExpense:(s, e)     => req('GET',    `/monthly_expense/${s}/${e}`, null, true),
  getProfile:    ()         => req('GET',    '/profile', null, true),
};
