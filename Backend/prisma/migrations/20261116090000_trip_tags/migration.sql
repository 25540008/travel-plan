-- UC 7 B3: kiểu chuyến đi (tag) của chuyến để lọc lịch trình mẫu, ví dụ {MOUNTAIN,FOOD}
ALTER TABLE "trips" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
