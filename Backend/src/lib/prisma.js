import { PrismaClient } from '@prisma/client';

// Dùng chung một PrismaClient cho cả app (nodemon reload không mở thêm kết nối).
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
