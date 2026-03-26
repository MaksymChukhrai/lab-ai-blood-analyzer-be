# 🩺 Lab AI - Blood Test Analyzer (Backend)

<div align="center">

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

[🌐 Live Demo](https://lab-ai-blood-analyzer.vercel.app) • [📚 API Docs](https://lab-ai-blood-analyzer-be-production.up.railway.app/api/docs) • [💚 Health Check](https://lab-ai-blood-analyzer-be-production.up.railway.app/api/health) • [🎨 Frontend Repo](https://github.com/MaksymChukhrai/lab-ai-blood-analyzer)

</div>

---
## 📑 Table of Contents

- [About The Project](#-about-the-project)
- [Tech Stack](#️-tech-stack)
- [AI Architecture](#-ai-architecture)
- [Getting Started](#-getting-started)
- [OAuth Setup](#-oauth-setup)
- [Available Scripts](#-available-scripts)
- [Production Deployment](#-production-deployment)
- [API Documentation](#-api-documentation)
- [Docker Setup](#-docker-setup)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Links](#-links)

## 📋 About The Project

**Lab AI - Blood Test Analyzer** is an intelligent healthcare platform that empowers patients and doctors with AI-driven blood test analysis and personalized health recommendations.

### ✨ Key Features

- 🔐 **Multi-Provider Authentication**
  - Google OAuth 2.0
  - LinkedIn OpenID Connect
  - Magic Link (passwordless email authentication)

- 📄 **Smart Document Processing**
  - Upload blood test PDFs or photos (mobile)
  - OCR text recognition
  - AI-powered analysis with personalized insights

- 🤖 **AI-Powered Analysis**
  - Gender and age-specific recommendations
  - Individual patient characteristics consideration
  - Early diagnosis support tool

- 📊 **Detailed Health Reports**
  - Comprehensive analysis results
  - Actionable health recommendations
  - Medical professional consultation suggestions

### 🎯 Use Cases

- **For Patients**: Early diagnosis, health monitoring, understanding test results
- **For Doctors**: Quick reference tool, patient education support, preliminary analysis

---

## 🛠️ Tech Stack

### Core Framework
- **NestJS 11.x** - Progressive Node.js framework
- **TypeScript 5.x** - Strict mode enabled
- **Node.js 20.x** - LTS runtime

### Database & Caching
- **MySQL 8.0** - Primary database
- **TypeORM** - Database ORM
- **Redis 7.x** - Session storage & caching

### Authentication
- **Passport.js** - OAuth & JWT strategies
- **JWT** - Access & refresh tokens
- **express-session** - Session management
- **connect-redis** - Redis session store

### AI & Document Processing
- **Google Gemini AI** - Blood test analysis
- **LangChain** - AI workflow orchestration
- **OCR Integration** - Text extraction from images/PDFs

### Email Service
- **Resend API** - Transactional emails (Magic Link)
- **React Email** - Email templates

### DevOps & Deployment
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration
- **Railway** - Production hosting (Europe-West4)

---

## 🤖 AI Architecture

### How It Works

1. **Document Upload**
User → Upload PDF/Image → OCR Processing → Text Extraction

2. **AI Analysis Pipeline**
```typescript
// LangChain workflow
Input: {
  bloodTestData: ExtractedText,
  patientProfile: { age, gender, medicalHistory }
}

↓ Google Gemini AI

Output: {
  analysis: DetailedResults,
  recommendations: PersonalizedAdvice,
  riskFactors: HealthAlerts
}
```
## 🧠 Personalization Engine

- Gender-specific reference ranges  
- Age-based adjustments  
- Medical history context  
- Lifestyle factor integration  

## 🤖 AI Models Used

- Google Gemini 1.5 Pro — Primary analysis model  
- LangChain Agents — Multi-step reasoning  
- Custom Prompts — Medical domain expertise  

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher  
- Docker & Docker Compose  
- Git  

### Installation

1. Clone the repository  
```bash
git clone https://github.com/MaksymChukhrai/lab-ai-blood-analyzer-be.git
cd lab-ai-blood-analyzer-be
```
2. Install dependencies
```bash
npm install
```
3. Setup environment variables
```bash
cp .env.example .env
```
4. Configure .env file

```
# Database
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your-password
DB_NAME=lab_ai_db

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email (Resend)
RESEND_API_KEY=re_your_key
RESEND_FROM=onboarding@resend.dev
RESEND_FROM_NAME=AI Lab Analyzer

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# OAuth - LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# AI
GEMINI_API_KEY=your-gemini-api-key

# Redis
REDIS_URL=redis://localhost:6379

# URLs
BACKEND_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173
```

### Run Application

5. Start services with Docker  
```bash
docker-compose up -d
```
6. Run database migrations
```bash
npm run migration:run
```
7. Start development server
```bash
npm run start:dev
```
8. Access the application
- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health
- Adminer (DB UI): http://localhost:8080

## 🔐 OAuth Setup

### Google OAuth

1. Go to Google Cloud Console  
2. Create a new project or select existing  
3. Navigate to **APIs & Services → Credentials**  
4. Create **OAuth 2.0 Client ID (Web Application)**  
5. Add authorized redirect URI:  
```bash
http://localhost:3000/api/auth/google/callback
```
6. Copy Client ID and Client Secret to `.env`

### LinkedIn OAuth

1. Go to LinkedIn Developers  
2. Create a new app  
3. Enable **"Sign In with LinkedIn using OpenID Connect"**  
4. Add redirect URL:  
```bash
http://localhost:3000/api/auth/linkedin/callback
```
5. Request access to **OpenID, Profile**, and **Email** scopes
6.Copy **Client ID** and **Client Secret** to `.env`

### Magic Link (Resend)

1. Sign up at Resend
2. Create API key
3. Add to `.env`:
```Bash
RESEND_API_KEY=re_your_api_key
RESEND_FROM_NAME=AI Lab Analyzer
```
 ## 📦 Available Scripts
 ```Bash
 # Development
npm run start:dev          # Start dev server with hot-reload
npm run start:debug        # Start with debugger

# Production
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage

# Docker
docker-compose up -d       # Start all services
docker-compose down        # Stop all services
docker-compose logs -f     # View logs
 ```
## 🌐 Production Deployment

### Hosted on Railway

- **URL**: [Open API](https://lab-ai-blood-analyzer-be-production.up.railway.app)  
- **Region**: Europe-West4  
- **Database**: Railway MySQL  
- **Cache**: Railway Redis  
- **Auto-deploy**: Enabled (GitHub main branch)  

### Environment Variables (Railway)

All production environment variables are managed in Railway Dashboard.  
```Bash
Railway Project → Variables → Add/Edit
```

### Required Variables

- Database credentials (auto-generated by Railway MySQL)  
- Redis URL (auto-generated by Railway Redis)  
- OAuth secrets  
- Gemini API key  
- Resend API key  
- Production URLs  

## 📚 API Documentation
### Endpoints Overview
#### Authentication
```Bash
GET    /api/auth/google                    # Google OAuth
GET    /api/auth/google/callback           # Google callback
GET    /api/auth/linkedin                  # LinkedIn OAuth
GET    /api/auth/linkedin/callback         # LinkedIn callback
POST   /api/auth/magic-link/request        # Request magic link
GET    /api/auth/magic-link/consume        # Consume magic link
POST   /api/auth/refresh                   # Refresh access token
POST   /api/auth/logout                    # Logout user
GET    /api/auth/profile                   # Get user profile
```

#### Blood Test Analysis
```Bash
POST   /api/analysis/upload                # Upload test document
GET    /api/analysis/:id                   # Get analysis result
GET    /api/analysis/history               # User's analysis history
```

#### Health

```Bash
GET    /health                             # Application health status
```

### Full API Documentation
📖 [Swagger UI:](https://lab-ai-blood-analyzer-be-production.up.railway.app/api/docs)

## 🐳 Docker Setup
#### Services
- MySQL 8.0 - Database (port 3306)
- Redis 7.x - Cache/Sessions (port 6379)
- Adminer - Database UI (port 8080)
- Backend - NestJS API (port 3000)

#### Docker Compose
```Bash
services:
  db:          # MySQL database
  redis:       # Redis cache
  adminer:     # Database admin UI
  backend:     # Production build
  backend-dev: # Development with hot-reload
```

#### Start services:
```Bash
docker-compose up -d
```
#### View logs:
```Bash
docker-compose logs -f backend
```

## 🧪 Testing

### Authentication Flow

#### Google OAuth

```bash
curl http://localhost:3000/api/auth/google
# Follow redirect → Get tokens
```
#### Magic Link
```bash
curl -X POST http://localhost:3000/api/auth/magic-link/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Check email → Click link → Get tokens
```

#### Token Refresh
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token"}'
```

### 📁 Project Structure
```bash
src/
├── modules/
│   ├── auth/              # Authentication module
│   │   ├── strategies/    # Passport strategies
│   │   ├── guards/        # Auth guards
│   │   └── entities/      # User & token entities
│   ├── analysis/          # Blood test analysis
│   └── upload/            # File upload handling
├── common/
│   └── services/
│       └── email.service.ts  # Resend email API
├── config/
│   └── env.validation.ts     # Joi schema
└── main.ts                   # Bootstrap
```

### 🔗 Links

[Frontend Repository](https://github.com/MaksymChukhrai/lab-ai-blood-analyzer)  
[Live Application](https://lab-ai-blood-analyzer.vercel.app)   
[Swagger API Documentation](https://lab-ai-blood-analyzer-be-production.up.railway.app/api/docs)  
[Health Check](https://lab-ai-blood-analyzer-be-production.up.railway.app/api/health)

- [Jump to the 📑 Table of Contents](#-table-of-contents)