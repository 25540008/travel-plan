// Dữ liệu mẫu: npx prisma db seed (chạy lại nhiều lần không bị trùng).
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEMO_EMAIL = 'demo@travelplan.vn';
export const DEMO_PASSWORD = 'Demo@123';

const destinations = [
  { name: 'Đà Lạt', address: 'Lâm Đồng, Việt Nam', latitude: 11.9404192, longitude: 108.4583132, description: 'Thành phố ngàn hoa với khí hậu mát mẻ quanh năm' },
  { name: 'Hà Giang', address: 'Hà Giang, Việt Nam', latitude: 22.823351, longitude: 104.983649, description: 'Cao nguyên đá Đồng Văn hùng vĩ' },
  { name: 'Phú Quốc', address: 'Kiên Giang, Việt Nam', latitude: 10.289879, longitude: 103.98402, description: 'Đảo ngọc biển xanh cát trắng' },
  { name: 'Hội An', address: 'Quảng Nam, Việt Nam', latitude: 15.8800584, longitude: 108.3380469, description: 'Phố cổ lung linh đèn lồng' },
  { name: 'Sa Pa', address: 'Lào Cai, Việt Nam', latitude: 22.3363608, longitude: 103.8437852, description: 'Thành phố trong sương' },
  { name: 'Côn Đảo', address: 'Bà Rịa - Vũng Tàu, Việt Nam', latitude: 8.6832323, longitude: 106.6062755, description: 'Vẻ đẹp hoang sơ và tâm linh' },
  { name: 'Quy Nhơn', address: 'Bình Định, Việt Nam', latitude: 13.7829673, longitude: 109.2196634, description: 'Eo Gió, Kỳ Co tuyệt đẹp' },
  { name: 'Ninh Bình', address: 'Ninh Bình, Việt Nam', latitude: 20.2506149, longitude: 105.9744536, description: 'Di sản Tràng An - Bái Đính' },
  { name: 'Mộc Châu', address: 'Sơn La, Việt Nam', latitude: 20.8443487, longitude: 104.6391408, description: 'Đồi chè xanh mướt và mùa hoa mận' },
  { name: 'Vũng Tàu', address: 'Bà Rịa - Vũng Tàu, Việt Nam', latitude: 10.3459613, longitude: 107.0842819, description: 'Biển gần Sài Gòn, hải sản tươi' },
  { name: 'Hạ Long', address: 'Quảng Ninh, Việt Nam', latitude: 20.9500739, longitude: 107.0733681, description: 'Vịnh di sản với hàng nghìn đảo đá vôi' },
];

const day = (d) => new Date(`2026-10-${d}T00:00:00Z`);
const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

const items = [
  { activityDate: day(23), startTime: time('06:00'), endTime: time('12:30'), activity: 'Xe khách Sài Gòn → Đà Lạt', location: 'Bến xe Miền Đông' },
  { activityDate: day(23), startTime: time('14:00'), endTime: time('15:00'), activity: 'Nhận phòng homestay', location: 'Phường 3, Đà Lạt' },
  { activityDate: day(23), startTime: time('17:00'), endTime: time('19:00'), activity: 'Dạo hồ Xuân Hương, ăn tối chợ đêm', location: 'Chợ Đà Lạt' },
  { activityDate: day(24), startTime: time('05:00'), endTime: time('08:00'), activity: 'Săn mây đồi Đa Phú', location: 'Đồi Đa Phú' },
  { activityDate: day(24), startTime: time('09:30'), endTime: time('11:30'), activity: 'Cà phê view rừng thông', location: 'Đường Hoa Hồng' },
  { activityDate: day(24), startTime: time('14:00'), endTime: time('17:00'), activity: 'Thác Datanla, máng trượt', location: 'Thác Datanla' },
  { activityDate: day(25), startTime: time('08:00'), endTime: time('10:00'), activity: 'Mua đặc sản mứt, atiso', location: 'Chợ Đà Lạt' },
  { activityDate: day(25), startTime: time('13:00'), endTime: time('19:30'), activity: 'Xe khách về Sài Gòn', location: 'Bến xe Liên tỉnh Đà Lạt' },
];

