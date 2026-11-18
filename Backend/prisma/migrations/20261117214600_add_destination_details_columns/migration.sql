ALTER TABLE "destinations"
ADD COLUMN "slug" VARCHAR(120),
ADD COLUMN "province" VARCHAR(100),
ADD COLUMN "region" VARCHAR(50),
ADD COLUMN "category" VARCHAR(50),
ADD COLUMN "best_months" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "avg_temp_by_month" JSONB,
ADD COLUMN "summary" TEXT,
ADD COLUMN "suggested_days" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "distance_from_hcm" VARCHAR(100),
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");
