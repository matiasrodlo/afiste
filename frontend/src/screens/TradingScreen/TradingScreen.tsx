import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vcFundsAPI } from '../../api/vcFunds';
import { balancesAPI } from '../../api/balances';
import { authAPI } from '../../api/auth';
import { ordersAPI } from '../../api/orders';
import { marketsAPI } from '../../api/markets';
import { VCFund } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

interface OrderBookEntry {
  price: number;
  volume: number;
}

interface Trade {
  id: string;
  price: number;
  volume: number;
  funds: number;
  createdAt: string;
}

const TradingScreen: React.FC = () => {
  const { market } = useParams<{ market: string }>();
  const navigate = useNavigate();
  const [fund, setFund] = useState<VCFund | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [ordType, setOrdType] = useState<'limit' | 'market'>('limit');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [marketId, setMarketId] = useState<string>('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadMarketData();
    const interval = setInterval(() => {
      if (marketId) {
        loadOrderBook();
        loadTrades();
        loadUserOrders();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [market, navigate, marketId]);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      // Use market ID directly or construct it
      const marketId = market || `${market}-usdt`;
      setMarketId(marketId);

      // Try to get market data
      try {
        const marketData = await marketsAPI.getMarket(marketId);
        if (marketData.data?.vcFundId) {
          const fundResponse = await vcFundsAPI.getVCFund(marketData.data.vcFundId);
          setFund(fundResponse.data);
          setPrice(marketData.data.currentNav?.toString() || fundResponse.data.current_nav?.toString() || '1.0');
        }
      } catch (e) {
        // If market doesn't exist, try to extract fund ID
        const fundId = market?.split('-usdt')[0] || market?.split('-usdc')[0] || '';
        if (fundId) {
          const fundResponse = await vcFundsAPI.getVCFund(fundId);
          setFund(fundResponse.data);
          setPrice(fundResponse.data.current_nav?.toString() || '1.0');
        }
      }

      // Load user balance
      const quoteCurrency = market?.includes('usdt') ? 'usdt' : 'usdc';
      const balances = await balancesAPI.getBalances();
      const quoteBalance = balances.find(b => b.currency_id.toLowerCase() === quoteCurrency);
      setBalance(quoteBalance?.available || 0);

      // Load order book, trades, and user orders
      await loadOrderBook();
      await loadTrades();
      await loadUserOrders();
    } catch (err: any) {
      setError(err.message || 'Error loading market data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderBook = async () => {
    if (!marketId) return;
    try {
      const response = await marketsAPI.getOrderBook(marketId, 20);
      setOrderBook(response.data);
    } catch (err) {
      console.error('Error loading order book:', err);
    }
  };

  const loadTrades = async () => {
    if (!marketId) return;
    try {
      const response = await marketsAPI.getTrades(marketId, { limit: 20 });
      const tradesData = response.data || [];
      setTrades(tradesData);
      // Update last price and change
      if (tradesData.length > 0) {
        const latestTrade = tradesData[0];
        setLastPrice(latestTrade.price);
        // Calculate price change (simplified - compare with previous trade)
        if (tradesData.length > 1) {
          const previousPrice = tradesData[1].price;
          const change = ((latestTrade.price - previousPrice) / previousPrice) * 100;
          setPriceChange(change);
        }
      }
    } catch (err) {
      console.error('Error loading trades:', err);
    }
  };

  const loadUserOrders = async () => {
    if (!marketId) return;
    try {
      const response = await ordersAPI.getOrders({ market_id: marketId, state: 'wait', limit: 20 });
      setUserOrders(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error loading user orders:', err);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await ordersAPI.cancelOrder(orderId);
      await loadUserOrders();
      await loadOrderBook();
      await loadTrades();
    } catch (err: any) {
      setError(err.message || 'Error canceling order');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fund || !amount || !price) return;

    try {
      setSubmitting(true);
      setError(null);

      const amountNum = parseFloat(amount);
      const priceNum = parseFloat(price);
      const total = amountNum * priceNum;

      if (orderType === 'buy') {
        if (ordType === 'limit' && total > balance) {
          setError('Saldo insuficiente');
          return;
        }
      }

      // Create order via API
      const orderData: any = {
        market_id: marketId,
        side: orderType,
        ord_type: ordType,
        volume: amountNum,
      };

      if (ordType === 'limit') {
        orderData.price = priceNum;
      }

      const response = await ordersAPI.createOrder(orderData);
      
      if (response.data) {
        // Order created successfully - user will see confirmation via state/UI
        // Reset form
        setAmount('');
        setPrice(fund?.current_nav?.toString() || '1.0');
        // Reload data
        await loadOrderBook();
        await loadTrades();
        await loadUserOrders();
        await loadMarketData();
      }
    } catch (err: any) {
      setError(err.message || 'Error creating order');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = parseFloat(price) || 0;
    return (amountNum * priceNum).toFixed(2);
  };

  const setMaxAmount = () => {
    if (orderType === 'buy' && fund) {
      const maxAmount = balance / parseFloat(price || '1');
      setAmount(maxAmount.toFixed(4));
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando mercado...</div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Fondo no encontrado</div>
        <button
          style={styles.backButton}
          onClick={() => navigate('/marketplace')}
        >
          Volver al Marketplace
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/funds/${fund.id}`)}
        >
          ← Volver
        </button>
        <h1 style={styles.title}>Trading: {fund.name}</h1>
      </div>

      {/* Price Header */}
      <div style={styles.priceHeader}>
        <div style={styles.priceInfo}>
          <div style={styles.priceLabel}>Último Precio</div>
          <div style={{
            ...styles.priceValue,
            color: priceChange >= 0 ? afisteTheme.colors.secondary : afisteTheme.colors.accent
          }}>
            ${lastPrice > 0 ? lastPrice.toFixed(4) : (fund?.current_nav?.toFixed(4) || '0.0000')}
          </div>
          {priceChange !== 0 && (
            <div style={{
              ...styles.priceChange,
              color: priceChange >= 0 ? afisteTheme.colors.secondary : afisteTheme.colors.accent
            }}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          )}
        </div>
        <div style={styles.marketInfo}>
          <span style={styles.marketLabel}>Mercado:</span>
          <span style={styles.marketValue}>{marketId.toUpperCase()}</span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Fund Info Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.fundCard}>
            <h3 style={styles.fundName}>{fund.name}</h3>
            <div style={styles.fundInfo}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>NAV Actual:</span>
                <span style={styles.infoValue}>
                  ${fund.current_nav?.toFixed(4) || '0.0000'}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Gestor:</span>
                <span style={styles.infoValue}>{fund.manager}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Nivel de Riesgo:</span>
                <span style={styles.infoValue}>{fund.risk_level}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Estado:</span>
                <span style={styles.infoValue}>{fund.status}</span>
              </div>
            </div>
            <button
              style={styles.detailButton}
              onClick={() => navigate(`/funds/${fund.id}`)}
            >
              Ver Detalles Completos
            </button>
          </div>

          {/* Balance Info */}
          <div style={styles.balanceCard}>
            <h4 style={styles.balanceTitle}>Mi Balance</h4>
            <div style={styles.balanceInfo}>
              <div style={styles.balanceRow}>
                <span>USDT Disponible:</span>
                <span style={styles.balanceAmount}>
                  ${balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Interface */}
        <div style={styles.tradingArea}>
          {/* Main Trading Grid */}
          <div style={styles.tradingGrid}>
            {/* Left Column: Order Form & Active Orders */}
            <div style={styles.leftColumn}>
              {/* Order Type Tabs */}
              <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(orderType === 'buy' ? styles.tabActive : {}),
                backgroundColor: orderType === 'buy' ? afisteTheme.colors.secondary : 'transparent',
              }}
              onClick={() => setOrderType('buy')}
            >
              Comprar
            </button>
            <button
              style={{
                ...styles.tab,
                ...(orderType === 'sell' ? styles.tabActive : {}),
                backgroundColor: orderType === 'sell' ? afisteTheme.colors.accent : 'transparent',
              }}
              onClick={() => setOrderType('sell')}
            >
              Vender
            </button>
          </div>

          {/* Order Form */}
          <form onSubmit={handleSubmit} style={styles.orderForm}>
            {error && (
              <div style={styles.alertError}>{error}</div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Tipo de Orden
              </label>
              <div style={styles.inputGroup}>
                <button
                  type="button"
                  style={{
                    ...styles.orderTypeButton,
                    backgroundColor: ordType === 'limit' ? afisteTheme.colors.primary : 'transparent',
                    color: ordType === 'limit' ? 'white' : afisteTheme.colors.text,
                  }}
                  onClick={() => setOrdType('limit')}
                >
                  Limit
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.orderTypeButton,
                    backgroundColor: ordType === 'market' ? afisteTheme.colors.primary : 'transparent',
                    color: ordType === 'market' ? 'white' : afisteTheme.colors.text,
                  }}
                  onClick={() => setOrdType('market')}
                >
                  Market
                </button>
              </div>
            </div>

            {ordType === 'limit' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Precio (USD por token)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Cantidad (tokens)
              </label>
              <div style={styles.inputGroup}>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={styles.input}
                  placeholder="0.0000"
                  required
                />
                <button
                  type="button"
                  style={styles.maxButton}
                  onClick={setMaxAmount}
                >
                  MAX
                </button>
              </div>
            </div>

            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total:</span>
              <span style={styles.totalValue}>
                ${calculateTotal()} USD
              </span>
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                backgroundColor: orderType === 'buy' 
                  ? afisteTheme.colors.secondary 
                  : afisteTheme.colors.accent,
              }}
              disabled={submitting || !amount || (ordType === 'limit' && !price)}
            >
              {submitting 
                ? 'Procesando...' 
                : orderType === 'buy' 
                  ? 'Comprar Tokens' 
                  : 'Vender Tokens'}
            </button>
          </form>

          {/* User Active Orders */}
          <div style={styles.activeOrders}>
            <h3 style={styles.activeOrdersTitle}>Mis Órdenes Activas</h3>
            {userOrders.length > 0 ? (
              <div style={styles.ordersList}>
                <div style={styles.ordersHeader}>
                  <span>Tipo</span>
                  <span>Precio</span>
                  <span>Cantidad</span>
                  <span>Total</span>
                  <span>Acción</span>
                </div>
                {userOrders.map((order) => (
                  <div key={order.id} style={styles.orderRow}>
                    <span style={{
                      color: order.side === 'buy' ? afisteTheme.colors.secondary : afisteTheme.colors.accent,
                      fontWeight: '600'
                    }}>
                      {order.side === 'buy' ? 'COMPRA' : 'VENTA'}
                    </span>
                    <span>${order.price ? Number(order.price).toFixed(4) : 'Market'}</span>
                    <span>{Number(order.volume).toFixed(4)}</span>
                    <span>${order.price ? (Number(order.price) * Number(order.volume)).toFixed(2) : '-'}</span>
                    <button
                      style={styles.cancelButton}
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noOrders}>
                <p>No tienes órdenes activas</p>
              </div>
            )}
          </div>
            </div>

            {/* Right Column: Order Book & Trade History */}
            <div style={styles.rightColumn}>
          {/* Order Book */}
          <div style={styles.orderBook}>
            <h3 style={styles.orderBookTitle}>Order Book</h3>
            <div style={styles.orderBookContent}>
              <div style={styles.orderBookSide}>
                <div style={styles.orderBookHeader}>
                  <span>Precio (USD)</span>
                  <span>Volumen</span>
                </div>
                {orderBook.asks.slice(0, 10).map((ask, idx) => (
                  <div key={idx} style={{...styles.orderBookRow, color: afisteTheme.colors.accent}}>
                    <span>{ask.price.toFixed(4)}</span>
                    <span>{ask.volume.toFixed(4)}</span>
                  </div>
                ))}
              </div>
              <div style={styles.orderBookSide}>
                <div style={styles.orderBookHeader}>
                  <span>Precio (USD)</span>
                  <span>Volumen</span>
                </div>
                {orderBook.bids.slice(0, 10).map((bid, idx) => (
                  <div key={idx} style={{...styles.orderBookRow, color: afisteTheme.colors.secondary}}>
                    <span>{bid.price.toFixed(4)}</span>
                    <span>{bid.volume.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trade History */}
          <div style={styles.tradeHistory}>
            <h3 style={styles.tradeHistoryTitle}>Historial de Trades</h3>
            <div style={styles.tradeHistoryContent}>
              <div style={styles.tradeHistoryHeader}>
                <span>Precio</span>
                <span>Volumen</span>
                <span>Total</span>
                <span>Hora</span>
              </div>
              {trades.length > 0 ? (
                trades.map((trade) => (
                  <div key={trade.id} style={styles.tradeHistoryRow}>
                    <span style={{color: afisteTheme.colors.primary}}>
                      ${trade.price.toFixed(4)}
                    </span>
                    <span>{trade.volume.toFixed(4)}</span>
                    <span>${trade.funds.toFixed(2)}</span>
                    <span>{new Date(trade.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))
              ) : (
                <div style={styles.tradeHistoryPlaceholder}>
                  <p>No hay trades recientes</p>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: afisteTheme.colors.background,
    padding: '20px',
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.primary,
    border: `2px solid ${afisteTheme.colors.primary}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: afisteTheme.colors.text,
  },
  priceHeader: {
    maxWidth: '1400px',
    margin: '0 auto 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: afisteTheme.colors.surface,
    padding: '20px',
    borderRadius: '12px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  priceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  priceLabel: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
  },
  priceValue: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  priceChange: {
    fontSize: '16px',
    fontWeight: '600',
  },
  marketInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  marketLabel: {
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  marketValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  content: {
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
  },
  tradingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    minHeight: '600px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fundCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  fundName: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  fundInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  infoLabel: {
    color: afisteTheme.colors.textSecondary,
  },
  infoValue: {
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  detailButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  balanceTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  balanceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  balanceAmount: {
    fontWeight: '600',
    color: afisteTheme.colors.primary,
  },
  tradingArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    backgroundColor: afisteTheme.colors.surface,
    padding: '8px',
    borderRadius: '12px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    transition: 'all 0.2s',
  },
  tabActive: {
    transform: 'scale(1.02)',
  },
  orderForm: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: afisteTheme.colors.text,
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: afisteTheme.colors.surfaceLight,
    color: afisteTheme.colors.text,
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
  },
  maxButton: {
    padding: '12px 20px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    marginBottom: '20px',
  },
  totalLabel: {
    fontSize: '18px',
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  totalValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: afisteTheme.colors.primary,
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
  },
  orderBook: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  orderBookTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  orderBookContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  orderBookSide: {
    display: 'flex',
    flexDirection: 'column',
  },
  orderBookHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    fontWeight: '600',
    borderBottom: `1px solid ${afisteTheme.colors.textSecondary}`,
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  orderBookRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  orderTypeButton: {
    flex: 1,
    padding: '8px',
    border: `1px solid ${afisteTheme.colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  tradeHistory: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  tradeHistoryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  tradeHistoryContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  tradeHistoryHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    padding: '8px',
    fontWeight: '600',
    borderBottom: `1px solid ${afisteTheme.colors.textSecondary}`,
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  tradeHistoryRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    padding: '8px',
    fontSize: '13px',
    borderBottom: `1px solid ${afisteTheme.colors.background}`,
  },
  tradeHistoryPlaceholder: {
    textAlign: 'center',
    padding: '40px',
    color: afisteTheme.colors.textSecondary,
  },
  alertError: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: afisteTheme.colors.accent,
    borderRadius: '8px',
    marginBottom: '20px',
    border: `1px solid ${afisteTheme.colors.accent}`,
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: afisteTheme.colors.textSecondary,
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: afisteTheme.colors.accent,
  },
  activeOrders: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  activeOrdersTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
  },
  ordersHeader: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 1fr 1fr 100px',
    gap: '12px',
    padding: '8px',
    fontWeight: '600',
    borderBottom: `1px solid ${afisteTheme.colors.textSecondary}`,
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  orderRow: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 1fr 1fr 100px',
    gap: '12px',
    padding: '12px 8px',
    fontSize: '13px',
    borderBottom: `1px solid ${afisteTheme.colors.background}`,
    alignItems: 'center',
  },
  cancelButton: {
    padding: '6px 12px',
    backgroundColor: afisteTheme.colors.accent,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  noOrders: {
    textAlign: 'center',
    padding: '40px',
    color: afisteTheme.colors.textSecondary,
  },
};

export default TradingScreen;

