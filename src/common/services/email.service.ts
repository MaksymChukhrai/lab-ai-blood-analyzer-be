// src/common/services/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export type MagicLinkEmailPayload = {
  to: string;
  from: string;
  link: string;
  expiresInSeconds: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  public constructor(private readonly configService: ConfigService) {
    this.initResend();
  }

  private initResend(): void {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log(`✅ Resend email service initialized`);
    } else {
      this.logger.error('❌ RESEND_API_KEY not found in environment variables');
    }
  }

  public async sendMagicLink(payload: MagicLinkEmailPayload): Promise<void> {
    try {
      if (!this.resend) {
        throw new Error('Resend client is not initialized');
      }

      const subject = 'Your one-time sign-in link';
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

      this.logger.log(
        `📧 Sending email via Resend: ${payload.from} → ${payload.to}`,
      );

      const { data, error } = await this.resend.emails.send({
        from: payload.from,
        to: [payload.to],
        subject,
        html,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      this.logger.log(`✅ Email sent successfully via Resend to ${payload.to}`);
      this.logger.debug(`Resend email ID: ${data?.id || 'N/A'}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ sendMagicLink failed: ${err.message}`);
      throw error;
    }
  }
}
