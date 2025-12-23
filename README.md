# Flex Living Reviews Dashboard - Backend API

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)
![Jest](https://img.shields.io/badge/Jest-29.x-red)
![Docker](https://img.shields.io/badge/Docker-✓-blue)

A production-ready backend API for managing guest reviews across multiple properties. Built for Flex Living to help property managers monitor performance, identify issues, and display approved reviews on their website.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Docker
- MongoDB (local or Atlas)
- npm or yarn

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd flex-living-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Or use Docker
docker-compose -f docker-compose.dev.yml up
```

### Production Deployment (Render)
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
flex-living-backend/
├── .github/
│   └── workflows/       #Github workflows  for CI/CD
├── src/
│   ├── config/          # Environment & database config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── tests/           # Test suites
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   ├── server.ts        # Server entry point
│   └── tests/           # Test files
├── scripts/             # Database seeding scripts
└── docker/              # Docker configurations
              
```

## 🛠 Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Testing**: Jest + Supertest + MongoDB Memory Server
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Render (Backend), Vercel (Frontend)
- **Security**: Helmet, CORS, Rate Limiting, JWT
- **Logging**: Winston with file rotation
- **Validation**: Express-validator

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/flex-living

# API Keys (mock data used if not configured)
HOSTAWAY_ACCOUNT_ID=61148
HOSTAWAY_API_KEY=your_hostaway_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3001
```

## 📊 API Endpoints

### Reviews Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/hostaway` | Get filtered Hostaway reviews |
| POST | `/api/reviews/sync` | Sync reviews from Hostaway |
| PATCH | `/api/reviews/:id` | Update review status |
| GET | `/api/reviews/public/:listingId` | Get public reviews for website |

### Dashboard Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/performance` | Property performance metrics |
| GET | `/api/dashboard/trends` | Review trends over time |
| GET | `/api/dashboard/issues` | Identify recurring issues |
| GET | `/api/dashboard/quick-stats` | Quick statistics |

### Google Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/google/reviews` | Get Google reviews |
| GET | `/api/google/search` | Search Google places |
| POST | `/api/google/connect` | Connect Google place to listing |

### Health & Docs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/api/docs` | API documentation |
| GET | `/` | API information |

## 🧪 Testing

```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e            # End-to-end tests

# Test with coverage report
npm run test:coverage

# Test in watch mode
npm run test:watch

# CI/CD testing
npm run test:ci
```

### Test Structure
- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints with MongoDB
- **E2E Tests**: Complete user flows and scenarios
- **Mock Data**: Realistic test data for all scenarios

## 🐳 Docker Support

### Development with Hot Reload
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production Build
```bash
# Build and run
docker-compose up

# Build only
docker build -t flex-living-backend .

# Run with custom port
docker run -p 3000:3000 -e MONGODB_URI=your_uri flex-living-backend
```

### Docker Compose Services
- **mongodb**: MongoDB 6.0 with initialized database
- **api**: Node.js application with auto-reload (dev) or production build

## 🔄 CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing and deployment:

### Continuous Integration
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb: # MongoDB service for testing
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Type checking
      - Linting
      - Run unit tests
      - Run integration tests
      - Run E2E tests
      - Generate coverage report

  build-and-deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Build project
      - Deploy to Vercel
```

### Workflow Features
- ✅ Automatic testing on push and PR
- ✅ TypeScript compilation check
- ✅ ESLint code quality check
- ✅ Complete test suite execution
- ✅ Coverage reporting
- ✅ Conditional deployment to production

## 🚢 Deployment

### Option 1: Render (Recommended for Backend)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   ```yaml
   Name: flex-living-backend
   Environment: Node
   Region: Oregon (or nearest)
   Branch: main
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

4. **Set Environment Variables**
   - `NODE_ENV=production`
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `CORS_ORIGIN` (Your frontend URL)
   - `JWT_SECRET` (Generate secure random string)

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy

### Option 2: Vercel (For Backend API)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set production environment variables
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
```

### Option 3: Traditional Hosting

```bash
# Build application
npm run build

# Start production server
NODE_ENV=production node dist/server.js
```

## 📈 Monitoring & Logging

### Health Checks
```bash
# Check API health
curl https://your-api.herokuapp.com/health

# Get metrics
curl https://your-api.herokuapp.com/health/metrics
```

### Log Files
- `logs/error.log`: All error logs
- `logs/combined.log`: All application logs
- Console output in development

### Winston Configuration
```typescript
// Custom logging levels and formats
logger.info('Server started on port 3000');
logger.error('Database connection failed', error);
logger.http('GET /api/reviews 200 45ms');
```

## 🔒 Security Features

- **Helmet.js**: Secure HTTP headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: 100 requests/15 minutes per IP
- **Input Validation**: Express-validator middleware
- **JWT Authentication**: Ready for user authentication
- **Environment-based configuration**: Separate dev/test/prod configs
- **NoSQL Injection Prevention**: Mongoose schema validation
- **XSS Protection**: Input sanitization utilities

## 🔌 API Integration Examples

### Fetch Hostaway Reviews
```javascript
// JavaScript/Node.js
const response = await fetch('/api/reviews/hostaway?listingId=property-1&minRating=4');
const data = await response.json();
```

### Get Dashboard Performance
```javascript
const response = await fetch('/api/dashboard/performance?timeframe=30d');
const performanceData = await response.json();
```

### Update Review Status
```javascript
const response = await fetch('/api/reviews/12345', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ isApproved: true, isPublic: true })
});
```

## 🗄️ Database Schema

### Review Model
```typescript
{
  externalId: String,      // Unique ID from source
  type: String,            // host-to-guest, guest-to-host, guest-to-property
  status: String,          // published, unpublished, pending, archived
  rating: Number,          // 1-5 scale
  publicReview: String,    // Review text
  reviewCategory: [{       // Category breakdown
    category: String,
    rating: Number         // 1-10 scale
  }],
  guestName: String,
  listingId: String,
  channel: String,         // hostaway, google, airbnb, booking, direct
  isApproved: Boolean,     // Manager approved
  isPublic: Boolean,       // Display on website
  sentimentScore: Number   // -1 to 1 sentiment analysis
}
```

## 🚦 Available Scripts

```bash
# Development
npm run dev              # Start development server with nodemon
npm run build           # Build TypeScript to dist/
npm start              # Start production server

