import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { TradingError, InsufficientFundsError, InvalidOrderError } from '../utils/errors';

export interface CreateOrderParams {
  userId: string;
  marketId: string;
  side: 'buy' | 'sell';
  ordType: 'limit' | 'market';
  price?: number;
  volume: number;
}

export class OrderService {
  static async createOrder(params: CreateOrderParams): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({
        where: { id: params.marketId },
        include: { baseCurrency: true, quoteCurrency: true },
      });

      if (!market || market.state !== 'active') {
        throw new InvalidOrderError('Market not found or not active');
      }

      const user = await tx.user.findUnique({
        where: { id: params.userId },
      });

      if (!user || !user.isActive) {
        throw new InvalidOrderError('User not found or inactive');
      }

      // TODO: make KYC level configurable per market
      if (user.kycLevel < 1 || user.kycStatus !== 'verified') {
        throw new InvalidOrderError('KYC verification required for trading');
      }

      const volumeDecimal = new Prisma.Decimal(params.volume);
      let priceDecimal: Prisma.Decimal;
      let requiredFunds: Prisma.Decimal;

      if (params.ordType === 'market') {
        // Use NAV for market orders
        const vcFund = await tx.vCFund.findFirst({
          where: { currency: { id: market.baseUnit } },
        });
        priceDecimal = vcFund ? vcFund.currentNav : new Prisma.Decimal(1); // fallback if no NAV
      } else {
        if (!params.price) {
          throw new InvalidOrderError('Price required for limit orders');
        }
        priceDecimal = new Prisma.Decimal(params.price);
      }

      requiredFunds = volumeDecimal.mul(priceDecimal);

