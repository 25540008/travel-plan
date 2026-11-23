-- UC 8, UC 9: thông tin chi tiết điểm đến (slug, vùng, loại, tháng đẹp...), địa điểm nên ghé và chi phí tham khảo.
ALTER TABLE "destinations"
  ADD COLUMN "slug" VARCHAR(160),
  ADD COLUMN "province" VARCHAR(100),
  ADD COLUMN "region" VARCHAR(20),
  ADD COLUMN "category" VARCHAR(20),
  ADD COLUMN "best_months" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "special_months" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "special_note" VARCHAR(150),
  ADD COLUMN "avg_temp_by_month" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "travel_from_hcm" VARCHAR(100),
  ADD COLUMN "suggested_days" VARCHAR(50),
  ADD COLUMN "cost_source" VARCHAR(255);

CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

CREATE TABLE "destination_spots" (
    "id" SERIAL NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500),
    "image_url" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_spots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "destination_spots_destination_id_idx" ON "destination_spots"("destination_id");

CREATE TABLE "destination_costs" (
    "id" SERIAL NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "destination_costs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "destination_costs_destination_id_idx" ON "destination_costs"("destination_id");

ALTER TABLE "destination_spots" ADD CONSTRAINT "destination_spots_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "destination_costs" ADD CONSTRAINT "destination_costs_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
