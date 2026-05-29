export type SendProductEmailCommand = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export interface ProductEmailSender {
  sendEmail(command: SendProductEmailCommand): Promise<void>;
}
