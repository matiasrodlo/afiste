import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class AccountService {
  // Get or create account
  static async getAccount(userId: string, currencyId: string): Promise<any> {
    const account = await prisma.account.findUnique({
      where: {
        userId_currencyId: {
          userId,
          currencyId,
        },
      },
    });

    if (!account) {
      return await prisma.account.create({
        data: {
          userId,
          currencyId,
          balance: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });
    }

    return {
      ...account,
      balance: Number(account.balance),
      locked: Number(account.locked),
      available: Number(account.balance) - Number(account.locked),
    };
  }

  static async creditAccount(userId: string, currencyId: string, amount: number): Promise<void> {
    await prisma.account.upsert({
      where: { userId_currencyId: { userId, currencyId } },
      update: { balance: { increment: new Prisma.Decimal(amount) } },
      create: {
        userId,
        currencyId,
        balance: new Prisma.Decimal(amount),
        locked: new Prisma.Decimal(0),
      },
    });
  }

  static async debitAccount(userId: string, currencyId: string, amount: number): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { userId_currencyId: { userId, currencyId } },
    });

    if (!account) throw new Error('Account not found');
    if (Number(account.balance) < amount) throw new Error('Not enough balance');

    await prisma.account.update({
      where: { userId_currencyId: { userId, currencyId } },
      data: { balance: { decrement: new Prisma.Decimal(amount) } },
    });
  }

  static async lockBalance(userId: string, currencyId: string, amount: number): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { userId_currencyId: { userId, currencyId } },
    });
    if (!account) throw new Error('Account not found');

    const available = Number(account.balance) - Number(account.locked);
    if (available < amount) throw new Error('Insufficient available balance');

    await prisma.account.update({
      where: { userId_currencyId: { userId, currencyId } },
      data: { locked: { increment: new Prisma.Decimal(amount) } },
    });
  }

  static async unlockBalance(userId: string, currencyId: string, amount: number): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { userId_currencyId: { userId, currencyId } },
    });
    if (!account) throw new Error('Account not found');
    if (Number(account.locked) < amount) throw new Error('Insufficient locked balance');

    await prisma.account.update({
      where: { userId_currencyId: { userId, currencyId } },
      data: { locked: { decrement: new Prisma.Decimal(amount) } },
    });
  }
}

