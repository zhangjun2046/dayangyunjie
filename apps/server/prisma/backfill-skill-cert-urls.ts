import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 将历史单张技能证书回填到新的 JSON 数组字段。
 * 脚本可重复执行：已有非空数组的记录不会被覆盖。
 */
async function main() {
  const affectedRows = await prisma.$executeRaw<number>`
    UPDATE workers
    SET skill_cert_urls = JSON_ARRAY(skill_cert_url)
    WHERE skill_cert_url IS NOT NULL
      AND skill_cert_url <> ''
      AND (
        skill_cert_urls IS NULL
        OR JSON_LENGTH(skill_cert_urls) = 0
      )
  `;

  console.info(
    `[skill-cert-backfill] completed, affectedRows=${affectedRows}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('[skill-cert-backfill] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