      const currencyId = params.side === 'buy' ? market.quoteUnit : market.baseUnit;
      const account = await tx.account.upsert({
        where: {
          userId_currencyId: {
            userId: params.userId,
            currencyId: currencyId,
          },
        },
        update: {},
        create: {
          userId: params.userId,
          currencyId: currencyId,
          balance: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });

      const availableBalance = new Prisma.Decimal(account.balance).minus(account.locked);
      if (availableBalance.lt(requiredFunds)) {
        throw new InsufficientFundsError('Not enough funds');
      }

      const order = await tx.order.create({
        data: {
          userId: params.userId,
          marketId: params.marketId,
          side: params.side,
          ordType: params.ordType,
          price: params.ordType === 'limit' ? priceDecimal : null,
          volume: volumeDecimal,
          originVolume: volumeDecimal,
          filledVolume: new Prisma.Decimal(0),
          state: 'wait',
          locked: requiredFunds,
          originLocked: requiredFunds,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          locked: new Prisma.Decimal(account.locked).plus(requiredFunds),
        },
      });

      const matchResult = await this.matchOrder(order.id, tx);

      return {
        ...order,
        price: order.price ? Number(order.price) : null,
        volume: Number(order.volume),
        filledVolume: Number(order.filledVolume),
        locked: Number(order.locked),
        trades: matchResult.trades,
      };
    });
  }

  static async matchOrder(orderId: string, tx?: any): Promise<{ order: any; trades: any[] }> {
    const prismaClient = tx || prisma;
    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
      include: { market: true },
    });

    if (!order || order.state !== 'wait') {
      return { order, trades: [] };
    }

    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    const priceCondition = order.ordType === 'limit' && order.price
      ? order.side === 'buy'
        ? { lte: order.price }
        : { gte: order.price }
      : {};

    // Find matching orders
    const matchingOrders = await prismaClient.order.findMany({
      where: {
        marketId: order.marketId,
        side: oppositeSide,
        state: 'wait',
        ...(order.ordType === 'limit' && order.price ? { price: priceCondition } : {}),
      },
      orderBy: order.side === 'buy'
        ? [{ price: 'asc' }, { createdAt: 'asc' }]
        : [{ price: 'desc' }, { createdAt: 'asc' }],
    });

    const trades: any[] = [];
    let remainingVolume = new Prisma.Decimal(order.volume).minus(order.filledVolume);

    for (const matchOrder of matchingOrders) {
      if (remainingVolume.lte(0)) break;

      const matchRemaining = new Prisma.Decimal(matchOrder.volume).minus(matchOrder.filledVolume);
      const tradeVolume = Prisma.Decimal.min(remainingVolume, matchRemaining);
      const tradePrice = order.ordType === 'market' && order.price === null
        ? matchOrder.price || new Prisma.Decimal(1)
        : matchOrder.price || order.price || new Prisma.Decimal(1);
      const tradeFunds = tradeVolume.mul(tradePrice);

      // Create trade
      const trade = await prismaClient.trade.create({
        data: {
          marketId: order.marketId,
          askOrderId: order.side === 'sell' ? order.id : matchOrder.id,
          bidOrderId: order.side === 'buy' ? order.id : matchOrder.id,
          askUserId: order.side === 'sell' ? order.userId : matchOrder.userId,
          bidUserId: order.side === 'buy' ? order.userId : matchOrder.userId,
          price: tradePrice,
          volume: tradeVolume,
          funds: tradeFunds,
        },
      });

      trades.push(trade);

      // Update order filled volumes
      const newFilledVolume = new Prisma.Decimal(order.filledVolume).plus(tradeVolume);
      await prismaClient.order.update({
        where: { id: order.id },
        data: {
          filledVolume: newFilledVolume,
          state: newFilledVolume.gte(order.volume) ? 'done' : 'wait',
        },
      });

      const matchNewFilledVolume = new Prisma.Decimal(matchOrder.filledVolume).plus(tradeVolume);
      await prismaClient.order.update({
        where: { id: matchOrder.id },
        data: {
          filledVolume: matchNewFilledVolume,
          state: matchNewFilledVolume.gte(matchOrder.volume) ? 'done' : 'wait',
        },
      });

      // Execute trade (transfer funds)
      await this.executeTrade(trade.id, prismaClient);

      remainingVolume = remainingVolume.minus(tradeVolume);
    }

    return { order, trades };
  }

  // Execute trade - move funds between accounts
  private static async executeTrade(tradeId: string, tx: any): Promise<void> {
    const trade = await tx.trade.findUnique({
      where: { id: tradeId },
      include: {
        market: { include: { baseCurrency: true, quoteCurrency: true } },
        askOrder: true,
        bidOrder: true,
      },
    });

    if (!trade) return;

    // Get accounts
    const askBaseAccount = await tx.account.upsert({
      where: {
        userId_currencyId: {
          userId: trade.askUserId,
          currencyId: trade.market.baseUnit,
        },
      },
      update: {},
      create: {
        userId: trade.askUserId,
        currencyId: trade.market.baseUnit,
        balance: new Prisma.Decimal(0),
        locked: new Prisma.Decimal(0),
      },
    });

    const askQuoteAccount = await tx.account.upsert({
      where: {
        userId_currencyId: {
          userId: trade.askUserId,
          currencyId: trade.market.quoteUnit,
        },
      },
      update: {},
      create: {
        userId: trade.askUserId,
        currencyId: trade.market.quoteUnit,
        balance: new Prisma.Decimal(0),
        locked: new Prisma.Decimal(0),
      },
    });

    const bidBaseAccount = await tx.account.upsert({
      where: {
        userId_currencyId: {
          userId: trade.bidUserId,
          currencyId: trade.market.baseUnit,
        },
      },
      update: {},
      create: {
        userId: trade.bidUserId,
        currencyId: trade.market.baseUnit,
        balance: new Prisma.Decimal(0),
        locked: new Prisma.Decimal(0),
      },
    });

    const bidQuoteAccount = await tx.account.upsert({
      where: {
        userId_currencyId: {
          userId: trade.bidUserId,
          currencyId: trade.market.quoteUnit,
        },
      },
      update: {},
      create: {
        userId: trade.bidUserId,
        currencyId: trade.market.quoteUnit,
        balance: new Prisma.Decimal(0),
        locked: new Prisma.Decimal(0),
      },
    });

    // Transfer: Ask user sells base, receives quote
    await tx.account.update({
      where: { id: askBaseAccount.id },
      data: {
        balance: new Prisma.Decimal(askBaseAccount.balance).minus(trade.volume),
        locked: new Prisma.Decimal(askBaseAccount.locked).minus(trade.volume),
      },
    });

    await tx.account.update({
      where: { id: askQuoteAccount.id },
      data: {
        balance: new Prisma.Decimal(askQuoteAccount.balance).plus(trade.funds),
      },
    });

    // Transfer: Bid user buys base, pays quote
    await tx.account.update({
      where: { id: bidBaseAccount.id },
      data: {
        balance: new Prisma.Decimal(bidBaseAccount.balance).plus(trade.volume),
      },
    });

    await tx.account.update({
      where: { id: bidQuoteAccount.id },
      data: {
        balance: new Prisma.Decimal(bidQuoteAccount.balance).minus(trade.funds),
        locked: new Prisma.Decimal(bidQuoteAccount.locked).minus(trade.funds),
      },
    });
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { market: true },
      });

      if (!order) {
        throw new InvalidOrderError('Order not found');
      }

      if (order.userId !== userId) {
        throw new InvalidOrderError('Unauthorized');
      }

      if (order.state !== 'wait') {
        throw new InvalidOrderError('Order cannot be cancelled');
      }

      // Unlock funds
      const currencyId = order.side === 'buy' ? order.market.quoteUnit : order.market.baseUnit;
      const account = await tx.account.findUnique({
        where: {
          userId_currencyId: {
            userId: order.userId,
            currencyId: currencyId,
          },
        },
      });

      if (account) {
        await tx.account.update({
          where: { id: account.id },
          data: {
            locked: new Prisma.Decimal(account.locked).minus(order.locked),
          },
        });
      }

      // Cancel order
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { state: 'cancel' },
      });

      return cancelledOrder;
    });
  }

  /**
   * Get user orders
   */
  static async getUserOrders(
    userId: string,
    options?: { marketId?: string; state?: string; limit?: number; offset?: number }
  ): Promise<any[]> {
    const where: any = { userId };
    if (options?.marketId) where.marketId = options.marketId;
    if (options?.state) where.state = options.state;

    const orders = await prisma.order.findMany({
      where,
      include: { market: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return orders.map((order) => ({
      id: order.id,
      marketId: order.marketId,
      side: order.side,
      ordType: order.ordType,
      price: order.price ? Number(order.price) : null,
      volume: Number(order.volume),
      originVolume: Number(order.originVolume),
      filledVolume: Number(order.filledVolume),
      state: order.state,
      createdAt: order.createdAt,
    }));
  }
}

