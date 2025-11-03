# 🐳 Docker Setup Guide

## Overview

This project uses Docker for containerization of the backend application and MySQL database.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Development Mode

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean state)
docker-compose down -v
```

### 2. Production Build

```bash
# Build production image
docker build -t blood-test-backend:latest .

# Run production container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name blood_test_backend \
  blood-test-backend:latest
  ```

### 3. Services
**Backend (NestJS)**
- Port: 3000
- Swagger: [http://localhost:3000/api](http://localhost:3000/api)
- Health: [http://localhost:3000/health](http://localhost:3000/health)

**Database (MySQL)**
- Port: 3306
- User: root
- Password: (from .env)
- Database: blood_test_analyzer

**Adminer (Database UI)**
- Port: 8080
- URL: [http://localhost:8080](http://localhost:8080)
- System: MySQL
- Server: db
- Username: root
- Password: (from .env)

**Environment Variables**

Required environment variables (see .env.example):
```env
# Application
APP_PORT=3000

# Database
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASS=rootpassword
DB_NAME=blood_test_analyzer

# JWT
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRATION=7d
```

**Useful Commands**
**Development**
```bash
# Rebuild and start
docker-compose up -d --build

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend npm run migration:run

# Access backend shell
docker-compose exec backend sh

# Access database shell
docker-compose exec db mysql -u root -p blood_test_analyzer

# Restart specific service
docker-compose restart backend
```

**Database**
```bash
# Run migrations
docker-compose exec backend npm run migration:run

# Revert migration
docker-compose exec backend npm run migration:revert

# Create migration
docker-compose exec backend npm run migration:create CreateUsersTable
```

**Cleanup**
```bash
# Stop containers
docker-compose down

# Stop and remove volumes (CAREFUL: deletes data)
docker-compose down -v

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

**Troubleshooting**
**Port already in use**

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

**Database connection failed**
```bash
# Check database health
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db

# Connect to database manually
docker-compose exec db mysql -u root -p
```

**Hot reload not working**

Make sure volumes are correctly mounted:

```yaml
volumes:
  - .:/app           # Source code
  - /app/node_modules  # Preserve node_modules
  ```

**Permission errors (Linux/Mac)**

```bash
# Fix file ownership
sudo chown -R $USER:$USER .

# Or run containers as current user
docker-compose run --user $(id -u):$(id -g) backend npm install
```

**Production Deployment**  
**Build production image**

```bash
docker build -t blood-test-backend:1.0.0 -f Dockerfile .
```

**Run with docker-compose (production)**  
Create `docker-compose.prod.yml:`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
```
Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Docker Hub / Registry**  
**Tag and push image**
```bash
# Tag image
docker tag blood-test-backend:latest your-registry/blood-test-backend:1.0.0

# Push to registry
docker push your-registry/blood-test-backend:1.0.0

# Pull from registry
docker pull your-registry/blood-test-backend:1.0.0
```
**CI/CD Integration**  
Example GitHub Actions workflow:
```yaml
name: Build Docker Image

on:
  push:
    branches: [develop, main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t blood-test-backend .
      
      - name: Run tests
        run: docker run blood-test-backend npm test
```
**Health Checks**  
The production Dockerfile includes a health check:
```
dockerfileCopyHEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health')"
```
Monitor health:  
```bash
docker ps
# Look for "healthy" status
```
**Security Best Practices**  

**✅ Implemented:**

- Non-root user in container
- Multi-stage build (smaller image)
- .dockerignore to exclude sensitive files
- Health checks
- Signal handling with dumb-init

**⚠️ TODO for production:**

- Use secrets management (Docker Secrets, Vault)
- Scan images for vulnerabilities: docker scan blood-test-backend
- Use specific image versions (not latest)
- Enable Docker Content Trust
- Implement rate limiting
- Configure proper CORS

**Performance Optimization**  
**Current optimizations:**

- Multi-stage builds (smaller image size)
- Layer caching
- Production dependencies only
- Alpine Linux base (minimal size)

**Image size:**
```
docker images blood-test-backend
# Expected: ~200-300MB for production
```

