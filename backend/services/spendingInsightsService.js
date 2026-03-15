const postgresService = require('./postgresService');
const ledgerService = require('./ledgerService');

class SpendingInsightsService {
  getDateRange(timeRange) {
    const now = new Date();
    let from;
    let to = new Date(now);
    let label;

    const startOfDay = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const endOfDay = (date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    switch (timeRange) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        label = 'today';
        break;
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        from = startOfDay(y);
        to = endOfDay(y);
        label = 'yesterday';
        break;
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        from = startOfDay(start);
        label = 'this month';
        break;
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        from = startOfDay(start);
        to = endOfDay(end);
        label = 'last month';
        break;
      }
      case 'this_week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        from = startOfDay(start);
        label = 'this week';
        break;
      }
      case 'last_week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 13);
        const end = new Date(now);
        end.setDate(now.getDate() - 7);
        from = startOfDay(start);
        to = endOfDay(end);
        label = 'last week';
        break;
      }
      case 'last_7_days': {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        from = startOfDay(start);
        label = 'the last 7 days';
        break;
      }
      case 'last_30_days': {
        const start = new Date(now);
        start.setDate(now.getDate() - 29);
        from = startOfDay(start);
        label = 'the last 30 days';
        break;
      }
      default: {
        const start = new Date(now);
        start.setDate(now.getDate() - 29);
        from = startOfDay(start);
        label = 'the last 30 days';
        break;
      }
    }

    return { from, to, label };
  }

  async getUserSpendingSummary(userId, options = {}) {
    const { timeRange } = options;
    const accounts = await ledgerService.getAccountsForUser(userId);

    const { from, to, label } = this.getDateRange(timeRange);

    if (!accounts || accounts.length === 0) {
      return {
        hasAccounts: false,
        accountId: null,
        currency: 'NGN',
        timeRange: timeRange || null,
        periodLabel: label,
        from,
        to,
        totalSpent: 0,
        txCount: 0
      };
    }

    const primaryAccount =
      accounts.find((acc) => acc.currency === 'NGN') || accounts[0];

    const result = await postgresService.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_spent,
         COUNT(*) AS tx_count
       FROM payments
       WHERE from_account_id = $1
         AND status = 'COMPLETED'
         AND created_at >= $2
         AND created_at <= $3`,
      [primaryAccount.id, from, to]
    );

    const row = result.rows[0] || {};

    return {
      hasAccounts: true,
      accountId: primaryAccount.id,
      currency: primaryAccount.currency || 'NGN',
      timeRange: timeRange || null,
      periodLabel: label,
      from,
      to,
      totalSpent: row.total_spent || 0,
      txCount: parseInt(row.tx_count || '0', 10)
    };
  }

  categorizePaymentRow(row) {
    let meta = row.metadata;

    if (meta && typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (e) {
        meta = null;
      }
    }

    if (meta && meta.category) {
      return String(meta.category).toLowerCase();
    }

    let text = '';

    if (row.description) {
      text += ` ${String(row.description).toLowerCase()}`;
    }

    if (meta && meta.narration) {
      text += ` ${String(meta.narration).toLowerCase()}`;
    }

    if (
      text.includes('uber') ||
      text.includes('bolt') ||
      text.includes('taxi') ||
      text.includes('ride') ||
      text.includes('transport') ||
      text.includes('bus')
    ) {
      return 'transport';
    }

    if (
      text.includes('kfc') ||
      text.includes('food') ||
      text.includes('restaurant') ||
      text.includes('eatery') ||
      text.includes('eat out') ||
      text.includes('jollof') ||
      text.includes('pizza') ||
      text.includes('chicken republic')
    ) {
      return 'food';
    }

    if (
      text.includes('airtime') ||
      text.includes('recharge') ||
      text.includes('data') ||
      text.includes('mtn') ||
      text.includes('glo') ||
      text.includes('airtel') ||
      text.includes('9mobile')
    ) {
      return 'airtime';
    }

    if (
      text.includes('electricity') ||
      text.includes('nepa') ||
      text.includes('phcn') ||
      text.includes('ikeja') ||
      text.includes('eko') ||
      text.includes('dstv') ||
      text.includes('gotv') ||
      text.includes('startimes') ||
      text.includes('cable') ||
      text.includes('subscription')
    ) {
      return 'bills';
    }

    if (
      text.includes('shopping') ||
      text.includes('market') ||
      text.includes('mall') ||
      text.includes('store') ||
      text.includes('boutique') ||
      text.includes('jumia') ||
      text.includes('konga')
    ) {
      return 'shopping';
    }

    if (
      text.includes('rent') ||
      text.includes('landlord')
    ) {
      return 'rent';
    }

    if (
      text.includes('fee') ||
      text.includes('charge') ||
      text.includes('commission')
    ) {
      return 'fees';
    }

    return 'other';
  }

  async getUserSpendingByCategory(userId, options = {}) {
    const { timeRange, category } = options;
    const accounts = await ledgerService.getAccountsForUser(userId);

    const { from, to, label } = this.getDateRange(timeRange);

    if (!accounts || accounts.length === 0) {
      return {
        hasAccounts: false,
        accountId: null,
        currency: 'NGN',
        timeRange: timeRange || null,
        periodLabel: label,
        from,
        to,
        totalSpent: 0,
        txCount: 0,
        categories: [],
        targetCategory: category || null,
        targetCategoryTotal: 0,
        targetCategoryTxCount: 0
      };
    }

    const primaryAccount =
      accounts.find((acc) => acc.currency === 'NGN') || accounts[0];

    const result = await postgresService.query(
      `SELECT
         amount,
         description,
         metadata
       FROM payments
       WHERE from_account_id = $1
         AND status = 'COMPLETED'
         AND created_at >= $2
         AND created_at <= $3`,
      [primaryAccount.id, from, to]
    );

    const rows = result.rows || [];
    const buckets = {};
    let totalSpent = 0;
    let txCount = 0;

    for (const row of rows) {
      const amountValue = typeof row.amount === 'string'
        ? parseFloat(row.amount)
        : row.amount;

      if (!amountValue || Number.isNaN(amountValue)) {
        continue;
      }

      const cat = this.categorizePaymentRow(row);

      if (!buckets[cat]) {
        buckets[cat] = { category: cat, totalSpent: 0, txCount: 0 };
      }

      buckets[cat].totalSpent += amountValue;
      buckets[cat].txCount += 1;
      totalSpent += amountValue;
      txCount += 1;
    }

    const categories = Object.values(buckets).sort((a, b) => b.totalSpent - a.totalSpent);

    let targetCategoryTotal = 0;
    let targetCategoryTxCount = 0;

    if (category) {
      const normalized = String(category).toLowerCase();
      const target = categories.find((c) => c.category === normalized);
      if (target) {
        targetCategoryTotal = target.totalSpent;
        targetCategoryTxCount = target.txCount;
      }
    }

    return {
      hasAccounts: true,
      accountId: primaryAccount.id,
      currency: primaryAccount.currency || 'NGN',
      timeRange: timeRange || null,
      periodLabel: label,
      from,
      to,
      totalSpent,
      txCount,
      categories,
      targetCategory: category || null,
      targetCategoryTotal,
      targetCategoryTxCount
    };
  }
}

module.exports = new SpendingInsightsService();
