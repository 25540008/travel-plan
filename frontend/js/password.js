// Ô mật khẩu dùng chung cho Screen 10, 11: nút con mắt hiện/ẩn, cảnh báo Caps Lock (UC 2 · BR 5).

/** Gắn cho mọi .password-wrap trong trang. */
export function initPasswordFields(root = document) {
  for (const wrap of root.querySelectorAll('.password-wrap')) {
    const input = wrap.querySelector('input');
    const toggle = wrap.querySelector('.password-toggle');
    toggle?.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      toggle.setAttribute('aria-pressed', String(show));
    });

    const warning = wrap.parentElement.querySelector('.caps-warning');
    if (!warning) continue;
    const check = (e) => {
      if (e.getModifierState) warning.hidden = !e.getModifierState('CapsLock');
    };
    input.addEventListener('keydown', check);
    input.addEventListener('keyup', check);
    input.addEventListener('blur', () => (warning.hidden = true));
  }
}
