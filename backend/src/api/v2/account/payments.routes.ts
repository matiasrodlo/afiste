/**
 * Payment API Routes
 * User endpoints for deposits and withdrawals
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { PaymentService } from '../../../services/PaymentService';
import { BankService } from '../../../services/BankService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v2/account/payments/deposit
 * Create a deposit payment
 */
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, bankAccountId, currency } = req.body;

    if (!amount || !bankAccountId) {
      return res.status(400).json({ error: 'Amount and bankAccountId are required' });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Deposit API] userId=${userId}, amount=${amount}`);
    }
    
    const result = await PaymentService.createDeposit({
      userId,
      amount: parseFloat(amount),
      bankAccountId,
      currency: currency || 'USD',
    });
    res.json(result);
  } catch (error: any) {
    console.error(`[Deposit API] Error:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/payments/withdraw
 * Create a withdrawal payment
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, bankAccountId, currency } = req.body;

    if (!amount || !bankAccountId) {
      return res.status(400).json({ error: 'Amount and bankAccountId are required' });
    }

    const result = await PaymentService.createWithdrawal({
      userId,
      amount: parseFloat(amount),
      bankAccountId,
      currency: currency || 'USD',
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/payments
 * Get payment history
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const payments = await PaymentService.getPaymentHistory(userId, limit, offset);
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/payments/bank-accounts/link-token
 * Create Plaid link token
 */
router.post('/bank-accounts/link-token', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const linkToken = await BankService.createLinkToken({ userId });
    res.json({ linkToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/payments/bank-accounts/exchange-token
 * Exchange public token for access token
 */
router.post('/bank-accounts/exchange-token', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({ error: 'publicToken is required' });
    }

    const bankAccounts = await BankService.exchangePublicToken({
      publicToken,
      userId,
    });

    res.json({ bankAccounts });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/payments/bank-accounts
 * Get user's bank accounts
 */
router.get('/bank-accounts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const bankAccounts = await BankService.getBankAccounts(userId);
    res.json(bankAccounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/bank-accounts/:id/verify
 * Verify bank account with micro-deposits
 */
router.post('/bank-accounts/:id/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { amounts } = req.body;

    if (!amounts || !Array.isArray(amounts) || amounts.length !== 2) {
      return res.status(400).json({ error: 'Two amounts are required for verification' });
    }

    const verified = await BankService.verifyAccount(id, amounts);
    res.json({ verified });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/account/bank-accounts/:id/default
 * Set default bank account
 */
router.put('/bank-accounts/:id/default', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await BankService.setDefaultAccount(userId, id);
    res.json({ message: 'Default account updated' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/account/payments/bank-accounts/:id
 * Remove bank account
 */
router.delete('/bank-accounts/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await BankService.removeBankAccount(userId, id);
    res.json({ message: 'Bank account removed' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/payments/:id
 * Get payment details
 * NOTE: This must come AFTER /bank-accounts routes to avoid route conflicts
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const payment = await PaymentService.getPayment(id, userId);
    res.json(payment);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

export default router;

