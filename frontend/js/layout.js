// Header và footer chung (Screen 1). Trang chỉ cần:
//   <body data-page="myTrips"> <div id="site-header"></div> ... <div id="site-footer"></div>
//   <script type="module" src="js/layout.js"></script>
import { pageUrl } from './config.js';
import { getUser, isLoggedIn, clearSession } from './auth.js';
import { confirmDialog } from './ui.js';
import { msg } from './messages.js';

const NAV = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'templates', label: 'Lịch trình mẫu' },
  { key: 'destinations', label: 'Điểm đến' },
  { key: 'myTrips', label: 'Chuyến đi của tôi' },
];

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts.at(-2)?.[0] || '') + (parts.at(-1)?.[0] || '')).toUpperCase() || 'TP';
}

function accountHtml() {
  if (!isLoggedIn()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return `
      <a class="link" href="${pageUrl('login')}?next=${next}">Đăng nhập</a>
      <a class="btn btn-secondary btn-sm" href="${pageUrl('register')}">Đăng ký miễn phí</a>`;
  }
  const name = getUser()?.fullName || 'Tài khoản';
  return `
    <a class="btn btn-primary btn-sm" href="${pageUrl('createTrip')}">Tạo chuyến đi</a>
    <div class="user-menu">
      <button type="button" class="user-menu-button" aria-haspopup="true" aria-expanded="false">
        <span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>${escapeHtml(name)}
      </button>
      <ul class="user-menu-list" hidden>
        <li><a href="${pageUrl('myTrips')}">Chuyến đi của tôi</a></li>
        <li><button type="button" data-action="logout">Đăng xuất</button></li>
      </ul>
    </div>`;
}

function renderHeader(el, current) {
  el.outerHTML = `
    <header class="site-header">
      <div class="container">
        <a class="brand" href="${pageUrl('home')}"><span class="brand-mark" aria-hidden="true">✦</span>travelplan</a>
        <button type="button" class="nav-toggle" aria-label="Mở menu" aria-expanded="false">☰</button>
        <nav class="site-nav" aria-label="Menu chính">
          ${NAV.map((n) => `<a href="${pageUrl(n.key)}"${n.key === current ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}
        </nav>
        <div class="header-actions">${accountHtml()}</div>
      </div>
    </header>`;

  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  const menuBtn = header.querySelector('.user-menu-button');
  if (menuBtn) {
    const list = header.querySelector('.user-menu-list');
    menuBtn.addEventListener('click', () => {
      list.hidden = !list.hidden;
      menuBtn.setAttribute('aria-expanded', String(!list.hidden));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) list.hidden = true;
    });
    header.querySelector('[data-action="logout"]').addEventListener('click', async () => {
      if (!(await confirmDialog(msg('MSG 26'), { okText: 'Đăng xuất' }))) return;
      clearSession();
      location.href = pageUrl('home');
    });
  }
}

function renderFooter(el) {
  el.outerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="${pageUrl('home')}">travelplan</a>
            <p class="meta" style="color:inherit">Đi nhiều, tính ít, chơi hết mình.</p>
          </div>
          <div>
            <h4>Điểm đến</h4>
            <ul>
              <li><a href="${pageUrl('destinationDetail', { slug: 'da-lat' })}">Đà Lạt</a></li>
              <li><a href="${pageUrl('destinationDetail', { slug: 'hoi-an' })}">Hội An</a></li>
              <li><a href="${pageUrl('destinationDetail', { slug: 'phu-quoc' })}">Phú Quốc</a></li>
              <li><a href="${pageUrl('destinationDetail', { slug: 'sa-pa' })}">Sa Pa</a></li>
            </ul>
          </div>
          <div>
            <h4>Lên kế hoạch</h4>
            <ul>
              <li><a href="${pageUrl('createTrip')}">Tạo chuyến đi</a></li>
              <li><a href="${pageUrl('templates')}">Lịch trình mẫu</a></li>
              <li><a href="${pageUrl('myTrips')}">Quỹ chuyến đi</a></li>
            </ul>
          </div>
          <div>
            <h4>Tài khoản</h4>
            <ul>
              <li><a href="${pageUrl('login')}">Đăng nhập</a></li>
              <li><a href="${pageUrl('register')}">Đăng ký</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} travelplan</div>
      </div>
    </footer>`;
}

const headerEl = document.getElementById('site-header');
const footerEl = document.getElementById('site-footer');
if (headerEl) renderHeader(headerEl, document.body.dataset.page);
if (footerEl) renderFooter(footerEl);
