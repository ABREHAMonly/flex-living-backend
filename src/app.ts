// src/app.ts (updated routes section)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import reviewRoutes from './routes/reviews.routes';
import dashboardRoutes from './routes/dashboard.routes';
import googleRoutes from './routes/google.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.url === '/health'
    });
    this.app.use('/api', limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Compression
    this.app.use(compression());
    
    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/reviews', reviewRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);
    this.app.use('/api/google', googleRoutes);
    this.app.use('/health', healthRoutes);
    
    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Flex Living Reviews API',
        version: '1.0.0',
        endpoints: {
          reviews: '/api/reviews/hostaway',
          dashboard: '/api/dashboard/performance',
          google: '/api/google/reviews',
          health: '/health'
        }
      });
    });
    
    // API documentation
    this.app.get('/api/docs', (_req, res) => {
      res.json({
        message: 'API Documentation',
        endpoints: {
          'GET /api/reviews/hostaway': 'Get reviews with filtering',
          'POST /api/reviews/sync': 'Sync reviews from Hostaway',
          'PATCH /api/reviews/:id': 'Update review status',
          'GET /api/reviews/public/:listingId': 'Get public reviews for website',
          'GET /api/dashboard/performance': 'Get property performance',
          'GET /api/dashboard/trends': 'Get review trends',
          'GET /api/dashboard/issues': 'Get identified issues',
          'GET /api/google/reviews': 'Get Google reviews',
          'GET /health': 'Health check'
        }
      });
    });
    
    // Catch-all for undefined routes
    this.app.use('*', notFoundHandler);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async initializeDatabase(): Promise<void> {
    await connectDatabase();
  }

  public getServer(): express.Application {
    return this.app;
  }
}

export default App;