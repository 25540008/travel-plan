// Screen 9 Ngân sách (tab "Ngân sách" của Screen 7) + Screen 14 popup thêm / sửa khoản chi.
// UC 24 Xem ngân sách, UC 25 Thêm khoản chi, UC 26 Sửa / xóa khoản chi, UC 27 Sửa ngân sách. CBR 6. MSG 27, MSG 28, MSG 33.
// Giao diện và cách tính theo bản của Phượng (TP-34), đã nối API thật của TP-32:
//   GET /trips/:id/budget, GET|POST /trips/:id/expenses, PUT|DELETE /trips/:id/expenses/:expenseId, PUT /trips/:id/budget
// Screen 7 phát sự kiện trip:tab { tab, trip } khi đổi tab; mở thẳng tab bằng chuyen-di.html?id=..&tab=budget.
import { get, post, put, del } from '../api.js';
import { MSG, msg } from '../messages.js';
import { toast, confirmDialog } from '../ui.js';
import { todayVN, isoDate, budgetStatus, escapeHtml } from '../trip-utils.js';

// Loại khoản chi: mã API → [tên, màu đậm, màu nền, chữ viết tắt trên icon]
const CATS = {
  ACCOMMODATION: ['Lưu trú', '#6b4fbb', '#e7e0f6', 'LT'],
  TRANSPORT: ['Di chuyển', '#2a7ba0', '#dcebf2', 'DC'],
  FOOD: ['Ăn uống', '#d9512c', '#fbe3da', 'AU'],
  SIGHTSEEING: ['Tham quan', '#2e6b57', '#dcebe5', 'TQ'],
  SHOPPING: ['Mua sắm', '#d49a1c', '#f8ecd0', 'MS'],
  OTHER: ['Khác', '#9aa9a5', '#e8eceb', 'KH'],
};
const POPUP_CAT_ORDER = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'SIGHTSEEING', 'SHOPPING', 'OTHER'];
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MAX_DIGITS = 13; // cột Decimal(15, 2)

const panel = document.getElementById('panel-budget');
const state = { trip: null, budget: 0, spent: 0, exp: [], filter: 'ALL', loaded: false, loading: false };

