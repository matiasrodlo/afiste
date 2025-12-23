/**
 * Payment Configuration
 * Configuration for Stripe and Plaid payment providers
 */

export interface PaymentConfig {
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  plaid: {
    clientId: string;
    secret: string;
    environment: 'sandbox' | 'development' | 'production';
  };
  limits: {
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
  };
}

const getPaymentConfig = (): PaymentConfig => {
  return {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    plaid: {
      clientId: process.env.PLAID_CLIENT_ID || '',
      secret: process.env.PLAID_SECRET || '',
      environment: (process.env.PLAID_ENV || 'sandbox') as 'sandbox' | 'development' | 'production',
    },
    limits: {
      minDeposit: parseFloat(process.env.MIN_DEPOSIT || '10'),
      maxDeposit: parseFloat(process.env.MAX_DEPOSIT || '100000'),
      minWithdrawal: parseFloat(process.env.MIN_WITHDRAWAL || '10'),
      maxWithdrawal: parseFloat(process.env.MAX_WITHDRAWAL || '100000'),
    },
  };
};

export const paymentConfig = getPaymentConfig();

