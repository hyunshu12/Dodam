/**
 * Notification Worker
 * Polls DB for PENDING/FAILED notifications and retries SMS delivery
 *
 * Run: npx tsx scripts/notifications-worker.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1m, 5m, 15m

// ── Inline crypto helpers (worker runs standalone) ──
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error("ENCRYPTION_KEY not set");
  return Buffer.from(keyHex, "hex");
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext");
  const iv = Buffer.from(parts[0], "base64");
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Inline DevSmsAdapter (avoid module resolution issues) ──
async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  console.log("──────────────────────────────────────");
  console.log("📱 [WORKER SMS] Sending SMS");
  console.log(`   To:      ${to}`);
  console.log(`   Message: ${message}`);
  console.log("──────────────────────────────────────");

  // 10% simulated failure
  if (Math.random() < 0.1) {
    return { success: false, error: "Simulated random failure" };
  }
  return { success: true };
}

async function processNotifications() {
  const now = new Date();

  // Find notifications ready for retry
  const notifications = await prisma.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
    },
    take: 10, // Process 10 at a time
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (notifications.length === 0) return;

  console.log(`[Worker] Found ${notifications.length} notification(s) to process`);

  for (const notif of notifications) {
    try {
      const payload = JSON.parse(notif.payload as string);
      const message = payload.message || JSON.stringify(payload);

      // Try to get the phone number from guardian link
      let phone: string | null = null;

      // Look up guardian link to get encrypted phone
      const link = await prisma.guardianLink.findFirst({
        where: {
          guardianId: notif.userId,
          status: "ACTIVE",
        },
        select: { guardianPhone: true },
      });

      if (link) {
        phone = decrypt(link.guardianPhone);
      }

      if (!phone) {
        console.warn(`[Worker] No phone found for user ${notif.userId}, skipping`);
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: "FAILED",
            attempts: notif.attempts + 1,
            lastError: "No phone number found",
          },
        });
        continue;
      }

      const result = await sendSms(phone, message);

      if (result.success) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: notif.attempts + 1,
          },
        });
        console.log(`[Worker] ✅ Notification ${notif.id} sent successfully`);
      } else {
        const nextAttempt = notif.attempts + 1;
        const nextDelay = RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)];

        if (nextAttempt >= MAX_ATTEMPTS) {
          await prisma.notification.update({
            where: { id: notif.id },
            data: {
              status: "FAILED",
              attempts: nextAttempt,
              lastError: result.error || "Max retries exceeded",
            },
          });
          console.log(`[Worker] ❌ Notification ${notif.id} permanently failed after ${nextAttempt} attempts`);
        } else {
          await prisma.notification.update({
            where: { id: notif.id },
            data: {
              status: "FAILED",
              attempts: nextAttempt,
              nextRetryAt: new Date(Date.now() + nextDelay * 1000),
              lastError: result.error,
            },
          });
          console.log(`[Worker] ⏳ Notification ${notif.id} failed, will retry in ${nextDelay}s`);
        }
      }
    } catch (error) {
      console.error(`[Worker] Error processing notification ${notif.id}:`, error);
      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          attempts: notif.attempts + 1,
          lastError: error instanceof Error ? error.message : "Unknown error",
          nextRetryAt: new Date(Date.now() + 60_000),
        },
      });
    }
  }
}

// ── Main loop ──
async function main() {
  console.log("🔔 Notification Worker started");
  console.log(`   Polling interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`   Max attempts: ${MAX_ATTEMPTS}`);
  console.log("");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processNotifications();
    } catch (error) {
      console.error("[Worker] Polling error:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
