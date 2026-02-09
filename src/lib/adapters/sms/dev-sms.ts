/**
 * Development SMS Adapter
 * Logs SMS to console and records in DB (no actual SMS sent)
 */
import { ISmsAdapter, SmsPayload, SmsResult } from "./interface";
import { v4 as uuid } from "uuid";

export class DevSmsAdapter implements ISmsAdapter {
  async send(payload: SmsPayload): Promise<SmsResult> {
    const messageId = uuid();

    console.log("──────────────────────────────────────");
    console.log("📱 [DEV SMS] Sending SMS");
    console.log(`   To:      ${payload.to}`);
    console.log(`   Message: ${payload.message}`);
    console.log(`   ID:      ${messageId}`);
    console.log("──────────────────────────────────────");

    // Simulate occasional failure for testing retry logic (10% chance)
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: "DEV: Simulated random failure",
      };
    }

    return {
      success: true,
      messageId,
    };
  }
}
