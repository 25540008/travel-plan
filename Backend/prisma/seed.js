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
