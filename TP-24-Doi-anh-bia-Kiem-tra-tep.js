const coverInput = document.getElementById('cover-upload');
const coverError = document.getElementById('cover-error');
const saveCoverBtn = document.getElementById('save-cover-btn');

coverInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Kiểm tra dung lượng (Max 5MB) và định dạng tệp (WebP, PNG, JPG)
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            coverError.textContent = "Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB."; // MSG 16
            coverError.classList.remove('hidden');
            saveCoverBtn.disabled = true;
        } else {
            coverError.classList.add('hidden');
            saveCoverBtn.disabled = false;
        }
    }
});

saveCoverBtn.addEventListener('click', async () => {
    const file = coverInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('cover', file);

    try {
        const response = await fetch(`/api/trips/${tripId}/cover/upload`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            // Cập nhật lại ảnh bìa trên giao diện Screen 7 và đóng popup
            reloadCoverImage();
            closeModal('cover-modal');
        }
    } catch (error) {
        console.error("Lỗi tải ảnh:", error);
    }
});