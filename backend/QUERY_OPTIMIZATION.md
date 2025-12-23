# Query Optimizations

Some optimizations we did to fix slow queries.

## Fixed N+1 Queries

Was doing this (bad):
```typescript
for (const account of vcAccounts) {
  const fund = await prisma.vCFund.findUnique({ where: { id: account.currency.vcFundId } });
}
```

Now doing this (good):
```typescript
const fundIds = vcAccounts.map(acc => acc.currency.vcFundId).filter(Boolean);
const funds = await prisma.vCFund.findMany({ where: { id: { in: fundIds } } });
const fundMap = new Map(funds.map(fund => [fund.id, fund]));
```

## Indexes Added

Added indexes for common queries:
- `orders_market_side_state_idx` - for order book
- `trades_market_date_idx` - for trade history
- `orders_user_created_idx` - for user orders
- `token_offerings_status_start_idx` - for active offerings
- `kyc_documents_user_status_idx` - for KYC reviews

## Tips

- Use `select` instead of `include` when you only need specific fields
- Batch queries instead of loops
- Add indexes for frequently queried fields
- Use transactions for related operations

