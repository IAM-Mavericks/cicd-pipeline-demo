const ledgerService = require('../services/ledgerService');
const User = require('../models/User');

class LedgerReadController {
  static async getAccount(req, res) {
    try {
      const accountId = parseInt(req.params.id, 10);
      if (Number.isNaN(accountId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account id'
        });
      }

      const account = await ledgerService.getAccount(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error fetching account:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch account details'
      });
    }
  }

  static async openAccountForCurrentUser(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { currency, name, description } = req.body || {};

      if (!currency || typeof currency !== 'string' || currency.length !== 3) {
        return res.status(400).json({
          success: false,
          message: 'A valid 3-letter currency code is required'
        });
      }

      const upperCurrency = currency.toUpperCase();

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const existingAccounts = await ledgerService.getAccountsForUser(userId.toString());
      const existingForCurrency = existingAccounts.find(
        (account) => account.currency === upperCurrency
      );

      if (existingForCurrency) {
        return res.json({
          success: true,
          data: existingForCurrency
        });
      }

      let mongoAccount = Array.isArray(user.accounts)
        ? user.accounts.find((account) => account.currency === upperCurrency)
        : null;

      if (!mongoAccount) {
        const accountNumber = user.generateAccountNumber(upperCurrency);

        mongoAccount = {
          accountNumber,
          accountName: user.getFullName(),
          currency: upperCurrency,
          balance: '0.00',
          type: 'savings',
          status: 'active'
        };

        user.accounts.push(mongoAccount);
        await user.save();
      }

      let ledgerAccount = await ledgerService.getAccountByNumber(mongoAccount.accountNumber);
      if (!ledgerAccount) {
        ledgerAccount = await ledgerService.createAccount({
          userId: user._id.toString(),
          accountNumber: mongoAccount.accountNumber,
          currency: mongoAccount.currency || upperCurrency,
          type: 'ASSET',
          name: name || mongoAccount.accountName || user.getFullName(),
          description: description || `${upperCurrency} wallet account`
        });
      }

      return res.status(201).json({
        success: true,
        data: ledgerAccount
      });
    } catch (error) {
      console.error('Error opening account for user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to open account'
      });
    }
  }

  static async getAccountsForCurrentUser(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const accounts = await ledgerService.getAccountsForUser(userId.toString());

      return res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('Error fetching accounts for user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch accounts'
      });
    }
  }

  static async getAccountTransactions(req, res) {
    try {
      const accountId = parseInt(req.params.id, 10);
      if (Number.isNaN(accountId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account id'
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

      const transactions = await ledgerService.getAccountTransactions(accountId, {
        limit: Number.isNaN(limit) ? 20 : limit,
        offset: Number.isNaN(offset) ? 0 : offset
      });

      return res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch account transactions'
      });
    }
  }

  static async getAccountByNumber(req, res) {
    try {
      const { accountNumber } = req.params;

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          message: 'Account number is required'
        });
      }

      const account = await ledgerService.getAccountByNumber(accountNumber);

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error fetching account by number:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch account details'
      });
    }
  }

  static async getPrimaryAccountForCurrentUser(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      let account = await ledgerService.getPrimaryAccountForUser(userId.toString());

      // If no ledger account exists yet, provision one based on the Mongo user record
      if (!account) {
        const user = await User.findById(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        let primaryAccount = Array.isArray(user.accounts) && user.accounts.length > 0
          ? user.accounts[0]
          : null;

        // If the Mongo user has no primary account, create one
        if (!primaryAccount) {
          const preferredCurrency = user.preferences?.currency || 'NGN';
          const accountNumber = user.generateAccountNumber(preferredCurrency);

          user.accounts.push({
            accountNumber,
            accountName: user.getFullName(),
            currency: preferredCurrency,
            balance: '0.00',
            type: 'savings',
            status: 'active'
          });

          await user.save();
          primaryAccount = user.accounts[0];
        }

        // Ensure a ledger account exists for this Mongo primary account
        const existingByNumber = await ledgerService.getAccountByNumber(primaryAccount.accountNumber);

        if (existingByNumber) {
          account = existingByNumber;
        } else {
          account = await ledgerService.createAccount({
            userId: user._id.toString(),
            accountNumber: primaryAccount.accountNumber,
            currency: primaryAccount.currency || 'NGN',
            type: 'ASSET',
            name: primaryAccount.accountName || user.getFullName(),
            description: 'Primary wallet account'
          });
        }
      }

      return res.json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error fetching primary account for user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch account details'
      });
    }
  }
}

module.exports = LedgerReadController;
