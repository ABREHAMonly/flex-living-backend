Project Structure
flex-living-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── models/
│   │   ├── Review.ts
│   │   ├── Listing.ts
│   │   └── GoogleReview.ts
│   ├── services/
│   │   ├── hostaway.service.ts
│   │   ├── google.service.ts
│   │   └── review.service.ts
│   ├── controllers/
│   │   ├── reviews.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── google.controller.ts
│   │   ├── batch.controller.ts
│   │   ├── health.controller.ts
│   │   └── webhook.controller.ts
│   ├── routes/
│   │   ├── reviews.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── index.ts
│   │   ├── google.routes.ts
│   │   └── health.routes.ts
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── auth.middleware.ts
│   ├── utils/
│   │   ├── helpers.ts
│   │   ├── logger.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── index.ts
│   ├── tests/
│   │   ├── unit/
|   |   │   ├── dashboard.controller.test.ts
|   |   │   ├── hostaway.service.test.ts
|   |   │   └── review.service.test.ts
│   │   ├── integration/
|   |   │   ├── dashboard.integration.test.ts
|   |   │   ├── google.integration.test.ts
|   |   │   └── reviews.integration.test.ts
|   |   └── setup.ts
│   ├── app.ts
│   └── server.ts
├── docker/
│   └── mongodb/init.js
├── scripts/seed.ts test-google.js
├── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/ci-cd.yml
├── .env.example
├── .env
├── .gitignore
├── package.json
├── .eslintrc.json
├── docker-compose.test.yml
├── Dockerfile.test
├── tsconfig.json
├── jest.config.js
├── README.md
├── nodemon.json
├── vercel.json
└── swagger.yaml

# Run this in the project directory to generate JWT
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"


Method 2: Using OpenSSL
bash
# Generate 64 random bytes and convert to hex
openssl rand -hex 64

Method 3: Using PowerShell (Windows)
powershell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))




To Run Tests


# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch