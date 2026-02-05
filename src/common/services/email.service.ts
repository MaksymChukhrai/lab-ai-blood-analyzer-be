// src/common/services/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMailOptions, Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

export type MagicLinkEmailPayload = {
  to: string;
  from: string;
  link: string;
  expiresInSeconds: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  public constructor(private readonly configService: ConfigService) {}

  private ensureTransporter(): Promise<void> {
    if (this.transporter) return Promise.resolve();

    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
        secure: port === 465, // true для SSL (465), false для STARTTLS (587)

        // 🔧 КРИТИЧНЫЕ НАСТРОЙКИ для Railway/Gmail:
        tls: {
          rejectUnauthorized: false, // Игнорируем самоподписанные сертификаты
          minVersion: 'TLSv1.2', // Минимальная версия TLS
        },

        // ⏱️ Таймауты (по умолчанию бесконечность):
        connectionTimeout: 10000, // 10 сек на подключение
        greetingTimeout: 5000, // 5 сек на приветствие SMTP
        socketTimeout: 10000, // 10 сек на операции сокета

        // 📋 Логирование для дебага:
        logger: this.configService.get<string>('NODE_ENV') !== 'production',
        debug: this.configService.get<string>('NODE_ENV') === 'development',
      });

      this.logger.log(
        `✅ SMTP transporter initialized: ${host}:${port} (user: ${user})`,
      );
      return Promise.resolve();
    }

    this.logger.error(
      '❌ SMTP configuration incomplete - missing required variables',
    );
    return Promise.resolve();
  }

  public async sendMagicLink(payload: MagicLinkEmailPayload): Promise<void> {
    try {
      await this.ensureTransporter();

      if (!this.transporter) {
        throw new Error('Mail transporter is not initialized');
      }

      const subject = 'Your one-time sign-in link';
      const text = `Sign in using this link (valid for ${Math.floor(payload.expiresInSeconds / 60)} minutes): ${payload.link}`;
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:auto; padding:20px;">
          <p>Hello,</p>
          <p>Use the button below to sign in. This link is one-time use and will expire in <strong>${Math.floor(
            payload.expiresInSeconds / 60,
          )} minutes</strong>.</p>
          <p style="text-align:center; margin: 24px 0;">
            <a href="${payload.link}" style="background-color:#0069d9;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
              Sign in
            </a>
          </p>
          <p>If the button does not work, copy and paste this URL into your browser:</p>
          <p style="word-break:break-all">${payload.link}</p>
          <hr />
          <p style="font-size:12px;color:#666;">If you did not request this link, you can safely ignore this email.</p>
        </div>
      `;

      const mailOptions: SendMailOptions = {
        from: payload.from,
        to: payload.to,
        subject,
        text,
        html,
      };

      // 📧 Отправка с логированием (без messageId чтобы избежать TypeScript ошибок)
      this.logger.log(`📧 Sending email: ${payload.from} → ${payload.to}`);
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${payload.to}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ sendMagicLink failed: ${err.message}`);

      // Дополнительная информация для дебага:
      if (err.message.includes('timeout')) {
        this.logger.error('💡 Hint: Try SMTP_PORT=465 instead of 587');
      }
      if (err.message.includes('authentication')) {
        this.logger.error('💡 Hint: Check SMTP_USER and SMTP_PASS are correct');
      }

      throw error;
    }
  }
}
