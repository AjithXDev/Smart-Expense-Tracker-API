/* ============================================================
   app.js  –  SpendWise 2.0 Application Logic
   ============================================================ */

// ─── State ───
let curPage   = 1;
let curSort   = 'DESC';
let curSearch = '';
let searchTmr = null;
let delId     = null;
let barChart  = null;
let donutChart= null;

// ─── Category config ───
const CATS = {
  Food:          { emoji:'🍔', color:'#f43f5e' },
  Transport:     { emoji:'🚗', color:'#06b6d4' },
  Shopping:      { emoji:'🛍️', color:'#f59e0b' },
  Entertainment: { emoji:'🎬', color:'#8b5cf6' },
  Health:        { emoji:'💊', color:'#10b981' },
  Bills:         { emoji:'🧾', color:'#ef4444' },
  Education:     { emoji:'📚', color:'#3b82f6' },
  Travel:        { emoji:'✈️', color:'#f97316' },
  Other:         { emoji:'📦', color:'#6b7280' },
};
const ce = c => (CATS[c] || CATS.Other).emoji;
const cc = c => (CATS[c] || CATS.Other).color;

// ─── Utils ───
const $   = id => document.getElementById(id);
const fmt = n  => `$${parseFloat(n||0).toFixed(2)}`;
const esc = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthRange() {
  const d = new Date(), y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0');
  const last = new Date(y, d.getMonth()+1, 0).getDate();
  return { s:`${y}-${m}-01`, e:`${y}-${m}-${String(last).padStart(2,'0')}` };
}
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Toast
function toast(msg, err=false) {
  const t = $('toast'), icon = $('toast-icon'), m = $('toast-message');
  m.textContent  = msg;
  icon.textContent = err ? '✕' : '✓';
  t.className = err ? 'toast toast-err' : 'toast';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3000);
}

// Loading state
function setLoad(btnId, on) {
  const b = $(btnId);
  if (!b) return;
  const sp = b.querySelector('span');
  const ld = b.querySelector('.spin');
  b.disabled = on;
  if (sp) sp.style.opacity = on ? '0' : '1';
  if (ld) ld.classList.toggle('hidden', !on);
}

function showErr(id, msg) { const e=$(id); e.textContent=msg; e.classList.remove('hidden'); }
function showOk (id, msg) { const e=$(id); e.textContent=msg; e.classList.remove('hidden'); }
function hide   (id)      { const e=$(id); if(e) e.classList.add('hidden'); }

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
const PAGES = {
  'overview':    'Overview',
  'expenses':    'All Expenses',
  'recurring':   'Recurring Expenses',
  'analytics':   'Analytics',
  'add-expense': 'Add Expense',
};
const navIds = { 'overview':'nav-overview','expenses':'nav-expenses','recurring':'nav-recurring','analytics':'nav-analytics','add-expense':'nav-add' };

function goTo(key) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  $(`page-${key}`).classList.add('active');
  $(navIds[key]).classList.add('active');
  $('topbar-title').textContent = PAGES[key] || key;
  closeSidebar();
  if (key === 'overview')    loadOverview();
  if (key === 'expenses')    loadTable();
  if (key === 'recurring')   loadRecurringTable();
  if (key === 'analytics')   loadAnalytics();
}
document.querySelectorAll('.sb-link').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); goTo(a.dataset.page); });
});

