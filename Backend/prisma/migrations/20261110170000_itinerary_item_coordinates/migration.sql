-- Toạ độ của hoạt động (UC 19 bản đồ ngày, UC 20/21 chọn địa điểm Nominatim). Cột cho phép NULL nên dữ liệu cũ không đổi.
ALTER TABLE "itinerary_items" ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7);
