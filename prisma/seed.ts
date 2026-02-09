/**
 * Seed script for demo data
 * Run: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Inline crypto helpers ──
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error("ENCRYPTION_KEY not set");
  return Buffer.from(keyHex, "hex");
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${encrypted}:${tag.toString("base64")}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.progressCheck.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.message.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.fileObject.deleteMany();
  await prisma.codeConfig.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.guardianLink.deleteMany();
  await prisma.deletionRequest.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create victim user
  const victimPw = await bcrypt.hash("password123", 10);
  const victim = await prisma.user.create({
    data: {
      email: "victim@demo.com",
      passwordHash: victimPw,
      role: "VICTIM",
      displayName: "김지수",
    },
  });
  console.log(`  ✅ Victim: ${victim.email} (pw: password123)`);

  // 2. Create guardian user
  const guardianPw = await bcrypt.hash("password123", 10);
  const guardian = await prisma.user.create({
    data: {
      email: "guardian@demo.com",
      passwordHash: guardianPw,
      role: "GUARDIAN",
      displayName: "이보호",
    },
  });
  console.log(`  ✅ Guardian: ${guardian.email} (pw: password123)`);

  // 3. Create active guardian link
  const encPhone = encrypt("010-1234-5678");
  await prisma.guardianLink.create({
    data: {
      victimId: victim.id,
      guardianId: guardian.id,
      guardianPhone: encPhone,
      relationship: "부모",
      guardianAlias: "엄마",
      status: "ACTIVE",
      acceptedAt: new Date(),
    },
  });
  console.log("  ✅ GuardianLink: ACTIVE");

  // 4. Create code config
  //    Primary phrase: "오늘 날씨 좋다"
  //    Duress phrase: "비가 올 것 같아"
  //    Second factor Q: "우리 강아지 이름은?"
  //    Second factor A: "초코"
  const primaryHash = await bcrypt.hash("오늘 날씨 좋다", 10);
  const duressHash = await bcrypt.hash("비가 올 것 같아", 10);
  const answerHash = await bcrypt.hash("초코", 10);

  await prisma.codeConfig.create({
    data: {
      victimId: victim.id,
      primaryPhraseHash: primaryHash,
      duressPhraseHash: duressHash,
      secondFactorQuestion: "우리 강아지 이름은?",
      secondFactorAnswerHash: answerHash,
      attemptsPerWindow: 5,
      windowSeconds: 300,
      lockSeconds: 600,
    },
  });
  console.log("  ✅ CodeConfig set");
  console.log('     Primary phrase: "오늘 날씨 좋다"');
  console.log('     Duress phrase: "비가 올 것 같아"');
  console.log('     2FA question: "우리 강아지 이름은?"');
  console.log('     2FA answer: "초코"');

  console.log("");
  console.log("🎉 Seed complete!");
  console.log("");
  console.log("Demo scenario:");
  console.log("  1. Go to /search");
  console.log('  2. Type "오늘 날씨 좋다" and search');
  console.log('  3. Answer "초코" to the security question');
  console.log("  4. You'll be taken to the emergency chat room");
  console.log("  5. Login as guardian (guardian@demo.com) to see the dashboard");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