// ══════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════
const sidebar  = $('sidebar');
const overlay  = $('sb-overlay');
function openSidebar()  { sidebar.classList.add('sb-open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('sb-open'); overlay.classList.remove('show'); }
$('hamburger-btn').addEventListener('click', openSidebar);
$('sidebar-close').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
function showDash(username) {
  $('auth-screen').classList.add('hidden');
  $('dashboard-screen').classList.remove('hidden');
  $('sb-avatar').textContent  = username[0].toUpperCase();
  $('sb-username').textContent= username;
  $('tb-avatar').textContent  = username[0].toUpperCase();
  $('hero-greeting').textContent = `${greet()}, ${username}`;
  $('exp-date').value  = today();
  $('daily-date-pick').value = today();
  const {s,e} = monthRange();
  $('range-start').value = s;
  $('range-end').value   = e;
  goTo('overview');
}

// Auto-restore session
if (getToken()) showDash(getUser());

// Tab pill
const indicator = document.querySelector('.tp-indicator');
$('tab-login-btn').addEventListener('click', () => {
  $('login-form').classList.add('active');
  $('register-form').classList.remove('active');
  $('tab-login-btn').classList.add('active');
  $('tab-register-btn').classList.remove('active');
  indicator.classList.remove('right');
});
$('tab-register-btn').addEventListener('click', () => {
  $('register-form').classList.add('active');
  $('login-form').classList.remove('active');
  $('tab-register-btn').classList.add('active');
  $('tab-login-btn').classList.remove('active');
  indicator.classList.add('right');
});

// Password eye
function bindEye(eyeId, inputId) {
  $(eyeId).addEventListener('click', () => {
    const i = $(inputId);
    i.type = i.type === 'password' ? 'text' : 'password';
  });
}
bindEye('login-eye', 'login-password');
bindEye('reg-eye',   'reg-password');

// Login
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); hide('login-error');
  setLoad('login-btn', true);
  try {
    await API.login($('login-username').value.trim(), $('login-password').value);
    showDash(getUser());
  } catch(err) { showErr('login-error', err.message); }
  finally      { setLoad('login-btn', false); }
});

  $('register-form').addEventListener('submit', async e => {
    e.preventDefault(); hide('reg-error'); hide('reg-success');
    setLoad('register-btn', true);
    try {
      const r = await API.register($('reg-username').value.trim(), $('reg-password').value, $('reg-mail').value.trim(),$('reg-name').value.trim());
      showOk('reg-success', r.message || 'Account created! Please sign in.');
      $('register-form').reset();
      setTimeout(() => {
        $('tab-login-btn').click();
        hide('reg-success');
      }, 1000);
    } catch(err) { showErr('reg-error', err.message); }
    finally      { setLoad('register-btn', false); }
  });

// Logout
$('logout-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  clearToken();
  $('dashboard-screen').classList.add('hidden');
  $('auth-screen').classList.remove('hidden');
  barChart   && barChart.destroy();   barChart   = null;
});

// ══════════════════════════════════════════
// PROFILE MODAL
// ══════════════════════════════════════════
const profModal = $('profile-modal');
const closeProf = () => profModal.classList.add('hidden');
$('profile-modal-close').addEventListener('click', closeProf);
$('profile-close-btn').addEventListener('click', closeProf);
profModal.addEventListener('click', e => { if(e.target === profModal) closeProf(); });

const sbUserBtn = $('sb-user-btn');
const tbAvatarBtn = $('tb-avatar');

async function openProfileModal() {
  profModal.classList.remove('hidden');
  $('prof-name').textContent = 'Loading...';
  $('prof-mail').textContent = 'Loading...';
  $('prof-username').textContent = '@' + getUser();
  try {
    const data = await API.getProfile();
    $('prof-name').textContent = data.name;
    $('prof-mail').textContent = data.mail;
    $('prof-username').textContent = '@' + data.username;
    $('prof-avatar').textContent = data.name.charAt(0).toUpperCase();
  } catch(err) {
    toast('Failed to load profile', true);
  }
}

if (sbUserBtn) {
  sbUserBtn.addEventListener('click', openProfileModal);
}
if (tbAvatarBtn) {
  tbAvatarBtn.style.cursor = 'pointer';
  tbAvatarBtn.title = 'View Profile';
  tbAvatarBtn.addEventListener('click', openProfileModal);
}

// ══════════════════════════════════════════
// QUICK ADD buttons
// ══════════════════════════════════════════
$('quick-add-btn').addEventListener('click', () => goTo('add-expense'));
$('quick-add-topbar').addEventListener('click', () => goTo('add-expense'));
$('view-all-link').addEventListener('click', e => { e.preventDefault(); goTo('expenses'); });

// ══════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════
async function loadOverview() {
  // Total
  try { const r = await API.totalExpense();     $('kpi-total').textContent = r['Total Expenses'] || '$0.00'; } catch {}
  // Today
  try {
    const t = today();
    const r = await API.dailyExpense(t);
    $('kpi-today').textContent      = fmt(r.total_expense);
    $('kpi-today-date').textContent = t;
  } catch {}
  // Month
  try {
    const {s,e} = monthRange();
    const r = await API.monthlyExpense(s, e);
    $('kpi-month').textContent       = fmt(r.total_expense);
    $('kpi-month-range').textContent = `${s} → ${e}`;
  } catch {}
  // Category
  try {
    const cats = await API.categoryExpense();
    $('kpi-cats').textContent = cats.length;
    renderCharts(cats);
  } catch {}
  // Recent
  try {
    const d = await API.getExpenses('', 'DESC', 1, 5);
    renderRecent(d.data || []);
  } catch {}
}

