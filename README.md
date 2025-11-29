## 🔐 OAuth Authentication

### Supported Providers
- ✅ Google OAuth 2.0
- ✅ LinkedIn OpenID Connect
- ✅ Magic Link (email-based passwordless)

### Setup Instructions

#### Prerequisites
1. Copy `.env.example` to `.env`
2. Fill in OAuth credentials
3. Install dependencies: `npm install`

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

#### LinkedIn OAuth Setup
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Enable "Sign In with LinkedIn using OpenID Connect"
4. Add redirect URL: `http://localhost:3000/api/auth/linkedin/callback`
5. Copy Client ID and Client Secret to `.env`

### Environment Variables
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# Frontend
FRONTEND_URL=http://localhost:5173

#### Testing
```bash
# Start development server
npm run start:dev

# Open in browser
http://localhost:3000/api/auth/google
http://localhost:3000/api/auth/linkedin

# API Documentation (Swagger)
http://localhost:3000/api/docs
```
#### Response Format
After successful authentication, user will be redirected to:
`http://localhost:5173/auth/callback?access_token=JWT_TOKEN&refresh_token=JWT_TOKEN`

#### Database
Currently using MySQL for development.

#### Database
**MySQL** ready for production.

**Development:**
- MySQL 8.0 via Docker Compose
- Auto-configured with default credentials
- Database name: `lab_ai_db`

**Production (Docker):**
- MySQL 8.0 container configured
- Connection via `.env` variables
- Migrations run automatically on startup

---

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests
```bash
unit tests
npm run test

e2e tests
npm run test:e2e

test coverage
npm run test:cov
```

## Docker
Backend containerized with Docker.
```bash
docker-compose up -d
```
Full documentation: [docs/DOCKER.md](https://github.com/ZenBit-Tech/green_be/blob/develop/docs/DOCKER.md)