import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo data seed...\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('Clearing existing demo data...');
  await prisma.aMLTransaction.deleteMany({});
  await prisma.vCFundPerformanceRecord.deleteMany({});
  await prisma.vCFundPortfolioCompany.deleteMany({});
  // Delete VC fund accounts first
  await prisma.account.deleteMany({
    where: {
      currency: {
        vcFundId: { not: null }
      }
    }
  });
  // Delete funds (this will cascade delete currencies)
  await prisma.vCFund.deleteMany({});
  // Delete demo users (this will cascade delete their accounts)
  await prisma.user.deleteMany({ where: { email: { not: 'admin@afiste.com' } } });
  console.log('✅ Cleared existing data\n');

  // 1. Create stablecoins
  console.log('📊 Creating stablecoins...');
  const usdt = await prisma.currency.upsert({
    where: { id: 'usdt' },
    update: {},
    create: {
      id: 'usdt',
      code: 'usdt',
      name: 'Tether USD',
      symbol: 'USDT',
      precision: 8,
      type: 'coin',
      visible: true,
      depositFee: 0,
      withdrawFee: 0,
      minDepositAmount: new Prisma.Decimal(10),
      minWithdrawAmount: new Prisma.Decimal(20),
    },
  });

  const usdc = await prisma.currency.upsert({
    where: { id: 'usdc' },
    update: {},
    create: {
      id: 'usdc',
      code: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      precision: 8,
      type: 'coin',
      visible: true,
      depositFee: 0,
      withdrawFee: 0,
      minDepositAmount: new Prisma.Decimal(10),
      minWithdrawAmount: new Prisma.Decimal(20),
    },
  });
  console.log('✅ Stablecoins created\n');

  // 2. Create demo investors
  console.log('👥 Creating demo investors...');
  const investors = [
    {
      email: 'investor@afiste.com',
      password: 'investor123',
      firstName: 'Maria',
      lastName: 'Garcia',
      kycLevel: 2,
      kycStatus: 'verified' as const,
      balance: 50000,
    },
    {
      email: 'demo1@afiste.com',
      password: 'demo123',
      firstName: 'John',
      lastName: 'Smith',
      kycLevel: 2,
      kycStatus: 'verified' as const,
      balance: 75000,
    },
    {
      email: 'demo2@afiste.com',
      password: 'demo123',
      firstName: 'Sarah',
      lastName: 'Johnson',
      kycLevel: 1,
      kycStatus: 'verified' as const,
      balance: 30000,
    },
    {
      email: 'demo3@afiste.com',
      password: 'demo123',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      kycLevel: 1,
      kycStatus: 'verified' as const,
      balance: 25000,
    },
    {
      email: 'newinvestor@afiste.com',
      password: 'demo123',
      firstName: 'Emma',
      lastName: 'Wilson',
      kycLevel: 0,
      kycStatus: 'pending' as const,
      balance: 0,
    },
  ];

  const createdInvestors = [];
  for (const inv of investors) {
    const passwordHash = await bcrypt.hash(inv.password, 10);
    const user = await prisma.user.upsert({
      where: { email: inv.email },
      update: {},
      create: {
        email: inv.email,
        passwordDigest: passwordHash,
        firstName: inv.firstName,
        lastName: inv.lastName,
        role: 'investor',
        kycLevel: inv.kycLevel,
        kycStatus: inv.kycStatus,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (inv.balance > 0) {
      await prisma.account.upsert({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: usdt.id,
          },
        },
        update: { balance: new Prisma.Decimal(inv.balance) },
        create: {
          userId: user.id,
          currencyId: usdt.id,
          balance: new Prisma.Decimal(inv.balance),
          locked: new Prisma.Decimal(0),
        },
      });
    }

    createdInvestors.push(user);
    console.log(`  ✅ ${inv.email} (${inv.firstName} ${inv.lastName}) - Balance: $${inv.balance.toLocaleString()}`);
  }
  console.log('✅ Demo investors created\n');

  // 3. Create diverse VC funds
  console.log('💼 Creating VC funds...');
  const funds = [
    {
      id: 'yc-fund-001',
      name: 'Y Combinator Ventures I',
      description: 'Fondo tokenizado de Y Combinator, la aceleradora de startups más exitosa del mundo. Portfolio incluye empresas como Airbnb, Stripe, Dropbox, Coinbase, Reddit y más de 4,000 startups.',
      manager: 'Y Combinator',
      totalSupply: 5000000,
      availableSupply: 1500000,
      fundSize: 500000000,
      minimumInvestment: 1000,
      currentNav: 1.25,
      riskLevel: 'medium',
      status: 'active',
      portfolioCompanies: [
        { name: 'Stripe', sector: 'Fintech', stage: 'Series H', investmentAmount: 50000000, currentValuation: 95000000, ownershipPercentage: 5.2 },
        { name: 'Airbnb', sector: 'Travel', stage: 'Public', investmentAmount: 20000000, currentValuation: 85000000, ownershipPercentage: 2.3 },
        { name: 'Coinbase', sector: 'Crypto', stage: 'Public', investmentAmount: 30000000, currentValuation: 120000000, ownershipPercentage: 2.5 },
      ],
    },
    {
      id: 'a16z-fund-001',
      name: 'Andreessen Horowitz Ventures I',
      description: 'Fondo de capital de riesgo de Andreessen Horowitz enfocado en tecnología, crypto y biotecnología. Inversiones en empresas como GitHub, Instagram, Oculus VR.',
      manager: 'Andreessen Horowitz',
      totalSupply: 10000000,
      availableSupply: 3000000,
      fundSize: 1000000000,
      minimumInvestment: 5000,
      currentNav: 1.22,
      riskLevel: 'high',
      status: 'active',
      portfolioCompanies: [
        { name: 'GitHub', sector: 'Developer Tools', stage: 'Acquired', investmentAmount: 100000000, currentValuation: 7500000, ownershipPercentage: 7.5 },
        { name: 'Oculus VR', sector: 'VR/AR', stage: 'Acquired', investmentAmount: 50000000, currentValuation: 2000000, ownershipPercentage: 2.0 },
        { name: 'Instagram', sector: 'Social Media', stage: 'Acquired', investmentAmount: 25000000, currentValuation: 1000000, ownershipPercentage: 1.0 },
      ],
    },
    {
      id: 'sequoia-fund-001',
      name: 'Sequoia Capital Partners I',
      description: 'Fondo de Sequoia Capital, uno de los fondos de VC más exitosos del mundo. Portfolio histórico incluye Apple, Google, WhatsApp, LinkedIn.',
      manager: 'Sequoia Capital',
      totalSupply: 8000000,
      availableSupply: 2000000,
      fundSize: 800000000,
      minimumInvestment: 2500,
      currentNav: 1.35,
      riskLevel: 'medium',
      status: 'active',
      portfolioCompanies: [
        { name: 'WhatsApp', sector: 'Messaging', stage: 'Acquired', investmentAmount: 60000000, currentValuation: 19000000, ownershipPercentage: 19.0 },
        { name: 'LinkedIn', sector: 'Professional Network', stage: 'Acquired', investmentAmount: 40000000, currentValuation: 26000000, ownershipPercentage: 3.2 },
        { name: 'Zoom', sector: 'Video Conferencing', stage: 'Public', investmentAmount: 30000000, currentValuation: 45000000, ownershipPercentage: 5.6 },
      ],
    },
    {
      id: 'latam-tech-fund-001',
      name: 'Latam Tech Ventures I',
      description: 'Fondo enfocado en startups tecnológicas de América Latina. Inversiones en fintech, e-commerce, y SaaS en mercados emergentes.',
      manager: 'Latam Ventures',
      totalSupply: 3000000,
      availableSupply: 800000,
      fundSize: 300000000,
      minimumInvestment: 500,
      currentNav: 1.15,
      riskLevel: 'high',
      status: 'active',
      portfolioCompanies: [
        { name: 'Rappi', sector: 'Delivery', stage: 'Series F', investmentAmount: 25000000, currentValuation: 35000000, ownershipPercentage: 11.6 },
        { name: 'Nubank', sector: 'Fintech', stage: 'Public', investmentAmount: 20000000, currentValuation: 40000000, ownershipPercentage: 13.3 },
        { name: 'MercadoLibre', sector: 'E-commerce', stage: 'Public', investmentAmount: 15000000, currentValuation: 28000000, ownershipPercentage: 9.3 },
      ],
    },
    {
      id: 'climate-fund-001',
      name: 'Climate Impact Ventures',
      description: 'Fondo de impacto enfocado en tecnologías climáticas y energía renovable. Inversiones en solar, eólica, baterías y tecnologías de captura de carbono.',
      manager: 'Climate Capital',
      totalSupply: 4000000,
      availableSupply: 1200000,
      fundSize: 400000000,
      minimumInvestment: 1000,
      currentNav: 1.08,
      riskLevel: 'medium',
      status: 'active',
      portfolioCompanies: [
        { name: 'Tesla Energy', sector: 'Energy Storage', stage: 'Public', investmentAmount: 50000000, currentValuation: 55000000, ownershipPercentage: 13.7 },
        { name: 'SolarCity', sector: 'Solar', stage: 'Acquired', investmentAmount: 30000000, currentValuation: 32000000, ownershipPercentage: 8.0 },
        { name: 'CarbonCapture Inc', sector: 'Carbon Tech', stage: 'Series B', investmentAmount: 20000000, currentValuation: 25000000, ownershipPercentage: 6.2 },
      ],
    },
    {
      id: 'ai-fund-001',
      name: 'AI Innovation Fund',
      description: 'Fondo especializado en inteligencia artificial y machine learning. Inversiones en empresas de IA, robótica, y automatización.',
      manager: 'AI Ventures',
      totalSupply: 6000000,
      availableSupply: 2500000,
      fundSize: 600000000,
      minimumInvestment: 2000,
      currentNav: 1.42,
      riskLevel: 'high',
      status: 'active',
      portfolioCompanies: [
        { name: 'OpenAI', sector: 'AI/ML', stage: 'Series D', investmentAmount: 80000000, currentValuation: 150000000, ownershipPercentage: 25.0 },
        { name: 'Anthropic', sector: 'AI Safety', stage: 'Series C', investmentAmount: 40000000, currentValuation: 70000000, ownershipPercentage: 11.6 },
        { name: 'Robotics Corp', sector: 'Robotics', stage: 'Series B', investmentAmount: 30000000, currentValuation: 50000000, ownershipPercentage: 8.3 },
      ],
    },
  ];

  const createdFunds = [];
  for (const fundData of funds) {
    // Create fund
    const fund = await prisma.vCFund.upsert({
      where: { id: fundData.id },
      update: {
        currentNav: new Prisma.Decimal(fundData.currentNav),
        availableSupply: new Prisma.Decimal(fundData.availableSupply),
      },
      create: {
        id: fundData.id,
        name: fundData.name,
        description: fundData.description,
        manager: fundData.manager,
        totalSupply: new Prisma.Decimal(fundData.totalSupply),
        availableSupply: new Prisma.Decimal(fundData.availableSupply),
        fundSize: new Prisma.Decimal(fundData.fundSize),
        minimumInvestment: new Prisma.Decimal(fundData.minimumInvestment),
        launchDate: new Date('2023-01-15'),
        maturityDate: new Date('2033-01-15'),
        status: fundData.status,
        riskLevel: fundData.riskLevel,
        regulatoryStatus: 'approved',
        currentNav: new Prisma.Decimal(fundData.currentNav),
      },
    });

    // Create currency for fund
    const currencyId = `vc-${fundData.id}`;
    await prisma.currency.upsert({
      where: { id: currencyId },
      update: {
        vcFundId: fund.id,
        vcFundName: fund.name,
        vcFundDescription: fund.description,
        vcFundManager: fund.manager,
        vcFundSize: fund.fundSize,
        vcFundLaunchDate: fund.launchDate,
        vcFundMaturityDate: fund.maturityDate,
        vcFundMinimumInvestment: fund.minimumInvestment,
        vcFundTotalSupply: fund.totalSupply,
        vcFundAvailableSupply: fund.availableSupply,
        vcFundRiskLevel: fund.riskLevel,
        vcFundStatus: fund.status,
        vcFundRegulatoryStatus: fund.regulatoryStatus,
      },
      create: {
        id: currencyId,
        code: currencyId,
        name: `${fundData.name} Token`,
        symbol: fundData.id.toUpperCase().substring(0, 6),
        precision: 8,
        type: 'coin',
        visible: true,
        depositFee: 0,
        withdrawFee: 0,
        minDepositAmount: new Prisma.Decimal(0),
        minWithdrawAmount: new Prisma.Decimal(0),
        vcFundId: fund.id,
        vcFundName: fund.name,
        vcFundDescription: fund.description,
        vcFundManager: fund.manager,
        vcFundSize: fund.fundSize,
        vcFundLaunchDate: fund.launchDate,
        vcFundMaturityDate: fund.maturityDate,
        vcFundMinimumInvestment: fund.minimumInvestment,
        vcFundTotalSupply: fund.totalSupply,
        vcFundAvailableSupply: fund.availableSupply,
        vcFundRiskLevel: fund.riskLevel,
        vcFundStatus: fund.status,
        vcFundRegulatoryStatus: fund.regulatoryStatus,
      },
    });

    // Create portfolio companies
    for (const company of fundData.portfolioCompanies) {
      await prisma.vCFundPortfolioCompany.create({
        data: {
          vcFundId: fund.id,
          name: company.name,
          sector: company.sector,
          stage: company.stage,
          investmentAmount: new Prisma.Decimal(company.investmentAmount),
          investmentDate: new Date('2023-06-01'),
          currentValuation: new Prisma.Decimal(company.currentValuation),
          ownershipPercentage: new Prisma.Decimal(company.ownershipPercentage),
          description: `${company.name} is a ${company.sector} company at ${company.stage} stage.`,
        },
      });
    }

    // Create performance records
    const today = new Date();
    const months = [6, 3, 1, 0]; // 6 months ago, 3 months ago, 1 month ago, today
    const initialNav = 1.0;
    const currentNav = fundData.currentNav;
    const navGrowth = (currentNav - initialNav) / initialNav;

    for (let i = 0; i < months.length; i++) {
      const recordDate = new Date(today);
      recordDate.setMonth(recordDate.getMonth() - months[i]);
      
      const progress = months[i] === 0 ? 1 : (6 - months[i]) / 6;
      const navAtDate = initialNav + (navGrowth * progress);
      const assetsAtDate = Number(fundData.fundSize) * (1 + navGrowth * progress);

      await prisma.vCFundPerformanceRecord.create({
        data: {
          vcFundId: fund.id,
          recordDate,
          navPerToken: new Prisma.Decimal(navAtDate),
          totalAssets: new Prisma.Decimal(assetsAtDate),
          totalLiabilities: new Prisma.Decimal(0),
          performanceMetrics: {
            totalReturn: navGrowth * progress * 100,
            monthlyReturn: (navGrowth * progress / 6) * 100,
          },
        },
      });
    }

    createdFunds.push(fund);
    console.log(`  ✅ ${fund.name} - NAV: $${fundData.currentNav}, Available: ${(fundData.availableSupply / fundData.totalSupply * 100).toFixed(1)}%`);
  }
  console.log('✅ VC funds created\n');

  // 4. Create investments for demo investors
  console.log('💰 Creating demo investments...');
  const investments = [
    { userEmail: 'investor@afiste.com', fundId: 'yc-fund-001', amount: 10000 },
    { userEmail: 'investor@afiste.com', fundId: 'a16z-fund-001', amount: 15000 },
    { userEmail: 'investor@afiste.com', fundId: 'sequoia-fund-001', amount: 10000 },
    { userEmail: 'investor@afiste.com', fundId: 'latam-tech-fund-001', amount: 5000 },
    { userEmail: 'demo1@afiste.com', fundId: 'yc-fund-001', amount: 20000 },
    { userEmail: 'demo1@afiste.com', fundId: 'climate-fund-001', amount: 15000 },
    { userEmail: 'demo1@afiste.com', fundId: 'ai-fund-001', amount: 25000 },
    { userEmail: 'demo2@afiste.com', fundId: 'latam-tech-fund-001', amount: 10000 },
    { userEmail: 'demo2@afiste.com', fundId: 'sequoia-fund-001', amount: 8000 },
    { userEmail: 'demo3@afiste.com', fundId: 'climate-fund-001', amount: 5000 },
    { userEmail: 'demo3@afiste.com', fundId: 'yc-fund-001', amount: 7000 },
  ];

  for (const inv of investments) {
    try {
      const user = createdInvestors.find(u => u.email === inv.userEmail);
      if (!user) {
        console.log(`  ⚠️  User not found: ${inv.userEmail}`);
        continue;
      }

      const fund = createdFunds.find(f => f.id === inv.fundId);
      if (!fund) {
        console.log(`  ⚠️  Fund not found: ${inv.fundId}`);
        continue;
      }

      const currency = await prisma.currency.findUnique({
        where: { id: `vc-${inv.fundId}` },
      });
      if (!currency) {
        console.log(`  ⚠️  Currency not found: vc-${inv.fundId}`);
        continue;
      }

      // Get or create USDT account - refresh to get current balance
      const usdtAccount = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: usdt.id,
          },
        },
      });

      if (!usdtAccount) {
        console.log(`  ⚠️  USDT account not found for ${inv.userEmail}`);
        continue;
      }

      const currentBalance = Number(usdtAccount.balance);
      if (currentBalance < inv.amount) {
        console.log(`  ⚠️  Insufficient balance for ${inv.userEmail}: $${currentBalance} < $${inv.amount}`);
        continue;
      }

      // Calculate tokens
      const tokens = inv.amount / Number(fund.currentNav);

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Update USDT account (debit)
        await tx.account.update({
          where: { id: usdtAccount.id },
          data: {
            balance: new Prisma.Decimal(Number(usdtAccount.balance) - inv.amount),
          },
        });

        // Get or create VC token account
        const existingVcAccount = await tx.account.findUnique({
          where: {
            userId_currencyId: {
              userId: user.id,
              currencyId: currency.id,
            },
          },
        });

        if (existingVcAccount) {
          await tx.account.update({
            where: { id: existingVcAccount.id },
            data: {
              balance: new Prisma.Decimal(Number(existingVcAccount.balance) + tokens),
            },
          });
        } else {
          await tx.account.create({
            data: {
              userId: user.id,
              currencyId: currency.id,
              balance: new Prisma.Decimal(tokens),
              locked: new Prisma.Decimal(0),
            },
          });
        }

        // Update fund available supply
        await tx.vCFund.update({
          where: { id: fund.id },
          data: {
            availableSupply: new Prisma.Decimal(Number(fund.availableSupply) - tokens),
          },
        });
      });

      // Create AML transaction record (outside transaction)
      await prisma.aMLTransaction.create({
        data: {
          userId: user.id,
          transactionType: 'investment',
          amount: new Prisma.Decimal(inv.amount),
          currency: 'USDT',
          riskScore: 10,
          flagged: false,
          reviewStatus: 'cleared',
        },
      });

      console.log(`  ✅ ${inv.userEmail} invested $${inv.amount.toLocaleString()} in ${fund.name}`);
    } catch (error: any) {
      console.log(`  ❌ Error processing investment for ${inv.userEmail}: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
    }
  }
  console.log('✅ Demo investments created\n');

  // 5. Create payment history
  console.log('💳 Creating payment history...');
  for (const user of createdInvestors) {
    if (user.email === 'newinvestor@afiste.com') continue;

    const account = await prisma.account.findUnique({
      where: {
        userId_currencyId: {
          userId: user.id,
          currencyId: usdt.id,
        },
      },
    });

    if (!account) continue;

    const balance = Number(account.balance);
    if (balance > 0) {
      // Create a deposit payment record
      await prisma.payment.create({
        data: {
          userId: user.id,
          type: 'deposit',
          amount: new Prisma.Decimal(balance),
          currency: 'USDT',
          status: 'completed',
          paymentMethod: 'sandbox',
          processedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        },
      });
    }
  }
  console.log('✅ Payment history created\n');

  console.log('🎉 Demo data seed completed!\n');
  console.log('📋 Demo Accounts:');
  console.log('  - investor@afiste.com / investor123 (Maria Garcia)');
  console.log('  - demo1@afiste.com / demo123 (John Smith)');
  console.log('  - demo2@afiste.com / demo123 (Sarah Johnson)');
  console.log('  - demo3@afiste.com / demo123 (Carlos Rodriguez)');
  console.log('  - newinvestor@afiste.com / demo123 (Emma Wilson - KYC pending)\n');
  console.log('💼 VC Funds Created:');
  funds.forEach(f => {
    console.log(`  - ${f.name} (${f.id})`);
  });
  console.log('\n✨ Your project is now demo-ready!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