function renderRecent(items) {
  const el = $('recent-list');
  if (!items.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-emoji">💸</div><div class="empty-state-text">No expenses yet. Add your first one!</div></div>`;
    return;
  }
  el.innerHTML = items.map(i => txnHTML(i, false)).join('');
  bindActions(el);
}

function txnHTML(item, actions=true) {
  const col = cc(item.category);
  return `
  <div class="txn-item" data-id="${item.id}">
    <div class="txn-emoji" style="background:${col}18">${ce(item.category)}</div>
    <div class="txn-info">
      <div class="txn-title">${esc(item.title)}</div>
      <div class="txn-meta">${item.category} · ${item.date} · ${item.payment_method}</div>
    </div>
    <div class="txn-amount" style="color:${col}">${fmt(item.amount)}</div>
    ${actions ? `
    <div class="txn-actions">
      <button class="icon-btn edit" data-action="edit" data-id="${item.id}"
        data-title="${esc(item.title)}" data-category="${item.category}"
        data-amount="${item.amount}" data-date="${item.date}" data-payment="${item.payment_method}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
      </button>
      <button class="icon-btn del" data-action="delete" data-id="${item.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
      </button>
    </div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════
function renderCharts(cats) {
  if (!cats.length) return;
  const labels  = cats.map(c => `${ce(c.category)} ${c.category}`);
  const amounts = cats.map(c => c.total);
  const colors  = cats.map(c => cc(c.category));
  const chartOpts = { responsive:true, maintainAspectRatio:false };

  if (barChart)   barChart.destroy();
  if (donutChart) donutChart.destroy();

  barChart = new Chart($('bar-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: amounts,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
        borderWidth: 0,
      }]
    },
    options: {
      ...chartOpts,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toFixed(2)}` } }
      },
      scales: {
        x: {
          ticks: { color:'#6b7280', font:{ family:'Plus Jakarta Sans', size:11 } },
          grid:  { color:'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: { color:'#6b7280', callback: v=>`$${v}`, font:{ family:'Plus Jakarta Sans', size:11 } },
          grid:  { color:'rgba(255,255,255,.05)' }
        }
      }
    }
  });

  donutChart = new Chart($('donut-chart'), {
    type: 'doughnut',
    data: {
      labels: cats.map(c=>c.category),
      datasets: [{
        data: amounts,
        backgroundColor: colors,
        borderColor: 'transparent',
        hoverOffset: 14,
        borderWidth: 0,
      }]
    },
    options: {
      ...chartOpts, cutout:'68%',
      plugins: {
        legend: {
          position:'bottom',
          labels:{ color:'#6b7280', padding:10, font:{ family:'Plus Jakarta Sans', size:11 } }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}` } }
      }
    }
  });
}

