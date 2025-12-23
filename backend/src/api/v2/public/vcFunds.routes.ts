import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get list of VC funds
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, risk_level, page = '1', limit = '25' } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (risk_level) {
      where.riskLevel = risk_level;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let funds: any[] = [];
    let total = 0;

    try {
      const [fundsResult, totalResult] = await Promise.all([
        prisma.vCFund.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.vCFund.count({ where }),
      ]);
      funds = fundsResult;
      total = totalResult;
    } catch (dbError: any) {
      // If database is unavailable, return empty result instead of 500 error
      // This allows the frontend to load gracefully
      if (dbError.code === 'P1001' || dbError.message?.includes("Can't reach database server")) {
        return res.json({
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
          warning: 'Database is currently unavailable. Please ensure PostgreSQL is running.',
        });
      }
      // Re-throw other database errors
      throw dbError;
    }

    res.json({
      data: funds.map((fund) => {
        const totalSupply = Number(fund.totalSupply);
        const availableSupply = Number(fund.availableSupply);
        const tokensAvailablePercentage = totalSupply > 0 
          ? (availableSupply / totalSupply) * 100 
          : 0;

        return {
          id: fund.id,
          name: fund.name,
          description: fund.description,
          manager: fund.manager,
          total_supply: totalSupply,
          available_supply: availableSupply,
          fund_size: fund.fundSize ? Number(fund.fundSize) : null,
          minimum_investment: Number(fund.minimumInvestment),
          launch_date: fund.launchDate?.toISOString().split('T')[0] || null,
          maturity_date: fund.maturityDate?.toISOString().split('T')[0] || null,
          status: fund.status,
          risk_level: fund.riskLevel,
          regulatory_status: fund.regulatoryStatus,
          terms: fund.terms,
          documents: fund.documents,
          current_nav: Number(fund.currentNav),
          tokens_available_percentage: tokensAvailablePercentage,
          created_at: fund.createdAt.toISOString(),
          updated_at: fund.updatedAt.toISOString(),
        };
      }),
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to find by ID first
    let fund = await prisma.vCFund.findUnique({
      where: { id },
      include: {
        portfolioCompanies: true,
        performanceRecords: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    // If not found by ID, try to find by slug or partial ID match
    // e.g., "green-energy" should match "green-energy-fund-001"
    if (!fund) {
      // Try to find fund where ID contains the slug
      // This allows URLs like /funds/green-energy to work with fund ID green-energy-fund-001
      const allFunds = await prisma.vCFund.findMany({
        include: {
          portfolioCompanies: true,
          performanceRecords: {
            orderBy: { recordDate: 'desc' },
            take: 1,
          },
        },
      });
      
      // Find fund where ID starts with the slug or contains it as a prefix
      fund = allFunds.find(f => 
        f.id.toLowerCase().startsWith(id.toLowerCase() + '-') ||
        f.id.toLowerCase() === id.toLowerCase() ||
        f.id.toLowerCase().includes(id.toLowerCase())
      ) || null;
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const totalSupply = Number(fund.totalSupply);
    const availableSupply = Number(fund.availableSupply);
    const tokensAvailablePercentage = totalSupply > 0 
      ? (availableSupply / totalSupply) * 100 
      : 0;

    res.json({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      manager: fund.manager,
      total_supply: totalSupply,
      available_supply: availableSupply,
      fund_size: fund.fundSize ? Number(fund.fundSize) : null,
      minimum_investment: Number(fund.minimumInvestment),
      launch_date: fund.launchDate?.toISOString().split('T')[0] || null,
      maturity_date: fund.maturityDate?.toISOString().split('T')[0] || null,
      status: fund.status,
      risk_level: fund.riskLevel,
      regulatory_status: fund.regulatoryStatus,
      terms: fund.terms,
      documents: fund.documents,
      current_nav: Number(fund.currentNav),
      latest_nav: fund.performanceRecords[0] 
        ? Number(fund.performanceRecords[0].navPerToken) 
        : Number(fund.currentNav),
      tokens_available_percentage: tokensAvailablePercentage,
      portfolio_companies: fund.portfolioCompanies.map((company) => {
        const investmentAmount = company.investmentAmount ? Number(company.investmentAmount) : null;
        const currentValuation = company.currentValuation ? Number(company.currentValuation) : null;
        const ownershipPercentage = company.ownershipPercentage ? Number(company.ownershipPercentage) : null;
        
        // Calculate ROI
        let roi = null;
        if (investmentAmount && currentValuation && investmentAmount > 0) {
          roi = ((currentValuation - investmentAmount) / investmentAmount) * 100;
        }
        
        return {
          id: company.id,
          name: company.name,
          sector: company.sector,
          stage: company.stage,
          investment_amount: investmentAmount,
          investment_date: company.investmentDate?.toISOString().split('T')[0] || null,
          current_valuation: currentValuation,
          ownership_percentage: ownershipPercentage,
          description: company.description,
          roi: roi,
        };
      }),
      latest_performance: fund.performanceRecords[0]
        ? {
            record_date: fund.performanceRecords[0].recordDate.toISOString().split('T')[0],
            nav_per_token: Number(fund.performanceRecords[0].navPerToken),
            total_assets: fund.performanceRecords[0].totalAssets
              ? Number(fund.performanceRecords[0].totalAssets)
              : null,
            total_liabilities: fund.performanceRecords[0].totalLiabilities
              ? Number(fund.performanceRecords[0].totalLiabilities)
              : null,
          }
        : null,
      created_at: fund.createdAt.toISOString(),
      updated_at: fund.updatedAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch VC fund' });
  }
});

// Get VC fund portfolio companies
router.get('/:id/portfolio', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sector, stage } = req.query;

    // Try to find by ID first
    let fund = await prisma.vCFund.findUnique({
      where: { id },
    });

    // If not found, try slug matching
    if (!fund) {
      const allFunds = await prisma.vCFund.findMany();
      const matchedFund = allFunds.find(f => 
        f.id.toLowerCase().startsWith(id.toLowerCase() + '-') ||
        f.id.toLowerCase() === id.toLowerCase() ||
        f.id.toLowerCase().includes(id.toLowerCase())
      );
      if (matchedFund) {
        fund = matchedFund;
      }
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const where: any = { vcFundId: fund.id };
    if (sector) {
      where.sector = sector;
    }
    if (stage) {
      where.stage = stage;
    }

    const companies = await prisma.vCFundPortfolioCompany.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      companies.map((company) => {
        const investmentAmount = company.investmentAmount ? Number(company.investmentAmount) : null;
        const currentValuation = company.currentValuation ? Number(company.currentValuation) : null;
        const ownershipPercentage = company.ownershipPercentage ? Number(company.ownershipPercentage) : null;
        
        // Calculate ROI
        let roi = null;
        if (investmentAmount && currentValuation && investmentAmount > 0) {
          roi = ((currentValuation - investmentAmount) / investmentAmount) * 100;
        }
        
        return {
          id: company.id,
          name: company.name,
          sector: company.sector,
          stage: company.stage,
          investment_amount: investmentAmount,
          investment_date: company.investmentDate?.toISOString().split('T')[0] || null,
          current_valuation: currentValuation,
          ownership_percentage: ownershipPercentage,
          description: company.description,
          roi: roi,
        };
      })
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch portfolio companies' });
  }
});

// Get VC fund performance records
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, limit = '100' } = req.query;

    // Try to find by ID first
    let fund = await prisma.vCFund.findUnique({
      where: { id },
    });

    // If not found, try slug matching
    if (!fund) {
      const allFunds = await prisma.vCFund.findMany();
      const matchedFund = allFunds.find(f => 
        f.id.toLowerCase().startsWith(id.toLowerCase() + '-') ||
        f.id.toLowerCase() === id.toLowerCase() ||
        f.id.toLowerCase().includes(id.toLowerCase())
      );
      if (matchedFund) {
        fund = matchedFund;
      }
    }

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const where: any = { vcFundId: fund.id };
    if (start_date && end_date) {
      where.recordDate = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string),
      };
    }

    const records = await prisma.vCFundPerformanceRecord.findMany({
      where,
      orderBy: { recordDate: 'asc' }, // Order ascending for chart display
      take: parseInt(limit as string, 10),
    });

    res.json(
      records.map((record) => ({
        id: record.id,
        record_date: record.recordDate.toISOString().split('T')[0],
        nav_per_token: Number(record.navPerToken),
        total_assets: record.totalAssets ? Number(record.totalAssets) : null,
        total_liabilities: record.totalLiabilities ? Number(record.totalLiabilities) : null,
        performance_metrics: record.performanceMetrics,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch performance records' });
  }
});

export default router;

