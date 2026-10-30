import * as exampleService from '../services/example.service.js';
import { AppError } from '../utils/AppError.js';

// Controller đọc req.user / req.valid, gọi service, trả dữ liệu trực tiếp (không bọc { data }).
// Express 5 tự chuyển lỗi của hàm async sang errorHandler, không cần try/catch.

export async function list(req, res) {
  res.json(await exampleService.listMyTrips(req.user.id));
}

export async function create(req, res) {
  const { startDate, endDate } = req.valid.body;
  if (endDate < startDate) throw AppError.badRequest('MSG 32', undefined, [{ field: 'endDate', code: 'MSG 32', message: 'Ngày về phải bằng hoặc sau ngày đi.' }]);
  res.status(201).json(await exampleService.createTrip(req.user.id, req.valid.body));
}

export async function detail(req, res) {
  res.json(await exampleService.getMyTrip(req.user.id, req.valid.params.id));
}
