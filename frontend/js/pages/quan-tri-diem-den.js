import { get, post, put, del } from '../api.js';
import { requireLogin, updateUser } from '../auth.js';
import { toast, confirmDialog, bindForm, showFieldError, clearFieldError, applyServerErrors } from '../ui.js';
import { MSG } from '../messages.js';
import { escapeHtml } from '../trip-utils.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const forbiddenBox = document.getElementById('forbidden-box');
const adminContent = document.getElementById('admin-content');
const listView = document.getElementById('list-view');
const tbody = document.getElementById('dest-tbody');
const form = document.getElementById('dest-form');
const formTitle = document.getElementById('form-title');
const monthsGrid = document.getElementById('best-months-grid');
const spotsList = document.getElementById('spots-list');
const costsList = document.getElementById('costs-list');

let editingId = null;

monthsGrid.innerHTML = Array.from({ length: 12 }, (_, i) =>
  `<label class="month-chip"><input type="checkbox" value="${i + 1}"> Tháng ${i + 1}</label>`,
).join('');

function addSpotRow(s = {}) {
  const row = document.createElement('div');
  row.className = 'sub-row';
  row.innerHTML = `
    <div class="field"><label>Tên địa điểm *</label><input class="input" data-k="name" value="${escapeHtml(s.name || '')}"></div>
    <div class="field">
      <label>Loại</label>
      <select class="input" data-k="category">
        <option value="SIGHTSEEING" ${s.category === 'SIGHTSEEING' ? 'selected' : ''}>Ngắm cảnh</option>
        <option value="FOOD" ${s.category === 'FOOD' ? 'selected' : ''}>Ăn uống</option>
        <option value="CULTURE" ${s.category === 'CULTURE' ? 'selected' : ''}>Văn hóa</option>
        <option value="TREKKING" ${s.category === 'TREKKING' ? 'selected' : ''}>Trekking</option>
      </select>
    </div>
    <div class="field"><label>Mô tả</label><input class="input" data-k="description" value="${escapeHtml(s.description || '')}"></div>
    <div class="field"><label>Vĩ độ</label><input class="input" data-k="latitude" type="number" step="any" value="${s.latitude ?? ''}"></div>
    <div class="field"><label>Kinh độ</label><input class="input" data-k="longitude" type="number" step="any" value="${s.longitude ?? ''}"></div>
    <button type="button" class="btn btn-secondary btn-sm" data-remove>Xóa</button>`;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  spotsList.append(row);
}

function addCostRow(c = {}) {
  const row = document.createElement('div');
  row.className = 'sub-row';
  row.innerHTML = `
    <div class="field">
      <label>Danh mục *</label>
      <select class="input" data-k="category">
        <option value="TRANSPORT" ${c.category === 'TRANSPORT' ? 'selected' : ''}>Xe khách</option>
        <option value="LODGING" ${c.category === 'LODGING' ? 'selected' : ''}>Homestay</option>
        <option value="FOOD" ${c.category === 'FOOD' ? 'selected' : ''}>Ăn uống</option>
        <option value="TICKETS" ${c.category === 'TICKETS' ? 'selected' : ''}>Vé tham quan</option>
      </select>
    </div>
    <div class="field"><label>Số tiền (VND) *</label><input class="input" data-k="amount" type="number" min="0" value="${c.amount ?? ''}"></div>
    <div class="field"><label>Ghi chú</label><input class="input" data-k="note" value="${escapeHtml(c.note || '')}"></div>
    <button type="button" class="btn btn-secondary btn-sm" data-remove>Xóa</button>`;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  costsList.append(row);
}

function showList() {
  editingId = null;
  form.hidden = true;
  listView.hidden = false;
}

function openForm(d = null) {
  editingId = d?.id ?? null;
  formTitle.textContent = editingId ? `Sửa điểm đến: ${d.name}` : 'Thêm điểm đến mới';
  form.reset();
  form.querySelectorAll('.is-invalid').forEach(clearFieldError);

  form.name.value = d?.name ?? '';
  form.slug.value = d?.slug ?? '';
  form.province.value = d?.province ?? '';
  form.region.value = d?.region ?? '';
  form.latitude.value = d?.latitude ?? '';
  form.longitude.value = d?.longitude ?? '';
  form.imageUrl.value = d?.imageUrl ?? '';
  form.description.value = d?.description ?? '';

  const best = new Set(
    d?.bestMonths ?? d?.bestTimeChart?.months?.filter((x) => x.level === 'BEST').map((x) => x.month) ?? [],
  );
  monthsGrid.querySelectorAll('input').forEach((cb) => (cb.checked = best.has(Number(cb.value))));

  spotsList.innerHTML = '';
  (d?.spots ?? []).forEach(addSpotRow);

  costsList.innerHTML = '';
  (d?.costs?.items ?? d?.costs ?? []).forEach(addCostRow);

  listView.hidden = true;
  form.hidden = false;
}

