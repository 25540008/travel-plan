import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

/**
 * Kiểm tra xem đối tượng có tồn tại để lưu hay không
 * Trip: phải công khai (isPublic = true) hoặc là chuyến của chính user
 * Destination: phải tồn tại trong bảng destinations
 */
async function verifyItemExists(itemType, itemId, userId) {
  if (itemType === 'TRIP') {
    const trip = await prisma.trip.findFirst({
      where: {
        id: itemId,
        OR: [{ isPublic: true }, { userId: userId }],
      },
    });
    return !!trip;
  }

  if (itemType === 'DESTINATION') {
    const destination = await prisma.destination.findUnique({
      where: { id: itemId },
    });
    return !!destination;
  }

  return false;
}

//UC 12: Toggle lưu / bỏ lưu (POST /api/me/saved)
//Bấm lần 1 -> Lưu. Bấm lại khi đã lưu -> Bỏ lưu (BR 40)
export async function toggleSaveItem(userId, { itemType, itemId }) {
  const numericItemId = Number(itemId);
  const numericUserId = Number(userId);

  const exists = await verifyItemExists(itemType, numericItemId, numericUserId);
  if (!exists) {
    throw new AppError(400, 'MSG 18', 'Mục không tồn tại hoặc không thể lưu.');
  }

  const existingSave = await prisma.savedItem.findUnique({
    where: {
      userId_itemType_itemId: {
        userId: numericUserId,
        itemType,
        itemId: numericItemId,
      },
    },
  });

  if (existingSave) {
    // Đã lưu -> Bỏ lưu
    await prisma.savedItem.delete({
      where: { id: existingSave.id },
    });
    return {
      saved: false,
      message: 'Đã bỏ lưu thành công.',
    };
  }

  // Chưa lưu -> Lưu mới
  const newSave = await prisma.savedItem.create({
    data: {
      userId: numericUserId,
      itemType,
      itemId: numericItemId,
    },
  });

  return {
    saved: true,
    data: newSave,
    message: 'Đã lưu thành công.',
  };
}

//UC 12: Bỏ lưu trực tiếp (DELETE /api/me/saved?itemType=...&itemId=...)
export async function removeSavedItem(userId, { itemType, itemId }) {
  const numericItemId = Number(itemId);
  const numericUserId = Number(userId);

  const existingSave = await prisma.savedItem.findUnique({
    where: {
      userId_itemType_itemId: {
        userId: numericUserId,
        itemType,
        itemId: numericItemId,
      },
    },
  });

  if (!existingSave) {
    throw new AppError(404, 'MSG 18', 'Mục chưa được lưu.');
  }

  await prisma.savedItem.delete({
    where: { id: existingSave.id },
  });

  return {
    saved: false,
    message: 'Đã bỏ lưu thành công.',
  };
}

//Lấy danh sách các mục đã lưu kèm thông tin hiển thị thẻ (Screen 1, 2, 4)
export async function getSavedItems(userId, { itemType }) {
  const where = { userId: Number(userId) };
  if (itemType) {
    where.itemType = itemType;
  }

  const savedList = await prisma.savedItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const tripIds = savedList.filter((i) => i.itemType === 'TRIP').map((i) => i.itemId);
  const destIds = savedList.filter((i) => i.itemType === 'DESTINATION').map((i) => i.itemId);

  const [trips, destinations] = await Promise.all([
    tripIds.length > 0
      ? prisma.trip.findMany({
          where: { id: { in: tripIds } },
          select: {
            id: true,
            title: true,
            destination: true,
            coverImage: true,
            coverColor: true,
            budget: true,
            startDate: true,
            endDate: true,
          },
        })
      : [],
    destIds.length > 0
      ? prisma.destination.findMany({
          where: { id: { in: destIds } },
          select: {
            id: true,
            name: true,
            address: true,
            imageUrl: true,
            description: true,
          },
        })
      : [],
  ]);

  const tripMap = new Map(trips.map((t) => [t.id, t]));
  const destMap = new Map(destinations.map((d) => [d.id, d]));

  return savedList.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    itemId: item.itemId,
    createdAt: item.createdAt,
    details: item.itemType === 'TRIP' ? tripMap.get(item.itemId) || null : destMap.get(item.itemId) || null,
  }));
}