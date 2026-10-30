// Component dùng chung: toast, popup xác nhận, lỗi dưới ô nhập (CBR 1).
import { msg } from './messages.js';

/* ---------- Toast: toast('Đã lưu thay đổi.', 'success' | 'warning' | 'error') ---------- */
function toastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  return region;
}

export function toast(text, type = 'success', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = text;
  toastRegion().append(el);
  setTimeout(() => el.remove(), duration);
}

/* ---------- Popup ---------- */
function openModal({ message, okText = 'OK', cancelText, danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p></p>
        <div class="modal-actions">
          ${cancelText ? '<button type="button" class="btn btn-secondary" data-act="cancel"></button>' : ''}
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-act="ok"></button>
        </div>
      </div>`;
    backdrop.querySelector('p').textContent = message;
    backdrop.querySelector('[data-act="ok"]').textContent = okText;
    if (cancelText) backdrop.querySelector('[data-act="cancel"]').textContent = cancelText;

    const previousFocus = document.activeElement;
    const close = (value) => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    backdrop.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (act) close(act === 'ok');
      else if (e.target === backdrop && cancelText) close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    backdrop.querySelector('[data-act="ok"]').focus();
  });
}

/** if (await confirmDialog(msg('MSG 27'), { okText: 'Xóa', danger: true })) ... */
export function confirmDialog(message, { okText = 'Đồng ý', cancelText = 'Hủy', danger = false } = {}) {
  return openModal({ message, okText, cancelText, danger });
}

/** Popup một nút OK (ví dụ MSG 10). */
export function alertDialog(message, okText = 'OK') {
  return openModal({ message, okText });
}

/* ---------- Lỗi dưới ô nhập (CBR 1) ---------- */
function errorEl(input) {
  const field = input.closest('.field') || input.parentElement;
  let el = field.querySelector('.field-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'field-error';
    field.append(el);
  }
  if (!el.id) el.id = `${input.name || input.id}-error`;
  input.setAttribute('aria-describedby', el.id);
  return el;
}

export function showFieldError(input, text) {
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  errorEl(input).textContent = text;
}

export function clearFieldError(input) {
  input.classList.remove('is-invalid');
  input.removeAttribute('aria-invalid');
  errorEl(input).textContent = '';
}

const maxLen = (input) => Number(input.dataset.maxlength) || (input.maxLength > 0 ? input.maxLength : 0);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Kiểm tra một ô theo thuộc tính HTML: required, maxlength, type="email", type="number" min.
 * Tên trường lấy từ data-label, không có thì từ <label>.
 */
export function validateInput(input) {
  const label = input.dataset.label || input.closest('.field')?.querySelector('label')?.textContent.trim() || input.name;
  const value = input.value.trim();
  let error = '';
  if (input.required && !value) error = msg('MSG 29', { label });
  else if (value && maxLen(input) && value.length > maxLen(input)) error = msg('MSG 30', { label, max: maxLen(input) });
  else if (value && input.type === 'email' && !EMAIL_RE.test(value)) error = msg('MSG 3');
  else if (value && input.dataset.type === 'money' && !/^\d+$/.test(value.replace(/[.\s]/g, ''))) error = msg('MSG 3');
  if (error) showFieldError(input, error);
  else clearFieldError(input);
  return !error;
}

/**
 * Gắn kiểm tra cho form: lỗi hiện khi rời ô và khi bấm lưu; con trỏ nhảy tới ô lỗi đầu tiên.
 * onSubmit(form) chỉ chạy khi mọi ô hợp lệ. Dùng data-maxlength (thay cho maxlength) nếu muốn cho gõ quá rồi báo MSG 30.
 */
export function bindForm(form, onSubmit) {
  form.noValidate = true;
  const inputs = () => [...form.querySelectorAll('input, textarea, select')].filter((el) => el.name);
  for (const input of inputs()) {
    input.addEventListener('blur', () => validateInput(input));
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = inputs().filter((input) => !validateInput(input));
    if (invalid.length) return invalid[0].focus();
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    try {
      await onSubmit(form);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/** Gắn lỗi theo trường từ server (400 errors[]) vào đúng ô. Trả true nếu gắn được ít nhất một lỗi. */
export function applyServerErrors(form, errors = []) {
  let first = null;
  for (const { field, message } of errors) {
    const input = form.elements[field];
    if (!input) continue;
    showFieldError(input, message);
    first ||= input;
  }
  first?.focus();
  return Boolean(first);
}

/** Lấy dữ liệu form thành object (đã trim). */
export function formData(form) {
  return Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
}
