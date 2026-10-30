import { AppError } from '../utils/AppError.js';

function toFieldError(issue) {
  const [code, message] = issue.message.includes('|') ? issue.message.split('|') : ['MSG 3', issue.message];
  return { field: issue.path.join('.'), code, message };
}

/**
 * Kiểm tra req.body / req.query / req.params bằng zod (CBR 1).
 * Dữ liệu đã làm sạch nằm ở req.valid.body, req.valid.query, req.valid.params.
 * Lỗi → 400 { code, message, errors: [{ field, code, message }] } với lỗi đầu tiên ở code/message.
 * Params sai (ví dụ id không phải số) → 404 như id không tồn tại.
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        if (part === 'params') return next(AppError.notFound());
        const errors = result.error.issues.map(toFieldError);
        return next(AppError.badRequest(errors[0].code, errors[0].message, errors));
      }
      req.valid[part] = result.data;
    }
    next();
  };
}
