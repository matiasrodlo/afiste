const MINIMUM_INVESTMENT = 100.0; // USD minimum
const MAX_INVESTMENT_PER_USER = 1_000_000.0; // USD maximum per user
const MIN_KYC_LEVEL = 1; // Minimum KYC level required

export class VCInvestmentValidator {
  static validate(user: any, fund: any, amount: number): string[] {
    const errors: string[] = [];

    // Validate KYC
    if (user.kycLevel < MIN_KYC_LEVEL) {
      errors.push(
        `KYC level insufficient. Required: ${MIN_KYC_LEVEL}, Current: ${user.kycLevel}`
      );
    }

    if (user.kycStatus !== 'verified') {
      errors.push(`KYC verification required. Current status: ${user.kycStatus}`);
    }

    // Validate minimum investment
    const minimumInvestment = Number(fund.minimumInvestment);
    if (amount < minimumInvestment) {
      errors.push(`Amount below minimum investment. Minimum: ${minimumInvestment} USD`);
    }

    // Validate maximum investment per user
    // Note: Total investment validation is handled at the service layer
    // where account balances and transaction history can be properly queried

    // Validate fund status
    if (fund.status !== 'active') {
      errors.push(`Fund is not active. Current status: ${fund.status}`);
    }

    if (fund.regulatoryStatus !== 'approved') {
      errors.push(`Fund not approved. Current status: ${fund.regulatoryStatus}`);
    }

    // Validate availability
    const currentNav = Number(fund.currentNav);
    const tokensNeeded = amount / currentNav;
    const availableSupply = Number(fund.availableSupply);
    if (tokensNeeded > availableSupply) {
      errors.push(
        `Insufficient tokens available. Available: ${availableSupply}, Needed: ${tokensNeeded}`
      );
    }

    return errors;
  }
}