/* ---------- Tiện ích ngày, tiền ---------- */
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const vnd = (n) => `${fmt(n)}đ`;
const ymd = (v) => String(v ?? '').slice(0, 10);
const ms = (d) => Date.UTC(...d.split('-').map((x, i) => (i === 1 ? x - 1 : +x)));
const shiftDay = (d, k) => new Date(ms(d) + k * 864e5).toISOString().slice(0, 10);
const dm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const wd = (d) => WD[new Date(ms(d)).getUTCDay()];
const vnDate = (d) => d.split('-').reverse().join('/');
const short = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',').replace(',0', '')}tr` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
const digits = (s) => Number(String(s).replace(/\D/g, '') || 0);

const today = () => isoDate(todayVN());
const start = () => ymd(state.trip.startDate);
const end = () => ymd(state.trip.endDate);
const dayNo = (d) => Math.round((ms(d) - ms(start())) / 864e5) + 1;
const totalDays = () => dayNo(end());
const dateRange = () => [shiftDay(start(), -30), shiftDay(end(), 7)]; // UC 25 B6

const toExp = (x) => ({
  id: x.id,
  desc: x.description,
  amount: Number(x.amount),
  cat: CATS[x.category] ? x.category : 'OTHER',
  date: ymd(x.expenseDate) || start(),
});

/* ---------- Khung trang ---------- */
function skeleton() {
  panel.classList.remove('card');
  panel.classList.add('budget');
  panel.innerHTML = `
    <div class="budget-banner" id="b-banner" hidden></div>
    <section class="card budget-fund">
      <div class="budget-fund-main">
        <div class="budget-row">
          <div><span class="budget-caption">Quỹ chuyến đi</span> <span class="budget-pill" id="b-pill"></span></div>
          <button type="button" class="budget-ghost" id="b-edit-btn">Sửa ngân sách</button>
        </div>
        <div class="budget-big" id="b-view"><strong id="b-spent"></strong> <span>đã chi / <span id="b-budget"></span></span></div>
        <form class="budget-edit" id="b-edit" hidden novalidate>
          <input class="input" id="b-input" inputmode="numeric" autocomplete="off" aria-label="Ngân sách mới">
          <b>đ</b>
          <button type="submit" class="btn btn-primary btn-sm" id="b-save">Lưu</button>
          <button type="button" class="budget-link" id="b-cancel">Hủy</button>
          <p class="budget-err" id="b-err" role="alert"></p>
        </form>
        <div class="budget-bar"><i id="b-fill"></i></div>
        <div class="budget-row"><small id="b-pct"></small><small id="b-left"></small></div>
      </div>
      <div class="budget-stat"><small>Mỗi ngày còn tiêu được</small><b id="b-perday"></b><small id="b-perday-n"></small></div>
      <div class="budget-stat"><small>Trung bình mỗi ngày</small><b id="b-avg"></b><small id="b-avg-n"></small></div>
    </section>
    <div class="budget-grid">
      <section class="card">
        <h2>Chi theo ngày</h2>
        <p class="meta">Gồm cả khoản trả trước chuyến đi.</p>
        <div class="budget-chart" id="b-chart"></div>
        <div class="budget-lbls" id="b-lbls"></div>
      </section>
      <section class="card">
        <h2>Chi theo loại</h2>
        <div id="b-cats"></div>
        <div class="budget-top" id="b-top"></div>
      </section>
    </div>
    <section class="card">
      <div class="budget-chips" id="b-chips"></div>
      <div id="b-list"></div>
    </section>`;
}

const $ = (id) => document.getElementById(id);

/* ---------- UC 24 B3: dựng Screen 9 ---------- */
function render() {
  const E = state.exp;
  const B = state.budget;
  const spent = state.spent;
  const status = budgetStatus(spent, B); // CBR 6
  const pct = B > 0 ? (spent / B) * 100 : 0;
  const remain = B - spent;
  const TOTAL = totalDays();
  const tn = dayNo(today());
  const passed = tn < 1 ? 0 : Math.min(tn - 1, TOTAL); // số ngày đã qua (không tính hôm nay)
  const rem = tn < 1 ? TOTAL : tn > TOTAL ? 0 : TOTAL - tn + 1; // số ngày chưa qua (kể cả hôm nay)
  const color = { ok: 'var(--b-green)', near: 'var(--b-yellow)', over: 'var(--b-red)' }[status.key];

  $('b-pill').textContent = status.label;
  $('b-pill').style.background = color;
  $('b-fill').style.background = color;
  $('b-fill').style.width = `${Math.min(pct, 100)}%`;
  $('b-spent').textContent = vnd(spent);
  $('b-budget').textContent = vnd(B);
  $('b-pct').textContent = `${Math.round(pct)}% ngân sách`;
  $('b-left').textContent = status.key === 'over' ? `Vượt ${vnd(spent - B)}` : `Còn lại ${vnd(remain)}`;
  $('b-left').classList.toggle('is-over', status.key === 'over');

  $('b-perday').textContent = rem > 0 ? vnd(Math.max(remain, 0) / rem) : '—';
  $('b-perday-n').textContent = rem > 0 ? `cho ${rem} ngày còn lại` : 'chuyến đã kết thúc';
  const pastSum = E.filter((e) => {
    const n = dayNo(e.date);
    return n >= 1 && n <= passed;
  }).reduce((s, e) => s + e.amount, 0);
  $('b-avg').textContent = passed > 0 ? vnd(pastSum / passed) : '—';
  $('b-avg-n').textContent =
    passed === 0 ? 'chưa có ngày nào qua' : passed === 1 ? 'ngày 1' : passed === 2 ? 'ngày 1 và 2' : `ngày 1 đến ${passed}`;

  // Chi theo ngày: Trước chuyến, từng ngày, Sau chuyến
  const cols = [['Trước chuyến', E.filter((e) => dayNo(e.date) < 1), '#9bb5ae']];
  for (let i = 1; i <= TOTAL; i++) cols.push([`Ngày ${i}`, E.filter((e) => dayNo(e.date) === i), i === tn ? '#d9512c' : '#2e6b57']);
  cols.push(['Sau chuyến', E.filter((e) => dayNo(e.date) > TOTAL), '#9bb5ae']);
  const sums = cols.map((c) => c[1].reduce((s, e) => s + e.amount, 0));
  const mx = Math.max(...sums, 1);
  $('b-chart').innerHTML = cols
    .map((c, i) => `<div class="budget-col">${short(sums[i])}<i style="height:${(sums[i] / mx) * 140}px;background:${c[2]}"></i></div>`)
    .join('');
  $('b-lbls').innerHTML = cols.map((c) => `<span>${c[0]}</span>`).join('');

  // Chi theo loại: 6 loại giảm dần + khoản lớn nhất
  const bc = Object.keys(CATS)
    .map((k) => [k, E.filter((e) => e.cat === k).reduce((s, e) => s + e.amount, 0)])
    .sort((a, b) => b[1] - a[1]);
  const cm = Math.max(bc[0][1], 1);
  $('b-cats').innerHTML = bc
    .map(
      ([k, v]) => `<div class="budget-cat"><div class="budget-row"><span><span class="budget-dot" style="background:${CATS[k][1]}"></span>${CATS[k][0]}</span><b>${vnd(v)}</b></div>
        <div class="budget-track"><i style="width:${(v / cm) * 100}%;background:${CATS[k][1]}"></i></div></div>`,
    )
    .join('');
  const big = [...E].sort((a, b) => b.amount - a.amount)[0];
  $('b-top').innerHTML = big ? `Khoản lớn nhất: <b>${escapeHtml(big.desc)} · ${vnd(big.amount)}</b>` : 'Chưa có khoản chi';

  // Danh sách: lọc theo loại, nhóm theo ngày, ngày mới nhất trước, mỗi nhóm có tổng
  $('b-chips').innerHTML =
    '<h2>Khoản chi</h2>' +
    [['ALL', 'Tất cả'], ...Object.keys(CATS).map((k) => [k, CATS[k][0]])]
      .map(([k, t]) => `<button type="button" class="chip ${state.filter === k ? 'chip-dark' : 'chip-outline'}" data-filter="${k}">${t}</button>`)
      .join('') +
    '<button type="button" class="btn btn-primary btn-sm budget-add" data-budget="add">+ Thêm khoản chi</button>';

  const L = E.filter((e) => state.filter === 'ALL' || e.cat === state.filter);
  const days = [...new Set(L.map((e) => e.date))].sort().reverse();
  $('b-list').innerHTML = days.length
    ? days
        .map((d) => {
          const g = L.filter((e) => e.date === d);
          const n = dayNo(d);
          const lb = n < 1 ? 'TRƯỚC CHUYẾN' : n > TOTAL ? 'SAU CHUYẾN' : `NGÀY ${n} · ${wd(d)} ${dm(d)}`;
          return (
            `<div class="budget-group"><span>${lb}</span><span>${vnd(g.reduce((s, e) => s + e.amount, 0))}</span></div>` +
            g
              .map(
                (e) => `<button type="button" class="budget-item" data-expense="${e.id}">
                  <span class="budget-ic" style="background:${CATS[e.cat][2]};color:${CATS[e.cat][1]}">${CATS[e.cat][3]}</span>
                  <span class="budget-item-name"><b>${escapeHtml(e.desc)}</b><small>${CATS[e.cat][0]}</small></span>
                  <b>${vnd(e.amount)}</b></button>`,
              )
              .join('')
          );
        })
        .join('')
    : '<p class="meta budget-empty">Chưa có khoản chi nào.</p>';
}

async function load() {
  if (state.loading) return;
  state.loading = true;
  const banner = $('b-banner');
  panel.classList.add('is-busy');
  banner.hidden = false;
  banner.className = 'budget-banner';
  banner.textContent = 'Đang tải ngân sách…';
  try {
    const [bd, ex] = await Promise.all([get(`/trips/${state.trip.id}/budget`), get(`/trips/${state.trip.id}/expenses`)]);
    state.budget = Number(bd.overview?.budget ?? state.trip.budget ?? 0);
    state.spent = Number(bd.overview?.totalSpent ?? 0);
    state.exp = (Array.isArray(ex) ? ex : ex?.items || []).map(toExp);
    state.loaded = true;
    banner.hidden = true;
    render();
  } catch (err) {
    if (err.status === 401) return;
    banner.className = 'budget-banner is-error';
    banner.textContent = `${err.message} `;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-secondary btn-sm';
    retry.textContent = 'Thử lại';
    retry.onclick = load;
    banner.append(retry);
  } finally {
    state.loading = false;
    panel.classList.remove('is-busy');
  }
}

/* ---------- UC 27: sửa ngân sách tại chỗ ---------- */
function editBudget(on) {
  $('b-view').hidden = on;
  $('b-edit').hidden = !on;
  $('b-edit-btn').hidden = on;
  $('b-err').textContent = '';
  if (on) {
    $('b-input').value = fmt(state.budget);
    $('b-input').focus();
    $('b-input').select();
  }
}

async function saveBudget() {
  if ($('b-save').disabled) return;
  const v = digits($('b-input').value);
  if (!(v > 0)) {
    $('b-err').textContent = MSG['MSG 33'];
    $('b-input').focus();
    return;
  }
  $('b-save').disabled = true;
  try {
    await put(`/trips/${state.trip.id}/budget`, { budget: v });
    editBudget(false);
    await load();
    toast('Đã cập nhật ngân sách');
  } catch (err) {
    if (err.status !== 401) $('b-err').textContent = err.message;
  } finally {
    $('b-save').disabled = false;
  }
}

/* ---------- Screen 14: popup thêm / sửa khoản chi (UC 25, UC 26) ---------- */
function openExpense(exp = null) {
  const [mn, mx] = dateRange();
  const t = today();
  let cat = exp ? exp.cat : '';
  const spentOther = state.spent - (exp ? exp.amount : 0);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop expense-backdrop';
  backdrop.innerHTML = `
    <form class="modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="exp-title" novalidate>
      <h2 id="exp-title">${exp ? 'Sửa khoản chi' : 'Thêm khoản chi'}</h2>
      <div class="field">
        <label for="exp-desc">Mô tả <i>*</i><span class="expense-count" id="exp-count">0/200</span></label>
        <input class="input" id="exp-desc" maxlength="200" autocomplete="off" placeholder="VD: Lẩu gà lá é">
        <p class="field-error" id="exp-e-desc"></p>
      </div>
      <div class="field">
        <label for="exp-amount">Số tiền <i>*</i></label>
        <div class="expense-amount"><input class="input" id="exp-amount" inputmode="numeric" autocomplete="off" placeholder="0"><span>VND</span></div>
        <p class="field-error" id="exp-e-amount"></p>
      </div>
      <div class="field">
        <label id="exp-cat-label">Loại <i>*</i></label>
        <div class="expense-cats" id="exp-cats" role="radiogroup" aria-labelledby="exp-cat-label">
          ${POPUP_CAT_ORDER.map((k) => `<button type="button" role="radio" class="chip ${k === cat ? 'chip-dark' : 'chip-outline'}" data-cat="${k}" aria-checked="${k === cat}">${CATS[k][0]}</button>`).join('')}
        </div>
        <p class="field-error" id="exp-e-cat"></p>
      </div>
      <div class="field">
        <label for="exp-date">Ngày <i>*</i></label>
        <input class="input" type="date" id="exp-date" min="${mn}" max="${mx}">
        <p class="field-error" id="exp-e-date"></p>
      </div>
      <div class="expense-warn" id="exp-warn" role="alert" hidden></div>
      <div class="modal-actions">
        ${exp ? '<button type="button" class="btn btn-secondary expense-delete" data-act="delete">Xóa</button>' : ''}
        <span class="expense-spacer"></span>
        <button type="button" class="btn btn-secondary" data-act="cancel">Hủy</button>
        <button type="submit" class="btn btn-primary" data-act="save">Lưu</button>
      </div>
    </form>`;
  document.body.append(backdrop);

  const q = (id) => backdrop.querySelector(`#${id}`);
  const desc = q('exp-desc');
  const amount = q('exp-amount');
  const date = q('exp-date');
  const warn = q('exp-warn');
  const saveBtn = backdrop.querySelector('[data-act="save"]');
  const previousFocus = document.activeElement;

  desc.value = exp ? exp.desc : '';
  amount.value = exp ? fmt(exp.amount) : '';
  date.value = exp ? exp.date : t < mn ? mn : t > mx ? mx : t;

  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    previousFocus?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && document.querySelectorAll('.modal-backdrop').length === 1) close();
  };
  document.addEventListener('keydown', onKey);

  // MSG 28: báo trước khi lưu nếu khoản này làm vượt ngân sách (vẫn cho lưu)
  const update = () => {
    q('exp-count').textContent = `${desc.value.length}/200`;
    const over = spentOther + digits(amount.value) - state.budget;
    warn.classList.remove('is-error');
    warn.hidden = !(digits(amount.value) > 0 && over > 0);
    if (!warn.hidden) warn.textContent = msg('MSG 28', { x: fmt(over) });
  };
  const setErr = (id, text, input) => {
    q(id).textContent = text;
    input?.classList.toggle('is-invalid', Boolean(text));
  };

  desc.addEventListener('input', update);
  amount.addEventListener('input', () => {
    const d = amount.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    amount.value = d ? fmt(+d) : '';
    update();
  });
  q('exp-cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    q('exp-cats').querySelectorAll('[data-cat]').forEach((x) => {
      const on = x === b;
      x.classList.toggle('chip-dark', on);
      x.classList.toggle('chip-outline', !on);
      x.setAttribute('aria-checked', String(on));
    });
    setErr('exp-e-cat', '');
  });
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);

  backdrop.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
    if (!(await confirmDialog(MSG['MSG 27'], { okText: 'Xóa', danger: true }))) return; // UC 26 B5
    try {
      await del(`/trips/${state.trip.id}/expenses/${exp.id}`);
      close();
      toast('Đã xóa khoản chi');
      await load();
    } catch (err) {
      if (err.status === 401) return;
      warn.hidden = false;
      warn.classList.add('is-error');
      warn.textContent = err.message;
    }
  });

  backdrop.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveBtn.disabled) return;
    const d = desc.value.trim();
    const a = digits(amount.value);
    const dt = date.value;
    const errors = [];
    const check = (ok, id, text, input) => {
      setErr(id, ok ? '' : text, input);
      if (!ok) errors.push(input || q('exp-cats').querySelector('[data-cat]'));
    };
    check(Boolean(d), 'exp-e-desc', 'Vui lòng nhập Mô tả.', desc);
    check(a > 0, 'exp-e-amount', 'Số tiền phải lớn hơn 0.', amount);
    check(Boolean(cat), 'exp-e-cat', 'Vui lòng chọn Loại.');
    check(Boolean(dt) && dt >= mn && dt <= mx, 'exp-e-date', `Ngày phải từ ${vnDate(mn)} đến ${vnDate(mx)}.`, date);
    if (errors.length) return errors[0].focus();

    const body = { description: d, amount: a, category: cat, expenseDate: dt };
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu…';
    try {
      if (exp) await put(`/trips/${state.trip.id}/expenses/${exp.id}`, body);
      else await post(`/trips/${state.trip.id}/expenses`, body);
      close();
      toast(exp ? 'Đã cập nhật khoản chi' : 'Đã thêm khoản chi');
      await load(); // UC 25 B7: gọi lại /budget để cập nhật thanh %, nhãn, biểu đồ
    } catch (err) {
      if (err.status === 401) return;
      const fieldMap = { description: ['exp-e-desc', desc], amount: ['exp-e-amount', amount], category: ['exp-e-cat'], expenseDate: ['exp-e-date', date] };
      const known = (err.errors || []).filter((x) => fieldMap[x.field]);
      known.forEach((x) => setErr(fieldMap[x.field][0], x.message, fieldMap[x.field][1]));
      if (!known.length) {
        warn.hidden = false;
        warn.classList.add('is-error');
        warn.textContent = err.message;
      }
      saveBtn.disabled = false;
      saveBtn.textContent = 'Lưu';
    }
  });

  update();
  desc.focus();
}

