import prisma from '../lib/prisma.js';
import { toSlug } from '../utils/slug.js';

/**
 * GET /api/public/destinations (bản tối thiểu cho Screen 1, TP-42 ở Sprint 4 sẽ mở rộng thêm spots, costs, chi tiết theo slug).
 * Điểm đến nổi bật trước, rồi điểm đến có nhiều lịch trình công khai hơn. q: tìm theo tên/địa chỉ, không phân biệt dấu.
 */
export async function listDestinations({ page, size, q }) {
  const rows = await prisma.destination.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      description: true,
      imageUrl: true,
      isFeatured: true,
      latitude: true,
      longitude: true,
      trips: { where: { isPublic: true }, select: { budget: true } },
    },
  });

  const keyword = q ? toSlug(q) : '';
  const all = rows
    .map((d) => {
      const budgets = d.trips.map((t) => Number(t.budget)).filter((b) => b > 0);
      return {
        id: d.id,
        name: d.name,
        slug: toSlug(d.name),
        province: d.address ? d.address.split(',')[0].trim() : '',
        address: d.address,
        tagline: d.description,
        imageUrl: d.imageUrl,
        isFeatured: d.isFeatured,
        latitude: d.latitude == null ? null : Number(d.latitude),
        longitude: d.longitude == null ? null : Number(d.longitude),
        itineraryCount: d.trips.length,
        fromPrice: budgets.length ? Math.min(...budgets) : null,
      };
    })
    .filter((d) => !keyword || toSlug(`${d.name} ${d.address ?? ''}`).includes(keyword))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.itineraryCount - a.itineraryCount || a.id - b.id);

  const total = all.length;
  return { items: all.slice((page - 1) * size, page * size), page, size, total, hasMore: page * size < total };
}
