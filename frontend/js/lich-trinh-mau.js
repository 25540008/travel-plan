import { get } from './api.js';
import { formatMoney } from './format.js';
import { pageUrl } from './config.js';
import { getUser } from './auth.js';

// Vector minh họa bìa thẻ
const VECTOR_COVERS = {
  dalat: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="230" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="50,140 40,165 60,165" fill="#1C3F3A"/><polygon points="210,135 200,160 220,160" fill="#1C3F3A"/></svg>`,
  food: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="225" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="60,140 50,165 70,165" fill="#1C3F3A"/><polygon points="230,135 220,160 240,160" fill="#1C3F3A"/></svg>`,
  langbiang: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#C5D3E8"/><polygon points="20,110 110,40 200,110" fill="#8D99AE"/><polygon points="120,110 200,55 280,110" fill="#6C757D"/><rect y="110" width="300" height="70" fill="#99D98C"/><polygon points="255,135 265,125 275,135" fill="#582F0E"/><rect x="257" y="135" width="16" height="12" fill="#7F4F24"/></svg>`,
  group: `<svg viewBox="0 0 300 180" preserveAspectRatio="none"><rect width="300" height="180" fill="#E6BE8A"/><circle cx="215" cy="80" r="32" fill="#FCE9B8"/><path d="M0 120 Q150 95 300 120 L300 180 L0 180 Z" fill="#719B91"/><ellipse cx="150" cy="140" rx="60" ry="14" fill="#B4D5CD"/><polygon points="50,140 40,165 60,165" fill="#1C3F3A"/><polygon points="220,135 210,160 230,160" fill="#1C3F3A"/></svg>`
};

