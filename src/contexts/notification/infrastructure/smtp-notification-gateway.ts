import nodemailer from 'nodemailer';

import { EmailNotification, NotificationGateway } from '../application/ports/notification-gateway';

export interface SmtpOptions {
  host: string;
  port: number;
  from: string;
}

export class SmtpNotificationGateway implements NotificationGateway {
  public constructor(private readonly options: SmtpOptions) {}

  public async send(notification: EmailNotification): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.options.host,
      port: this.options.port,
      secure: false,
    });

    await transporter.sendMail({
      from: this.options.from,
      to: notification.to,
      subject: notification.subject,
      text: notification.body,
    });
  }
}
