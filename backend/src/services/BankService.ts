// Plaid integration for bank accounts
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid';
import { PrismaClient } from '@prisma/client';
import { paymentConfig } from '../config/payments';

const prisma = new PrismaClient();

// Set up Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[paymentConfig.plaid.environment],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': paymentConfig.plaid.clientId,
      'PLAID-SECRET': paymentConfig.plaid.secret,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export interface CreateLinkTokenParams {
  userId: string;
}

export interface ExchangePublicTokenParams {
  publicToken: string;
  userId: string;
}

export class BankService {
  // Create Plaid Link token
  static async createLinkToken(params: CreateLinkTokenParams): Promise<string> {
    const request = {
      user: {
        client_user_id: params.userId,
      },
      client_name: 'Afiste',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    try {
      const response = await plaidClient.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error: any) {
      console.error('Plaid error:', error);
      throw new Error('Failed to create link token');
    }
  }

  // Exchange public token for access token
  static async exchangePublicToken(params: ExchangePublicTokenParams): Promise<any> {
    try {
      // Exchange public token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: params.publicToken,
      });

      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;

      // Get account information
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      const accounts = accountsResponse.data.accounts;

      // Save bank accounts to DB
      const bankAccounts = [];
      for (const account of accounts) {
        // Skip non-checking/savings accounts
        if (account.type !== 'depository' || !['checking', 'savings'].includes(account.subtype || '')) {
          continue;
        }

        // Get account details
        const accountDetails = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        const accountData = accountDetails.data.accounts.find(a => a.account_id === account.account_id);
        if (!accountData) continue;

        // Create or update bank account
        const bankAccount = await prisma.bankAccount.upsert({
          where: {
            plaidItemId: itemId,
          },
          update: {
            plaidAccountId: account.account_id,
            accountType: account.subtype || 'checking',
            accountNumber: account.mask || null, // Last 4 digits
            bankName: accountDetails.data.item?.institution_id || null,
            accountName: account.name,
            verified: false,
          },
          create: {
            userId: params.userId,
            plaidItemId: itemId,
            plaidAccountId: account.account_id,
            accountType: account.subtype || 'checking',
            accountNumber: account.mask || null,
            bankName: accountDetails.data.item?.institution_id || null,
            accountName: account.name,
            verified: false,
          },
        });

        bankAccounts.push(bankAccount);
      }

      return bankAccounts;
    } catch (error: any) {
      console.error('Plaid token exchange error:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  /**
   * Verify bank account with micro-deposits
   */
  static async verifyAccount(bankAccountId: string, amounts: number[]): Promise<boolean> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || !bankAccount.plaidItemId) {
      throw new Error('Bank account not found or not linked via Plaid');
    }

    // TODO: implement micro-deposits via Stripe

    // For now, we'll mark as verified if amounts are provided
    if (amounts && amounts.length === 2) {
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          verified: true,
          verificationMethod: 'micro_deposits',
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Get bank accounts for user
   */
  static async getBankAccounts(userId: string): Promise<any[]> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Remove sensitive data
    return bankAccounts.map(account => ({
      id: account.id,
      accountType: account.accountType,
      accountNumber: account.accountNumber, // Only last 4 digits
      bankName: account.bankName,
      accountName: account.accountName,
      verified: account.verified,
      isDefault: account.isDefault,
      createdAt: account.createdAt,
    }));
  }

  /**
   * Set default bank account
   */
  static async setDefaultAccount(userId: string, bankAccountId: string): Promise<void> {
    // Unset all other default accounts
    await prisma.bankAccount.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set new default
    await prisma.bankAccount.update({
      where: {
        id: bankAccountId,
        userId, // Ensure user owns the account
      },
      data: {
        isDefault: true,
      },
    });
  }

  /**
   * Remove bank account
   */
  static async removeBankAccount(userId: string, bankAccountId: string): Promise<void> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      throw new Error('Bank account not found');
    }

    await prisma.bankAccount.delete({
      where: { id: bankAccountId },
    });
  }
}

