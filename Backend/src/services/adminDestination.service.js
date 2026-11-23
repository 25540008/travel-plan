import prisma from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { clearDestinationCache } from './destinationCatalog.service.js';

const includeChildren = {
  spots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  costs: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
};

const slugTaken = () => new AppError(409, 'SLUG_EXISTS', 'Slug điểm đến đã tồn tại.');

const formatDestination = (d) => ({
  ...d,
  latitude: d.latitude == null ? null : Number(d.latitude),
  longitude: d.longitude == null ? null : Number(d.longitude),
  spots: (d.spots ?? []).map((s) => ({
    ...s,
    latitude: s.latitude == null ? null : Number(s.latitude),
    longitude: s.longitude == null ? null : Number(s.longitude),
  })),
  costs: (d.costs ?? []).map((c) => ({
    ...c,
    amount: Number(c.amount),
  })),
});

async function ensureDestination(id) {
  const dest = await prisma.destination.findUnique({ where: { id } });
  if (!dest) throw AppError.notFound('Không tìm thấy điểm đến.');
  return dest;
}

// --- DESTINATION ---

export async function createDestination({ spots, costs, ...data }) {
  if (await prisma.destination.findFirst({ where: { slug: data.slug } })) throw slugTaken();
  try {
    const created = await prisma.destination.create({
      data: {
        ...data,
        ...(spots?.length ? { spots: { create: spots } } : {}),
        ...(costs?.length ? { costs: { create: costs } } : {}),
      },
      include: includeChildren,
    });
    clearDestinationCache();
    return formatDestination(created);
  } catch (err) {
    if (err?.code === 'P2002') throw slugTaken();
    throw err;
  }
}

export async function updateDestination(id, { spots, costs, ...data }) {
  const current = await ensureDestination(id);
  if (data.slug && data.slug !== current.slug) {
    const dup = await prisma.destination.findFirst({ where: { slug: data.slug } });
    if (dup && dup.id !== id) throw slugTaken();
  }
  try {
    const updated = await prisma.destination.update({
      where: { id },
      data: {
        ...data,
        ...(spots !== undefined ? { spots: { deleteMany: {}, create: spots } } : {}),
        ...(costs !== undefined ? { costs: { deleteMany: {}, create: costs } } : {}),
      },
      include: includeChildren,
    });
    clearDestinationCache();
    return formatDestination(updated);
  } catch (err) {
    if (err?.code === 'P2002') throw slugTaken();
    throw err;
  }
}

export async function deleteDestination(id) {
  await ensureDestination(id);
  await prisma.destination.delete({ where: { id } });
  clearDestinationCache();
  return { deleted: true, id };
}

// --- SPOTS CON ---

export async function createSpot(destinationId, data) {
  await ensureDestination(destinationId);
  const spot = await prisma.destinationSpot.create({ data: { ...data, destinationId } });
  clearDestinationCache();
  return {
    ...spot,
    latitude: spot.latitude == null ? null : Number(spot.latitude),
    longitude: spot.longitude == null ? null : Number(spot.longitude),
  };
}

export async function updateSpot(destinationId, spotId, data) {
  const existing = await prisma.destinationSpot.findFirst({ where: { id: spotId, destinationId } });
  if (!existing) throw AppError.notFound('Không tìm thấy địa điểm nên ghé.');
  const spot = await prisma.destinationSpot.update({ where: { id: spotId }, data });
  clearDestinationCache();
  return {
    ...spot,
    latitude: spot.latitude == null ? null : Number(spot.latitude),
    longitude: spot.longitude == null ? null : Number(spot.longitude),
  };
}

export async function deleteSpot(destinationId, spotId) {
  const existing = await prisma.destinationSpot.findFirst({ where: { id: spotId, destinationId } });
  if (!existing) throw AppError.notFound('Không tìm thấy địa điểm nên ghé.');
  await prisma.destinationSpot.delete({ where: { id: spotId } });
  clearDestinationCache();
  return { deleted: true, id: spotId };
}

// --- COSTS CON ---

export async function createCost(destinationId, data) {
  await ensureDestination(destinationId);
  const cost = await prisma.destinationCost.create({ data: { ...data, destinationId } });
  clearDestinationCache();
  return { ...cost, amount: Number(cost.amount) };
}

export async function updateCost(destinationId, costId, data) {
  const existing = await prisma.destinationCost.findFirst({ where: { id: costId, destinationId } });
  if (!existing) throw AppError.notFound('Không tìm thấy chi phí tham khảo.');
  const cost = await prisma.destinationCost.update({ where: { id: costId }, data });
  clearDestinationCache();
  return { ...cost, amount: Number(cost.amount) };
}

export async function deleteCost(destinationId, costId) {
  const existing = await prisma.destinationCost.findFirst({ where: { id: costId, destinationId } });
  if (!existing) throw AppError.notFound('Không tìm thấy chi phí tham khảo.');
  await prisma.destinationCost.delete({ where: { id: costId } });
  clearDestinationCache();
  return { deleted: true, id: costId };
}