import { z } from 'zod';

const m = (code, text) => `${code}|${text}`;

export const saveItemTypeEnum = ['TRIP', 'DESTINATION'];

// Schema POST /api/me/saved
export const saveItemBodySchema = {
  body: z.object({
    itemType: z.enum(saveItemTypeEnum, {
      error: m('MSG 3', 'Loại mục lưu không hợp lệ. Phải là TRIP hoặc DESTINATION.'),
    }),
    itemId: z.coerce
      .number({ error: m('MSG 3', 'ID mục phải là số.') })
      .int({ error: m('MSG 3', 'ID mục phải là số nguyên.') })
      .positive({ error: m('MSG 3', 'ID mục phải lớn hơn 0.') }),
  }),
};

// Schema DELETE /api/me/saved (qua query ?itemType=...&itemId=...)
export const deleteSavedItemSchema = {
  query: z.object({
    itemType: z.enum(saveItemTypeEnum, {
      error: m('MSG 3', 'Loại mục lưu không hợp lệ.'),
    }),
    itemId: z.coerce
      .number({ error: m('MSG 3', 'ID mục phải là số.') })
      .int()
      .positive(),
  }),
};

// Schema GET /api/me/saved
export const getSavedItemsSchema = {
  query: z.object({
    itemType: z.enum(saveItemTypeEnum, {
      error: m('MSG 3', 'Loại mục lọc không hợp lệ.'),
    }).optional(),
  }),
};