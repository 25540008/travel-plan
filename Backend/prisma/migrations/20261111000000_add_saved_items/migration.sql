-- CreateEnum
CREATE TYPE "SavedItemType" AS ENUM ('TRIP', 'DESTINATION');

-- CreateTable
CREATE TABLE "saved_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_type" "SavedItemType" NOT NULL,
    "item_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_items_user_id_item_type_item_id_key" ON "saved_items"("user_id", "item_type", "item_id");

-- CreateIndex
CREATE INDEX "saved_items_user_id_idx" ON "saved_items"("user_id");

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
