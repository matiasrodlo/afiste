/**
 * Stripe Webhook Routes
 * Handles Stripe webhook events
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { paymentConfig } from '../../../config/payments';
import { PaymentService } from '../../../services/PaymentService';

const router = Router();
const stripe = paymentConfig.stripe.secretKey
  ? new Stripe(paymentConfig.stripe.secretKey, {
      apiVersion: '2025-02-24.acacia',
    })
  : null;

/**
 * POST /api/v2/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * Note: This route should use raw body for signature verification
 * Configure express to use raw body for this route only
 */
router.post('/', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  if (!stripe) {
    return res.status(503).send('Stripe webhooks are not configured');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    // req.body should be a Buffer for raw body
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig as string,
      paymentConfig.stripe.webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Process webhook event
    await PaymentService.processWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    // Still return 200 to Stripe to prevent retries
    res.status(200).json({ received: true, error: error.message });
  }
});

export default router;

