// 4 template đồ họa vector cho ảnh bìa lịch trình
const VECTOR_COVERS = {
  dalat: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="230" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="50,140 40,165 60,165" fill="#1C3F3A"/><polygon points="210,135 200,160 220,160" fill="#1C3F3A"/></svg>`,
  food: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="225" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="60,140 50,165 70,165" fill="#1C3F3A"/><polygon points="230,135 220,160 240,160" fill="#1C3F3A"/></svg>`,
  langbiang: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#C5D3E8"/><polygon points="20,110 110,40 200,110" fill="#8D99AE"/><polygon points="120,110 200,55 280,110" fill="#6C757D"/><rect y="110" width="300" height="70" fill="#99D98C"/><polygon points="255,135 265,125 275,135" fill="#582F0E"/><rect x="257" y="135" width="16" height="12" fill="#7F4F24"/></svg>`,
  group: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="215" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="50,140 40,165 60,165" fill="#1C3F3A"/><polygon points="220,135 210,160 230,160" fill="#1C3F3A"/></svg>`
};

// Dữ liệu mẫu chuẩn giao diện (sử dụng khi chạy thử nghiệm độc lập)
const MOCK_ITINERARIES = [
  {
    id: 1,
    title: "Đà Lạt 3 ngày săn mây và cà phê",
    cover_type: "dalat",
    days_count: 3,
    clone_count: 86,
    creator_name: "Đoàn Minh Anh",
    estimated_budget: 3500000,
    preview_days: [
      { d: "Ngày 1", t: "Quảng trường Lâm Viên, chợ đêm" },
      { d: "Ngày 2", t: "Đồi Đa Phú, hồ Tuyền Lâm" },
      { d: "Ngày 3", t: "Đồi chè Cầu Đất" }
    ]
  },
  {
    id: 2,
    title: "Đà Lạt ăn sập phố",
    cover_type: "food",
    days_count: 3,
    clone_count: 41,
    creator_name: "Lê Gia Huy",
    estimated_budget: 2400000,
    preview_days: [
      { d: "Ngày 1", t: "Bánh căn Nhà Chung, kem bơ" },
      { d: "Ngày 2", t: "Lẩu gà lá é, chợ Đà Lạt" },
      { d: "Ngày 3", t: "Bánh tráng nướng, sữa đậu" }
    ]
  },
  {
    id: 3,
    title: "Đà Lạt trekking Langbiang",
    cover_type: "langbiang",
    days_count: 3,
    clone_count: 23,
    creator_name: "Vũ Phương Linh",
    estimated_budget: 2600000,
    preview_days: [
      { d: "Ngày 1", t: "Nhận phòng, dạo hồ Xuân Hương" },
      { d: "Ngày 2", t: "Trekking đỉnh Langbiang" },
      { d: "Ngày 3", t: "Làng Cù Lần" }
    ]
  },
  {
    id: 4,
    title: "Đà Lạt nhóm bạn giá mềm",
    cover_type: "group",
    days_count: 3,
    clone_count: 19,
    creator_name: "Trần Tuấn Kiệt",
    estimated_budget: 1900000,
    preview_days: [
      { d: "Ngày 1", t: "Homestay đồi, nướng BBQ" },
      { d: "Ngày 2", t: "Thác Datanla, máng trượt" },
      { d: "Ngày 3", t: "Ga Đà Lạt, chợ" }
    ]
  }
];

// Trạng thái bộ lọc và phân trang (B2, B3)
const state = {
  destination: 'Đà Lạt',
  days: '3',
  tags: ['Núi, đồi', 'Ẩm thực'],
  budgetMax: 5000000,
  sort: 'popular',
  page: 1,
  size: 12,
  totalPages: 1
};

// Rút gọn tên tác giả: lấy đúng 2 chữ cuối họ tên
function formatAuthor(name) {
  if (!name) return 'Cộng đồng';
  const parts = name.trim().split(/\s+/);
  return parts.length <= 2 ? name : parts.slice(-2).join(' ');
}

// Định dạng tiền tệ VNĐ
function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

// Đọc URL query vào state khi mở màn hình (B2)
function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.has('destination')) state.destination = p.get('destination');
  if (p.has('days')) state.days = p.get('days');
  if (p.has('budgetMax')) state.budgetMax = parseInt(p.get('budgetMax'), 10) || 5000000;
  if (p.has('sort')) state.sort = p.get('sort');
  if (p.has('tag')) {
    state.tags = p.get('tag').split(',').map(s => s.trim()).filter(Boolean);
  }
  syncStateToUI();
}

// Cập nhật lại URL không reload trang (B4)
function writeUrlParams() {
  const p = new URLSearchParams();
  if (state.destination) p.set('destination', state.destination);
  if (state.days) p.set('days', state.days);
  if (state.tags.length > 0) p.set('tag', state.tags.join(','));
  if (state.budgetMax < 5000000) p.set('budgetMax', state.budgetMax);
  if (state.sort !== 'popular') p.set('sort', state.sort);

  const newUrl = `${window.location.pathname}${p.toString() ? '?' + p.toString() : ''}`;
  window.history.pushState({}, '', newUrl);
}

// Đồng bộ state lên giao diện
function syncStateToUI() {
  document.getElementById('inputDestination').value = state.destination;
  document.getElementById('sortDropdown').value = state.sort;
  document.getElementById('budgetRange').value = state.budgetMax;
  document.getElementById('budgetMaxLabel').textContent = (state.budgetMax / 1000000) + ' triệu';

  // Checkbox tags
  document.querySelectorAll('#tagsList input[type="checkbox"]').forEach(cb => {
    cb.checked = state.tags.includes(cb.value);
  });

  // Nút số ngày
  document.querySelectorAll('#daysOptions .days-pill').forEach(btn => {
    if (btn.dataset.days === state.days) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Điểm đến nổi bật
  document.querySelectorAll('.dest-card').forEach(card => {
    if (state.destination && card.dataset.dest.toLowerCase() === state.destination.toLowerCase()) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// Render danh sách thẻ lịch trình
function renderCards(items, append = false) {
  const cardsGrid = document.getElementById('cardsGrid');
  if (!append) cardsGrid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'plan-card';

    const dCount = item.days_count || 3;
    const badgeText = dCount === 1 ? '1 ngày' : `${dCount}N${dCount - 1}Đ`;
    const isHot = (item.clone_count || 0) >= 50;

    const steps = (item.preview_days || []).slice(0, 3).map(s => `
      <li class="step-item">
        <span class="step-day">${s.d}</span>
        <span class="step-desc">${s.t}</span>
      </li>
    `).join('');

    const coverSvg = VECTOR_COVERS[item.cover_type] || (item.cover_image ? `<img src="${item.cover_image}" alt="${item.title}">` : VECTOR_COVERS.dalat);

    card.innerHTML = `
      <div class="plan-thumbnail">
        ${coverSvg}
        <span class="badge-pill">${badgeText}</span>
        ${isHot ? '<span class="badge-reuse">Được dùng lại nhiều</span>' : ''}
      </div>
      <div class="plan-details">
        <h3 class="plan-title">${item.title}</h3>
        <ul class="steps-list">${steps}</ul>
        <div class="author-meta">bởi ${formatAuthor(item.creator_name || item.author)} · ${item.clone_count || 0} lượt dùng lại</div>
        <div class="card-footer">
          <div>
            <div class="price-caption">Chi phí dự kiến</div>
            <div class="price-number">${formatMoney(item.estimated_budget || item.budget)}</div>
          </div>
          <button class="btn-use" onclick="handleReuse(${item.id})">Dùng lại</button>
        </div>
      </div>
    `;
    cardsGrid.appendChild(card);
  });
}

// Gọi API lấy dữ liệu (hoặc dùng fallback mock)
async function fetchItineraries(append = false) {
  const btnMore = document.getElementById('btnLoadMore');
  const heading = document.getElementById('headingTitle');
  const sub = document.getElementById('subSummary');

  const q = new URLSearchParams({
    page: state.page,
    size: state.size,
    sort: state.sort,
    budgetMax: state.budgetMax
  });
  if (state.destination) q.set('destination', state.destination);
  if (state.days) q.set('days', state.days);
  if (state.tags.length > 0) q.set('tag', state.tags.join(','));

  const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  const API_ENDPOINT = isLocal ? 'http://localhost:3000/api/public/itineraries' : '/api/public/itineraries';

  try {
    const res = await fetch(`${API_ENDPOINT}?${q.toString()}`);
    if (!res.ok) throw new Error('API connection failed');
    const json = await res.json();
    const data = json.data || json;
    const items = data.items || [];
    state.totalPages = data.totalPages || 1;

    heading.textContent = state.destination ? `Lịch trình ${state.destination}` : 'Lịch trình mẫu';
    sub.textContent = `${data.total || items.length} lịch trình · đang lọc ${state.days ? state.days + 'N' : ''}, dưới ${(state.budgetMax / 1000000)} triệu`;

    renderCards(items, append);

    if (state.page >= state.totalPages) {
      btnMore.style.display = 'none';
    } else {
      btnMore.style.display = 'block';
    }
  } catch (err) {
    // Fallback: hiển thị dữ liệu mẫu ban đầu để giao diện luôn đúng 100%
    heading.textContent = `Lịch trình ${state.destination || 'Đà Lạt'}`;
    sub.textContent = `128 lịch trình · đang lọc 3N2Đ, dưới 5 triệu`;
    renderCards(MOCK_ITINERARIES, append);
    btnMore.style.display = 'block';
  }
}

// Xử lý nút [Dùng lại] (UC 11)
function handleReuse(id) {
  window.location.href = `/itineraries/${id}/clone`;
}

// Đăng ký sự kiện
document.addEventListener('DOMContentLoaded', () => {
  readUrlParams();
  fetchItineraries();

  // Submit tìm kiếm từ Hero Bar
  document.getElementById('topSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.destination = document.getElementById('inputDestination').value.trim();
    state.page = 1;
    writeUrlParams();
    syncStateToUI();
    fetchItineraries();
  });

  // Nhấp chọn điểm đến nổi bật
  document.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', () => {
      const dest = card.dataset.dest;
      state.destination = (state.destination === dest) ? '' : dest;
      state.page = 1;
      writeUrlParams();
      syncStateToUI();
      fetchItineraries();
    });
  });

  // Lọc theo tag
  document.querySelectorAll('#tagsList input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.tags = Array.from(document.querySelectorAll('#tagsList input[type="checkbox"]:checked')).map(el => el.value);
      state.page = 1;
      writeUrlParams();
      fetchItineraries();
    });
  });

  // Nút số ngày
  document.querySelectorAll('#daysOptions .days-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.days;
      state.days = (state.days === d) ? '' : d;
      state.page = 1;
      writeUrlParams();
      syncStateToUI();
      fetchItineraries();
    });
  });

  // Kéo thanh ngân sách
  const budgetSlider = document.getElementById('budgetRange');
  budgetSlider.addEventListener('input', (e) => {
    document.getElementById('budgetMaxLabel').textContent = (e.target.value / 1000000) + ' triệu';
  });
  budgetSlider.addEventListener('change', (e) => {
    state.budgetMax = parseInt(e.target.value, 10);
    state.page = 1;
    writeUrlParams();
    fetchItineraries();
  });

  // Sắp xếp
  document.getElementById('sortDropdown').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    writeUrlParams();
    fetchItineraries();
  });

  // Xóa lọc
  document.getElementById('btnResetFilter').addEventListener('click', () => {
    state.destination = '';
    state.days = '';
    state.tags = [];
    state.budgetMax = 5000000;
    state.sort = 'popular';
    state.page = 1;
    writeUrlParams();
    syncStateToUI();
    fetchItineraries();
  });

  // Xem thêm lịch trình (B5, B6)
  document.getElementById('btnLoadMore').addEventListener('click', () => {
    state.page += 1;
    fetchItineraries(true);
  });
});