// Dữ liệu mẫu phong phú để test
const FULL_MOCK_ITINERARIES = [
  // --- ĐÀ LẠT ---
  {
    id: 1,
    title: "Đà Lạt 3 ngày săn mây và cà phê",
    destination: "Đà Lạt",
    cover_type: "dalat",
    days_count: 3,
    clone_count: 86,
    created_at: "2026-10-25T10:00:00Z",
    creator_name: "Đoàn Minh Anh",
    estimated_budget: 3500000,
    tags: ["Núi, đồi", "Cà phê", "Nhóm bạn"],
    preview_days: [
      { d: "Ngày 1", t: "Quảng trường Lâm Viên, chợ đêm" },
      { d: "Ngày 2", t: "Đồi Đa Phú, hồ Tuyền Lâm" },
      { d: "Ngày 3", t: "Đồi chè Cầu Đất" }
    ]
  },
  {
    id: 2,
    title: "Đà Lạt ăn sập phố",
    destination: "Đà Lạt",
    cover_type: "food",
    days_count: 3,
    clone_count: 41,
    created_at: "2026-10-28T08:30:00Z",
    creator_name: "Lê Gia Huy",
    estimated_budget: 2400000,
    tags: ["Ẩm thực", "Tiết kiệm"],
    preview_days: [
      { d: "Ngày 1", t: "Bánh căn Nhà Chung, kem bơ" },
      { d: "Ngày 2", t: "Lẩu gà lá é, chợ Đà Lạt" },
      { d: "Ngày 3", t: "Bánh tráng nướng, sữa đậu" }
    ]
  },
  {
    id: 3,
    title: "Đà Lạt trekking Langbiang",
    destination: "Đà Lạt",
    cover_type: "langbiang",
    days_count: 3,
    clone_count: 23,
    created_at: "2026-10-15T09:15:00Z",
    creator_name: "Vũ Phương Linh",
    estimated_budget: 2600000,
    tags: ["Núi, đồi", "Trekking"],
    preview_days: [
      { d: "Ngày 1", t: "Nhận phòng, dạo hồ Xuân Hương" },
      { d: "Ngày 2", t: "Trekking đỉnh Langbiang" },
      { d: "Ngày 3", t: "Làng Cù Lần" }
    ]
  },
  {
    id: 4,
    title: "Đà Lạt nhóm bạn giá mềm",
    destination: "Đà Lạt",
    cover_type: "group",
    days_count: 3,
    clone_count: 19,
    created_at: "2026-10-12T14:20:00Z",
    creator_name: "Trần Tuấn Kiệt",
    estimated_budget: 1900000,
    tags: ["Nhóm bạn", "Tiết kiệm"],
    preview_days: [
      { d: "Ngày 1", t: "Homestay đồi, nướng BBQ" },
      { d: "Ngày 2", t: "Thác Datanla, máng trượt" },
      { d: "Ngày 3", t: "Ga Đà Lạt, chợ" }
    ]
  },
  {
    id: 5,
    title: "Đà Lạt cuối tuần 2N1Đ nhẹ nhàng",
    destination: "Đà Lạt",
    cover_type: "dalat",
    days_count: 2,
    clone_count: 55,
    created_at: "2026-11-01T07:00:00Z",
    creator_name: "Nguyễn Hải Đăng",
    estimated_budget: 1800000,
    tags: ["Cà phê", "Tiết kiệm"],
    preview_days: [
      { d: "Ngày 1", t: "Chợ Đà Lạt, tiệm cà phê Túi Mơ To" },
      { d: "Ngày 2", t: "Dinh 1 Bảo Đại, Vườn hoa thành phố" }
    ]
  },
  {
    id: 6,
    title: "Đà Lạt 4 ngày 3 đêm khám phá toàn cảnh",
    destination: "Đà Lạt",
    cover_type: "langbiang",
    days_count: 4,
    clone_count: 62,
    created_at: "2026-10-20T11:45:00Z",
    creator_name: "Phạm Thùy Dung",
    estimated_budget: 4200000,
    tags: ["Núi, đồi", "Trekking", "Ẩm thực"],
    preview_days: [
      { d: "Ngày 1", t: "Quảng trường Lâm Viên, Chợ đêm" },
      { d: "Ngày 2", t: "Hồ Suối Vàng, Cây thông cô đơn" },
      { d: "Ngày 3", t: "Đồi chè Cầu Đất, Cánh đồng hoa cẩm tú cầu" }
    ]
  },

  // --- SA PA ---
  {
    id: 7,
    title: "Sa Pa mùa lúa chín & Fansipan",
    destination: "Sa Pa",
    cover_type: "langbiang",
    days_count: 3,
    clone_count: 78,
    created_at: "2026-10-18T16:00:00Z",
    creator_name: "Hoàng Mai Hương",
    estimated_budget: 3200000,
    tags: ["Núi, đồi", "Trekking"],
    preview_days: [
      { d: "Ngày 1", t: "Nhà thờ Đá, dạo bản Cát Cát" },
      { d: "Ngày 2", t: "Chinh phục đỉnh Fansipan bằng cáp treo" },
      { d: "Ngày 3", t: "Đèo Ô Quy Hồ, Cổng Trời săn hoàng hôn" }
    ]
  },
  {
    id: 8,
    title: "Sa Pa trekking bản làng Tả Van",
    destination: "Sa Pa",
    cover_type: "group",
    days_count: 2,
    clone_count: 35,
    created_at: "2026-10-22T09:30:00Z",
    creator_name: "Lê Minh Trí",
    estimated_budget: 1700000,
    tags: ["Trekking", "Tiết kiệm", "Nhóm bạn"],
    preview_days: [
      { d: "Ngày 1", t: "Đi bộ xuyên thung lũng Mường Hoa, ngủ homestay Tả Van" },
      { d: "Ngày 2", t: "Bản Giang Mỗ, tắm lá thuốc người Dao đỏ" }
    ]
  },
  {
    id: 9,
    title: "Sa Pa 1 ngày dạo quanh thị trấn sương mù",
    destination: "Sa Pa",
    cover_type: "dalat",
    days_count: 1,
    clone_count: 14,
    created_at: "2026-11-03T10:00:00Z",
    creator_name: "Bùi Ngọc Tuấn",
    estimated_budget: 1200000,
    tags: ["Ẩm thực", "Cà phê"],
    preview_days: [
      { d: "Ngày 1", t: "Hồ Sa Pa, chợ đêm nướng Sa Pa, Sun Plaza" }
    ]
  },

  // --- HỘI AN ---
  {
    id: 10,
    title: "Hội An 2N1Đ ký ức phố hoài và ẩm thực",
    destination: "Hội An",
    cover_type: "food",
    days_count: 2,
    clone_count: 92,
    created_at: "2026-10-29T13:20:00Z",
    creator_name: "Trịnh Thảo Nhi",
    estimated_budget: 2100000,
    tags: ["Ẩm thực", "Tiết kiệm"],
    preview_days: [
      { d: "Ngày 1", t: "Chùa Cầu, thả hoa đăng sông Hoài, cơm gà Bà Buội" },
      { d: "Ngày 2", t: "Làng gốm Thanh Hà, đạp xe ra biển An Bàng" }
    ]
  },
  {
    id: 11,
    title: "Hội An - Rừng dừa Bảy Mẫu náo nhiệt",
    destination: "Hội An",
    cover_type: "group",
    days_count: 3,
    clone_count: 48,
    created_at: "2026-10-14T08:00:00Z",
    creator_name: "Đỗ Quốc Bảo",
    estimated_budget: 2800000,
    tags: ["Nhóm bạn", "Ẩm thực"],
    preview_days: [
      { d: "Ngày 1", t: "Dạo phố cổ, may đồ lấy liền, uống mót" },
      { d: "Ngày 2", t: "Đi thuyền thúng Rừng dừa Bảy Mẫu, xem múa thúng" },
      { d: "Ngày 3", t: "Chợ cá Hội An, bánh mì Phượng" }
    ]
  },

  // --- PHÚ QUỐC ---
  {
    id: 12,
    title: "Phú Quốc 4N3Đ biển xanh và tour 4 đảo",
    destination: "Phú Quốc",
    cover_type: "dalat",
    days_count: 4,
    clone_count: 88,
    created_at: "2026-10-11T12:00:00Z",
    creator_name: "Ngô Khánh Linh",
    estimated_budget: 4800000,
    tags: ["Nhóm bạn", "Ẩm thực"],
    preview_days: [
      { d: "Ngày 1", t: "Check-in Sunset Sanato, chợ đêm Phú Quốc" },
      { d: "Ngày 2", t: "Cano tham quan 4 đảo, lặn ngắm san hô Hòn Mây Rút" },
      { d: "Ngày 3", t: "Cáp treo Hòn Thơm, Grand World ngắm show Tinh hoa VN" }
    ]
  },
  {
    id: 13,
    title: "Phú Quốc nghỉ dưỡng Sunset Town",
    destination: "Phú Quốc",
    cover_type: "food",
    days_count: 3,
    clone_count: 31,
    created_at: "2026-11-02T15:00:00Z",
    creator_name: "Lê Minh Trang",
    estimated_budget: 3900000,
    tags: ["Cà phê", "Nhóm bạn"],
    preview_days: [
      { d: "Ngày 1", t: "Cầu Hôn Kiss Bridge, ngắm hoàng hôn Địa Trung Hải" },
      { d: "Ngày 2", t: "Bãi Sao tắm biển, ăn gỏi cá trích" },
      { d: "Ngày 3", t: "Làng chài Hàm Ninh, mua ngọc trai" }
    ]
  },

  // --- HẠ LONG ---
  {
    id: 14,
    title: "Hạ Long du thuyền ngủ đêm trên vịnh",
    destination: "Hạ Long",
    cover_type: "group",
    days_count: 2,
    clone_count: 67,
    created_at: "2026-10-19T09:00:00Z",
    creator_name: "Phan Văn Nam",
    estimated_budget: 3100000,
    tags: ["Nhóm bạn", "Tiết kiệm"],
    preview_days: [
      { d: "Ngày 1", t: "Lên du thuyền Tuần Châu, chèo kayak hang Luồn" },
      { d: "Ngày 2", t: "Hang Sửng Sốt, tắm biển đảo Ti Tốp" }
    ]
  },

  // --- VŨNG TÀU ---
  {
    id: 15,
    title: "Vũng Tàu đổi gió 2N1Đ gần Sài Gòn",
    destination: "Vũng Tàu",
    cover_type: "food",
    days_count: 2,
    clone_count: 73,
    created_at: "2026-11-04T14:00:00Z",
    creator_name: "Đặng Quang Huy",
    estimated_budget: 1500000,
    tags: ["Tiết kiệm", "Ẩm thực", "Nhóm bạn"],
    preview_days: [
      { d: "Ngày 1", t: "Bánh khọt Gốc Vú Sữa, tắm biển Bãi Sau, ngắm hoàng hôn Mũi Nghinh Phong" },
      { d: "Ngày 2", t: "Lên Ngọn Hải Đăng ăn yaourt, dạo Bãi Trước" }
    ]
  }
];

