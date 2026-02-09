/**
 * SMS Adapter interface
 * Implementations: DevSmsAdapter (console), TwilioSmsAdapter, etc.
 */
export interface SmsPayload {
  to: string; // phone number (decrypted)
  message: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsAdapter {
  send(payload: SmsPayload): Promise<SmsResult>;
}
