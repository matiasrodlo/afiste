import { Router } from 'express';
import authRoutes from './public/auth.routes';
import vcFundsRoutes from './public/vcFunds.routes';
import marketsRoutes from './public/markets.routes';
import currenciesRoutes from './public/currencies.routes';
import tickersRoutes from './public/tickers.routes';
import tradesRoutes from './public/trades.routes';
import orderBookRoutes from './public/orderBook.routes';
import publicTokenOfferingsRoutes from './public/tokenOfferings.routes';
import publicFeesRoutes from './public/fees.routes';
import publicExchangeRatesRoutes from './public/exchangeRates.routes';
import profileRoutes from './account/profile.routes';
import balancesRoutes from './account/balances.routes';
import investmentsRoutes from './account/investments.routes';
import portfolioRoutes from './account/portfolio.routes';
import ordersRoutes from './account/orders.routes';
import accountTradesRoutes from './account/trades.routes';
import accountTokenOfferingsRoutes from './account/tokenOfferings.routes';
import kycRoutes from './account/kyc.routes';
import adminVCFundsRoutes from './admin/vcFunds.routes';
import adminUsersRoutes from './admin/users.routes';
import adminTokenOfferingsRoutes from './admin/tokenOfferings.routes';
import adminKYCRoutes from './admin/kyc.routes';
import adminFeesRoutes from './admin/fees.routes';
import adminWalletsRoutes from './admin/wallets.routes';
import adminMonitoringRoutes from './admin/monitoring.routes';
import blockchainRoutes from './blockchain/blockchain.routes';
import accountWalletsRoutes from './account/wallets.routes';
import accountPaymentsRoutes from './account/payments.routes';
import accountTwoFactorRoutes from './account/twoFactor.routes';
import accountSessionsRoutes from './account/sessions.routes';
import accountGDPRRoutes from './account/gdpr.routes';
import accountCurrencyRoutes from './account/currency.routes';
import stripeWebhookRoutes from './webhooks/stripe.routes';

const router = Router();

// Public routes
router.use('/public/auth', authRoutes);
router.use('/public/vc_funds', vcFundsRoutes);
router.use('/public/markets', marketsRoutes);
router.use('/public/currencies', currenciesRoutes);
router.use('/public/tickers', tickersRoutes);
router.use('/public/trades', tradesRoutes);
router.use('/public/order_book', orderBookRoutes);
router.use('/public/token_offerings', publicTokenOfferingsRoutes);
router.use('/public/fees', publicFeesRoutes);
router.use('/public/exchange_rates', publicExchangeRatesRoutes);

// Account routes (requires auth)
router.use('/account/profile', profileRoutes);
router.use('/account/balances', balancesRoutes);
router.use('/account/investments', investmentsRoutes);
router.use('/account/portfolio', portfolioRoutes);
router.use('/account/orders', ordersRoutes);
router.use('/account/trades', accountTradesRoutes);
router.use('/account/token_offerings', accountTokenOfferingsRoutes);
router.use('/account/kyc', kycRoutes);
router.use('/account/wallets', accountWalletsRoutes);
router.use('/account/payments', accountPaymentsRoutes);
router.use('/account/two-factor', accountTwoFactorRoutes);
router.use('/account/sessions', accountSessionsRoutes);
router.use('/account/gdpr', accountGDPRRoutes);
router.use('/account/currency', accountCurrencyRoutes);

// Admin routes (requires admin)
router.use('/admin/vc_funds', adminVCFundsRoutes);
router.use('/admin/users', adminUsersRoutes);
router.use('/admin/token_offerings', adminTokenOfferingsRoutes);
router.use('/admin/kyc', adminKYCRoutes);
router.use('/admin/fees', adminFeesRoutes);
router.use('/admin/wallets', adminWalletsRoutes);
router.use('/admin/monitoring', adminMonitoringRoutes);

// Blockchain routes
router.use('/blockchain', blockchainRoutes);

// Webhooks (no auth, uses signature verification)
router.use('/webhooks/stripe', stripeWebhookRoutes);

export default router;

