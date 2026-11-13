/** "Đà Lạt" → "da-lat": chữ thường, bỏ dấu, các ký tự khác chữ và số thành dấu gạch ngang. */
export function toSlug(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