// ══════════════════════════════════════════
// ALL EXPENSES TABLE
// ══════════════════════════════════════════
async function loadTable() {
  const tbody = $('expenses-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Loading…</td></tr>`;
  try {
    const d = await API.getExpenses(curSearch, curSort, curPage, 8);
    renderTable(d.data || []);
    updatePag(d.page, d.data.length, 8);
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell" style="color:#ef4444">${err.message}</td></tr>`;
  }
}

function renderTable(items) {
  const tbody = $('expenses-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No expenses found.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((item,i) => {
    const col = cc(item.category);
    return `
    <tr>
      <td style="color:#6b7280">${(curPage-1)*8+i+1}</td>
      <td style="font-weight:700;color:#fff">${esc(item.title)}</td>
      <td><span class="cat-badge" style="background:${col}18;color:${col}">${ce(item.category)} ${item.category}</span></td>
      <td class="amount-bold" style="color:${col}">${fmt(item.amount)}</td>
      <td>${item.date}</td>
      <td>${item.payment_method}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit" data-action="edit" data-id="${item.id}"
            data-title="${esc(item.title)}" data-category="${item.category}"
            data-amount="${item.amount}" data-date="${item.date}" data-payment="${item.payment_method}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="icon-btn del" data-action="delete" data-id="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
  bindActions($('expenses-tbody'));
}

function updatePag(page, count, limit) {
  $('page-info').textContent       = `Page ${page}`;
  $('prev-page-btn').disabled      = page <= 1;
  $('next-page-btn').disabled      = count < limit;
}

$('prev-page-btn').addEventListener('click', () => { if(curPage>1){curPage--;loadTable();} });
$('next-page-btn').addEventListener('click', () => { curPage++; loadTable(); });

$('search-input').addEventListener('input', e => {
  clearTimeout(searchTmr);
  searchTmr = setTimeout(() => { curSearch=e.target.value.trim(); curPage=1; loadTable(); }, 400);
});
$('sort-select').addEventListener('change', e => { curSort=e.target.value; curPage=1; loadTable(); });

// Bind edit/delete buttons in any container
function bindActions(container) {
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action==='edit')   openEdit(btn);
      if (btn.dataset.action==='delete') openDel(parseInt(btn.dataset.id));
    });
  });
}

// ══════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════
function openEdit(btn) {
  $('edit-id').value       = btn.dataset.id;
  $('edit-title').value    = btn.dataset.title    || '';
  $('edit-amount').value   = btn.dataset.amount   || '';
  $('edit-date').value     = btn.dataset.date     || '';
  $('edit-category').value = btn.dataset.category || '';
  $('edit-payment').value  = btn.dataset.payment  || 'Cash';
  hide('edit-error');
  $('edit-modal').classList.remove('hidden');
}
const closeEdit = () => $('edit-modal').classList.add('hidden');
$('modal-close-btn').addEventListener('click', closeEdit);
$('modal-cancel-btn').addEventListener('click', closeEdit);
$('edit-modal').addEventListener('click', e => { if(e.target===$('edit-modal')) closeEdit(); });

$('edit-form').addEventListener('submit', async e => {
  e.preventDefault(); hide('edit-error');
  setLoad('edit-save-btn', true);
  try {
    await API.updateExpense(parseInt($('edit-id').value), {
      title:          $('edit-title').value.trim(),
      category:       $('edit-category').value,
      amount:         parseFloat($('edit-amount').value),
      date:           $('edit-date').value,
      payment_method: $('edit-payment').value,
    });
    closeEdit();
    toast('Expense updated');
    loadTable(); loadOverview();
  } catch(err) { showErr('edit-error', err.message); }
  finally      { setLoad('edit-save-btn', false); }
});

// ══════════════════════════════════════════
// DELETE MODAL
// ══════════════════════════════════════════
let delType = 'normal';
function openDel(id) { delId=id; delType='normal'; $('delete-modal').classList.remove('hidden'); }
function openDelRecurring(id) { delId=id; delType='recurring'; $('delete-modal').classList.remove('hidden'); }

const closeDel = () => { $('delete-modal').classList.add('hidden'); delId=null; };
$('delete-modal-close').addEventListener('click', closeDel);
$('delete-cancel-btn').addEventListener('click', closeDel);
$('delete-modal').addEventListener('click', e => { if(e.target===$('delete-modal')) closeDel(); });

$('delete-confirm-btn').addEventListener('click', async () => {
  if (!delId) return;
  setLoad('delete-confirm-btn', true);
  try {
    if (delType === 'recurring') {
      await API.deleteRecurringExpense(delId);
      closeDel();
      toast('Recurring Setup stopped!');
      if ($('page-recurring').classList.contains('active')) loadRecurringTable();
    } else {
      await API.deleteExpense(delId);
      closeDel();
      toast('Expense deleted');
      loadTable(); loadOverview();
    }
  } catch(err) { toast(err.message, true); closeDel(); }
  finally      { setLoad('delete-confirm-btn', false); }
});

// ══════════════════════════════════════════
// ADD EXPENSE
// ══════════════════════════════════════════
document.querySelectorAll('.pay-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.pay-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

$('exp-is-recurring')?.addEventListener('change', e => {
  if (e.target.checked) $('recurring-options').classList.remove('hidden');
  else $('recurring-options').classList.add('hidden');
});

$('add-expense-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('add-expense-error'); hide('add-expense-success');
  setLoad('add-expense-btn', true);
  const pm = document.querySelector('#payment-options input:checked')?.value || 'Cash';
  const isRecur = $('exp-is-recurring').checked;
  
  try {
    const payload = {
      title:          $('exp-title').value.trim(),
      category:       $('exp-category').value,
      amount:         parseFloat($('exp-amount').value),
      payment_method: pm,
    };
    
    let r;
    if (isRecur) {
        payload.next_date = $('exp-date').value;
        payload.frequency = $('exp-frequency').value;
        r = await API.addRecurringExpense(payload);
    } else {
        payload.date = $('exp-date').value;
        r = await API.addExpense(payload);
    }
    
    showOk('add-expense-success', r.message || 'Added successfully!');
    setTimeout(() => hide('add-expense-success'), 2000);
    $('add-expense-form').reset();
    $('exp-date').value = today();
    $('exp-is-recurring').checked = false;
    $('recurring-options').classList.add('hidden');
    document.querySelectorAll('.pay-chip').forEach((c,i) => c.classList.toggle('active', i===0));
    toast('Added successfully');
  } catch(err) { showErr('add-expense-error', err.message); }
  finally      { setLoad('add-expense-btn', false); }
});

// ══════════════════════════════════════════
// RECURRING UI RENDERING
// ══════════════════════════════════════════
async function loadRecurringTable() {
  const tbody = $('recurring-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Loading…</td></tr>`;
  try {
    const d = await API.getRecurringExpenses();
    renderRecurringTable(d.data || []);
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell" style="color:#ef4444">${err.message}</td></tr>`;
  }
}

function renderRecurringTable(items) {
  const tbody = $('recurring-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No recurring expenses set up.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => {
    const col = cc(item.category);
    return `
    <tr>
      <td style="font-weight:700;color:#fff">${esc(item.title)}</td>
      <td><span class="cat-badge" style="background:${col}18;color:${col}">${ce(item.category)} ${item.category}</span></td>
      <td class="amount-bold" style="color:${col}">${fmt(item.amount)}</td>
      <td>${item.payment_method}</td>
      <td><span class="tag" style="background:rgba(255,255,255,0.1);color:#fff">${item.frequency}</span></td>
      <td style="color:#10b981;font-weight:600">${item.next_date}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn del" data-id="${item.id}" title="Delete/Stop Recurring">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
  
  tbody.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => openDelRecurring(parseInt(btn.dataset.id)));
  });
}


// ══════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════
async function loadAnalytics() {
  try {
    const cats = await API.categoryExpense();
    renderCatBars(cats);
  } catch {}
}

function renderCatBars(cats) {
  const el = $('cat-analytics-list');
  if (!cats.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-emoji">📊</div><div class="empty-state-text">No data yet.</div></div>`;
    return;
  }
  const max = Math.max(...cats.map(c=>c.total));
  el.innerHTML = cats.map(c => {
    const pct = max>0 ? (c.total/max*100).toFixed(1) : 0;
    return `
    <div class="cat-bar-row">
      <div class="cbr-meta">
        <span class="cbr-name">${ce(c.category)} ${c.category}</span>
        <span class="cbr-amount">${fmt(c.total)}</span>
      </div>
      <div class="cbr-track">
        <div class="cbr-fill" style="width:${pct}%;background:${cc(c.category)}"></div>
      </div>
    </div>`;
  }).join('');
}

$('daily-fetch-btn').addEventListener('click', async () => {
  const dt = $('daily-date-pick').value;
  if (!dt) { toast('Pick a date first', true); return; }
  try {
    const r = await API.dailyExpense(dt);
    $('daily-amount').textContent = fmt(r.total_expense);
    $('daily-result').classList.remove('hidden');
  } catch(err) { toast(err.message, true); }
});

$('range-fetch-btn').addEventListener('click', async () => {
  const s = $('range-start').value, e = $('range-end').value;
  if (!s || !e) { toast('Pick both dates', true); return; }
  try {
    const r = await API.monthlyExpense(s, e);
    $('range-amount').textContent   = fmt(r.total_expense);
    $('range-label-text').textContent = `${s}  →  ${e}`;
    $('range-result').classList.remove('hidden');
  } catch(err) { toast(err.message, true); }
});
