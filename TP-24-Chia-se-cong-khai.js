const publicToggle = document.getElementById('public-toggle');
const copyLinkBtn = document.getElementById('copy-link-btn');
const shareLinkInput = document.getElementById('share-link-input');

// Link chỉ chép được khi chuyến đang công khai
publicToggle.addEventListener('change', async (e) => {
    const isPublic = e.target.checked;
    copyLinkBtn.disabled = !isPublic;
    
    // Gọi API cập nhật trạng thái public_trip 
    await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ public_trip: isPublic })
    });
});

// Xử lý sao chép link và hiển thị Toast (MSG 17)
copyLinkBtn.addEventListener('click', async () => {
    if (!copyLinkBtn.disabled) {
        await navigator.clipboard.writeText(shareLinkInput.value);
        showToast("Đã chép link chia sẻ.", "success"); // MSG 17
    }
});

// Hàm hiển thị Toast thông báo 3 giây
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}