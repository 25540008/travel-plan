// --- LOGIC XÓA HOẠT ĐỘNG (TP-30) ---
let deleteItemId = null; // Lưu ID của hoạt động đang chuẩn bị xóa
const tripId = 1; // 

const deleteModal = document.getElementById('deleteConfirmModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

// 1. Hàm mở Popup
function openDeleteConfirm(itemId) {
  deleteItemId = itemId;
  deleteModal.classList.add('active');
}

// 2. Hàm đóng Popup
function closeDeleteConfirm() {
  deleteItemId = null;
  deleteModal.classList.remove('active');
}

// 3. Logic khi bấm "Đồng ý"
async function executeDelete() {
  if (!deleteItemId) return;

  try {
    // Vô hiệu hóa nút bấm tránh spam click
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerText = 'Đang xóa...';

    // Gọi API Delete 
    const response = await fetch(`/api/trips/${tripId}/itinerary/${deleteItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });

    if (response.ok) {
      // 1. Tìm và xóa phần tử HTML (DOM) tương ứng của hoạt động đó
      const itemElement = document.getElementById(`itinerary-item-${deleteItemId}`);
      if (itemElement) {
        itemElement.remove();
      }

      // 2. Gọi hàm vẽ lại bản đồ 
      if (typeof window.updateMap === 'function') {
        window.updateMap();
      }
    } else {
      alert("Bạn không có quyền xóa hoặc xảy ra lỗi.");
    }
  } catch (error) {
    console.error("Lỗi khi gọi API xóa:", error);
    alert("Lỗi kết nối. Vui lòng thử lại!");
  } finally {
    // Phục hồi lại trạng thái popup
    btnConfirmDelete.disabled = false;
    btnConfirmDelete.innerText = 'Đồng ý';
    closeDeleteConfirm();
  }
}

// Lắng nghe sự kiện
btnCancelDelete.addEventListener('click', closeDeleteConfirm);
btnConfirmDelete.addEventListener('click', executeDelete);