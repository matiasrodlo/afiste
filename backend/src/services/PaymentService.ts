// Payment stuff - Stripe integration
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { paymentConfig } from '../config/payments';
import { AccountService } from './AccountService';

const prisma = new PrismaClient();
// TODO: check if this API version is still valid
const stripe = paymentConfig.stripe.secretKey
  ? new Stripe(paymentConfig.stripe.secretKey, {
      apiVersion: '2025-02-24.acacia',
    })
  : null;

export interface CreateDepositParams {
  userId: string;
  amount: number;
  bankAccountId: string;
  currency?: string;
}

export interface CreateWithdrawalParams {
  userId: string;
  amount: number;
  bankAccountId: string;
  currency?: string;
}

export class PaymentService {
  private static readonly SANDBOX_MODE = process.env.SANDBOX_PAYMENTS === 'true' || !paymentConfig.stripe.secretKey;

  // Create a deposit
  static async createDeposit(params: CreateDepositParams): Promise<any> {
    const { userId, amount, bankAccountId, currency = 'USD' } = params;

    if (amount < paymentConfig.limits.minDeposit) {
      throw new Error(`Deposit too small, minimum is ${paymentConfig.limits.minDeposit}`);
    }
    if (amount > paymentConfig.limits.maxDeposit) {
      throw new Error(`Deposit too large, max is ${paymentConfig.limits.maxDeposit}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Skip KYC checks in sandbox
    if (!this.SANDBOX_MODE) {
      if (user.kycStatus !== 'verified') {
        throw new Error('KYC verification required');
      }

      const bankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
      });

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Bank account not found');
      }

      if (!bankAccount.verified) {
        throw new Error('Bank account must be verified');
      }
    }

    // Sandbox: instant deposit
    if (this.SANDBOX_MODE) {
      const usdtCurrency = await prisma.currency.findUnique({
        where: { code: 'usdt' },
      });

      if (!usdtCurrency) {
        throw new Error('USDT currency not found');
      }

      // Create or get sandbox bank account for this user
      let sandboxBankAccountId = bankAccountId;
      
      if (!sandboxBankAccountId || 
          sandboxBankAccountId.startsWith('sandbox-account') || 
          sandboxBankAccountId === 'sandbox-account') {
        const existingSandboxAccount = await prisma.bankAccount.findFirst({
          where: {
            userId,
            accountName: { contains: 'Sandbox' },
          },
        });

        if (existingSandboxAccount) {
          sandboxBankAccountId = existingSandboxAccount.id;
        } else {
          const sandboxAccount = await prisma.bankAccount.create({
            data: {
              userId,
              accountName: 'Sandbox Checking Account',
              bankName: 'Sandbox Bank',
              accountType: 'checking',
              accountNumber: '1234',
              verified: true,
              isDefault: true,
            },
          });
          sandboxBankAccountId = sandboxAccount.id;
        }
      } else {
        const bankAccount = await prisma.bankAccount.findUnique({
          where: { id: bankAccountId },
        });
        
        if (!bankAccount || bankAccount.userId !== userId) {
          const existingSandboxAccount = await prisma.bankAccount.findFirst({
            where: {
              userId,
              accountName: { contains: 'Sandbox' },
            },
          });

          if (existingSandboxAccount) {
            sandboxBankAccountId = existingSandboxAccount.id;
          } else {
            const sandboxAccount = await prisma.bankAccount.create({
              data: {
                userId,
                accountName: 'Sandbox Checking Account',
                bankName: 'Sandbox Bank',
                accountType: 'checking',
                accountNumber: '1234',
                verified: true,
                isDefault: true,
              },
            });
            sandboxBankAccountId = sandboxAccount.id;
          }
        }
      }

      const payment = await prisma.payment.create({
        data: {
          userId,
          type: 'deposit',
          amount,
          currency,
          status: 'completed',
          paymentMethod: 'sandbox',
          bankAccountId: sandboxBankAccountId,
          processedAt: new Date(),
        },
      });

      await AccountService.creditAccount(userId, usdtCurrency.id, amount);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Sandbox] Deposit created: paymentId=${payment.id}, amount=${amount}, userId=${userId}`);
      }

      return {
        payment,
        sandbox: true,
        message: 'Sandbox deposit completed successfully',
      };
    }