// Quản lý trạng thái bộ lọc
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

// User góc phải
function initUserAvatar() {
  const user = getUser() || { fullName: 'Nguyễn Văn A' };
  const userBtn = document.getElementById('userBtn');
  if (userBtn && user.fullName) {
    userBtn.title = user.fullName;
    const parts = user.fullName.trim().split(/\s+/);
    const initials = parts.length >= 2 
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    userBtn.textContent = initials;
  }
}

// Rút gọn họ tên tác giả
function formatAuthor(name) {
  if (!name) return 'Cộng đồng';
  const parts = name.trim().split(/\s+/);
  return parts.length <= 2 ? name : parts.slice(-2).join(' ');
}

// Format số ngày dạng chuẩn 3N2Đ hoặc 1 ngày
function formatDaysBadge(daysCount) {
  const d = Number(daysCount) || 1;
  return d === 1 ? '1 ngày' : `${d}N${d - 1}Đ`;
}

// B2: Đọc query parameters từ URL vào state[cite: 4, 5]
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

// B4: Cập nhật URL không reload trang[cite: 4, 5]
function writeUrlParams() {
  const p = new URLSearchParams();
  if (state.destination) p.set('destination', state.destination);
  if (state.days) p.set('days', state.days);
  if (state.tags.length > 0) p.set('tag', state.tags.join(','));
  if (state.budgetMax < 5000000) p.set('budgetMax', String(state.budgetMax));
  if (state.sort !== 'popular') p.set('sort', state.sort);

  const query = p.toString() ? '?' + p.toString() : '';
  window.history.pushState({}, '', `${window.location.pathname}${query}`);
}