# Testing
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests
npm run test:coverage  # Tests with coverage report

# Code Quality
npm run lint           # ESLint check
npm run type-check     # TypeScript compilation check

# Database
npm run seed           # Seed database with mock data
npm run docker:up      # Start Docker containers
npm run docker:down    # Stop Docker containers
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Update documentation as needed
- Follow TypeScript strict mode
- Use ESLint and Prettier formatting
- Keep commit messages descriptive

## 📝 License

This project is proprietary software developed for Flex Living. All rights reserved.

## 📞 Support

For issues, questions, or support:
1. Check the [API Documentation](/api/docs)
2. Review the test examples
3. Create an issue in the repository

## 🎯 Assessment Deliverables Status

✅ **Completed Requirements:**
- [x] Hostaway Integration (Mocked API)
- [x] Manager Dashboard Backend
- [x] Review Display Page Backend  
- [x] Google Reviews Exploration
- [x] Comprehensive Testing Suite
- [x] Docker Configuration
- [x] CI/CD Pipeline
- [x] Production Deployment Ready

🚧 **Pending Frontend Implementation:**
- [ ] Manager Dashboard UI
- [ ] Property Details Page with Reviews
- [ ] Review Approval Interface

---

**Deployment URL**: `https://flex-living-backend-vprf.onrender.com` (after deployment)

**API Documentation**: `https://flex-living-backend-vprf.onrender.com/api/docs`

**Health Check**: `https://flex-living-backend-vprf.onrender.com/health`

---

Built with ❤️ for the Flex Living Developer Assessment. All tests passing ✅