// Tổng 2.780.000đ trên ngân sách 5.000.000đ
const expenses = [
  { category: 'TRANSPORT', description: 'Vé xe khách khứ hồi', amount: 600000, expenseDate: day(23) },
  { category: 'ACCOMMODATION', description: 'Homestay 2 đêm', amount: 1000000, expenseDate: day(23) },
  { category: 'FOOD', description: 'Ăn uống ngày 1', amount: 350000, expenseDate: day(23) },
  { category: 'FOOD', description: 'Ăn uống, cà phê ngày 2', amount: 380000, expenseDate: day(24) },
  { category: 'SIGHTSEEING', description: 'Vé Datanla + máng trượt', amount: 250000, expenseDate: day(24) },
  { category: 'SHOPPING', description: 'Đặc sản mang về', amount: 200000, expenseDate: day(25) },
];

const DESTINATIONS_DATA = [
  {
    slug: 'da-lat',
    name: 'Đà Lạt',
    province: 'Lâm Đồng',
    region: 'TAY_NGUYEN',
    category: 'NUI_RUNG',
    address: 'Lâm Đồng, Việt Nam',
    latitude: 11.9404192,
    longitude: 108.4583132,
    description: 'Thành phố ngàn hoa với khí hậu mát mẻ quanh năm',
    summary: 'Nằm trên cao nguyên Lâm Viên, Đà Lạt mát mẻ quanh năm với đồi thông, săn mây, cà phê và chợ đêm.',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200',
    isFeatured: true,
    bestMonths: [11, 12, 1, 2, 3, 4],
    avgTempByMonth: { 1: 18, 2: 19, 3: 20, 4: 21, 5: 21, 6: 20, 7: 19, 8: 19, 9: 19, 10: 19, 11: 18, 12: 17 },
    suggestedDays: 3,
    distanceFromHcm: '~300 km · 7 giờ xe khách',
    tags: ['MOUNTAIN', 'COFFEE', 'FOOD'],
    spots: [
      { name: 'Đồi Đa Phú', type: 'SIGHTSEEING', lat: 11.9845, lng: 108.4112, note: 'Săn mây sáng sớm trước 5:30' },
      { name: 'Hồ Tuyền Lâm & Thiền viện Trúc Lâm', type: 'CULTURE', lat: 11.9022, lng: 108.4356, note: 'Cách trung tâm 6 km' },
      { name: 'Chợ đêm Đà Lạt', type: 'FOOD', lat: 11.9424, lng: 108.4375, note: 'Bánh tráng nướng, sữa đậu nành nóng' },
    ],
    costs: [
      { item: 'Xe khách khứ hồi', min: 500000, max: 700000 },
      { item: 'Homestay 2 đêm', min: 800000, max: 1400000 },
      { item: 'Ăn uống & Cà phê', min: 700000, max: 1100000 },
      { item: 'Vé tham quan & Xe máy', min: 400000, max: 600000 },
    ],
  },
  {
    slug: 'sa-pa',
    name: 'Sa Pa',
    province: 'Lào Cai',
    region: 'MIEN_BAC',
    category: 'NUI_RUNG',
    address: 'Lào Cai, Việt Nam',
    latitude: 22.3363608,
    longitude: 103.8437852,
    description: 'Thành phố trong sương',
    summary: 'Thị trấn vùng cao Tây Bắc với đỉnh Fansipan, ruộng bậc thang Mường Hoa và bản sắc văn hóa dân tộc.',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200',
    isFeatured: true,
    bestMonths: [3, 4, 5, 9, 10, 11],
    avgTempByMonth: { 1: 9, 2: 11, 3: 14, 4: 17, 5: 19, 6: 20, 7: 20, 8: 20, 9: 18, 10: 16, 11: 13, 12: 10 },
    suggestedDays: 3,
    distanceFromHcm: '~2.000 km · Bay Hà Nội + 5 giờ xe',
    tags: ['MOUNTAIN', 'TREKKING'],
    spots: [
      { name: 'Đỉnh Fansipan', type: 'SIGHTSEEING', lat: 22.3033, lng: 103.775, note: 'Đi cáp treo buổi sáng trời quang' },
      { name: 'Bản Cát Cát', type: 'CULTURE', lat: 22.3269, lng: 103.8315, note: 'Làng văn hóa người H’Mông' },
      { name: 'Chợ đêm Sa Pa', type: 'FOOD', lat: 22.3358, lng: 103.8421, note: 'Đồ nướng Sa Pa, lẩu cá hồi' },
    ],
    costs: [
      { item: 'Xe giường nằm Hà Nội – Sa Pa', min: 500000, max: 800000 },
      { item: 'Khách sạn 2 đêm', min: 900000, max: 1600000 },
      { item: 'Ăn uống đặc sản Tây Bắc', min: 700000, max: 1000000 },
      { item: 'Cáp treo Fansipan & Vé bản', min: 850000, max: 1000000 },
    ],
  },
  {
    slug: 'hoi-an',
    name: 'Hội An',
    province: 'Quảng Nam',
    region: 'MIEN_TRUNG',
    category: 'VAN_HOA',
    address: 'Quảng Nam, Việt Nam',
    latitude: 15.8800584,
    longitude: 108.3380469,
    description: 'Phố cổ lung linh đèn lồng',
    summary: 'Đô thị cổ di sản bên sông Hoài với kiến trúc mái ngói rêu phong, đèn lồng rực rỡ và ẩm thực đặc sắc.',
    imageUrl: 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200',
    isFeatured: true,
    bestMonths: [2, 3, 4, 5, 6, 7],
    avgTempByMonth: { 1: 22, 2: 23, 3: 25, 4: 27, 5: 29, 6: 30, 7: 30, 8: 29, 9: 28, 10: 26, 11: 24, 12: 22 },
    suggestedDays: 3,
    distanceFromHcm: '~930 km · Bay Đà Nẵng + 45 phút xe',
    tags: ['OLD_TOWN', 'FOOD', 'COFFEE'],
    spots: [
      { name: 'Chùa Cầu & Phố cổ Hội An', type: 'CULTURE', lat: 15.8771, lng: 108.3261, note: 'Đẹp nhất lúc lên đèn sau 18:00' },
      { name: 'Biển An Bàng', type: 'SIGHTSEEING', lat: 15.9136, lng: 108.3413, note: 'Cách phố cổ 4 km' },
      { name: 'Cao lầu & Cơm gà Hội An', type: 'FOOD', lat: 15.8794, lng: 108.3302, note: 'Ẩm thực phố Hội' },
    ],
    costs: [
      { item: 'Vé máy bay + Xe đưa đón', min: 1500000, max: 2500000 },
      { item: 'Homestay / Villa 2 đêm', min: 800000, max: 1500000 },
      { item: 'Ăn uống & Cà phê', min: 600000, max: 900000 },
      { item: 'Vé tham quan & Thả đèn hoa đăng', min: 200000, max: 400000 },
    ],
  },
  {
    slug: 'da-nang',
    name: 'Đà Nẵng',
    province: 'Đà Nẵng',
    region: 'MIEN_TRUNG',
    category: 'BIEN_DAO',
    address: 'Đà Nẵng, Việt Nam',
    latitude: 16.0544068,
    longitude: 108.2021667,
    description: 'Thành phố biển năng động với bãi biển Mỹ Khê và bán đảo Sơn Trà',
    summary: 'Điểm đến biển hiện đại kết nối thuận tiện Hội An và Huế, nổi bật với biển Mỹ Khê, Sơn Trà và hải sản tươi.',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200',
    isFeatured: true,
    bestMonths: [2, 3, 4, 5, 6, 7, 8],
    avgTempByMonth: { 1: 22, 2: 23, 3: 25, 4: 27, 5: 29, 6: 30, 7: 30, 8: 29, 9: 28, 10: 26, 11: 24, 12: 22 },
    suggestedDays: 3,
    distanceFromHcm: '~960 km · 1h20 bay thẳng',
    tags: ['BEACH', 'FOOD', 'FRIENDS'],
    spots: [
      { name: 'Bãi biển Mỹ Khê', type: 'SIGHTSEEING', lat: 16.0592, lng: 108.2476, note: 'Tắm biển và đón bình minh' },
      { name: 'Bán đảo Sơn Trà & Chùa Linh Ứng', type: 'CULTURE', lat: 16.1003, lng: 108.2775, note: 'Toàn cảnh vịnh Đà Nẵng' },
      { name: 'Chợ Cồn Đà Nẵng', type: 'FOOD', lat: 16.0682, lng: 108.2144, note: 'Thiên đường ăn vặt miền Trung' },
    ],
    costs: [
      { item: 'Vé máy bay khứ hồi', min: 1400000, max: 2400000 },
      { item: 'Khách sạn gần biển 2 đêm', min: 800000, max: 1500000 },
      { item: 'Ăn uống & Hải sản', min: 700000, max: 1200000 },
      { item: 'Thuê xe máy & Vé tham quan', min: 300000, max: 900000 },
    ],
  },
  {
    slug: 'phu-quoc',
    name: 'Phú Quốc',
    province: 'Kiên Giang',
    region: 'MIEN_NAM',
    category: 'BIEN_DAO',
    address: 'Kiên Giang, Việt Nam',
    latitude: 10.289879,
    longitude: 103.98402,
    description: 'Đảo ngọc biển xanh cát trắng',
    summary: 'Hòn đảo lớn nhất Việt Nam với Bãi Sao cát trắng mịn, ngắm hoàng hôn Dinh Cậu và hải sản làng chài.',
    imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200',
    isFeatured: true,
    bestMonths: [11, 12, 1, 2, 3, 4],
    avgTempByMonth: { 1: 26, 2: 27, 3: 28, 4: 29, 5: 29, 6: 28, 7: 28, 8: 28, 9: 27, 10: 27, 11: 27, 12: 26 },
    suggestedDays: 3,
    distanceFromHcm: '~400 km · 1 giờ bay thẳng',
    tags: ['BEACH', 'FOOD', 'FRIENDS'],
    spots: [
      { name: 'Bãi Sao', type: 'SIGHTSEEING', lat: 10.0563, lng: 104.0342, note: 'Nước biển trong xanh, cát trắng mịn' },
      { name: 'Dinh Cậu', type: 'CULTURE', lat: 10.2175, lng: 103.9565, note: 'Ngắm hoàng hôn biểu tượng Phú Quốc' },
      { name: 'Làng chài Hàm Ninh', type: 'FOOD', lat: 10.1816, lng: 104.0471, note: 'Ghẹ Hàm Ninh, gỏi cá trích' },
    ],
    costs: [
      { item: 'Vé máy bay / Tàu cao tốc', min: 1200000, max: 2400000 },
      { item: 'Resort / Khách sạn 2 đêm', min: 1200000, max: 2500000 },
      { item: 'Hải sản & Ăn uống', min: 900000, max: 1500000 },
      { item: 'Tour đảo / Cáp treo Hòn Thơm', min: 600000, max: 1000000 },
    ],
  },
  {
    slug: 'nha-trang',
    name: 'Nha Trang',
    province: 'Khánh Hòa',
    region: 'MIEN_TRUNG',
    category: 'BIEN_DAO',
    address: 'Khánh Hòa, Việt Nam',
    latitude: 12.2387911,
    longitude: 109.1967488,
    description: 'Vịnh biển xanh nắng ấm quanh năm',
    summary: 'Thành phố biển với tour lặn san hô Hòn Mun, Tháp Bà Ponagar cổ kính và ẩm thực nem nướng Ninh Hòa.',
    imageUrl: 'https://images.unsplash.com/photo-1570366583862-f91883984fde?w=1200',
    isFeatured: false,
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8],
    avgTempByMonth: { 1: 24, 2: 25, 3: 26, 4: 28, 5: 29, 6: 29, 7: 29, 8: 29, 9: 28, 10: 27, 11: 26, 12: 25 },
    suggestedDays: 3,
    distanceFromHcm: '~430 km · 5 giờ cao tốc hoặc 1h bay',
    tags: ['BEACH', 'FOOD'],
    spots: [
      { name: 'Đảo Hòn Mun', type: 'SIGHTSEEING', lat: 12.1691, lng: 109.3039, note: 'Lặn ngắm san hô' },
      { name: 'Tháp Bà Ponagar', type: 'CULTURE', lat: 12.2654, lng: 109.1954, note: 'Kiến trúc Chăm Pa cổ kính' },
      { name: 'Nem nướng Ninh Hòa', type: 'FOOD', lat: 12.2481, lng: 109.1912, note: 'Đặc sản trứ danh Nha Trang' },
    ],
    costs: [
      { item: 'Xe giường nằm / Tàu hỏa khứ hồi', min: 550000, max: 900000 },
      { item: 'Khách sạn gần biển 2 đêm', min: 800000, max: 1500000 },
      { item: 'Ăn uống & Hải sản', min: 700000, max: 1100000 },
      { item: 'Tour đảo & Tắm bùn', min: 500000, max: 900000 },
    ],
  },
  {
    slug: 'ha-giang',
    name: 'Hà Giang',
    province: 'Hà Giang',
    region: 'MIEN_BAC',
    category: 'NUI_RUNG',
    address: 'Hà Giang, Việt Nam',
    latitude: 22.823351,
    longitude: 104.983649,
    description: 'Cao nguyên đá Đồng Văn hùng vĩ',
    summary: 'Cung đường đèo Mã Pí Lèng hùng vĩ, sông Nho Quế xanh ngọc và cao nguyên đá Đồng Văn nơi địa đầu Tổ quốc.',
    imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200',
    isFeatured: false,
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    avgTempByMonth: { 1: 15, 2: 17, 3: 20, 4: 24, 5: 27, 6: 28, 7: 28, 8: 28, 9: 26, 10: 23, 11: 19, 12: 16 },
    suggestedDays: 4,
    distanceFromHcm: '~2.050 km · Bay Hà Nội + 6 giờ xe',
    tags: ['MOUNTAIN', 'TREKKING', 'FRIENDS'],
    spots: [
      { name: 'Đèo Mã Pí Lèng & Sông Nho Quế', type: 'SIGHTSEEING', lat: 23.2419, lng: 105.4052, note: 'Đi thuyền hẻm Tu Sản buổi sáng' },
      { name: 'Cột cờ Lũng Cú', type: 'CULTURE', lat: 23.3636, lng: 105.3168, note: 'Điểm cực Bắc Việt Nam' },
      { name: 'Phố cổ Đồng Văn', type: 'FOOD', lat: 23.2775, lng: 105.3626, note: 'Cháo ấu tẩu, thắng dền' },
    ],
    costs: [
      { item: 'Xe cabin Hà Nội – Hà Giang', min: 600000, max: 800000 },
      { item: 'Homestay bản địa 2 đêm', min: 600000, max: 1000000 },
      { item: 'Ăn uống vùng cao', min: 600000, max: 900000 },
      { item: 'Thuê xe máy + Xăng + Thuyền Nho Quế', min: 650000, max: 950000 },
    ],
  },
  {
    slug: 'ninh-binh',
    name: 'Ninh Bình',
    province: 'Ninh Bình',
    region: 'MIEN_BAC',
    category: 'NUI_RUNG',
    address: 'Ninh Bình, Việt Nam',
    latitude: 20.2506149,
    longitude: 105.9744536,
    description: 'Di sản Tràng An - Bái Đính',
    summary: 'Quần thể danh thắng Tràng An – Tam Cốc non nước hữu tình cùng di tích cố đô Hoa Lư.',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200',
    isFeatured: false,
    bestMonths: [1, 2, 3, 4, 5, 9, 10, 11],
    avgTempByMonth: { 1: 17, 2: 18, 3: 20, 4: 24, 5: 28, 6: 30, 7: 30, 8: 29, 9: 28, 10: 25, 11: 21, 12: 18 },
    suggestedDays: 2,
    distanceFromHcm: '~1.650 km · Bay Hà Nội + 1h30 xe',
    tags: ['MOUNTAIN', 'BUDGET'],
    spots: [
      { name: 'Quần thể danh thắng Tràng An', type: 'SIGHTSEEING', lat: 20.2506, lng: 105.9375, note: 'Ngồi thuyền xuyên hang động' },
      { name: 'Cố đô Hoa Lư & Chùa Bái Đính', type: 'CULTURE', lat: 20.2856, lng: 105.9083, note: 'Kinh đô đầu tiên của Việt Nam' },
      { name: 'Dê núi & Cơm cháy Ninh Bình', type: 'FOOD', lat: 20.2543, lng: 105.9751, note: 'Đặc sản Ninh Bình' },
    ],
    costs: [
      { item: 'Xe limousine Hà Nội – Ninh Bình', min: 300000, max: 450000 },
      { item: 'Homestay Tam Cốc 2 đêm', min: 700000, max: 1300000 },
      { item: 'Ăn uống đặc sản dê núi', min: 600000, max: 900000 },
      { item: 'Vé thuyền Tràng An & Hang Múa', min: 350000, max: 500000 },
    ],
  },
  {
    slug: 'hue',
    name: 'Huế',
    province: 'Thừa Thiên Huế',
    region: 'MIEN_TRUNG',
    category: 'VAN_HOA',
    address: 'Thừa Thiên Huế, Việt Nam',
    latitude: 16.463713,
    longitude: 107.590866,
    description: 'Cố đô di sản trầm mặc bên dòng sông Hương',
    summary: 'Vùng đất cố đô với Đại Nội, hệ thống lăng tẩm triều Nguyễn, chùa Thiên Mụ và ẩm thực cung đình tinh tế.',
    imageUrl: 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200',
    isFeatured: false,
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8],
    avgTempByMonth: { 1: 20, 2: 21, 3: 24, 4: 27, 5: 29, 6: 30, 7: 30, 8: 29, 9: 27, 10: 25, 11: 23, 12: 20 },
    suggestedDays: 3,
    distanceFromHcm: '~1.050 km · 1h25 bay thẳng Phú Bài',
    tags: ['OLD_TOWN', 'FOOD', 'BUDGET'],
    spots: [
      { name: 'Đại Nội Huế & Chùa Thiên Mụ', type: 'CULTURE', lat: 16.4698, lng: 107.5784, note: 'Nên đi buổi sáng sớm' },
      { name: 'Đồi Vọng Cảnh & Cầu Trường Tiền', type: 'SIGHTSEEING', lat: 16.4352, lng: 107.5546, note: 'Ngắm hoàng hôn sông Hương' },
      { name: 'Bún bò Huế & Cơm hến', type: 'FOOD', lat: 16.4754, lng: 107.6033, note: 'Ẩm thực cố đô giá mềm' },
    ],
    costs: [
      { item: 'Vé máy bay khứ hồi', min: 1300000, max: 2200000 },
      { item: 'Khách sạn trung tâm 2 đêm', min: 650000, max: 1200000 },
      { item: 'Ăn uống & Chè Huế', min: 450000, max: 750000 },
      { item: 'Vé tham quan Đại Nội & Lăng tẩm', min: 420000, max: 550000 },
    ],
  },
  {
    slug: 'con-dao',
    name: 'Côn Đảo',
    province: 'Bà Rịa - Vũng Tàu',
    region: 'MIEN_NAM',
    category: 'BIEN_DAO',
    address: 'Bà Rịa - Vũng Tàu, Việt Nam',
    latitude: 8.6832323,
    longitude: 106.6062755,
    description: 'Vẻ đẹp hoang sơ và tâm linh',
    summary: 'Hòn đảo nguyên sơ với Bãi Đầm Trầu sát đường băng và các di tích lịch sử thiêng liêng.',
    imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200',
    isFeatured: false,
    bestMonths: [3, 4, 5, 6, 7, 8, 9],
    avgTempByMonth: { 1: 26, 2: 26, 3: 27, 4: 28, 5: 29, 6: 28, 7: 28, 8: 28, 9: 27, 10: 27, 11: 27, 12: 26 },
    suggestedDays: 3,
    distanceFromHcm: '~230 km · 45 phút bay thẳng',
    tags: ['BEACH'],
    spots: [
      { name: 'Bãi Đầm Trầu', type: 'SIGHTSEEING', lat: 8.7324, lng: 106.6251, note: 'Bãi biển đẹp nhất Côn Đảo' },
      { name: 'Nghĩa trang Hàng Dương & Nhà tù Côn Đảo', type: 'CULTURE', lat: 8.6894, lng: 106.6132, note: 'Di tích lịch sử quốc gia' },
      { name: 'Chợ đêm Côn Đảo', type: 'FOOD', lat: 8.6865, lng: 106.6078, note: 'Hải sản tươi nướng' },
    ],
    costs: [
      { item: 'Vé máy bay / Tàu cao tốc', min: 1500000, max: 3200000 },
      { item: 'Khách sạn / Homestay 2 đêm', min: 1000000, max: 2000000 },
      { item: 'Ăn uống & Hải sản', min: 800000, max: 1300000 },
      { item: 'Thuê xe máy & Vé tham quan', min: 300000, max: 500000 },
    ],
  },
];

async function main() {
  for (const d of destinations) {
    const existing = await prisma.destination.findFirst({ where: { name: d.name } });
    if (existing) await prisma.destination.update({ where: { id: existing.id }, data: d });
    else await prisma.destination.create({ data: d });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { fullName: 'Nguyễn Văn A', email: DEMO_EMAIL, passwordHash },
  });

  const daLat = await prisma.destination.findFirst({ where: { name: 'Đà Lạt' } });
  await prisma.trip.deleteMany({ where: { userId: user.id } });
  await prisma.trip.create({
    data: {
      userId: user.id,
      destinationId: daLat.id,
      title: 'Đà Lạt chill cuối tuần',
      destination: 'Đà Lạt',
      address: 'Đà Lạt, Lâm Đồng',
      latitude: daLat.latitude,
      longitude: daLat.longitude,
      startDate: day(23),
      endDate: day(25),
      budget: 5000000,
      description: 'Săn mây, cà phê rừng thông và đặc sản chợ Đà Lạt',
      isPublic: true,
      tags: ['MOUNTAIN', 'COFFEE', 'FOOD'],
      items: { create: items },
      expenses: { create: expenses },
    },
  });

  console.log(`Seed xong: ${destinations.length} điểm đến, tài khoản ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
