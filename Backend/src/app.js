import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';

const app = express();

app.set('trust proxy', 1); // Render đứng sau proxy, cần để lấy đúng IP (rate limit NFR 4)
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // healthcheck Render, curl, Postman
      if (!env.isProd && env.corsOrigins.length === 0) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError(403, 'CORS_NOT_ALLOWED', 'Domain không được phép truy cập API.'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Ảnh bìa tải lên (UC 17). Helmet mặc định chặn trang khác origin nhúng ảnh, nên mở riêng cho thư mục này.
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(env.uploadDir, { index: false, dotfiles: 'ignore' }),
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