    // Real mode: Use Stripe
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['us_bank_account'],
      metadata: {
        userId,
        bankAccountId,
        type: 'deposit',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId,
        type: 'deposit',
        amount,
        currency,
        status: 'pending',
        paymentMethod: 'ach',
        stripePaymentId: paymentIntent.id,
        bankAccountId,
      },
    });

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  // Create a withdrawal
  static async createWithdrawal(params: CreateWithdrawalParams): Promise<any> {
    const { userId, amount, bankAccountId, currency = 'USD' } = params;

    if (amount < paymentConfig.limits.minWithdrawal) {
      throw new Error(`Min withdrawal is ${paymentConfig.limits.minWithdrawal}`);
    }
    if (amount > paymentConfig.limits.maxWithdrawal) {
      throw new Error(`Max withdrawal is ${paymentConfig.limits.maxWithdrawal}`);
    }

    const usdtCurrency = await prisma.currency.findUnique({
      where: { code: 'usdt' },
    });

    if (!usdtCurrency) {
      throw new Error('USDT currency not found');
    }

    const account = await AccountService.getAccount(userId, usdtCurrency.id);
    if (Number(account.available) < amount) {
      throw new Error('Insufficient balance');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Skip KYC checks in sandbox
    if (!this.SANDBOX_MODE) {
      if (user.kycStatus !== 'verified') {
        throw new Error('KYC verification required');
      }

      const bankAccount = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
      });

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Bank account not found');
      }

      if (!bankAccount.verified) {
        throw new Error('Bank account must be verified');
      }
    }

    // Sandbox: instant withdrawal
    if (this.SANDBOX_MODE) {
      let sandboxBankAccountId = bankAccountId;
      if (!sandboxBankAccountId || sandboxBankAccountId === 'sandbox-account') {
        const existingSandboxAccount = await prisma.bankAccount.findFirst({
          where: {
            userId,
            accountName: { contains: 'Sandbox' },
          },
        });

        if (existingSandboxAccount) {
          sandboxBankAccountId = existingSandboxAccount.id;
        } else {
          const sandboxAccount = await prisma.bankAccount.create({
            data: {
              userId,
              accountName: 'Sandbox Checking Account',
              bankName: 'Sandbox Bank',
              accountType: 'checking',
              accountNumber: '1234',
              verified: true,
              isDefault: true,
            },
          });
          sandboxBankAccountId = sandboxAccount.id;
        }
      }

      await AccountService.debitAccount(userId, usdtCurrency.id, amount);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Sandbox] Withdrawal: amount=${amount}, userId=${userId}`);
      }

      const payment = await prisma.payment.create({
        data: {
          userId,
          type: 'withdrawal',
          amount,
          currency,
          status: 'completed',
          paymentMethod: 'sandbox',
          bankAccountId: sandboxBankAccountId,
          processedAt: new Date(),
        },
      });

      const withdrawal = await prisma.withdrawal.create({
        data: {
          userId,
          paymentId: payment.id,
          bankAccountId: sandboxBankAccountId,
          amount,
          currency,
          status: 'completed',
        },
      });

      return {
        payment,
        withdrawal,
        sandbox: true,
        message: 'Sandbox withdrawal completed successfully',
      };
    }

    // Lock funds
    await AccountService.lockBalance(userId, usdtCurrency.id, amount);

    const payment = await prisma.payment.create({
      data: {
        userId,
        type: 'withdrawal',
        amount,
        currency,
        status: 'pending',
        paymentMethod: 'ach',
        bankAccountId,
      },
    });

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        paymentId: payment.id,
        bankAccountId,
        amount,
        currency,
        status: 'pending',
      },
    });

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination: bankAccount.plaidAccountId || '',
        metadata: {
          userId,
          paymentId: payment.id,
          withdrawalId: withdrawal.id,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: transfer.id,
          status: 'processing',
        },
      });

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          stripeTransferId: transfer.id,
          status: 'processing',
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        },
      });
    } catch (error: any) {
      // Transfer failed, unlock the funds
      await AccountService.unlockBalance(userId, usdtCurrency.id, amount);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'failed',
          failureReason: error.message,
        },
      });
      throw error;
    }

    return {
      payment,
      withdrawal,
    };
  }

  /**
   * Process Stripe webhook event
   */
  static async processWebhook(event: Stripe.Event): Promise<void> {
    const eventType = event.type as string;
    
    switch (eventType) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'transfer.paid':
        await this.handleTransferPaid(event.data.object as any as Stripe.Transfer);
        break;
      case 'transfer.failed':
        await this.handleTransferFailed(event.data.object as any as Stripe.Transfer);
        break;
      default:
        if (process.env.NODE_ENV === 'development') {
          console.log(`Unhandled event type: ${eventType}`);
        }
    }
  }

  private static async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Payment not found for payment intent: ${paymentIntent.id}`);
      }
      return;
    }

    if (payment.status === 'completed') {
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        processedAt: new Date(),
      },
    });

    const usdtCurrency = await prisma.currency.findUnique({
      where: { code: 'usdt' },
    });

    if (usdtCurrency) {
      await AccountService.creditAccount(payment.userId, usdtCurrency.id, Number(payment.amount));
    }
  }

  private static async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
      },
    });
  }

  /**
   * Handle successful transfer
   */
  private static async handleTransferPaid(transfer: Stripe.Transfer): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripeTransferId: transfer.id },
    });

    if (!payment) {
      return;
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { paymentId: payment.id },
    });

    if (!withdrawal) {
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        processedAt: new Date(),
      },
    });

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'completed',
        actualArrival: new Date(),
      },
    });

    const usdtCurrency = await prisma.currency.findUnique({
      where: { code: 'usdt' },
    });

    if (usdtCurrency) {
      await AccountService.debitAccount(payment.userId, usdtCurrency.id, Number(payment.amount));
      await AccountService.unlockBalance(payment.userId, usdtCurrency.id, Number(payment.amount));
    }
  }

  private static async handleTransferFailed(transfer: Stripe.Transfer): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripeTransferId: transfer.id },
    });

    if (!payment) {
      return;
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { paymentId: payment.id },
    });

    if (!withdrawal) {
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        errorMessage: 'Transfer failed',
      },
    });

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'failed',
        failureReason: 'Transfer failed',
      },
    });

    // Unlock funds
    const usdtCurrency = await prisma.currency.findUnique({
      where: { code: 'usdt' },
    });

    if (usdtCurrency) {
      await AccountService.unlockBalance(payment.userId, usdtCurrency.id, Number(payment.amount));
    }
  }

  /**
   * Get payment history for user
   */
  static async getPaymentHistory(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        bankAccount: true,
        withdrawal: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Map payments to ensure proper data format
    return payments.map(payment => ({
      id: payment.id,
      type: payment.type,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt.toISOString(),
      processedAt: payment.processedAt ? payment.processedAt.toISOString() : null,
      bankAccount: payment.bankAccount,
      withdrawal: payment.withdrawal,
    }));
  }

  /**
   * Get payment by ID
   */
  static async getPayment(paymentId: string, userId?: string): Promise<any> {
    const where: any = { id: paymentId };
    if (userId) {
      where.userId = userId;
    }

    const payment = await prisma.payment.findUnique({
      where,
      include: {
        bankAccount: true,
        withdrawal: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }
}

