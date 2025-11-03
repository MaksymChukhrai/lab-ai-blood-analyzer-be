# ========================================
# Stage 1: Builder
# ========================================
FROM node:20-bookworm-slim AS builder

# Install security updates and build dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove devDependencies
RUN npm prune --production && \
    npm cache clean --force

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-bookworm-slim AS production

# Install dumb-init and security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        dumb-init \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# Metadata
LABEL maintainer="mchukhrai@zenbit.tech" \
      version="1.0.0" \
      description="Blood Test Analyzer Backend - Production" \
      org.opencontainers.image.source="https://github.com/ZenBit-Tech/green_be"