// Đồng bộ trạng thái state vào UI
function syncStateToUI() {
  const destInput = document.getElementById('inputDestination');
  if (destInput) destInput.value = state.destination;

  const sortSelect = document.getElementById('sortDropdown');
  if (sortSelect) sortSelect.value = state.sort;

  const budgetRange = document.getElementById('budgetRange');
  if (budgetRange) budgetRange.value = state.budgetMax;

  const budgetLabel = document.getElementById('budgetMaxLabel');
  if (budgetLabel) budgetLabel.textContent = `${state.budgetMax / 1000000} triệu`;

  // Checklist tags
  document.querySelectorAll('#tagsList input[type="checkbox"]').forEach(cb => {
    cb.checked = state.tags.includes(cb.value);
  });

  // Nút số ngày
  document.querySelectorAll('#daysOptions .days-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.days === state.days);
  });

  // Đánh dấu active cho thẻ điểm đến nổi bật
  document.querySelectorAll('.dest-card').forEach(card => {
    const cardName = card.querySelector('.dest-name')?.textContent?.trim();
    const isSelected = state.destination && cardName && cardName.toLowerCase() === state.destination.toLowerCase();
    card.classList.toggle('active', Boolean(isSelected));
  });
}

// Render lưới thẻ lịch trình
function renderCards(items, append = false) {
  const cardsGrid = document.getElementById('cardsGrid');
  if (!append) cardsGrid.innerHTML = '';

  if (items.length === 0 && !append) {
    cardsGrid.innerHTML = '<p class="meta" style="grid-column: 1 / -1; padding: var(--space-8); text-align: center;">Không có lịch trình nào khớp với bộ lọc.</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'plan-card';

    const dCount = item.days_count || item.totalDays || 3;
    const badgeText = formatDaysBadge(dCount);
    const isHot = (item.clone_count || 0) >= 50;

    const rawDays = item.preview_days || (item.days ? item.days.map((day, idx) => ({
      d: `Ngày ${idx + 1}`,
      t: (day.items || []).map(it => it.activity).slice(0, 2).join(', ') || 'Tự do khám phá'
    })) : []);

    const steps = rawDays.slice(0, 3).map(s => `
      <li class="step-item">
        <span class="step-day">${s.d}</span>
        <span class="step-desc">${s.t}</span>
      </li>
    `).join('');

    const coverSvg = VECTOR_COVERS[item.cover_type] ||
      (item.cover_image ? `<img src="${item.cover_image}" alt="${item.title}">` : VECTOR_COVERS.dalat);

    const price = item.estimated_budget || item.budget || 0;

    card.innerHTML = `
      <div class="plan-thumbnail">
        ${coverSvg}
        <span class="badge-pill">${badgeText}</span>
        ${isHot ? '<span class="badge-reuse">Được dùng lại nhiều</span>' : ''}
      </div>
      <div class="plan-details">
        <h3 class="plan-title">${item.title}</h3>
        <ul class="steps-list">${steps}</ul>
        <div class="author-meta">bởi ${formatAuthor(item.creator_name || item.author || item.ownerName)} · ${item.clone_count || 0} lượt dùng lại</div>
        <div class="card-footer">
          <div>
            <div class="price-caption">Chi phí dự kiến</div>
            <div class="price-number">${formatMoney(price)}</div>
          </div>
          <button type="button" class="btn btn-dark btn-sm" data-action="reuse" data-id="${item.id}">Dùng lại</button>
        </div>
      </div>
    `;
    cardsGrid.appendChild(card);
  });
}

