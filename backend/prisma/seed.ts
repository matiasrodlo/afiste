import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Create stablecoins (USDT, USDC)
  console.log('Creating stablecoins...');
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

  console.log('Stablecoins created');

  // 2. Create admin user
  console.log('Creating admin user...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@afiste.com' },
    update: {},
    create: {
      email: 'admin@afiste.com',
      passwordDigest: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      kycLevel: 3,
      kycStatus: 'verified',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Create admin USDT account with balance
  await prisma.account.upsert({
    where: {
      userId_currencyId: {
        userId: admin.id,
        currencyId: usdt.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      currencyId: usdt.id,
      balance: new Prisma.Decimal(100000), // $100k for testing
      locked: new Prisma.Decimal(0),
    },
  });

  console.log('Admin user created (email: admin@afiste.com, password: admin123)');

  // 3. Create test investor user
  console.log('Creating test investor...');
  const investorPasswordHash = await bcrypt.hash('investor123', 10);
  const investor = await prisma.user.upsert({
    where: { email: 'investor@afiste.com' },
    update: {},
    create: {
      email: 'investor@afiste.com',
      passwordDigest: investorPasswordHash,
      firstName: 'Test',
      lastName: 'Investor',
      role: 'investor',
      kycLevel: 1,
      kycStatus: 'verified',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Create investor USDT account with balance
  await prisma.account.upsert({
    where: {
      userId_currencyId: {
        userId: investor.id,
        currencyId: usdt.id,
      },
    },
    update: {},
    create: {
      userId: investor.id,
      currencyId: usdt.id,
      balance: new Prisma.Decimal(10000), // $10k for testing
      locked: new Prisma.Decimal(0),
    },
  });

  console.log('Test investor created (email: investor@afiste.com, password: investor123)');

  // Helper function to create performance records
  const createPerformanceRecords = async (fundId: string, initialNav: number, currentNav: number, fundSize: number) => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const navGrowth = (currentNav - initialNav) / initialNav;
    const monthlyGrowth = navGrowth / 3;

    await prisma.vCFundPerformanceRecord.createMany({
      data: [
        {
          vcFundId: fundId,
          recordDate: threeMonthsAgo,
          navPerToken: new Prisma.Decimal(initialNav),
          totalAssets: new Prisma.Decimal(fundSize),
          totalLiabilities: new Prisma.Decimal(0),
          performanceMetrics: {
            totalReturn: 0,
            monthlyReturn: 0,
          },
        },
        {
          vcFundId: fundId,
          recordDate: twoMonthsAgo,
          navPerToken: new Prisma.Decimal(initialNav * (1 + monthlyGrowth)),
          totalAssets: new Prisma.Decimal(fundSize * (1 + monthlyGrowth)),
          totalLiabilities: new Prisma.Decimal(0),
          performanceMetrics: {
            totalReturn: monthlyGrowth * 100,
            monthlyReturn: monthlyGrowth * 100,
          },
        },
        {
          vcFundId: fundId,
          recordDate: lastMonth,
          navPerToken: new Prisma.Decimal(initialNav * (1 + monthlyGrowth * 2)),
          totalAssets: new Prisma.Decimal(fundSize * (1 + monthlyGrowth * 2)),
          totalLiabilities: new Prisma.Decimal(0),
          performanceMetrics: {
            totalReturn: monthlyGrowth * 200,
            monthlyReturn: monthlyGrowth * 100,
          },
        },
        {
          vcFundId: fundId,
          recordDate: today,
          navPerToken: new Prisma.Decimal(currentNav),
          totalAssets: new Prisma.Decimal(fundSize * (1 + navGrowth)),
          totalLiabilities: new Prisma.Decimal(0),
          performanceMetrics: {
            totalReturn: navGrowth * 100,
            monthlyReturn: monthlyGrowth * 100,
          },
        },
      ],
      skipDuplicates: true,
    });
  };

  // 4. Create VC Fund 1: Y Combinator Fund
  console.log('Creating VC Fund 1: Y Combinator...');
  const ycFund = await prisma.vCFund.upsert({
    where: { id: 'yc-fund-001' },
    update: {
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - Y COMBINATOR VENTURES I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Y Combinator Ventures I (el "Fondo"), gestionado por Y Combinator (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $1,000 USD
- Inversión máxima: Sin límite superior
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 12 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos o retirados
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento

4. ESTRUCTURA DE COMISIONES
- Comisión de gestión: 2.0% anual sobre el patrimonio neto del Fondo
- Comisión de éxito: 20% sobre las ganancias realizadas, aplicable solo en caso de distribuciones positivas
- Las comisiones se calculan y cobran trimestralmente
- Gastos operativos: Los gastos operativos del Fondo se deducen del patrimonio neto antes del cálculo de comisiones

5. DISTRIBUCIÓN DE RETORNOS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas, IPOs, adquisiciones)
- Los retornos se pagarán en USD (USDT) a través de la plataforma

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables
- Volatilidad: El valor de los tokens puede fluctuar significativamente
- Riesgo regulatorio: Los cambios en la regulación pueden afectar el valor y la operación del Fondo
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores o empresas

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo
- Los inversores deben mantener la confidencialidad de la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo
- Los inversores deben cumplir con todas las obligaciones legales y regulatorias aplicables

8. GESTIÓN DEL FONDO
- El Gestor tiene discreción completa sobre las decisiones de inversión
- El Gestor debe actuar en el mejor interés de los inversores
- El Gestor proporcionará informes trimestrales sobre el desempeño del Fondo
- Cualquier cambio material en la estrategia de inversión será comunicado a los inversores

9. DISPOSICIONES LEGALES
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo
- Cualquier disputa se resolverá mediante arbitraje según las reglas establecidas
- El Fondo está sujeto a la regulación de valores aplicable
- Los inversores deben cumplir con todas las leyes de lavado de dinero y financiamiento del terrorismo

10. MODIFICACIONES
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores
- Las modificaciones materialmente adversas requieren el consentimiento de la mayoría de los inversores
- Los cambios se comunicarán con al menos 30 días de anticipación

11. CONTACTO
Para consultas sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de la plataforma o en los canales oficiales de comunicación establecidos.

Fecha de vigencia: Junio 2023
Última actualización: Junio 2023`,
    },
    create: {
      id: 'yc-fund-001',
      name: 'Y Combinator Ventures I',
      description: 'Fondo tokenizado de Y Combinator, la aceleradora de startups más exitosa del mundo. Portfolio incluye empresas como Airbnb, Stripe, Dropbox, Coinbase, Reddit y más de 4,000 startups.',
      manager: 'Y Combinator',
      totalSupply: new Prisma.Decimal(5000000), // 5M tokens
      availableSupply: new Prisma.Decimal(2000000), // 2M available
      fundSize: new Prisma.Decimal(500000000), // $500M fund
      minimumInvestment: new Prisma.Decimal(1000), // $1k minimum
      launchDate: new Date('2023-06-01'),
      maturityDate: new Date('2033-06-01'),
      status: 'active',
      riskLevel: 'medium',
      regulatoryStatus: 'approved',
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - Y COMBINATOR VENTURES I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Y Combinator Ventures I (el "Fondo"), gestionado por Y Combinator (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $1,000 USD
- Inversión máxima: Sin límite superior
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 12 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos o retirados
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento

4. ESTRUCTURA DE COMISIONES
- Comisión de gestión: 2.0% anual sobre el patrimonio neto del Fondo
- Comisión de éxito: 20% sobre las ganancias realizadas, aplicable solo en caso de distribuciones positivas
- Las comisiones se calculan y cobran trimestralmente
- Gastos operativos: Los gastos operativos del Fondo se deducen del patrimonio neto antes del cálculo de comisiones

5. DISTRIBUCIÓN DE RETORNOS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas, IPOs, adquisiciones)
- Los retornos se pagarán en USD (USDT) a través de la plataforma

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables
- Volatilidad: El valor de los tokens puede fluctuar significativamente
- Riesgo regulatorio: Los cambios en la regulación pueden afectar el valor y la operación del Fondo
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores o empresas

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo
- Los inversores deben mantener la confidencialidad de la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo
- Los inversores deben cumplir con todas las obligaciones legales y regulatorias aplicables

8. GESTIÓN DEL FONDO
- El Gestor tiene discreción completa sobre las decisiones de inversión
- El Gestor debe actuar en el mejor interés de los inversores
- El Gestor proporcionará informes trimestrales sobre el desempeño del Fondo
- Cualquier cambio material en la estrategia de inversión será comunicado a los inversores

9. DISPOSICIONES LEGALES
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo
- Cualquier disputa se resolverá mediante arbitraje según las reglas establecidas
- El Fondo está sujeto a la regulación de valores aplicable
- Los inversores deben cumplir con todas las leyes de lavado de dinero y financiamiento del terrorismo

10. MODIFICACIONES
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores
- Las modificaciones materialmente adversas requieren el consentimiento de la mayoría de los inversores
- Los cambios se comunicarán con al menos 30 días de anticipación

11. CONTACTO
Para consultas sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de la plataforma o en los canales oficiales de comunicación establecidos.

Fecha de vigencia: Junio 2023
Última actualización: Junio 2023`,
      currentNav: new Prisma.Decimal(1.28), // NAV $1.28 per token
      documents: {
        prospectus: 'https://example.com/yc-prospectus.pdf',
        terms: 'https://example.com/yc-terms.pdf',
      },
    },
  });

  // Create currency for YC Fund
  const ycCurrency = await prisma.currency.upsert({
    where: { id: 'vc-yc' },
    update: {},
    create: {
      id: 'vc-yc',
      code: 'vc-yc',
      name: 'Y Combinator Ventures Token',
      symbol: 'YC',
      precision: 8,
      type: 'coin',
      visible: true,
      depositFee: 0,
      withdrawFee: 0,
      minDepositAmount: new Prisma.Decimal(0),
      minWithdrawAmount: new Prisma.Decimal(0),
      vcFundId: ycFund.id,
      vcFundName: ycFund.name,
      vcFundDescription: ycFund.description,
      vcFundManager: ycFund.manager,
      vcFundSize: ycFund.fundSize,
      vcFundLaunchDate: ycFund.launchDate,
      vcFundMaturityDate: ycFund.maturityDate,
      vcFundMinimumInvestment: ycFund.minimumInvestment,
      vcFundTotalSupply: ycFund.totalSupply,
      vcFundAvailableSupply: ycFund.availableSupply,
      vcFundStatus: ycFund.status,
      vcFundRiskLevel: ycFund.riskLevel,
      vcFundRegulatoryStatus: ycFund.regulatoryStatus,
    },
  });

  // Create portfolio companies for YC
  await prisma.vCFundPortfolioCompany.createMany({
    data: [
      {
        vcFundId: ycFund.id,
        name: 'Airbnb',
        sector: 'Travel & Hospitality',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2009-01-01'),
        currentValuation: new Prisma.Decimal(70000000000),
        ownershipPercentage: new Prisma.Decimal(0.15),
        description: 'Plataforma global de alojamiento y experiencias de viaje',
      },
      {
        vcFundId: ycFund.id,
        name: 'Stripe',
        sector: 'Fintech',
        stage: 'Private',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2010-01-01'),
        currentValuation: new Prisma.Decimal(65000000000),
        ownershipPercentage: new Prisma.Decimal(0.12),
        description: 'Plataforma de pagos en línea para empresas',
      },
      {
        vcFundId: ycFund.id,
        name: 'Coinbase',
        sector: 'Cryptocurrency',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2012-01-01'),
        currentValuation: new Prisma.Decimal(50000000000),
        ownershipPercentage: new Prisma.Decimal(0.08),
        description: 'Intercambio de criptomonedas y wallet digital',
      },
      {
        vcFundId: ycFund.id,
        name: 'Dropbox',
        sector: 'SaaS',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2007-01-01'),
        currentValuation: new Prisma.Decimal(8000000000),
        ownershipPercentage: new Prisma.Decimal(0.05),
        description: 'Servicio de almacenamiento en la nube y sincronización de archivos',
      },
      {
        vcFundId: ycFund.id,
        name: 'Reddit',
        sector: 'Social Media',
        stage: 'Private',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2005-01-01'),
        currentValuation: new Prisma.Decimal(10000000000),
        ownershipPercentage: new Prisma.Decimal(0.10),
        description: 'Plataforma de comunidades y discusión en línea',
      },
      {
        vcFundId: ycFund.id,
        name: 'DoorDash',
        sector: 'Food Delivery',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(20000),
        investmentDate: new Date('2013-01-01'),
        currentValuation: new Prisma.Decimal(25000000000),
        ownershipPercentage: new Prisma.Decimal(0.06),
        description: 'Plataforma de entrega de comida a domicilio',
      },
    ],
    skipDuplicates: true,
  });

  await createPerformanceRecords(ycFund.id, 1.0, 1.28, 500000000);
  console.log('VC Fund 1 (Y Combinator) created');

  // 5. Create VC Fund 2: Sequoia Capital Fund
  console.log('Creating VC Fund 2: Sequoia Capital...');
  const sequoiaFund = await prisma.vCFund.upsert({
    where: { id: 'sequoia-fund-001' },
    update: {
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - SEQUOIA CAPITAL PARTNERS I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Sequoia Capital Partners I (el "Fondo"), gestionado por Sequoia Capital (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $5,000 USD
- Inversión máxima: Sin límite superior
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable
- Se requiere verificación de identidad (KYC) y cumplimiento de normas AML

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 18 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos o retirados
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento
- La liquidez está sujeta a la disponibilidad de compradores en el mercado secundario

4. ESTRUCTURA DE COMISIONES
- Comisión de gestión: 2.5% anual sobre el patrimonio neto del Fondo
- Comisión de éxito: 20% sobre las ganancias realizadas, aplicable solo en caso de distribuciones positivas
- Las comisiones se calculan y cobran trimestralmente
- Gastos operativos: Los gastos operativos del Fondo se deducen del patrimonio neto antes del cálculo de comisiones
- Gastos de transacción: Los costos de transacción de blockchain se deducen de las operaciones individuales

5. DISTRIBUCIÓN DE RETORNOS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas, IPOs, adquisiciones)
- Los retornos se pagarán en USD (USDT) a través de la plataforma
- El cálculo de retornos se basa en el NAV (Valor Neto de Activos) del Fondo

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables, especialmente durante el período de bloqueo
- Volatilidad: El valor de los tokens puede fluctuar significativamente basado en el desempeño del portafolio
- Riesgo regulatorio: Los cambios en la regulación de valores y criptomonedas pueden afectar el valor y la operación del Fondo
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores, geografías o empresas
- Riesgo tecnológico: Los riesgos asociados con la tecnología blockchain y los contratos inteligentes

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo
- Los inversores tienen derecho a acceder a informes trimestrales y estados financieros auditados
- Los inversores deben mantener la confidencialidad de la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo
- Los inversores deben cumplir con todas las obligaciones legales y regulatorias aplicables
- Los inversores deben notificar cualquier cambio en su situación financiera o regulatoria

8. GESTIÓN DEL FONDO
- El Gestor tiene discreción completa sobre las decisiones de inversión dentro de los parámetros establecidos
- El Gestor debe actuar en el mejor interés de los inversores y cumplir con los deberes fiduciarios
- El Gestor proporcionará informes trimestrales detallados sobre el desempeño del Fondo
- Cualquier cambio material en la estrategia de inversión será comunicado a los inversores con al menos 60 días de anticipación
- El Gestor mantendrá registros completos de todas las transacciones y decisiones de inversión

9. TOKENIZACIÓN Y TECNOLOGÍA BLOCKCHAIN
- Los tokens representan una participación fraccionada en el Fondo
- Los tokens se emiten y gestionan mediante tecnología blockchain
- El inversor es responsable de la seguridad de su wallet y claves privadas
- El Fondo no es responsable de pérdidas debido a errores del usuario, hackeos o pérdida de claves
- Las transacciones en blockchain son irreversibles una vez confirmadas

10. DISPOSICIONES LEGALES Y REGULATORIAS
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo
- El Fondo cumple con todas las regulaciones de valores y criptomonedas aplicables
- Cualquier disputa se resolverá mediante arbitraje según las reglas establecidas
- Los inversores deben cumplir con todas las leyes de lavado de dinero (AML) y financiamiento del terrorismo
- El Fondo se reserva el derecho de rechazar inversiones que no cumplan con los requisitos regulatorios

11. TERMINACIÓN Y DISOLUCIÓN
- El Fondo puede ser disuelto al finalizar el período de 10 años o antes por decisión del Gestor
- En caso de disolución, los activos se liquidarán y se distribuirán proporcionalmente entre los inversores
- El Gestor notificará a los inversores con al menos 90 días de anticipación antes de cualquier disolución planificada

12. MODIFICACIONES
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores
- Las modificaciones materialmente adversas requieren el consentimiento de la mayoría de los inversores (más del 50%)
- Los cambios se comunicarán con al menos 30 días de anticipación a través de la plataforma y por correo electrónico

13. PROTECCIÓN DE DATOS
- El Gestor procesará los datos personales de los inversores de acuerdo con las leyes de protección de datos aplicables
- Los datos se utilizarán únicamente para los fines relacionados con la gestión del Fondo
- Los inversores tienen derecho a acceder, rectificar y eliminar sus datos personales según la legislación aplicable

14. CONTACTO Y COMUNICACIONES
Para consultas sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de:
- Plataforma oficial: www.afiste.com
- Email: support@afiste.com
- Los comunicados oficiales se realizarán a través de la plataforma y por correo electrónico registrado

Fecha de vigencia: Marzo 2023
Última actualización: Marzo 2023`,
    },
    create: {
      id: 'sequoia-fund-001',
      name: 'Sequoia Capital Partners I',
      description: 'Fondo tokenizado de Sequoia Capital, uno de los fondos de capital de riesgo más prestigiosos del mundo. Portfolio histórico incluye Apple, Google, WhatsApp, Instagram, Zoom y más.',
      manager: 'Sequoia Capital',
      totalSupply: new Prisma.Decimal(10000000), // 10M tokens
      availableSupply: new Prisma.Decimal(3000000), // 3M available
      fundSize: new Prisma.Decimal(1000000000), // $1B fund
      minimumInvestment: new Prisma.Decimal(5000), // $5k minimum
      launchDate: new Date('2023-03-15'),
      maturityDate: new Date('2033-03-15'),
      status: 'active',
      riskLevel: 'low',
      regulatoryStatus: 'approved',
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - SEQUOIA CAPITAL PARTNERS I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Sequoia Capital Partners I (el "Fondo"), gestionado por Sequoia Capital (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $5,000 USD
- Inversión máxima: Sin límite superior
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable
- Se requiere verificación de identidad (KYC) y cumplimiento de normas AML

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 18 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos o retirados
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento
- La liquidez está sujeta a la disponibilidad de compradores en el mercado secundario

4. ESTRUCTURA DE COMISIONES
- Comisión de gestión: 2.5% anual sobre el patrimonio neto del Fondo
- Comisión de éxito: 20% sobre las ganancias realizadas, aplicable solo en caso de distribuciones positivas
- Las comisiones se calculan y cobran trimestralmente
- Gastos operativos: Los gastos operativos del Fondo se deducen del patrimonio neto antes del cálculo de comisiones
- Gastos de transacción: Los costos de transacción de blockchain se deducen de las operaciones individuales

5. DISTRIBUCIÓN DE RETORNOS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas, IPOs, adquisiciones)
- Los retornos se pagarán en USD (USDT) a través de la plataforma
- El cálculo de retornos se basa en el NAV (Valor Neto de Activos) del Fondo

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables, especialmente durante el período de bloqueo
- Volatilidad: El valor de los tokens puede fluctuar significativamente basado en el desempeño del portafolio
- Riesgo regulatorio: Los cambios en la regulación de valores y criptomonedas pueden afectar el valor y la operación del Fondo
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores, geografías o empresas
- Riesgo tecnológico: Los riesgos asociados con la tecnología blockchain y los contratos inteligentes

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo
- Los inversores tienen derecho a acceder a informes trimestrales y estados financieros auditados
- Los inversores deben mantener la confidencialidad de la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo
- Los inversores deben cumplir con todas las obligaciones legales y regulatorias aplicables
- Los inversores deben notificar cualquier cambio en su situación financiera o regulatoria

8. GESTIÓN DEL FONDO
- El Gestor tiene discreción completa sobre las decisiones de inversión dentro de los parámetros establecidos
- El Gestor debe actuar en el mejor interés de los inversores y cumplir con los deberes fiduciarios
- El Gestor proporcionará informes trimestrales detallados sobre el desempeño del Fondo
- Cualquier cambio material en la estrategia de inversión será comunicado a los inversores con al menos 60 días de anticipación
- El Gestor mantendrá registros completos de todas las transacciones y decisiones de inversión

9. TOKENIZACIÓN Y TECNOLOGÍA BLOCKCHAIN
- Los tokens representan una participación fraccionada en el Fondo
- Los tokens se emiten y gestionan mediante tecnología blockchain
- El inversor es responsable de la seguridad de su wallet y claves privadas
- El Fondo no es responsable de pérdidas debido a errores del usuario, hackeos o pérdida de claves
- Las transacciones en blockchain son irreversibles una vez confirmadas

10. DISPOSICIONES LEGALES Y REGULATORIAS
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo
- El Fondo cumple con todas las regulaciones de valores y criptomonedas aplicables
- Cualquier disputa se resolverá mediante arbitraje según las reglas establecidas
- Los inversores deben cumplir con todas las leyes de lavado de dinero (AML) y financiamiento del terrorismo
- El Fondo se reserva el derecho de rechazar inversiones que no cumplan con los requisitos regulatorios

11. TERMINACIÓN Y DISOLUCIÓN
- El Fondo puede ser disuelto al finalizar el período de 10 años o antes por decisión del Gestor
- En caso de disolución, los activos se liquidarán y se distribuirán proporcionalmente entre los inversores
- El Gestor notificará a los inversores con al menos 90 días de anticipación antes de cualquier disolución planificada

12. MODIFICACIONES
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores
- Las modificaciones materialmente adversas requieren el consentimiento de la mayoría de los inversores (más del 50%)
- Los cambios se comunicarán con al menos 30 días de anticipación a través de la plataforma y por correo electrónico

13. PROTECCIÓN DE DATOS
- El Gestor procesará los datos personales de los inversores de acuerdo con las leyes de protección de datos aplicables
- Los datos se utilizarán únicamente para los fines relacionados con la gestión del Fondo
- Los inversores tienen derecho a acceder, rectificar y eliminar sus datos personales según la legislación aplicable

14. CONTACTO Y COMUNICACIONES
Para consultas sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de:
- Plataforma oficial: www.afiste.com
- Email: support@afiste.com
- Los comunicados oficiales se realizarán a través de la plataforma y por correo electrónico registrado

Fecha de vigencia: Marzo 2023
Última actualización: Marzo 2023`,
      currentNav: new Prisma.Decimal(1.35), // NAV $1.35 per token
      documents: {
        prospectus: 'https://example.com/sequoia-prospectus.pdf',
        terms: 'https://example.com/sequoia-terms.pdf',
      },
    },
  });

  // Create currency for Sequoia Fund
  const sequoiaCurrency = await prisma.currency.upsert({
    where: { id: 'vc-sequoia' },
    update: {},
    create: {
      id: 'vc-sequoia',
      code: 'vc-sequoia',
      name: 'Sequoia Capital Partners Token',
      symbol: 'SEQ',
      precision: 8,
      type: 'coin',
      visible: true,
      depositFee: 0,
      withdrawFee: 0,
      minDepositAmount: new Prisma.Decimal(0),
      minWithdrawAmount: new Prisma.Decimal(0),
      vcFundId: sequoiaFund.id,
      vcFundName: sequoiaFund.name,
      vcFundDescription: sequoiaFund.description,
      vcFundManager: sequoiaFund.manager,
      vcFundSize: sequoiaFund.fundSize,
      vcFundLaunchDate: sequoiaFund.launchDate,
      vcFundMaturityDate: sequoiaFund.maturityDate,
      vcFundMinimumInvestment: sequoiaFund.minimumInvestment,
      vcFundTotalSupply: sequoiaFund.totalSupply,
      vcFundAvailableSupply: sequoiaFund.availableSupply,
      vcFundStatus: sequoiaFund.status,
      vcFundRiskLevel: sequoiaFund.riskLevel,
      vcFundRegulatoryStatus: sequoiaFund.regulatoryStatus,
    },
  });

  // Create portfolio companies for Sequoia
  await prisma.vCFundPortfolioCompany.createMany({
    data: [
      {
        vcFundId: sequoiaFund.id,
        name: 'Apple',
        sector: 'Technology',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(150000),
        investmentDate: new Date('1978-01-01'),
        currentValuation: new Prisma.Decimal(500000000000), // $500B (reduced from $3T)
        ownershipPercentage: new Prisma.Decimal(0.001),
        description: 'Empresa tecnológica multinacional que diseña y fabrica productos electrónicos',
      },
      {
        vcFundId: sequoiaFund.id,
        name: 'Google',
        sector: 'Technology',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(25000000),
        investmentDate: new Date('1999-01-01'),
        currentValuation: new Prisma.Decimal(300000000000), // $300B (reduced from $1.5T)
        ownershipPercentage: new Prisma.Decimal(0.05),
        description: 'Empresa de tecnología especializada en servicios y productos relacionados con Internet',
      },
      {
        vcFundId: sequoiaFund.id,
        name: 'WhatsApp',
        sector: 'Social Media',
        stage: 'Acquired',
        investmentAmount: new Prisma.Decimal(8000000),
        investmentDate: new Date('2011-01-01'),
        currentValuation: new Prisma.Decimal(19000000000),
        ownershipPercentage: new Prisma.Decimal(20.0),
        description: 'Aplicación de mensajería instantánea multiplataforma',
      },
      {
        vcFundId: sequoiaFund.id,
        name: 'Instagram',
        sector: 'Social Media',
        stage: 'Acquired',
        investmentAmount: new Prisma.Decimal(50000000),
        investmentDate: new Date('2011-01-01'),
        currentValuation: new Prisma.Decimal(100000000000),
        ownershipPercentage: new Prisma.Decimal(15.0),
        description: 'Plataforma de redes sociales para compartir fotos y videos',
      },
      {
        vcFundId: sequoiaFund.id,
        name: 'Zoom',
        sector: 'SaaS',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(3000000),
        investmentDate: new Date('2011-01-01'),
        currentValuation: new Prisma.Decimal(20000000000),
        ownershipPercentage: new Prisma.Decimal(8.0),
        description: 'Plataforma de videoconferencias y comunicaciones',
      },
      {
        vcFundId: sequoiaFund.id,
        name: 'LinkedIn',
        sector: 'Social Media',
        stage: 'Acquired',
        investmentAmount: new Prisma.Decimal(4700000),
        investmentDate: new Date('2003-01-01'),
        currentValuation: new Prisma.Decimal(26000000000),
        ownershipPercentage: new Prisma.Decimal(18.0),
        description: 'Red social profesional y plataforma de networking',
      },
    ],
    skipDuplicates: true,
  });

  await createPerformanceRecords(sequoiaFund.id, 1.0, 1.35, 1000000000);
  console.log('VC Fund 2 (Sequoia Capital) created');

  // 6. Create VC Fund 3: Andreessen Horowitz (a16z) Fund
  console.log('Creating VC Fund 3: Andreessen Horowitz...');
  const a16zFund = await prisma.vCFund.upsert({
    where: { id: 'a16z-fund-001' },
    update: {
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - ANDREESSEN HOROWITZ VENTURES I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Andreessen Horowitz Ventures I (el "Fondo"), gestionado por Andreessen Horowitz (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones en su totalidad.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $2,500 USD
- Inversión máxima: Sin límite superior, sujeto a disponibilidad de tokens
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable
- Se requiere verificación de identidad (KYC) completa y cumplimiento de normas AML/CFT
- Los inversores deben proporcionar documentación financiera que demuestre su elegibilidad

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 15 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos, retirados o utilizados como garantía
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma, sujeto a disponibilidad de liquidez
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento (Septiembre 2023 - Septiembre 2033)
- La liquidez en el mercado secundario no está garantizada y depende de la disponibilidad de compradores
- El Gestor puede establecer períodos de bloqueo adicionales para inversiones específicas

4. ESTRUCTURA DE COMISIONES Y GASTOS
- Comisión de gestión: 2.5% anual sobre el patrimonio neto del Fondo, calculada trimestralmente
- Comisión de éxito: 20% sobre las ganancias realizadas netas, aplicable solo en caso de distribuciones positivas después de recuperar el capital invertido
- Las comisiones se calculan y cobran trimestralmente, deducidas del patrimonio neto del Fondo
- Gastos operativos: Los gastos operativos del Fondo (auditorías, servicios legales, tecnología, etc.) se deducen del patrimonio neto antes del cálculo de comisiones
- Gastos de transacción: Los costos de transacción de blockchain, gas fees y comisiones de intercambio se deducen de las operaciones individuales
- Gastos de organización: Los costos iniciales de organización del Fondo se amortizan durante los primeros 3 años

5. DISTRIBUCIÓN DE RETORNOS Y GANANCIAS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo, medida en tokens
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas de participaciones, IPOs, adquisiciones, dividendos)
- Los retornos se pagarán en USD (USDT) a través de la plataforma, después de deducir comisiones y gastos
- El cálculo de retornos se basa en el NAV (Valor Neto de Activos) del Fondo, determinado trimestralmente
- Las distribuciones se realizarán dentro de los 90 días posteriores a la realización de ganancias
- Los inversores recibirán un estado de cuenta detallado con cada distribución

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido. No hay garantía de retorno del capital.
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables, especialmente durante el período de bloqueo. El mercado secundario puede tener liquidez limitada.
- Volatilidad: El valor de los tokens puede fluctuar significativamente basado en el desempeño del portafolio, condiciones de mercado y factores externos.
- Riesgo regulatorio: Los cambios en la regulación de valores, criptomonedas y tecnología blockchain pueden afectar adversamente el valor y la operación del Fondo.
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores (tecnología, redes sociales), geografías o empresas, aumentando el riesgo de pérdidas.
- Riesgo tecnológico: Los riesgos asociados con la tecnología blockchain, contratos inteligentes, hackeos, pérdida de claves y fallos técnicos.
- Riesgo de contraparte: Riesgo asociado con las empresas del portafolio, sus operaciones, gestión y capacidad de generar retornos.
- Riesgo de mercado: Factores macroeconómicos, condiciones de mercado, tasas de interés y volatilidad general pueden afectar el valor del Fondo.

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo, incluyendo informes trimestrales y estados financieros
- Los inversores tienen derecho a acceder a información sobre las inversiones del portafolio, sujeto a acuerdos de confidencialidad
- Los inversores deben mantener la confidencialidad estricta de toda la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo, que son responsabilidad exclusiva del Gestor
- Los inversores deben cumplir con todas las obligaciones legales, regulatorias y fiscales aplicables en su jurisdicción
- Los inversores deben notificar inmediatamente cualquier cambio en su situación financiera, regulatoria o legal que pueda afectar su elegibilidad
- Los inversores son responsables de mantener la seguridad de sus credenciales de acceso y wallets
- Los inversores deben proporcionar información precisa y actualizada cuando sea requerida

8. GESTIÓN DEL FONDO Y DEBERES FIDUCIARIOS
- El Gestor tiene discreción completa sobre las decisiones de inversión dentro de los parámetros establecidos en el documento de oferta
- El Gestor debe actuar en el mejor interés de los inversores y cumplir con los más altos estándares de deberes fiduciarios
- El Gestor proporcionará informes trimestrales detallados sobre el desempeño del Fondo, incluyendo NAV, inversiones realizadas y eventos relevantes
- Cualquier cambio material en la estrategia de inversión, objetivos o políticas será comunicado a los inversores con al menos 60 días de anticipación
- El Gestor mantendrá registros completos y precisos de todas las transacciones, decisiones de inversión y comunicaciones con inversores
- El Gestor debe mantener seguros los activos del Fondo y cumplir con todas las regulaciones de custodia aplicables

9. TOKENIZACIÓN Y TECNOLOGÍA BLOCKCHAIN
- Los tokens representan una participación fraccionada en el Fondo y otorgan derechos económicos pero no derechos de voto o control
- Los tokens se emiten, transfieren y gestionan mediante tecnología blockchain (Ethereum o la red especificada)
- El inversor es el único responsable de la seguridad de su wallet, claves privadas, frases semilla y cualquier dispositivo utilizado para acceder a sus tokens
- El Fondo y el Gestor no son responsables de pérdidas debido a errores del usuario, hackeos, pérdida de claves, phishing o cualquier otro incidente de seguridad
- Las transacciones en blockchain son irreversibles una vez confirmadas en la red
- El Gestor no puede recuperar tokens perdidos o transferidos incorrectamente
- Los inversores deben utilizar wallets compatibles y seguir las mejores prácticas de seguridad

10. DISPOSICIONES LEGALES Y REGULATORIAS
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo, según se especifica en el documento de oferta
- El Fondo cumple con todas las regulaciones de valores, criptomonedas y tecnología financiera aplicables
- Cualquier disputa, controversia o reclamo relacionado con estos términos se resolverá mediante arbitraje vinculante según las reglas establecidas
- Los inversores deben cumplir con todas las leyes de prevención de lavado de dinero (AML), lucha contra el financiamiento del terrorismo (CFT) y sanciones aplicables
- El Fondo se reserva el derecho de rechazar, suspender o terminar inversiones que no cumplan con los requisitos regulatorios o que representen un riesgo de cumplimiento
- Los inversores son responsables de cumplir con todas las obligaciones fiscales en su jurisdicción relacionadas con sus inversiones en el Fondo

11. TERMINACIÓN Y DISOLUCIÓN DEL FONDO
- El Fondo puede ser disuelto al finalizar el período de 10 años o antes por decisión del Gestor, sujeto a las disposiciones del documento de oferta
- En caso de disolución, los activos del Fondo se liquidarán de manera ordenada y se distribuirán proporcionalmente entre los inversores después de pagar todas las deudas, comisiones y gastos
- El Gestor notificará a los inversores con al menos 90 días de anticipación antes de cualquier disolución planificada
- Los inversores no tienen derecho a solicitar la disolución anticipada del Fondo, excepto en circunstancias excepcionales definidas en el documento de oferta

12. MODIFICACIONES DE LOS TÉRMINOS
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores, sujeto a las restricciones legales y regulatorias aplicables
- Las modificaciones materialmente adversas para los inversores requieren el consentimiento de la mayoría de los inversores (más del 50% del capital comprometido)
- Los cambios se comunicarán con al menos 30 días de anticipación a través de la plataforma, por correo electrónico y mediante notificación en el sitio web oficial
- Los inversores que no estén de acuerdo con modificaciones materialmente adversas pueden solicitar el retiro de su inversión según los procedimientos establecidos

13. PROTECCIÓN DE DATOS PERSONALES
- El Gestor procesará los datos personales de los inversores de acuerdo con las leyes de protección de datos aplicables (GDPR, CCPA, etc.)
- Los datos se utilizarán únicamente para los fines relacionados con la gestión del Fondo, cumplimiento regulatorio y comunicación con inversores
- Los inversores tienen derecho a acceder, rectificar, eliminar y portar sus datos personales según la legislación aplicable
- El Gestor implementará medidas de seguridad apropiadas para proteger los datos personales contra acceso no autorizado, pérdida o destrucción
- Los datos pueden ser compartidos con proveedores de servicios, reguladores y autoridades cuando sea legalmente requerido

14. LIMITACIÓN DE RESPONSABILIDAD
- El Gestor no será responsable de pérdidas resultantes de factores fuera de su control razonable, incluyendo pero no limitado a: cambios regulatorios, eventos de mercado, fallos tecnológicos, actos de terceros
- La responsabilidad total del Gestor está limitada al monto de las comisiones recibidas, excepto en casos de fraude, negligencia grave o incumplimiento intencional
- Los inversores reconocen que las inversiones en capital de riesgo son inherentemente riesgosas y aceptan estos riesgos

15. CONTACTO Y COMUNICACIONES OFICIALES
Para consultas, reclamos o comunicaciones sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de:
- Plataforma oficial: www.afiste.com
- Email: support@afiste.com / legal@afiste.com
- Dirección postal: [Dirección oficial del Gestor]
- Los comunicados oficiales, notificaciones y actualizaciones se realizarán a través de la plataforma y por correo electrónico al registro del inversor
- Es responsabilidad del inversor mantener actualizada su información de contacto

16. ACEPTACIÓN DE TÉRMINOS
Al realizar una inversión en el Fondo, el inversor confirma que:
- Ha leído, entendido y acepta estos términos y condiciones en su totalidad
- Ha recibido y revisado el documento de oferta completo y cualquier material adicional
- Ha consultado con asesores legales, fiscales y financieros según considere apropiado
- Comprende los riesgos asociados con la inversión en capital de riesgo
- Tiene la capacidad financiera para asumir una pérdida total de su inversión
- Cumple con todos los requisitos de elegibilidad para invertir en el Fondo

Fecha de vigencia: Septiembre 2023
Última actualización: Septiembre 2023
Versión: 1.0`,
    },
    create: {
      id: 'a16z-fund-001',
      name: 'Andreessen Horowitz Ventures I',
      description: 'Fondo tokenizado de Andreessen Horowitz (a16z), reconocido por inversiones en tecnología de vanguardia. Portfolio incluye Facebook, Twitter, GitHub, Slack, Coinbase y más.',
      manager: 'Andreessen Horowitz',
      totalSupply: new Prisma.Decimal(8000000), // 8M tokens
      availableSupply: new Prisma.Decimal(2500000), // 2.5M available
      fundSize: new Prisma.Decimal(800000000), // $800M fund
      minimumInvestment: new Prisma.Decimal(2500), // $2.5k minimum
      launchDate: new Date('2023-09-01'),
      maturityDate: new Date('2033-09-01'),
      status: 'active',
      riskLevel: 'medium',
      regulatoryStatus: 'approved',
      terms: `TÉRMINOS Y CONDICIONES DEL FONDO - ANDREESSEN HOROWITZ VENTURES I

1. INFORMACIÓN GENERAL DEL FONDO
El presente documento establece los términos y condiciones que rigen la inversión en el Fondo Andreessen Horowitz Ventures I (el "Fondo"), gestionado por Andreessen Horowitz (el "Gestor"). Al realizar una inversión en este Fondo, el inversor acepta estar sujeto a estos términos y condiciones en su totalidad.

2. REQUISITOS DE INVERSIÓN
- Inversión mínima: $2,500 USD
- Inversión máxima: Sin límite superior, sujeto a disponibilidad de tokens
- Moneda de inversión: USD (USDT)
- Los inversores deben cumplir con los requisitos de inversor acreditado según la legislación aplicable
- Se requiere verificación de identidad (KYC) completa y cumplimiento de normas AML/CFT
- Los inversores deben proporcionar documentación financiera que demuestre su elegibilidad

3. PERÍODO DE BLOQUEO Y LIQUIDEZ
- Período de bloqueo inicial: 15 meses desde la fecha de inversión
- Durante el período de bloqueo, los tokens no pueden ser transferidos, vendidos, retirados o utilizados como garantía
- Después del período de bloqueo, los tokens pueden ser negociados en el mercado secundario disponible en la plataforma, sujeto a disponibilidad de liquidez
- El Fondo tiene una duración prevista de 10 años desde la fecha de lanzamiento (Septiembre 2023 - Septiembre 2033)
- La liquidez en el mercado secundario no está garantizada y depende de la disponibilidad de compradores
- El Gestor puede establecer períodos de bloqueo adicionales para inversiones específicas

4. ESTRUCTURA DE COMISIONES Y GASTOS
- Comisión de gestión: 2.5% anual sobre el patrimonio neto del Fondo, calculada trimestralmente
- Comisión de éxito: 20% sobre las ganancias realizadas netas, aplicable solo en caso de distribuciones positivas después de recuperar el capital invertido
- Las comisiones se calculan y cobran trimestralmente, deducidas del patrimonio neto del Fondo
- Gastos operativos: Los gastos operativos del Fondo (auditorías, servicios legales, tecnología, etc.) se deducen del patrimonio neto antes del cálculo de comisiones
- Gastos de transacción: Los costos de transacción de blockchain, gas fees y comisiones de intercambio se deducen de las operaciones individuales
- Gastos de organización: Los costos iniciales de organización del Fondo se amortizan durante los primeros 3 años

5. DISTRIBUCIÓN DE RETORNOS Y GANANCIAS
- Los retornos se distribuyen proporcionalmente según la participación de cada inversor en el Fondo, medida en tokens
- Las distribuciones se realizarán cuando haya eventos de liquidez (ventas de participaciones, IPOs, adquisiciones, dividendos)
- Los retornos se pagarán en USD (USDT) a través de la plataforma, después de deducir comisiones y gastos
- El cálculo de retornos se basa en el NAV (Valor Neto de Activos) del Fondo, determinado trimestralmente
- Las distribuciones se realizarán dentro de los 90 días posteriores a la realización de ganancias
- Los inversores recibirán un estado de cuenta detallado con cada distribución

6. RIESGOS DE LA INVERSIÓN
- Riesgo de pérdida total: La inversión en capital de riesgo conlleva el riesgo de pérdida total del capital invertido. No hay garantía de retorno del capital.
- Falta de liquidez: Los activos del Fondo pueden no ser fácilmente liquidables, especialmente durante el período de bloqueo. El mercado secundario puede tener liquidez limitada.
- Volatilidad: El valor de los tokens puede fluctuar significativamente basado en el desempeño del portafolio, condiciones de mercado y factores externos.
- Riesgo regulatorio: Los cambios en la regulación de valores, criptomonedas y tecnología blockchain pueden afectar adversamente el valor y la operación del Fondo.
- Riesgo de concentración: El Fondo puede tener concentración en ciertos sectores (tecnología, redes sociales), geografías o empresas, aumentando el riesgo de pérdidas.
- Riesgo tecnológico: Los riesgos asociados con la tecnología blockchain, contratos inteligentes, hackeos, pérdida de claves y fallos técnicos.
- Riesgo de contraparte: Riesgo asociado con las empresas del portafolio, sus operaciones, gestión y capacidad de generar retornos.
- Riesgo de mercado: Factores macroeconómicos, condiciones de mercado, tasas de interés y volatilidad general pueden afectar el valor del Fondo.

7. DERECHOS Y OBLIGACIONES DEL INVERSOR
- Los inversores tienen derecho a recibir información periódica sobre el desempeño del Fondo, incluyendo informes trimestrales y estados financieros
- Los inversores tienen derecho a acceder a información sobre las inversiones del portafolio, sujeto a acuerdos de confidencialidad
- Los inversores deben mantener la confidencialidad estricta de toda la información proporcionada por el Gestor
- Los inversores no tienen derecho a participar en las decisiones de inversión del Fondo, que son responsabilidad exclusiva del Gestor
- Los inversores deben cumplir con todas las obligaciones legales, regulatorias y fiscales aplicables en su jurisdicción
- Los inversores deben notificar inmediatamente cualquier cambio en su situación financiera, regulatoria o legal que pueda afectar su elegibilidad
- Los inversores son responsables de mantener la seguridad de sus credenciales de acceso y wallets
- Los inversores deben proporcionar información precisa y actualizada cuando sea requerida

8. GESTIÓN DEL FONDO Y DEBERES FIDUCIARIOS
- El Gestor tiene discreción completa sobre las decisiones de inversión dentro de los parámetros establecidos en el documento de oferta
- El Gestor debe actuar en el mejor interés de los inversores y cumplir con los más altos estándares de deberes fiduciarios
- El Gestor proporcionará informes trimestrales detallados sobre el desempeño del Fondo, incluyendo NAV, inversiones realizadas y eventos relevantes
- Cualquier cambio material en la estrategia de inversión, objetivos o políticas será comunicado a los inversores con al menos 60 días de anticipación
- El Gestor mantendrá registros completos y precisos de todas las transacciones, decisiones de inversión y comunicaciones con inversores
- El Gestor debe mantener seguros los activos del Fondo y cumplir con todas las regulaciones de custodia aplicables

9. TOKENIZACIÓN Y TECNOLOGÍA BLOCKCHAIN
- Los tokens representan una participación fraccionada en el Fondo y otorgan derechos económicos pero no derechos de voto o control
- Los tokens se emiten, transfieren y gestionan mediante tecnología blockchain (Ethereum o la red especificada)
- El inversor es el único responsable de la seguridad de su wallet, claves privadas, frases semilla y cualquier dispositivo utilizado para acceder a sus tokens
- El Fondo y el Gestor no son responsables de pérdidas debido a errores del usuario, hackeos, pérdida de claves, phishing o cualquier otro incidente de seguridad
- Las transacciones en blockchain son irreversibles una vez confirmadas en la red
- El Gestor no puede recuperar tokens perdidos o transferidos incorrectamente
- Los inversores deben utilizar wallets compatibles y seguir las mejores prácticas de seguridad

10. DISPOSICIONES LEGALES Y REGULATORIAS
- Estos términos se rigen por las leyes aplicables en la jurisdicción del Fondo, según se especifica en el documento de oferta
- El Fondo cumple con todas las regulaciones de valores, criptomonedas y tecnología financiera aplicables
- Cualquier disputa, controversia o reclamo relacionado con estos términos se resolverá mediante arbitraje vinculante según las reglas establecidas
- Los inversores deben cumplir con todas las leyes de prevención de lavado de dinero (AML), lucha contra el financiamiento del terrorismo (CFT) y sanciones aplicables
- El Fondo se reserva el derecho de rechazar, suspender o terminar inversiones que no cumplan con los requisitos regulatorios o que representen un riesgo de cumplimiento
- Los inversores son responsables de cumplir con todas las obligaciones fiscales en su jurisdicción relacionadas con sus inversiones en el Fondo

11. TERMINACIÓN Y DISOLUCIÓN DEL FONDO
- El Fondo puede ser disuelto al finalizar el período de 10 años o antes por decisión del Gestor, sujeto a las disposiciones del documento de oferta
- En caso de disolución, los activos del Fondo se liquidarán de manera ordenada y se distribuirán proporcionalmente entre los inversores después de pagar todas las deudas, comisiones y gastos
- El Gestor notificará a los inversores con al menos 90 días de anticipación antes de cualquier disolución planificada
- Los inversores no tienen derecho a solicitar la disolución anticipada del Fondo, excepto en circunstancias excepcionales definidas en el documento de oferta

12. MODIFICACIONES DE LOS TÉRMINOS
- El Gestor se reserva el derecho de modificar estos términos con previo aviso a los inversores, sujeto a las restricciones legales y regulatorias aplicables
- Las modificaciones materialmente adversas para los inversores requieren el consentimiento de la mayoría de los inversores (más del 50% del capital comprometido)
- Los cambios se comunicarán con al menos 30 días de anticipación a través de la plataforma, por correo electrónico y mediante notificación en el sitio web oficial
- Los inversores que no estén de acuerdo con modificaciones materialmente adversas pueden solicitar el retiro de su inversión según los procedimientos establecidos

13. PROTECCIÓN DE DATOS PERSONALES
- El Gestor procesará los datos personales de los inversores de acuerdo con las leyes de protección de datos aplicables (GDPR, CCPA, etc.)
- Los datos se utilizarán únicamente para los fines relacionados con la gestión del Fondo, cumplimiento regulatorio y comunicación con inversores
- Los inversores tienen derecho a acceder, rectificar, eliminar y portar sus datos personales según la legislación aplicable
- El Gestor implementará medidas de seguridad apropiadas para proteger los datos personales contra acceso no autorizado, pérdida o destrucción
- Los datos pueden ser compartidos con proveedores de servicios, reguladores y autoridades cuando sea legalmente requerido

14. LIMITACIÓN DE RESPONSABILIDAD
- El Gestor no será responsable de pérdidas resultantes de factores fuera de su control razonable, incluyendo pero no limitado a: cambios regulatorios, eventos de mercado, fallos tecnológicos, actos de terceros
- La responsabilidad total del Gestor está limitada al monto de las comisiones recibidas, excepto en casos de fraude, negligencia grave o incumplimiento intencional
- Los inversores reconocen que las inversiones en capital de riesgo son inherentemente riesgosas y aceptan estos riesgos

15. CONTACTO Y COMUNICACIONES OFICIALES
Para consultas, reclamos o comunicaciones sobre estos términos y condiciones, los inversores pueden contactar al Gestor a través de:
- Plataforma oficial: www.afiste.com
- Email: support@afiste.com / legal@afiste.com
- Dirección postal: [Dirección oficial del Gestor]
- Los comunicados oficiales, notificaciones y actualizaciones se realizarán a través de la plataforma y por correo electrónico al registro del inversor
- Es responsabilidad del inversor mantener actualizada su información de contacto

16. ACEPTACIÓN DE TÉRMINOS
Al realizar una inversión en el Fondo, el inversor confirma que:
- Ha leído, entendido y acepta estos términos y condiciones en su totalidad
- Ha recibido y revisado el documento de oferta completo y cualquier material adicional
- Ha consultado con asesores legales, fiscales y financieros según considere apropiado
- Comprende los riesgos asociados con la inversión en capital de riesgo
- Tiene la capacidad financiera para asumir una pérdida total de su inversión
- Cumple con todos los requisitos de elegibilidad para invertir en el Fondo

Fecha de vigencia: Septiembre 2023
Última actualización: Septiembre 2023
Versión: 1.0`,
      currentNav: new Prisma.Decimal(1.22), // NAV $1.22 per token
      documents: {
        prospectus: 'https://example.com/a16z-prospectus.pdf',
        terms: 'https://example.com/a16z-terms.pdf',
      },
    },
  });

  // Create currency for a16z Fund
  const a16zCurrency = await prisma.currency.upsert({
    where: { id: 'vc-a16z' },
    update: {},
    create: {
      id: 'vc-a16z',
      code: 'vc-a16z',
      name: 'Andreessen Horowitz Ventures Token',
      symbol: 'A16Z',
      precision: 8,
      type: 'coin',
      visible: true,
      depositFee: 0,
      withdrawFee: 0,
      minDepositAmount: new Prisma.Decimal(0),
      minWithdrawAmount: new Prisma.Decimal(0),
      vcFundId: a16zFund.id,
      vcFundName: a16zFund.name,
      vcFundDescription: a16zFund.description,
      vcFundManager: a16zFund.manager,
      vcFundSize: a16zFund.fundSize,
      vcFundLaunchDate: a16zFund.launchDate,
      vcFundMaturityDate: a16zFund.maturityDate,
      vcFundMinimumInvestment: a16zFund.minimumInvestment,
      vcFundTotalSupply: a16zFund.totalSupply,
      vcFundAvailableSupply: a16zFund.availableSupply,
      vcFundStatus: a16zFund.status,
      vcFundRiskLevel: a16zFund.riskLevel,
      vcFundRegulatoryStatus: a16zFund.regulatoryStatus,
    },
  });

  // Create portfolio companies for a16z
  await prisma.vCFundPortfolioCompany.createMany({
    data: [
      {
        vcFundId: a16zFund.id,
        name: 'Facebook (Meta)',
        sector: 'Social Media',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(50000000),
        investmentDate: new Date('2010-01-01'),
        currentValuation: new Prisma.Decimal(400000000000), // $400B (reduced from $800B)
        ownershipPercentage: new Prisma.Decimal(0.08),
        description: 'Plataforma de redes sociales y tecnología de realidad virtual',
      },
      {
        vcFundId: a16zFund.id,
        name: 'Twitter',
        sector: 'Social Media',
        stage: 'Private',
        investmentAmount: new Prisma.Decimal(80000000),
        investmentDate: new Date('2011-01-01'),
        currentValuation: new Prisma.Decimal(44000000000),
        ownershipPercentage: new Prisma.Decimal(0.12),
        description: 'Plataforma de microblogging y redes sociales',
      },
      {
        vcFundId: a16zFund.id,
        name: 'GitHub',
        sector: 'Developer Tools',
        stage: 'Acquired',
        investmentAmount: new Prisma.Decimal(100000000),
        investmentDate: new Date('2012-01-01'),
        currentValuation: new Prisma.Decimal(7500000000),
        ownershipPercentage: new Prisma.Decimal(0.15),
        description: 'Plataforma de desarrollo colaborativo y control de versiones',
      },
      {
        vcFundId: a16zFund.id,
        name: 'Slack',
        sector: 'SaaS',
        stage: 'Acquired',
        investmentAmount: new Prisma.Decimal(80000000),
        investmentDate: new Date('2014-01-01'),
        currentValuation: new Prisma.Decimal(27700000000),
        ownershipPercentage: new Prisma.Decimal(0.10),
        description: 'Plataforma de comunicación empresarial y colaboración',
      },
      {
        vcFundId: a16zFund.id,
        name: 'Coinbase',
        sector: 'Cryptocurrency',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(25000000),
        investmentDate: new Date('2013-01-01'),
        currentValuation: new Prisma.Decimal(50000000000),
        ownershipPercentage: new Prisma.Decimal(0.06),
        description: 'Intercambio de criptomonedas y servicios financieros digitales',
      },
      {
        vcFundId: a16zFund.id,
        name: 'Pinterest',
        sector: 'Social Media',
        stage: 'Public',
        investmentAmount: new Prisma.Decimal(50000000),
        investmentDate: new Date('2012-01-01'),
        currentValuation: new Prisma.Decimal(18000000000),
        ownershipPercentage: new Prisma.Decimal(0.08),
        description: 'Plataforma de descubrimiento visual e inspiración',
      },
    ],
    skipDuplicates: true,
  });

  await createPerformanceRecords(a16zFund.id, 1.0, 1.22, 800000000);
  console.log('VC Fund 3 (Andreessen Horowitz) created');

  // 7. Create markets
  console.log('Creating markets...');
  await prisma.market.upsert({
    where: {
      baseUnit_quoteUnit: {
        baseUnit: ycCurrency.id,
        quoteUnit: usdt.id,
      },
    },
    update: {},
    create: {
      id: 'vc-yc-usdt',
      baseUnit: ycCurrency.id,
      quoteUnit: usdt.id,
      amountPrecision: 4,
      pricePrecision: 4,
      minPrice: new Prisma.Decimal(0.0001),
      maxPrice: new Prisma.Decimal(1000.0),
      minAmount: new Prisma.Decimal(0.0001),
      position: 1,
      state: 'active',
      type: 'spot',
      vcFundId: ycFund.id,
      initialOfferingPrice: new Prisma.Decimal(1.0),
      currentNav: ycFund.currentNav,
    },
  });

  await prisma.market.upsert({
    where: {
      baseUnit_quoteUnit: {
        baseUnit: sequoiaCurrency.id,
        quoteUnit: usdt.id,
      },
    },
    update: {},
    create: {
      id: 'vc-sequoia-usdt',
      baseUnit: sequoiaCurrency.id,
      quoteUnit: usdt.id,
      amountPrecision: 4,
      pricePrecision: 4,
      minPrice: new Prisma.Decimal(0.0001),
      maxPrice: new Prisma.Decimal(1000.0),
      minAmount: new Prisma.Decimal(0.0001),
      position: 2,
      state: 'active',
      type: 'spot',
      vcFundId: sequoiaFund.id,
      initialOfferingPrice: new Prisma.Decimal(1.0),
      currentNav: sequoiaFund.currentNav,
    },
  });

  await prisma.market.upsert({
    where: {
      baseUnit_quoteUnit: {
        baseUnit: a16zCurrency.id,
        quoteUnit: usdt.id,
      },
    },
    update: {},
    create: {
      id: 'vc-a16z-usdt',
      baseUnit: a16zCurrency.id,
      quoteUnit: usdt.id,
      amountPrecision: 4,
      pricePrecision: 4,
      minPrice: new Prisma.Decimal(0.0001),
      maxPrice: new Prisma.Decimal(1000.0),
      minAmount: new Prisma.Decimal(0.0001),
      position: 3,
      state: 'active',
      type: 'spot',
      vcFundId: a16zFund.id,
      initialOfferingPrice: new Prisma.Decimal(1.0),
      currentNav: a16zFund.currentNav,
    },
  });

  console.log('Markets created');

  console.log('Database seed completed successfully!');
  console.log('\nTest Credentials:');
  console.log('   Admin: admin@afiste.com / admin123');
  console.log('   Investor: investor@afiste.com / investor123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

