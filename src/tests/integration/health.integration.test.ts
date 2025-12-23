//src\tests\integration\health.integration.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import App from '../../app';

describe('Health API Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
    app = new App();
    await app.initializeDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getServer())
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        database: expect.stringMatching(/connected|disconnected/),
        environment: 'test',
        version: expect.any(String)
      });
    });
  });

  describe('GET /api/docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app.getServer())
        .get('/api/docs')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoints');
      // Check that endpoints is an object with expected keys
      expect(typeof response.body.endpoints).toBe('object');
      expect(Object.keys(response.body.endpoints).length).toBeGreaterThan(0);
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app.getServer())
        .get('/')
        .expect(200);
      
      expect(response.body).toMatchObject({
        message: 'Flex Living Reviews API',
        version: '1.0.0',
        endpoints: expect.any(Object)
      });
    });
  });
});