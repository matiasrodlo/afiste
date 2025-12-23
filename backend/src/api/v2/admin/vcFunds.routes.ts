import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../../middleware/auth.middleware';
import { VCFundService } from '../../../services/VCFundService';
import prisma from '../../../config/database';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Create VC fund
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // Transform snake_case from frontend to camelCase for service
    // Use nullish coalescing (??) instead of || to handle 0 values correctly
    const params = {
      name: req.body.name,
      manager: req.body.manager,
      totalSupply: req.body.total_supply ?? req.body.totalSupply,
      minimumInvestment: req.body.minimum_investment ?? req.body.minimumInvestment,
      description: req.body.description ?? '',
      availableSupply: req.body.available_supply ?? req.body.availableSupply ?? req.body.total_supply ?? req.body.totalSupply,
      fundSize: req.body.fund_size ?? req.body.fundSize,
      launchDate: req.body.launch_date ?? req.body.launchDate,
      maturityDate: req.body.maturity_date ?? req.body.maturityDate,
      status: req.body.status ?? 'active',
      riskLevel: req.body.risk_level ?? req.body.riskLevel ?? 'medium',
      regulatoryStatus: req.body.regulatory_status ?? req.body.regulatoryStatus ?? 'pending',
      terms: req.body.terms,
      documents: req.body.documents,
      currentNav: req.body.current_nav ?? req.body.currentNav ?? 1.0,
      currencyId: req.body.currency_id ?? req.body.currencyId,
      quoteCurrency: req.body.quote_currency ?? req.body.quoteCurrency,
      initialOfferingPrice: req.body.initial_offering_price ?? req.body.initialOfferingPrice,
    };
    
    // Convert string numbers to actual numbers if needed
    if (typeof params.totalSupply === 'string') {
      params.totalSupply = parseFloat(params.totalSupply);
    }
    if (typeof params.minimumInvestment === 'string') {
      params.minimumInvestment = parseFloat(params.minimumInvestment);
    }
    if (typeof params.availableSupply === 'string') {
      params.availableSupply = parseFloat(params.availableSupply);
    }
    if (typeof params.fundSize === 'string') {
      params.fundSize = parseFloat(params.fundSize);
    }
    if (typeof params.currentNav === 'string') {
      params.currentNav = parseFloat(params.currentNav);
    }
    if (typeof params.initialOfferingPrice === 'string') {
      params.initialOfferingPrice = parseFloat(params.initialOfferingPrice);
    }

    // Validate required fields with proper null/undefined/NaN checks
    if (!params.name || !params.manager || params.totalSupply == null || isNaN(Number(params.totalSupply)) || params.minimumInvestment == null || isNaN(Number(params.minimumInvestment))) {
      const missing = [];
      if (!params.name) missing.push('name');
      if (!params.manager) missing.push('manager');
      if (params.totalSupply == null || isNaN(Number(params.totalSupply))) missing.push('total_supply');
      if (params.minimumInvestment == null || isNaN(Number(params.minimumInvestment))) missing.push('minimum_investment');
      
      return res.status(400).json({ 
        error: `Missing required fields: ${missing.join(', ')}`,
        received: req.body
      });
    }

    const fund = await VCFundService.createFund(params);
    
    res.status(201).json({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      manager: fund.manager,
      totalSupply: Number(fund.totalSupply),
      availableSupply: Number(fund.availableSupply),
      minimumInvestment: Number(fund.minimumInvestment),
      status: fund.status,
      riskLevel: fund.riskLevel,
      regulatoryStatus: fund.regulatoryStatus,
      currentNav: Number(fund.currentNav),
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating VC fund:', {
        errorMessage: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorMeta: error.meta,
        errorCause: error.cause,
        errorStack: error.stack?.split('\n').slice(0, 10)
      });
    }
    
    let errorMessage = error.message || 'Failed to create VC fund';
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('code')) {
        errorMessage = `Currency code "${error.meta.targetValue}" already exists`;
      } else if (Array.isArray(target) && target.includes('vc_fund_id')) {
        errorMessage = `Currency already associated with this fund`;
      } else {
        errorMessage = `Duplicate entry: ${target?.join(', ') || 'unknown field'}`;
      }
    } else if (error.code === 'P2003') {
      errorMessage = `Invalid reference: ${error.meta?.field_name || 'unknown field'}`;
    }
    
    res.status(400).json({ 
      error: errorMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        meta: error.meta,
        cause: error.cause
      } : undefined
    });
  }
});

