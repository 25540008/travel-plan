CREATE TABLE "destination_costs" (
    "id" SERIAL NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "item" VARCHAR(150) NOT NULL,
    "min" DECIMAL(15,2) NOT NULL,
    "max" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "destination_costs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "destination_spots" (
    "id" SERIAL NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "note" TEXT,
    "image_url" VARCHAR(500),

    CONSTRAINT "destination_spots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "destination_costs_destination_id_idx" ON "destination_costs"("destination_id");

CREATE INDEX "destination_spots_destination_id_idx" ON "destination_spots"("destination_id");

ALTER TABLE "destination_costs" ADD CONSTRAINT "destination_costs_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "destination_spots" ADD CONSTRAINT "destination_spots_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