// Lọc dữ liệu mẫu cục bộ (hỗ trợ test offline luồng B2-B6 của UC 7)
function filterLocalMockData() {
  let list = [...FULL_MOCK_ITINERARIES];

  // 1. Lọc theo điểm đến
  if (state.destination) {
    const q = state.destination.toLowerCase();
    list = list.filter(it => it.destination?.toLowerCase().includes(q) || it.title?.toLowerCase().includes(q));
  }

  // 2. Lọc theo số ngày
  if (state.days) {
    const d = parseInt(state.days, 10);
    if (d >= 4) {
      list = list.filter(it => it.days_count >= 4);
    } else {
      list = list.filter(it => it.days_count === d);
    }
  }

  // 3. Lọc theo ngân sách
  if (state.budgetMax) {
    list = list.filter(it => (it.estimated_budget || 0) <= state.budgetMax);
  }

  // 4. Lọc theo tags (điều kiện HOẶC)
  if (state.tags && state.tags.length > 0) {
    list = list.filter(it => it.tags?.some(t => state.tags.includes(t)));
  }

  // 5. Sắp xếp (B3)
  if (state.sort === 'popular') {
    list.sort((a, b) => (b.clone_count || 0) - (a.clone_count || 0));
  } else if (state.sort === 'newest') {
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (state.sort === 'cheapest') {
    list.sort((a, b) => (a.estimated_budget || 0) - (b.estimated_budget || 0));
  }

  const total = list.length;
  state.totalPages = Math.ceil(total / state.size) || 1;
  const pagedItems = list.slice((state.page - 1) * state.size, state.page * state.size);

  return { total, items: pagedItems };
}

// Gọi API lấy dữ liệu (hoặc dùng fallback mock đã lọc)
async function fetchItineraries(append = false) {
  const btnMore = document.getElementById('btnLoadMore');
  const heading = document.getElementById('headingTitle');
  const sub = document.getElementById('subSummary');

  const params = {
    page: state.page,
    size: state.size,
    sort: state.sort,
    budgetMax: state.budgetMax
  };
  if (state.destination) params.destination = state.destination;
  if (state.days) params.days = state.days;
  if (state.tags.length > 0) params.tag = state.tags.join(',');

  try {
    const res = await get('/public/itineraries', { params, auth: false, silent: true });
    const data = res?.data || res || {};
    const items = data.items || (Array.isArray(data) ? data : []);
    state.totalPages = data.totalPages || (items.length < state.size ? state.page : state.page + 1);

    const totalCount = data.total ?? items.length;
    heading.textContent = state.destination ? `Lịch trình ${state.destination}` : 'Lịch trình mẫu';
    sub.textContent = `${totalCount} lịch trình · đang lọc ${state.days ? formatDaysBadge(state.days) : ''}, dưới ${state.budgetMax / 1000000} triệu`;

    renderCards(items, append);
    btnMore.style.display = (state.page >= state.totalPages) ? 'none' : 'inline-flex';
  } catch {
    const { total, items } = filterLocalMockData();
    heading.textContent = state.destination ? `Lịch trình ${state.destination}` : 'Lịch trình mẫu';
    sub.textContent = `${total} lịch trình · đang lọc ${state.days ? formatDaysBadge(state.days) : ''}, dưới ${state.budgetMax / 1000000} triệu`;
    
    renderCards(items, append);
    btnMore.style.display = (state.page >= state.totalPages) ? 'none' : 'inline-flex';
  }
}

// Chuyển hướng sang trang chi tiết điểm đến (Screen 4)
function navigateToDestinationDetail(slug) {
  window.location.href = pageUrl('destinationDetail', { slug });
}

// Xử lý nút [Dùng lại]
function handleReuse(id) {
  window.location.href = `${pageUrl('createTrip')}?cloneId=${id}`;
}

// Đăng ký sự kiện
document.addEventListener('DOMContentLoaded', () => {
  initUserAvatar();
  readUrlParams();
  fetchItineraries();

  // Tìm kiếm từ Hero
  document.getElementById('topSearchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.destination = document.getElementById('inputDestination').value.trim();
    state.page = 1;
    writeUrlParams();
    syncStateToUI();
    fetchItineraries();
  });

  // Bấm vào thẻ điểm đến nổi bật -> Dẫn thẳng đến màn hình chi tiết điểm đến (Screen 4)
  document.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = card.dataset.slug;
      if (slug) {
        navigateToDestinationDetail(slug);
      }
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

  // Thanh kéo ngân sách
  const budgetSlider = document.getElementById('budgetRange');
  budgetSlider?.addEventListener('input', (e) => {
    document.getElementById('budgetMaxLabel').textContent = `${e.target.value / 1000000} triệu`;
  });
  budgetSlider?.addEventListener('change', (e) => {
    state.budgetMax = parseInt(e.target.value, 10);
    state.page = 1;
    writeUrlParams();
    fetchItineraries();
  });

  // Lựa chọn sắp xếp
  document.getElementById('sortDropdown')?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    writeUrlParams();
    fetchItineraries();
  });

  // Xóa lọc
  document.getElementById('btnResetFilter')?.addEventListener('click', () => {
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

  // Xem thêm trang kế tiếp
  document.getElementById('btnLoadMore')?.addEventListener('click', () => {
    state.page += 1;
    fetchItineraries(true);
  });

  // Event delegation cho nút [Dùng lại]
  document.getElementById('cardsGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="reuse"]');
    if (btn) {
      handleReuse(btn.dataset.id);
    }
  });
});