import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables before importing other local files
dotenv.config();

import { connectDB, disconnectDB } from './config/db';
import { rateLimiter } from './middleware/rateLimit.middleware';
import apiRouter from './routes';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Reverse Proxy Trust (Essential for Hostinger, Cloudflare, Nginx reverse proxy)
app.set('trust proxy', 1);

// 2. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Allow dynamic Vite frontend scripts and external CDNs
  })
);

// 3. CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://arthovistaservices.sbs',
  'http://arthovistaservices.sbs'
];

if (process.env.APP_URL) {
  const appUrl = process.env.APP_URL.trim();
  if (appUrl && !allowedOrigins.includes(appUrl)) {
    allowedOrigins.push(appUrl);
  }
}

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile app, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(o => {
        const cleanOrigin = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const cleanO = o.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return cleanOrigin === cleanO || cleanOrigin.endsWith(`.${cleanO}`);
      });

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Permissive same-domain check for Hostinger
      if (origin.includes('arthovistaservices.sbs')) {
        return callback(null, true);
      }

      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id']
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// 4. Static Uploads Directory
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'ignore',
  maxAge: '1d'
}));

// 5. Database Initialization
connectDB();

// 6. Health Check Endpoint (For Hostinger deployment monitor and keep-alive)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 7. Bind API Routes with rate limiter protection
app.use('/api', rateLimiter, apiRouter);

// 8. Serve Frontend Static SPA in Production / Hostinger
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'dist')
];

const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (frontendDistPath) {
  logger.info(`Serving production frontend build from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Exclude API, health, uploads, downloads from SPA fallback
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/download')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 9. Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled request error:', err);

  const status = err.status || 500;
  const response: any = {
    success: false,
    message: err.message || 'An unexpected error occurred.',
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR'
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

// 10. Start Express Server
const server = app.listen(PORT, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// 11. Graceful Shutdown & Unhandled Exception Handlers
const handleShutdown = async (signal: string) => {
  logger.warn(`${signal} received. Shutting down gracefully.`);
  await disconnectDB();
  server.close(() => {
    logger.info('Server and database connections terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Prevent Node crashes on unhandled errors (Prevents Hostinger 503 Service Unavailable)
process.on('uncaughtException', (err: any) => {
  logger.error('Uncaught Exception caught safely:', err);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection caught safely:', reason);
});
