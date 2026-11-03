import { z } from 'zod';


const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});

// GET /api/public/weather?lat=&lng=&days=
export const weatherSchema = {
  query: z.object({
    lat: z.coerce.number({ invalid_type_error: 'MSG 3|Giá trị vĩ độ không đúng định dạng.' }),
    lng: z.coerce.number({ invalid_type_error: 'MSG 3|Giá trị kinh độ không đúng định dạng.' }),
    days: z.coerce.number().int().positive().default(7),
  }),
};

// GET /api/trips/:id/itinerary?day=
export const getItinerarySchema = {
  params: idParamSchema,
  query: z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'MSG 3|Giá trị ngày không đúng định dạng.').optional(),
  }),
};

// POST /api/trips/:id/itinerary
export const createItinerarySchema = {
  params: idParamSchema,
  body: z
    .object({
      activityDate: z
        .string({ required_error: 'MSG 29|Vui lòng chọn ngày hoạt động.' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'MSG 3|Giá trị ngày không đúng định dạng.'),
      activity: z
        .string({ required_error: 'MSG 29|Vui lòng nhập tên hoạt động.' })
        .trim()
        .min(1, 'MSG 29|Vui lòng nhập tên hoạt động.')
        .max(200, 'MSG 30|Tên hoạt động tối đa 200 ký tự.'),
      startTime: z
        .string({ required_error: 'MSG 29|Vui lòng chọn giờ bắt đầu.' })
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'MSG 3|Giờ bắt đầu không đúng định dạng HH:mm.'),
      endTime: z
        .string({ required_error: 'MSG 29|Vui lòng chọn giờ kết thúc.' })
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'MSG 3|Giờ kết thúc không đúng định dạng HH:mm.'),
      location: z.string().trim().max(200, 'MSG 30|Địa điểm tối đa 200 ký tự.').optional().nullable(),
      note: z.string().trim().max(1000, 'MSG 30|Ghi chú tối đa 1000 ký tự.').optional().nullable(),
    })
    .refine((data) => data.endTime > data.startTime, {
      message: 'MSG 8|Giờ kết thúc phải sau giờ bắt đầu.',
      path: ['endTime'],
    }),
};

// PUT /api/trips/:id/itinerary/:itemId
export const updateItinerarySchema = {
  params: itemParamsSchema,
  body: z
    .object({
      activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'MSG 3|Giá trị ngày không đúng định dạng.').optional(),
      activity: z
        .string()
        .trim()
        .min(1, 'MSG 29|Vui lòng nhập tên hoạt động.')
        .max(200, 'MSG 30|Tên hoạt động tối đa 200 ký tự.')
        .optional(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'MSG 3|Giờ bắt đầu không đúng định dạng HH:mm.').optional(),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'MSG 3|Giờ kết thúc không đúng định dạng HH:mm.').optional(),
      location: z.string().trim().max(200, 'MSG 30|Địa điểm tối đa 200 ký tự.').optional().nullable(),
      note: z.string().trim().max(1000, 'MSG 30|Ghi chú tối đa 1000 ký tự.').optional().nullable(),
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return data.endTime > data.startTime;
        }
        return true;
      },
      {
        message: 'MSG 8|Giờ kết thúc phải sau giờ bắt đầu.',
        path: ['endTime'],
      }
    ),
};

// DELETE /api/trips/:id/itinerary/:itemId
export const deleteItinerarySchema = {
  params: itemParamsSchema,
};