async function loadDestinations() {
  tbody.innerHTML = '<tr><td colspan="6" class="meta">Đang tải...</td></tr>';
  try {
    const { items = [] } = await get('/public/destinations?page=1&size=100');
    tbody.innerHTML = items.length
      ? items
          .map(
            (d) => `
          <tr>
            <td><strong>${escapeHtml(d.name)}</strong></td>
            <td><code>${escapeHtml(d.slug)}</code></td>
            <td>${escapeHtml(d.province || '')}</td>
            <td>${escapeHtml(d.regionLabel || d.region || '')}</td>
            <td>${escapeHtml(d.bestTime || '—')}</td>
            <td>
              <div class="admin-actions">
                <button type="button" class="btn btn-secondary btn-sm" data-edit="${escapeHtml(d.slug)}">Sửa</button>
                <button type="button" class="btn btn-danger btn-sm" data-delete="${d.id}">Xóa</button>
              </div>
            </td>
          </tr>`,
          )
          .join('')
      : '<tr><td colspan="6" class="meta">Chưa có điểm đến nào.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="meta">${escapeHtml(err.message)}</td></tr>`;
  }
}

tbody.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    try {
      openForm(await get(`/public/destinations/${encodeURIComponent(editBtn.dataset.edit)}`));
    } catch (err) {
      toast(err.message, 'error');
    }
    return;
  }
  const delBtn = e.target.closest('[data-delete]');
  if (delBtn) {
    if (!(await confirmDialog(MSG['MSG 27'], { okText: 'Xóa', danger: true }))) return;
    try {
      await del(`/admin/destinations/${delBtn.dataset.delete}`);
      toast(MSG['MSG 34'], 'success');
      await loadDestinations();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

document.getElementById('btn-add').addEventListener('click', () => openForm(null));
document.getElementById('btn-cancel').addEventListener('click', showList);
document.getElementById('btn-add-spot').addEventListener('click', () => addSpotRow());
document.getElementById('btn-add-cost').addEventListener('click', () => addCostRow());

bindForm(form, async () => {
  const slug = form.slug.value.trim();
  if (!SLUG_RE.test(slug)) {
    showFieldError(form.slug, 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.');
    form.slug.focus();
    return;
  }

  const payload = {
    name: form.name.value.trim(),
    slug,
    province: form.province.value.trim(),
    region: form.region.value,
    latitude: Number(form.latitude.value),
    longitude: Number(form.longitude.value),
    imageUrl: form.imageUrl.value.trim() || undefined,
    description: form.description.value.trim() || undefined,
    bestMonths: [...monthsGrid.querySelectorAll('input:checked')].map((cb) => Number(cb.value)),
    spots: [...spotsList.querySelectorAll('.sub-row')]
      .map((r, i) => {
        const v = (k) => r.querySelector(`[data-k="${k}"]`).value.trim();
        if (!v('name')) return null;
        return {
          name: v('name'),
          category: v('category'),
          description: v('description') || undefined,
          latitude: v('latitude') ? Number(v('latitude')) : undefined,
          longitude: v('longitude') ? Number(v('longitude')) : undefined,
          sortOrder: i,
        };
      })
      .filter(Boolean),
    costs: [...costsList.querySelectorAll('.sub-row')]
      .map((r, i) => {
        const v = (k) => r.querySelector(`[data-k="${k}"]`).value.trim();
        if (!v('amount')) return null;
        return { category: v('category'), amount: Number(v('amount')), note: v('note') || undefined, sortOrder: i };
      })
      .filter(Boolean),
  };

  try {
    if (editingId) await put(`/admin/destinations/${editingId}`, payload);
    else await post('/admin/destinations', payload);
    toast(MSG['MSG 34'], 'success');
    showList();
    await loadDestinations();
  } catch (err) {
    if (err.status === 403) {
      adminContent.hidden = true;
      forbiddenBox.hidden = false;
      return;
    }
    if (err.status === 409) {
      showFieldError(form.slug, err.message);
      form.slug.focus();
      return;
    }
    if (err.errors?.length) applyServerErrors(form, err.errors);
    else toast(err.message, 'error');
  }
});

async function init() {
  if (!requireLogin()) return;
  try {
    const me = await get('/auth/me');
    updateUser(me);
    if (me.role !== 'CONTENT_ADMIN') {
      forbiddenBox.hidden = false;
      return;
    }
    adminContent.hidden = false;
    await loadDestinations();
  } catch {
    forbiddenBox.hidden = false;
  }
}

init();