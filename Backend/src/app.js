import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.set('trust proxy', 1); // Render đứng sau proxy, cần để lấy đúng IP (rate limit NFR 4)
app.use(helmet());
app.use(cors(env.corsOrigins.length ? { origin: env.corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
