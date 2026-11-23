// Dữ liệu chi tiết điểm đến cho UC 8, UC 9 (SRS 7.1: tối thiểu 6 điểm đến). Nạp bằng npx prisma db seed, chạy lại nhiều lần không bị trùng.
// Chi phí, thời gian di chuyển và tọa độ địa điểm là số tham khảo gần đúng, nhóm đối chiếu lại trước khi công bố.

const COST_SOURCE = 'Giá tham khảo năm 2026 cho 1 người đi 3N2Đ, ở phòng đôi; thay đổi theo mùa và nơi đặt.';
const costs = (transport, lodging, food, tickets) => [
  { category: 'TRANSPORT', amount: transport, note: 'Khứ hồi', sortOrder: 1 },
  { category: 'LODGING', amount: lodging, note: '2 đêm', sortOrder: 2 },
  { category: 'FOOD', amount: food, note: '3 ngày', sortOrder: 3 },
  { category: 'TICKETS', amount: tickets, note: 'Các điểm tham quan chính', sortOrder: 4 },
];
const spot = (name, category, description, latitude, longitude) => ({ name, category, description, latitude, longitude });

export const destinationDetails = [
  {
    name: 'Đà Lạt', slug: 'da-lat', province: 'Lâm Đồng', region: 'HIGHLANDS', category: 'MOUNTAIN',
    bestMonths: [11, 12, 1, 2, 3], specialMonths: [11, 12], specialNote: 'Mùa hoa dã quỳ nở vàng đồi núi',
    avgTempByMonth: [16, 17, 18, 19, 19, 19, 18, 18, 18, 18, 17, 16],
    tags: ['Săn mây', 'Cà phê', 'Trekking'], travelFromHcm: '6–7 giờ đi xe', suggestedDays: '3–4 ngày',
    costs: costs(600000, 600000, 900000, 250000),
    spots: [
      spot('Hồ Xuân Hương', 'SIGHTSEEING', 'Hồ trung tâm thành phố, hợp đi dạo và đạp xe buổi sáng.', 11.9437, 108.4425),
      spot('Đồi chè Cầu Đất', 'SIGHTSEEING', 'Đồi chè xanh và điểm săn mây lúc bình minh.', 11.8667, 108.5667),
      spot('Thác Datanla', 'TREKKING', 'Thác nhỏ gần đèo Prenn, có máng trượt và đường mòn nhẹ.', 11.9027, 108.4491),
      spot('Chợ đêm Đà Lạt', 'FOOD', 'Sữa đậu nành, bánh tráng nướng và đồ len buổi tối.', 11.9425, 108.4382),
      spot('Dinh Bảo Đại', 'CULTURE', 'Biệt thự của vị vua cuối cùng, lưu nhiều hiện vật triều Nguyễn.', 11.9267, 108.4541),
    ],
  },
  {
    name: 'Hội An', slug: 'hoi-an', province: 'Quảng Nam', region: 'CENTRAL', category: 'CULTURE',
    bestMonths: [2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null,
    avgTempByMonth: [22, 23, 25, 27, 29, 30, 30, 29, 28, 26, 24, 22],
    tags: ['Phố cổ', 'Ẩm thực', 'Đèn lồng'], travelFromHcm: '1 giờ 30 bay đến Đà Nẵng, 45 phút đi xe', suggestedDays: '2–3 ngày',
    costs: costs(1800000, 700000, 800000, 220000),
    spots: [
      spot('Phố cổ Hội An', 'CULTURE', 'Khu phố cổ di sản với nhà cổ, hội quán và đèn lồng về đêm.', 15.8801, 108.3260),
      spot('Chùa Cầu', 'CULTURE', 'Biểu tượng của Hội An, cây cầu có mái từ thế kỷ 17.', 15.8774, 108.3260),
      spot('Biển An Bàng', 'SIGHTSEEING', 'Bãi biển yên tĩnh cách phố cổ khoảng 4 km.', 15.9016, 108.3547),
      spot('Cao lầu Bà Lễ', 'FOOD', 'Quán cao lầu và mì Quảng lâu năm trong phố cổ.', 15.8795, 108.3282),
    ],
  },
  {
    name: 'Phú Quốc', slug: 'phu-quoc', province: 'Kiên Giang', region: 'SOUTH', category: 'BEACH',
    bestMonths: [11, 12, 1, 2, 3, 4], specialMonths: [], specialNote: null,
    avgTempByMonth: [26, 27, 28, 29, 28, 28, 27, 27, 27, 27, 27, 26],
    tags: ['Biển', 'Lặn ngắm san hô', 'Hải sản'], travelFromHcm: '1 giờ bay', suggestedDays: '3–4 ngày',
    costs: costs(1600000, 1200000, 1100000, 400000),
    spots: [
      spot('Bãi Sao', 'SIGHTSEEING', 'Bãi cát trắng mịn, nước trong, ít sóng.', 10.0570, 104.0373),
      spot('Chợ đêm Dinh Cậu', 'FOOD', 'Hải sản nướng và đặc sản ngay trung tâm thị trấn Dương Đông.', 10.2187, 103.9657),
      spot('Hòn Thơm', 'SIGHTSEEING', 'Đảo nhỏ phía nam, đi cáp treo vượt biển.', 10.0050, 104.0340),
      spot('Nhà tù Phú Quốc', 'CULTURE', 'Di tích lịch sử với khu trưng bày và mô hình.', 10.0500, 104.0310),
    ],
  },
  {
    name: 'Sa Pa', slug: 'sa-pa', province: 'Lào Cai', region: 'NORTH', category: 'MOUNTAIN',
    bestMonths: [3, 4, 5, 9, 10], specialMonths: [2, 3], specialNote: 'Hoa đào, hoa mận nở cuối đông',
    avgTempByMonth: [9, 11, 14, 17, 19, 20, 20, 20, 18, 16, 13, 10],
    tags: ['Trekking', 'Ruộng bậc thang', 'Săn mây'], travelFromHcm: '2 giờ bay đến Hà Nội, 5 giờ đi xe', suggestedDays: '3–4 ngày',
    costs: costs(3200000, 700000, 800000, 300000),
    spots: [
      spot('Fansipan', 'TREKKING', 'Nóc nhà Đông Dương, đi cáp treo hoặc trekking.', 22.3033, 103.7750),
      spot('Bản Cát Cát', 'CULTURE', 'Bản người H\'Mông với nghề dệt và rèn truyền thống.', 22.3290, 103.8330),
      spot('Thung lũng Mường Hoa', 'SIGHTSEEING', 'Ruộng bậc thang trải dài, đẹp nhất mùa lúa chín.', 22.3000, 103.8800),
      spot('Chợ tình Sa Pa', 'FOOD', 'Ẩm thực vùng cao: thắng cố, cá hồi, thịt nướng.', 22.3364, 103.8438),
    ],
  },
  {
    name: 'Vũng Tàu', slug: 'vung-tau', province: 'Bà Rịa - Vũng Tàu', region: 'SOUTH', category: 'BEACH',
    bestMonths: [11, 12, 1, 2, 3, 4], specialMonths: [], specialNote: null,
    avgTempByMonth: [26, 27, 28, 29, 28, 27, 27, 27, 27, 27, 27, 26],
    tags: ['Biển', 'Hải sản', 'Cuối tuần'], travelFromHcm: '2 giờ đi xe', suggestedDays: '2–3 ngày',
    costs: costs(300000, 700000, 700000, 120000),
    spots: [
      spot('Bãi Sau', 'SIGHTSEEING', 'Bãi biển dài, đông vui, nhiều quán hải sản.', 10.3380, 107.0890),
      spot('Tượng Chúa Kitô Vua', 'CULTURE', 'Tượng lớn trên núi Nhỏ, ngắm toàn cảnh thành phố.', 10.3310, 107.0850),
      spot('Hải đăng Vũng Tàu', 'SIGHTSEEING', 'Ngọn hải đăng cổ trên núi Nhỏ, ngắm hoàng hôn.', 10.3290, 107.0770),
    ],
  },
  {
    name: 'Hạ Long', slug: 'ha-long', province: 'Quảng Ninh', region: 'NORTH', category: 'BEACH',
    bestMonths: [3, 4, 5, 9, 10, 11], specialMonths: [], specialNote: null,
    avgTempByMonth: [16, 17, 20, 24, 27, 29, 29, 28, 27, 25, 21, 17],
    tags: ['Vịnh di sản', 'Du thuyền', 'Hang động'], travelFromHcm: '2 giờ bay đến Hà Nội, 2,5 giờ đi xe', suggestedDays: '2–3 ngày',
    costs: costs(3000000, 1500000, 900000, 400000),
    spots: [
      spot('Vịnh Hạ Long', 'SIGHTSEEING', 'Vịnh di sản thế giới với hàng nghìn đảo đá vôi.', 20.9101, 107.1839),
      spot('Hang Sửng Sốt', 'SIGHTSEEING', 'Hang động rộng và đẹp nhất vịnh.', 20.8560, 107.0930),
      spot('Chợ đêm Hạ Long', 'FOOD', 'Hải sản và món địa phương như chả mực.', 20.9530, 107.0780),
    ],
  },
  {
    name: 'Hà Giang', slug: 'ha-giang', province: 'Hà Giang', region: 'NORTH', category: 'MOUNTAIN',
    bestMonths: [9, 10, 11], specialMonths: [10, 11], specialNote: 'Mùa hoa tam giác mạch',
    avgTempByMonth: [14, 16, 19, 22, 24, 25, 25, 25, 23, 21, 18, 15],
    tags: ['Phượt', 'Cao nguyên đá', 'Tam giác mạch'], travelFromHcm: '2 giờ bay đến Hà Nội, 6 giờ đi xe', suggestedDays: '3–4 ngày',
    costs: costs(3300000, 600000, 800000, 200000),
    spots: [
      spot('Cột cờ Lũng Cú', 'SIGHTSEEING', 'Điểm cực Bắc của Tổ quốc.', 23.3630, 105.3170),
      spot('Đèo Mã Pì Lèng', 'SIGHTSEEING', 'Một trong những con đèo hùng vĩ nhất Việt Nam.', 23.2420, 105.4140),
      spot('Phố cổ Đồng Văn', 'CULTURE', 'Phố cổ của người H\'Mông, họp chợ phiên Chủ nhật.', 23.2780, 105.3620),
    ],
  },
  {
    name: 'Côn Đảo', slug: 'con-dao', province: 'Bà Rịa - Vũng Tàu', region: 'SOUTH', category: 'BEACH',
    bestMonths: [2, 3, 4, 5, 6], specialMonths: [], specialNote: null,
    avgTempByMonth: [26, 27, 28, 29, 28, 28, 27, 27, 27, 27, 27, 26],
    tags: ['Biển hoang sơ', 'Tâm linh', 'Lặn biển'], travelFromHcm: '1 giờ bay', suggestedDays: '3 ngày',
    costs: costs(2400000, 1000000, 800000, 150000),
    spots: [
      spot('Nghĩa trang Hàng Dương', 'CULTURE', 'Nơi an nghỉ của nhiều chiến sĩ cách mạng, đông người viếng ban đêm.', 8.6890, 106.6100),
      spot('Bãi Đầm Trầu', 'SIGHTSEEING', 'Bãi biển hoang sơ, cát trắng.', 8.7240, 106.6230),
      spot('Hòn Bảy Cạnh', 'SIGHTSEEING', 'Đảo nhỏ với rạn san hô, hợp lặn ngắm san hô.', 8.6520, 106.7140),
    ],
  },
  {
    name: 'Quy Nhơn', slug: 'quy-nhon', province: 'Bình Định', region: 'CENTRAL', category: 'BEACH',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null,
    avgTempByMonth: [24, 25, 26, 28, 29, 30, 30, 30, 28, 27, 26, 24],
    tags: ['Biển', 'Hải sản', 'Cuối tuần'], travelFromHcm: '1 giờ bay', suggestedDays: '3 ngày',
    costs: costs(1500000, 700000, 700000, 200000),
    spots: [
      spot('Eo Gió', 'SIGHTSEEING', 'Eo biển đá và đường đi bộ ven vách núi, đẹp lúc hoàng hôn.', 13.8030, 109.2400),
      spot('Kỳ Co', 'SIGHTSEEING', 'Bãi biển nước trong như ngọc, đi bằng ca nô.', 13.7280, 109.3180),
      spot('Tháp Đôi', 'CULTURE', 'Tháp Chăm cổ giữa thành phố.', 13.7780, 109.2210),
    ],
  },
  {
    name: 'Ninh Bình', slug: 'ninh-binh', province: 'Ninh Bình', region: 'NORTH', category: 'CULTURE',
    bestMonths: [1, 2, 3, 5, 6], specialMonths: [5, 6], specialNote: 'Mùa lúa chín vàng ở Tam Cốc',
    avgTempByMonth: [16, 17, 20, 24, 27, 29, 29, 28, 27, 25, 21, 17],
    tags: ['Di sản', 'Đi thuyền', 'Hang động'], travelFromHcm: '2 giờ bay đến Hà Nội, 2 giờ đi xe', suggestedDays: '2 ngày',
    costs: costs(2800000, 600000, 600000, 350000),
    spots: [
      spot('Tràng An', 'SIGHTSEEING', 'Quần thể danh thắng di sản, đi thuyền qua các hang động.', 20.2510, 105.9060),
      spot('Chùa Bái Đính', 'CULTURE', 'Quần thể chùa lớn nhất Việt Nam.', 20.2740, 105.8590),
      spot('Hang Múa', 'TREKKING', 'Leo gần 500 bậc đá để ngắm toàn cảnh Tam Cốc.', 20.2150, 105.9190),
    ],
  },
  {
    name: 'Mộc Châu', slug: 'moc-chau', province: 'Sơn La', region: 'NORTH', category: 'MOUNTAIN',
    bestMonths: [11, 12, 1, 2, 3], specialMonths: [2, 3, 11], specialNote: 'Mùa hoa mận trắng và hoa dã quỳ',
    avgTempByMonth: [14, 16, 19, 21, 22, 23, 23, 22, 21, 19, 16, 13],
    tags: ['Đồi chè', 'Hoa mận', 'Săn mây'], travelFromHcm: '2 giờ bay đến Hà Nội, 4 giờ đi xe', suggestedDays: '2–3 ngày',
    costs: costs(3000000, 600000, 700000, 200000),
    spots: [
      spot('Đồi chè Trái Tim', 'SIGHTSEEING', 'Đồi chè hình trái tim nổi tiếng để chụp ảnh.', 20.8350, 104.6600),
      spot('Thác Dải Yếm', 'SIGHTSEEING', 'Thác nước hình dải yếm giữa rừng thông.', 20.8420, 104.6140),
      spot('Rừng thông Bản Áng', 'TREKKING', 'Rừng thông và hồ nước, hợp dã ngoại.', 20.8010, 104.7020),
    ],
  },
  // TP-42: Đà Nẵng, Nha Trang, Huế. Chi phí lấy trung bình khoảng min–max của TP-42.
  {
    name: 'Đà Nẵng', slug: 'da-nang', province: 'Đà Nẵng', region: 'CENTRAL', category: 'BEACH',
    bestMonths: [2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null,
    avgTempByMonth: [22, 23, 25, 27, 29, 30, 30, 29, 28, 26, 24, 22],
    tags: ['Biển', 'Ẩm thực', 'Nhóm bạn'], travelFromHcm: '1 giờ 20 bay thẳng', suggestedDays: '3 ngày',
    costs: costs(1900000, 1150000, 950000, 600000),
    spots: [
      spot('Bãi biển Mỹ Khê', 'SIGHTSEEING', 'Tắm biển và đón bình minh.', 16.0592, 108.2476),
      spot('Bán đảo Sơn Trà & Chùa Linh Ứng', 'CULTURE', 'Toàn cảnh vịnh Đà Nẵng.', 16.1003, 108.2775),
      spot('Chợ Cồn Đà Nẵng', 'FOOD', 'Thiên đường ăn vặt miền Trung.', 16.0682, 108.2144),
    ],
  },
  {
    name: 'Nha Trang', slug: 'nha-trang', province: 'Khánh Hòa', region: 'CENTRAL', category: 'BEACH',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null,
    avgTempByMonth: [24, 25, 26, 28, 29, 29, 29, 29, 28, 27, 26, 25],
    tags: ['Biển', 'Ẩm thực'], travelFromHcm: '5 giờ cao tốc hoặc 1 giờ bay', suggestedDays: '3 ngày',
    costs: costs(725000, 1150000, 900000, 700000),
    spots: [
      spot('Đảo Hòn Mun', 'SIGHTSEEING', 'Lặn ngắm san hô.', 12.1691, 109.3039),
      spot('Tháp Bà Ponagar', 'CULTURE', 'Kiến trúc Chăm Pa cổ kính.', 12.2654, 109.1954),
      spot('Nem nướng Ninh Hòa', 'FOOD', 'Đặc sản trứ danh Nha Trang.', 12.2481, 109.1912),
    ],
  },
  {
    name: 'Huế', slug: 'hue', province: 'Thừa Thiên Huế', region: 'CENTRAL', category: 'CULTURE',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8], specialMonths: [], specialNote: null,
    avgTempByMonth: [20, 21, 24, 27, 29, 30, 30, 29, 27, 25, 23, 20],
    tags: ['Cố đô', 'Ẩm thực', 'Tiết kiệm'], travelFromHcm: '1 giờ 25 bay thẳng Phú Bài', suggestedDays: '3 ngày',
    costs: costs(1750000, 925000, 600000, 485000),
    spots: [
      spot('Đại Nội Huế & Chùa Thiên Mụ', 'CULTURE', 'Nên đi buổi sáng sớm.', 16.4698, 107.5784),
      spot('Đồi Vọng Cảnh & Cầu Trường Tiền', 'SIGHTSEEING', 'Ngắm hoàng hôn sông Hương.', 16.4352, 107.5546),
      spot('Bún bò Huế & Cơm hến', 'FOOD', 'Ẩm thực cố đô giá mềm.', 16.4754, 107.6033),
    ],
  },
];

/** Cập nhật điểm đến đã có theo tên (seed.js tạo trước), rồi thay địa điểm nên ghé và chi phí. Tên chưa có thì bỏ qua. */
export async function seedDestinationDetails(prisma) {
  let done = 0;
  for (const { spots, costs: costRows, ...fields } of destinationDetails) {
    const existing = await prisma.destination.findFirst({ where: { name: fields.name } });
    if (!existing) continue;
    await prisma.destination.update({ where: { id: existing.id }, data: { ...fields, costSource: COST_SOURCE } });
    await prisma.destinationSpot.deleteMany({ where: { destinationId: existing.id } });
    await prisma.destinationCost.deleteMany({ where: { destinationId: existing.id } });
    await prisma.destinationSpot.createMany({ data: spots.map((s, i) => ({ ...s, destinationId: existing.id, sortOrder: i + 1 })) });
    await prisma.destinationCost.createMany({ data: costRows.map((c) => ({ ...c, destinationId: existing.id })) });
    done += 1;
  }
  return done;
}
