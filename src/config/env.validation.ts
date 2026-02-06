import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DB_TYPE: Joi.string().valid('mysql').default('mysql').required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().default(900),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(604800),

  MAGIC_LINK_EXPIRY_SECONDS: Joi.number().default(900),
  BACKEND_URL: Joi.string()
    .uri()
    .allow('')
    .optional()
    .default('http://localhost:3000/api')
    .description('Backend base URL for email links'),

  // ========================================
  // 🔧 Email Service (Resend)
  // ========================================
  RESEND_API_KEY: Joi.string()
    .optional()
    .description('Resend API key for email sending'),
  RESEND_FROM: Joi.string()
    .email()
    .optional()
    .default('onboarding@resend.dev')
    .description('Resend sender email address'),

  // ========================================
  // 📧 Legacy SMTP (optional, for backward compatibility)
  // ========================================
  EMAIL_FROM: Joi.string().email().optional(),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),

  // ========================================
  // 🔐 OAuth Providers
  // ========================================
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .default('http://localhost:3000/api/auth/google/callback')
    .description('Google OAuth callback URL'),

  LINKEDIN_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .default('http://localhost:3000/api/auth/linkedin/callback')
    .description('LinkedIn OAuth callback URL'),

  SESSION_SECRET: Joi.string().required(),

  // ========================================
  // 🌐 Frontend & CORS
  // ========================================
  FRONTEND_URL: Joi.string()
    .uri()
    .allow('')
    .default('http://localhost:5173')
    .description('Frontend application URL'),

  ALLOWED_ORIGINS: Joi.string()
    .optional()
    .default('http://localhost:5173')
    .custom((value: unknown, helpers) => {
      if (typeof value !== 'string') {
        return helpers.error('string.base');
      }

      const origins: string[] = value
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);

      if (origins.length === 0) {
        return helpers.error('any.invalid', {
          message: 'ALLOWED_ORIGINS cannot be empty',
        });
      }

      for (const origin of origins) {
        const validation = Joi.string().uri().validate(origin);
        if (validation.error) {
          return helpers.error('any.invalid', {
            message: `Invalid origin URL: ${origin}`,
          });
        }
      }

      return value;
    }, 'CORS origins validation')
    .messages({
      'string.base': 'ALLOWED_ORIGINS must be a string',
      'any.invalid': 'ALLOWED_ORIGINS must be comma-separated valid URIs',
    }),

  // ========================================
  // 🤖 AI Services
  // ========================================
  GEMINI_API_KEY: Joi.string().required(),
});
