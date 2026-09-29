export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationGateway {
  send(notification: EmailNotification): Promise<void>;
}
