# Flex Living Reviews Dashboard - Backend

A production-ready backend API for managing property reviews and dashboard analytics.

## Features

- 🚀 **Complete API Implementation**: All required endpoints as per specification
- 🎯 **Real-time Review Sync**: Integration with Hostaway API (mocked)
- 📊 **Dashboard Analytics**: Comprehensive statistics and trend analysis
- 🔍 **Advanced Filtering**: Filter reviews by multiple criteria
- 🌐 **Google Integration**: Google Places API integration for reviews
- 🛡️ **Security**: Helmet, CORS, rate limiting, input validation
- 📈 **Scalable Architecture**: Ready for horizontal scaling
- 🐳 **Docker Support**: Complete containerization
- 🧪 **Comprehensive Testing**: Jest with 80%+ coverage target
- 🔄 **CI/CD Pipeline**: GitHub Actions for automated testing & deployment
- 📚 **API Documentation**: Swagger/OpenAPI documentation

## Google Reviews Integration - Findings

### ✅ What Works:
1. **API Connection**: Successfully integrated Google Places API
2. **Review Fetching**: Can fetch reviews for any Google Place ID
3. **Search Functionality**: Can search for businesses by name/location
4. **Caching**: Reviews are cached for 24 hours to reduce API calls
5. **Mock Data**: Falls back to mock data when API key is not configured

### ⚠️ Limitations Found:
1. **Review Limit**: Google Places API returns only 5 most helpful reviews
2. **No Categories**: Google reviews don't have category breakdowns like Hostaway
3. **API Costs**: Google Places API has usage limits and costs money after free tier
4. **Business Verification**: Need to verify business ownership for full access

### 🔧 Implementation Details:
- **Endpoint**: `/api/google/reviews?placeId=...`
- **Endpoint**: `/api/google/search?query=...`
- **Authentication**: Uses Google Cloud API key
- **Data Structure**: Transforms Google reviews to match our Review model
- **Caching**: 24-hour cache to optimize API usage

### 📊 Cost Considerations:
- **Places API Details**: $0.017 per call (first 1000 calls/month free)
- **Estimated Monthly Cost**: ~$5-10 for 500-600 property syncs
- **Recommendation**: Implement webhook for new reviews instead of polling

### 🎯 Recommendation for Production:
1. **Verify Business**: Register each property as a Google Business
2. **Use Webhooks**: Implement Google My Business API for real-time updates
3. **Batch Sync**: Sync all properties once daily instead of on-demand
4. **Cache Aggressively**: Store reviews for 7-30 days depending on update frequency


## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Testing**: Jest, Supertest, MongoDB Memory Server
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston with file rotation
- **Validation**: Joi & Express Validator

## Prerequisites

- Node.js 18+ & npm
- MongoDB 6+
- Docker & Docker Compose (optional)
- Google Places API key (for Google integration)

## Quick Start

### Local Development

1. **Clone and install:**
```bash
git clone <myrepository-url>
cd flex-living-backend
npm install




# Flex Living Reviews Dashboard Backend

A robust backend API for managing property reviews with Hostaway integration and Google Reviews exploration.

## Features

1. **Hostaway Integration** - Mocked API with realistic review data
2. **Manager Dashboard** - Performance metrics, trends, and issue identification
3. **Review Display** - Public API for approved reviews on website
4. **Google Reviews** - Integration with Google Places API (mock data available)

## Tech Stack

- Node.js with TypeScript
- Express.js
- MongoDB with Mongoose
- Docker for containerization
- Jest for testing

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (or Docker)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flex-living-backend