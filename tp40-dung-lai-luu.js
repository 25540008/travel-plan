/*! 
  TP-40 · UC 11 Dùng lại lịch trình mẫu + UC 12 Lưu / bỏ lưu (kèm CBR 3, MSG 18, MSG 31)
  Gắn vào các màn hình có sẵn (Screen 2, 4; thêm cả vào Screen 7 để hiện MSG 31 sau khi dùng lại):
  <script src="tp40-dung-lai-luu.js"></script>
  <button data-tp-reuse="TRIP_ID" data-title="Tên lịch trình" data-days="3">Dùng lại</button>
  <button data-tp-save="itinerary:TRIP_ID">♡</button>                       (thẻ lịch trình)
  <button data-tp-save="destination:da-lat" data-tp-label>♡ Lưu</button>    (nút Lưu điểm đến; data-tp-label = tự đổi chữ Lưu / Đã lưu)
  
  Nút đã lưu được gắn class "tp-saved" và aria-pressed="true": host tự style (vd. tô tim).
  Cấu hình: đặt window.TP40_CONFIG = {...} TRƯỚC khi nạp file này. Khi có backend: useMock:false và isLoggedIn:()=>boolean. 
*/

(function () {
  const C = Object.assign(
    {
      useMock: true,
      isLoggedIn: null,
      loginPath: '/dang-nhap',
      tripPath: (id) => '/chuyen-di/' + id,
    },
    window.TP40_CONFIG || {}
  );

  const Q = new URLSearchParams(location.search);
  
  // mock: thêm ?guest=1 để xem luồng của khách
  const loggedIn = () => (C.isLoggedIn ? !!C.isLoggedIn() : !Q.has('guest')); 
  
  const MSG18 = 'Chưa lưu được, thử lại nhé.';
  const MSG31 = 'Đã tạo bản sao, bạn có thể sửa thoải mái.';

  /* ===== API. Hợp đồng JSON TẠM (đối chiếu với người làm backend, nếu khác chỉ sửa ở đây):
  POST   /api/trips/{id}/clone   body {startDate:'YYYY-MM-DD'} -> {id}   (id chuyến mới)
  GET    /api/me/saved           -> [{type:'itinerary'|'destination',id}]
  POST   /api/me/saved           body {type,id}
  DELETE /api/me/saved?type=&id=
  Lỗi: HTTP 4xx/5xx, body {message} nếu có. ===== */
  
  async function http(method, path, body) {
    let response;
    try {
      response = await fetch(path, {
        method: method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');
    }

    if (!response.ok) {
      let text = '';
      try {
        text = (await response.json()).message;
      } catch (e) {}
      throw new Error(text || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
    
    return response.status === 204 ? null : response.json();
  }

  const real = {
    clone: (id, date) => http('POST', '/api/trips/' + id + '/clone', { startDate: date }),
    saved: () => http('GET', '/api/me/saved'),
    save: (type, id) => http('POST', '/api/me/saved', { type, id }),
    unsave: (type, id) => http('DELETE', '/api/me/saved?type=' + type + '&id=' + encodeURIComponent(id)),
  };

  const sleep = () => new Promise((resolve) => setTimeout(resolve, 250));
  
  // ?fail=1: giả lập lỗi
  const w = async () => {
    await sleep();
    if (Q.has('fail')) throw new Error('Lỗi giả lập từ máy chủ.');
  }; 

  const mock = {
    clone: async () => {
      await w();
      return { id: 900 + Math.floor(Math.random() * 99) };
    },
    saved: async () => {
      await sleep();
      return [];
    },
    save: w,
    unsave: w,
  };

  const api = C.useMock ? mock : real;

  /* ===== Giao diện: popup + toast (tự chèn vào trang) ===== */
  const css = `
    .tp-bd {
      position: fixed;
      inset: 0;
      background: #10302c99;
      display: grid;
      place-items: center;
      padding: 16px;
      z-index: 9000;
    }
    .tp-bd[hidden] {
      display: none;
    }
    .tp-md {
      background: #fff;
      color: #10302c;
      border-radius: 16px;
      width: 100%;
      max-width: 420px;
      padding: 22px;
      font: 14px/1.45 system-ui, sans-serif;
    }
    .tp-md h2 {
      margin: 0 0 6px;
      font-size: 18px;
    }
    .tp-md p {
      margin: 0;
    }
    .tp-md label {
      display: block;
      font-weight: 600;
      font-size: 12px;
      margin: 12px 0 5px;
    }
    .tp-md input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #dfe7e2;
      border-radius: 10px;
      font: inherit;
    }
    .tp-md input[readonly] {
      background: #f2f5f3;
      color: #6b7c78;
    }
    .tp-act {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 18px;
    }
    .tp-act button {
      border-radius: 10px;
      padding: 9px 18px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid #dfe7e2;
      background: #fff;
    }
    .tp-act .tp-ok {
      background: #d9512c;
      color: #fff;
      border: 0;
    }
    .tp-act button:disabled {
      opacity: .6;
    }
    .tp-er {
      color: #d8392b;
      font-size: 12px;
      margin-top: 6px;
    }
    .tp-er:empty {
      display: none;
    }
    #tp-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 18px;
      border-radius: 12px;
      color: #fff;
      font: 600 14px system-ui, sans-serif;
      z-index: 9100;
      opacity: 0;
      transition: .25s;
      pointer-events: none;
      max-width: 92%;
      text-align: center;
    }
    #tp-toast.on {
      opacity: 1;
    }
    #tp-toast.ok {
      background: #1f8a5b;
    }
    #tp-toast.err {
      background: #d8392b;
    }
    #tp-toast.in {
      background: #10302c;
    }
    @media (max-width: 600px) {
      .tp-bd {
        align-items: end;
        padding: 0;
      }
      .tp-md {
        border-radius: 16px 16px 0 0;
        max-width: none;
      }
    }
  `;

  const $ = (id) => document.getElementById(id);

  function build() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);

    const div = document.createElement('div');
    div.innerHTML = `
      <div class="tp-bd" id="tp-reuse" hidden>
        <div class="tp-md" role="dialog" aria-modal="true" aria-labelledby="tp-rh">
          <h2 id="tp-rh">Dùng lại lịch trình</h2>
          <p id="tp-rt" style="font-weight:700"></p>
          <p id="tp-rd" style="color:#6b7c78"></p>
          <label for="tp-rs">Ngày bắt đầu</label>
          <input type="date" id="tp-rs">
          <label for="tp-re">Ngày kết thúc</label>
          <input id="tp-re" readonly>
          <p class="tp-er" id="tp-rer"></p>
          <div class="tp-act">
            <button id="tp-no">Hủy</button>
            <button class="tp-ok" id="tp-ok">Xác nhận</button>
          </div>
        </div>
      </div>
      
      <div class="tp-bd" id="tp-lg" hidden>
        <div class="tp-md">
          <h2>Cần đăng nhập (giả lập)</h2>
          <p>Theo CBR 3, hệ thống chuyển tới:</p>
          <code id="tp-lu" style="word-break:break-all;font-size:12px"></code>
          <div class="tp-act">
            <button id="tp-lno">Đóng</button>
            <button class="tp-ok" id="tp-lok">Giả lập: đăng nhập xong</button>
          </div>
        </div>
      </div>
      
      <div id="tp-toast" role="status"></div>
    `;
    
    document.body.append(...div.children);

    $('tp-no').onclick = () => ($('tp-reuse').hidden = true);
    $('tp-lno').onclick = () => ($('tp-lg').hidden = true);
    $('tp-rs').oninput = upEnd;
    $('tp-ok').onclick = confirmReuse;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $('tp-reuse').hidden = true;
        $('tp-lg').hidden = true;
      }
    });
  }

  let toastTimer;
  function toast(message, type) {
    const el = $('tp-toast');
    el.textContent = message;
    el.className = 'on ' + (type || 'in');
    
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = ''), 3000);
  }

  /* ===== CBR 3: khách bấm Dùng lại / Lưu -> /dang-nhap?next=&action=&id= ===== */
  function paramsNext() {
    const p = new URLSearchParams(location.search);
    ['action', 'id', 'guest'].forEach((k) => p.delete(k));
    return p;
  }

  function loginUrl(action, id, isBack) {
    const p = paramsNext();
    // next chỉ nhận đường dẫn nội bộ bắt đầu bằng "/"
    const next = location.pathname + (p.toString() ? '?' + p : ''); 

    if (isBack) {
      return next + (p.toString() ? '&' : '?') + 'action=' + action + '&id=' + encodeURIComponent(id);
    }
    
    return C.loginPath + '?next=' + encodeURIComponent(next) + '&action=' + action + '&id=' + encodeURIComponent(id);
  }

  function goLogin(action, id) {
    const url = loginUrl(action, id);
    if (!C.useMock) {
      location.href = url;
      return;
    }
    
    // giả lập: đăng nhập xong -> quay lại next kèm action
    $('tp-lu').textContent = url;
    $('tp-lg').hidden = false;
    $('tp-lok').onclick = () => (location.href = loginUrl(action, id, true));
  }

  function whenEl(selector, callback, retries = 30) {
    const el = document.querySelector(selector);
    if (el) {
      callback(el);
    } else if (retries) {
      setTimeout(() => whenEl(selector, callback, retries - 1), 100);
    }
  }

  function resume() {
    const action = Q.get('action');
    const id = Q.get('id');
    
    // sau đăng nhập: quay lại trang cũ và tự thực hiện thao tác
    if (!action || !id || !loggedIn()) return; 
    
    try {
      const p = paramsNext();
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    } catch (e) {}

    if (action === 'save') {
      toggleSave(id, true);
    } else if (action === 'reuse') {
      whenEl('[data-tp-reuse="' + id.replace(/"/g, '\\"') + '"]', (btn) => {
        openReuse(btn.dataset.tpReuse, btn.dataset.title, +btn.dataset.days);
      });
    }
  }

  /* ===== UC 12: Lưu / bỏ lưu ===== */
  const saved = new Set();
  const pend = new Set();

  const split = (k) => {
    const i = k.indexOf(':');
    return [k.slice(0, i), k.slice(i + 1)];
  };

  function paint() {
    document.querySelectorAll('[data-tp-save]').forEach((btn) => {
      const isOn = saved.has(btn.dataset.tpSave);
      btn.classList.toggle('tp-saved', isOn);
      btn.setAttribute('aria-pressed', isOn);
      
      if (btn.hasAttribute('data-tp-label')) {
        btn.textContent = isOn ? '♥ Đã lưu' : '♡ Lưu';
      }
    });
  }

  async function loadSaved() {
    if (loggedIn()) {
      try {
        const data = await api.saved();
        data.forEach((x) => saved.add(x.type + ':' + x.id));
      } catch (e) {}
    }
    paint();
  }

  async function toggleSave(key, isOnly = false) {
    if (!loggedIn()) {
      goLogin('save', key);
      return;
    } // B2 -> B2a

    const [type, id] = split(key);
    const wasSaved = saved.has(key);
    
    if (pend.has(key) || (isOnly && wasSaved)) return;
    
    // mỗi người chỉ lưu một mục một lần; bấm lại khi đã lưu = bỏ lưu
    pend.add(key); 
    
    wasSaved ? saved.delete(key) : saved.add(key);
    paint(); // B3: tô tim ngay rồi gọi API
    
    try {
      await (wasSaved ? api.unsave(type, id) : api.save(type, id));
      // B5: thành công thì giữ trạng thái
    } catch (e) {
      // B4a: bỏ tô tim, MSG 18 (toast đỏ)
      wasSaved ? saved.add(key) : saved.delete(key);
      paint();
      toast(MSG18, 'err');
    } finally {
      pend.delete(key);
    }
  } 

  /* ===== UC 11: Dùng lại lịch trình mẫu ===== */
  let cur = null;
  const iso = (d) => d.toISOString().slice(0, 10);
  
  const addDays = (startStr, numDays) => {
    const d = new Date(startStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + numDays);
    return iso(d);
  };
  
  // Thứ Bảy gần nhất (hôm nay nếu là thứ Bảy)
  const nearestSat = () => {
    const now = new Date();
    const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    target.setUTCDate(target.getUTCDate() + ((6 - target.getUTCDay() + 7) % 7));
    return iso(target);
  }; 

  function openReuse(id, title, days) {
    if (!loggedIn()) {
      goLogin('reuse', id);
      return;
    } // B2 -> B2a
    
    cur = { id, days: days > 0 ? days : 1 };
    $('tp-rt').textContent = title || '';
    $('tp-rd').textContent = `${cur.days} ngày (${cur.days}N${cur.days - 1}Đ)`;
    $('tp-rs').value = nearestSat();
    upEnd();
    
    $('tp-rer').textContent = '';
    $('tp-reuse').hidden = false;
    $('tp-rs').focus();
  } // B3: popup chọn ngày bắt đầu

  // Ngày kết thúc tự tính, không sửa được
  function upEnd() {
    const val = $('tp-rs').value;
    $('tp-re').value = val ? addDays(val, cur.days - 1).split('-').reverse().join('/') : '';
  } 

  async function confirmReuse() {
    const val = $('tp-rs').value; // B4
    if (!val) {
      $('tp-rer').textContent = 'Vui lòng chọn ngày bắt đầu.';
      return;
    }
    
    const okBtn = $('tp-ok');
    okBtn.disabled = true;
    okBtn.textContent = 'Đang tạo…';
    
    try {
      const res = await api.clone(cur.id, val);
      // B5: backend chép chuyến + hoạt động (dời ngày, không chép khoản chi), tăng số lần dùng lại
      $('tp-reuse').hidden = true; 
      
      if (C.useMock) {
        toast(MSG31, 'ok');
        console.info('Chuyển tới Screen 7: ' + C.tripPath(res.id));
      } else {
        try {
          sessionStorage.setItem('tp_toast', 'MSG31');
        } catch (e) {}
        location.href = C.tripPath(res.id);
      } // B6: Screen 7 nạp file này sẽ hiện MSG 31 (toast xanh)
    } catch (e) {
      $('tp-rer').textContent = e.message;
    } finally {
      okBtn.disabled = false;
      okBtn.textContent = 'Xác nhận';
    }
  }

  /* ===== Khởi tạo ===== */
  function init() {
    build();
    
    document.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('[data-tp-save]');
      const reuseBtn = e.target.closest('[data-tp-reuse]');
      
      if (saveBtn) {
        e.preventDefault();
        toggleSave(saveBtn.dataset.tpSave);
      } else if (reuseBtn) {
        e.preventDefault();
        openReuse(reuseBtn.dataset.tpReuse, reuseBtn.dataset.title, +reuseBtn.dataset.days);
      }
    });

    let q = 0;
    // Thẻ render sau vẫn được tô đúng
    new MutationObserver(() => {
      cancelAnimationFrame(q);
      q = requestAnimationFrame(paint);
    }).observe(document.body, { childList: true, subtree: true }); 
    
    // Screen 7: MSG 31 sau khi Dùng lại
    try {
      if (sessionStorage.getItem('tp_toast') === 'MSG31') {
        sessionStorage.removeItem('tp_toast');
        toast(MSG31, 'ok');
      }
    } catch (e) {} 
    
    loadSaved().then(resume);
  }

  window.TP40 = { toast, openReuse, toggleSave };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();