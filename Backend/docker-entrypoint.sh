#!/bin/sh
set -e
# Tạo/cập nhật bảng rồi mới chạy server
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node prisma/seed.js
fi
exec node src/server.js
