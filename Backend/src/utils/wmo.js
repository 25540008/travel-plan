// Đổi mã thời tiết WMO của Open-Meteo sang chữ tiếng Việt và tên icon (SRS Phụ lục 8.3, CBR 5).
const TABLE = [
  [[0], 'Trời quang', 'sun'],
  [[1, 2], 'Ít mây', 'partly'],
  [[3], 'Nhiều mây', 'cloud'],
  [[45, 48], 'Sương mù', 'fog'],
  [[51, 53, 55, 56, 57], 'Mưa phùn', 'drizzle'],
  [[61, 66, 80], 'Mưa nhẹ', 'rain'],
  [[63, 67, 81], 'Mưa vừa', 'rain'],
  [[65, 82], 'Mưa to', 'rain-heavy'],
  [[95, 96, 99], 'Dông', 'storm'],
];

const BY_CODE = new Map(TABLE.flatMap(([codes, label, icon]) => codes.map((c) => [c, { label, icon }])));
const FALLBACK = { label: 'Nhiều mây', icon: 'cloud' }; // mã không có trong bảng (ví dụ tuyết, ít gặp ở Việt Nam)

/** wmoInfo(63) → { label: 'Mưa vừa', icon: 'rain' } */
export function wmoInfo(code) {
  return BY_CODE.get(Number(code)) ?? FALLBACK;
}
