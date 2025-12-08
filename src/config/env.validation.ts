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
  BACKEND_URL: Joi.string().uri().required(),
  EMAIL_FROM: Joi.string().email().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),

  LINKEDIN_CLIENT_ID: Joi.string().required(),
  LINKEDIN_CLIENT_SECRET: Joi.string().required(),
  LINKEDIN_CALLBACK_URL: Joi.string().uri().required(),

  SESSION_SECRET: Joi.string().required(),

  FRONTEND_URL: Joi.string().uri().required(),

  ALLOWED_ORIGINS: Joi.string()
    .required()
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
      'any.required': 'ALLOWED_ORIGINS is required',
      'any.invalid': 'ALLOWED_ORIGINS must be comma-separated valid URIs',
    }),

  GEMINI_API_KEY: Joi.string().required(),
});
