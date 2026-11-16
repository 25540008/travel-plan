// Kiểu chuyến đi (UC 7 B3, Screen 1 "Đi theo kiểu của bạn", Screen 2 bộ lọc). Mã tag lưu trong cột trips.tags.
export const TRIP_TAGS = {
  BEACH: 'Biển',
  MOUNTAIN: 'Núi, đồi',
  OLD_TOWN: 'Phố cổ',
  FOOD: 'Ẩm thực',
  COFFEE: 'Cà phê',
  TREKKING: 'Trekking',
  FRIENDS: 'Nhóm bạn',
  BUDGET: 'Tiết kiệm',
};

export const TRIP_TAG_CODES = Object.keys(TRIP_TAGS);
