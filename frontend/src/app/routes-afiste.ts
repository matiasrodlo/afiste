// Afiste Routes - Add these to the main routes.ts file

export const AFISTE_ROUTES = {
  marketplace: '/marketplace',
  fundDetail: '/funds/:id',
  fundInvest: '/funds/:id/invest',
  dashboard: '/dashboard',
  adminVCFunds: '/admin/vc-funds',
};

// Add to ROUTES_WITH_LANG if needed
export const AFISTE_ROUTES_WITH_LANG = [
  AFISTE_ROUTES.marketplace,
  AFISTE_ROUTES.fundDetail,
  AFISTE_ROUTES.fundInvest,
  AFISTE_ROUTES.dashboard,
].map((route) => `/:lang${route}`);

