FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Copy build artifacts
COPY --from=builder /app/dist ./dist

# Copy README and config files
COPY --from=builder /app/README.md ./
COPY --from=builder /app/.env.example ./

# Create a dedicated user for running the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose ports
EXPOSE 8080 8081

# Command to run the application
CMD ["node", "dist/index.js"]