/* ---------- Gắn vào Screen 7 ---------- */
let bound = false;
function bind() {
  if (bound) return;
  bound = true;
  panel.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) {
      state.filter = f.dataset.filter;
      render();
      return;
    }
    if (e.target.closest('[data-budget="add"]')) return openExpense();
    const it = e.target.closest('[data-expense]');
    if (it) openExpense(state.exp.find((x) => String(x.id) === it.dataset.expense));
    if (e.target.closest('#b-edit-btn')) editBudget(true);
    if (e.target.closest('#b-cancel')) editBudget(false);
  });
  panel.addEventListener('submit', (e) => {
    if (e.target.id !== 'b-edit') return;
    e.preventDefault();
    saveBudget();
  });
  panel.addEventListener('input', (e) => {
    if (e.target.id !== 'b-input') return;
    const d = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    e.target.value = d ? fmt(+d) : '';
  });
  panel.addEventListener('keydown', (e) => {
    if (e.target.id === 'b-input' && e.key === 'Escape') editBudget(false);
  });
}

document.addEventListener('trip:tab', (e) => {
  if (e.detail.tab !== 'budget' || !e.detail.trip) return;
  const sameTrip = state.trip?.id === e.detail.trip.id;
  state.trip = e.detail.trip;
  if (!sameTrip || !panel.querySelector('.budget-fund')) {
    skeleton();
    bind();
  }
  load();
});
