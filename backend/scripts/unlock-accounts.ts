import prisma from '../src/config/database';

async function unlockAllAccounts() {
  try {
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { lockedUntil: { not: null } },
          { failedLoginAttempts: { gt: 0 } },
        ],
      },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    console.log(`Unlocked ${result.count} accounts`);
  } catch (error) {
    console.error('Error unlocking accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAllAccounts();

