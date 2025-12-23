# Dockerfile
# Multi-stage build for production
# Consider updating to node:20-alpine for better compatibility with your packages
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies) for building
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci  # Removed '--only=production' so tsc is available

# Copy source and build TypeScript
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install PRODUCTION dependencies only (keeps final image lean)
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/server.js"]