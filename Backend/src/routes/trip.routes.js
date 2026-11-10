import { Router } from 'express';
import * as tripController from '../controllers/trip.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

const router = Router();

// 1. Schema cho params id (truyền dưới dạng { params: ... })
const tripIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'MSG 3|ID không hợp lệ' }),
  }),
};

// 2. Schema cho PUT /api/trips/:id (truyền dưới dạng { params: ..., body: ... })
const updateTripSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'MSG 3|ID không hợp lệ' }),
  }),
  body: z.object({
    title: z.string().max(150, { message: 'MSG 30|Tên chuyến đi tối đa 150 ký tự' }).optional(),
    description: z.string().max(1000, { message: 'MSG 30|Mô tả tối đa 1000 ký tự' }).optional(),
    destination: z.string().max(150, { message: 'MSG 30|Điểm đến tối đa 150 ký tự' }).optional(),
    // CBR 2: Ngân sách > 0, nếu <= 0 trả về MSG 33
    budget: z.number().positive({ message: 'MSG 33|Ngân sách phải lớn hơn 0' }).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    public_trip: z.boolean().optional(),
    publicTrip: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }).refine((data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  }, {
    message: 'MSG 32|Ngày về phải bằng hoặc sau ngày đi',
    path: ['end_date'],
  }),
};

// GET /api/trips/:id
router.get('/:id', auth, validate(tripIdParamSchema), tripController.getTrip);

// PUT /api/trips/:id (UC 15, UC 18)
router.put('/:id', auth, validate(updateTripSchema), tripController.updateTrip);

// DELETE /api/trips/:id
router.delete('/:id', auth, validate(tripIdParamSchema), tripController.deleteTrip);

export default router;
