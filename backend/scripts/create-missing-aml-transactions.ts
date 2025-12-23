/**
 * Script to create missing AML transactions for existing investments
 * This script calculates investments based on VC token balances and creates AML transactions
 */

import prisma from '../src/config/database';
import { KYCService } from '../src/services/KYCService';

async function createMissingAMLTransactions() {
  console.log('Starting to create missing AML transactions...');

  try {
    // Get all users with VC token balances
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          include: {
            currency: {
              include: {
                vcFund: true,
              },
            },
          },
        },
      },
    });

    for (const user of users) {
      // Get existing AML investment transactions for this user
      const existingAMLTransactions = await prisma.aMLTransaction.findMany({
        where: {
          userId: user.id,
          transactionType: 'investment',
        },
      });

      const existingTotal = existingAMLTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
      );

      // Find VC accounts with balances
      const vcAccounts = user.accounts.filter(
        (account) =>
          account.currency.vcFundId &&
          (Number(account.balance) > 0 || Number(account.locked) > 0)
      );

      if (vcAccounts.length === 0) {
        continue;
      }

      // Calculate total invested based on token balances
      let calculatedTotal = 0;
      for (const account of vcAccounts) {
        if (!account.currency.vcFundId || !account.currency.vcFund) continue;

        const balance = Number(account.balance) + Number(account.locked);
        if (balance > 0) {
          // Use current NAV as proxy (this is an approximation)
          const nav = Number(account.currency.vcFund.currentNav) || 1.0;
          const estimatedInvestment = balance * nav;
          calculatedTotal += estimatedInvestment;
        }
      }

      // If calculated total is significantly different from existing AML transactions,
      // create a missing transaction
      const difference = calculatedTotal - existingTotal;
      if (difference > 1) {
        // Only create if difference is more than $1 to avoid rounding errors
        console.log(
          `User ${user.email}: Existing AML total: $${existingTotal.toFixed(2)}, Calculated: $${calculatedTotal.toFixed(2)}, Difference: $${difference.toFixed(2)}`
        );

        try {
          // Create AML transaction for the missing amount
          await KYCService.recordAMLTransaction({
            userId: user.id,
            transactionType: 'investment',
            amount: difference,
            currency: 'USDT',
          });
          console.log(
            `Created AML transaction for user ${user.email}: $${difference.toFixed(2)}`
          );
        } catch (error: any) {
          console.error(
            `Failed to create AML transaction for user ${user.email}:`,
            error.message
          );
        }
      }
    }

    console.log('Finished creating missing AML transactions.');
  } catch (error: any) {
    console.error('Error creating missing AML transactions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createMissingAMLTransactions()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