// Update VC fund
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      riskLevel,
      regulatoryStatus,
      terms,
      documents,
    } = req.body;

    const fund = await prisma.vCFund.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? status : undefined,
        riskLevel: riskLevel !== undefined ? riskLevel : undefined,
        regulatoryStatus: regulatoryStatus !== undefined ? regulatoryStatus : undefined,
        terms: terms !== undefined ? terms : undefined,
        documents: documents !== undefined ? documents : undefined,
      },
    });

    res.json({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      manager: fund.manager,
      totalSupply: Number(fund.totalSupply),
      availableSupply: Number(fund.availableSupply),
      minimumInvestment: Number(fund.minimumInvestment),
      status: fund.status,
      riskLevel: fund.riskLevel,
      regulatoryStatus: fund.regulatoryStatus,
      currentNav: Number(fund.currentNav),
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fund not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to update VC fund' });
  }
});

// Get list of VC funds
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '25' } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [funds, total] = await Promise.all([
      prisma.vCFund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.vCFund.count({ where }),
    ]);

    res.json({
      data: funds.map((fund) => ({
        id: fund.id,
        name: fund.name,
        description: fund.description,
        manager: fund.manager,
        totalSupply: Number(fund.totalSupply),
        availableSupply: Number(fund.availableSupply),
        minimumInvestment: Number(fund.minimumInvestment),
        status: fund.status,
        riskLevel: fund.riskLevel,
        regulatoryStatus: fund.regulatoryStatus,
        currentNav: Number(fund.currentNav),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch VC funds' });
  }
});

// Get VC fund details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const fund = await prisma.vCFund.findUnique({
      where: { id },
      include: {
        portfolioCompanies: true,
        performanceRecords: {
          orderBy: { recordDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    res.json({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      manager: fund.manager,
      totalSupply: Number(fund.totalSupply),
      availableSupply: Number(fund.availableSupply),
      minimumInvestment: Number(fund.minimumInvestment),
      status: fund.status,
      riskLevel: fund.riskLevel,
      regulatoryStatus: fund.regulatoryStatus,
      currentNav: Number(fund.currentNav),
      portfolioCompanies: fund.portfolioCompanies.length,
      performanceRecords: fund.performanceRecords.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch VC fund' });
  }
});

// Mint tokens for VC fund
router.post('/:id/tokens/mint', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, to_account_id } = req.body;

    if (!amount || !to_account_id) {
      return res.status(400).json({ error: 'Amount and to_account_id are required' });
    }

    const account = await VCFundService.mintTokens(id, amount, to_account_id);

    res.json({
      message: 'Tokens minted successfully',
      account_id: account.id,
      balance: Number(account.balance),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to mint tokens' });
  }
});

// Update NAV for VC fund
router.post('/:id/update_nav', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const navData = req.body;

    const nav = await VCFundService.updateNAV(id, navData);

    res.json({
      message: 'NAV updated successfully',
      nav,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update NAV' });
  }
});

// Delete VC fund
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if fund exists
    const fund = await prisma.vCFund.findUnique({
      where: { id },
      include: {
        currency: true,
      },
    });

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    // Delete in transaction to handle related records
    await prisma.$transaction(async (tx) => {
      // Delete associated currency if it exists
      if (fund.currency) {
        await tx.currency.delete({
          where: { id: fund.currency.id },
        });
      }

      // Delete the fund (cascade will handle related records)
      await tx.vCFund.delete({
        where: { id },
      });
    });

    res.json({
      message: 'Fund deleted successfully',
      id,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Fund not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to delete VC fund' });
  }
});

export default router;

