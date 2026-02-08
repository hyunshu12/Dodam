/**
 * Notification helper - creates notification record and attempts immediate send
 */
import { prisma } from "./prisma";
import { getSmsAdapter } from "./adapters/sms";
import { decrypt } from "./crypto";

/**
 * Create a notification and attempt immediate delivery
 */
export async function createAndSendNotification(params: {
  userId: string;
  roomId?: string;
  channel?: "SMS" | "PUSH" | "EMAIL";
  payload: Record<string, unknown>;
  /** Encrypted phone number to send SMS to */
  encryptedPhone?: string;
}) {
  const { userId, roomId, channel = "SMS", payload, encryptedPhone } = params;

  // Create notification record
  const notification = await prisma.notification.create({
    data: {
      userId,
      roomId: roomId || null,
      channel,
      payload: JSON.stringify(payload),
      status: "PENDING",
      attempts: 0,
      nextRetryAt: new Date(),
    },
  });

  // Attempt immediate send
  try {
    if (channel === "SMS" && encryptedPhone) {
      const phone = decrypt(encryptedPhone);
      const sms = getSmsAdapter();
      const result = await sms.send({
        to: phone,
        message: typeof payload.message === "string" ? payload.message : JSON.stringify(payload),
      });

      if (result.success) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: 1,
          },
        });
        return notification;
      } else {
        throw new Error(result.error || "SMS send failed");
      }
    }
  } catch (error) {
    // Mark as failed with retry schedule
    const retryDelays = [60, 300, 900]; // 1m, 5m, 15m
    const attempts = 1;
    const nextRetry = retryDelays[0] || 900;

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts,
        nextRetryAt: new Date(Date.now() + nextRetry * 1000),
        lastError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  return notification;
}
