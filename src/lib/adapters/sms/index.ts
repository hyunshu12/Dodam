/**
 * SMS Adapter factory
 * Returns appropriate adapter based on SMS_PROVIDER env var
 */
import { ISmsAdapter } from "./interface";
import { DevSmsAdapter } from "./dev-sms";

export function getSmsAdapter(): ISmsAdapter {
  const provider = process.env.SMS_PROVIDER || "dev";

  switch (provider) {
    case "dev":
    default:
      return new DevSmsAdapter();
    // Future: case "twilio": return new TwilioSmsAdapter();
    // Future: case "ncp": return new NcpSensAdapter();
  }
}

export type { ISmsAdapter, SmsPayload, SmsResult } from "./interface";
