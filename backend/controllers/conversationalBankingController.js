/**
 * Conversational Banking Controller
 * Handles AI-powered natural language banking transactions
 * Supports English and Nigerian Pidgin
 */

const aiParsingService = require('../services/aiParsingService');
const validationService = require('../services/validationService');
const transactionEngine = require('../services/transactionEngine');
const billPaymentService = require('../services/billPaymentService');
const ledgerService = require('../services/ledgerService');
const spendingInsightsService = require('../services/spendingInsightsService');
const localLLMService = require('../services/localLLMService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

class ConversationalBankingController {
  /**
   * Process natural language command
   * Parses intent and entities, validates, and returns preview
   */
  async processCommand(req, res) {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for conversational banking',
          response: 'Please log in again to use the SznPay AI assistant.'
        });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      logger.info(`Processing conversational command for user ${userId}: "${message}"`);

      // Check offline status
      const offlineStatus = offlineService.getSyncStatus();
      const isOffline = offlineStatus.status === 'offline';

      // Get user context
      let user = await User.findById(userId).select('+accounts +security');

      // In development, create a mock user if not found
      if (!user && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
        user = {
          _id: userId,
          personalInfo: { firstName: 'Demo', lastName: 'User' },
          email: 'demo@sznpay.com',
          accounts: [{
            accountNumber: '1234567890',
            accountType: 'savings',
            balance: 500000,
            currency: 'NGN',
            status: 'active'
          }],
          security: {
            mfa: { enabled: false },
            trustedDevices: [],
            lastKnownLocation: 'Lagos, Nigeria'
          },
          kyc: {
            verified: true,
            tier: 2
          },
          preferences: {
            language: 'en'
          },
          createdAt: new Date()
        };
        logger.info('Using mock user for development testing');
      } else if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Parse natural language input
      const parseResult = await aiParsingService.parseCommand(message, {
        userId: user._id,
        userName: user.firstName || user.personalInfo?.firstName || '',
        accounts: user.accounts,
        language: user.preferences?.language || 'en'
      });

      // NLP/intent parsing errors are treated as logical errors (success:false)
      // but still returned with HTTP 200 so the frontend can render the
      // friendly response instead of a network error.
      if (!parseResult.success) {
        let llmFallbackResponse = null;

        try {
          if (process.env.LOCAL_LLM_DISABLED !== 'true') {
            llmFallbackResponse = await localLLMService.generateGeneralResponse(message, {
              userId: user._id,
              name: user.personalInfo?.firstName || user.firstName || 'Customer'
            });
          }
        } catch (llmError) {
          logger.error('Error using local LLM fallback for conversational command:', llmError);
        }

        if (llmFallbackResponse) {
          return res.json({
            success: true,
            intent: 'GENERAL_ASSISTANT',
            requiresAuth: false,
            response: llmFallbackResponse,
            offlineStatus
          });
        }

        return res.json({
          success: false,
          error: parseResult.error,
          suggestion: parseResult.suggestion,
          response: parseResult.response,
          offlineStatus
        });
      }

      const { intent, entities, confidence, originalLanguage } = parseResult;

      // Handle offline-supported intents when offline
      if (isOffline && ['BALANCE_INQUIRY', 'TRANSACTION_HISTORY'].includes(intent)) {
        return await this.handleOfflineQuery(user, intent, entities, offlineStatus);
      }

      // For transaction intents when offline, queue them
      if (isOffline && ['TRANSFER', 'BILL_PAYMENT', 'AIRTIME_PURCHASE'].includes(intent)) {
        try {
          const queueResult = await offlineService.queueOfflineTransaction(
            userId,
            intent,
            entities,
            message,
            sessionId
          );

          return res.json({
            success: true,
            intent,
            offlineQueued: true,
            response: queueResult.message,
            transactionId: queueResult.transactionId,
            offlineStatus
          });
        } catch (queueError) {
          return res.json({
            success: false,
            error: 'Failed to queue offline transaction',
            response: queueError.message,
            offlineStatus
          });
        }
      }

      // Validate transaction based on intent
      let validationResult;
      let transactionPreview;

      switch (intent) {
        case 'TRANSFER':
          validationResult = await validationService.validateTransfer({
            userId: user._id,
            amount: entities.amount,
            recipientAccount: entities.recipientAccount,
            recipientName: entities.recipientName,
            description: entities.description || message,
            sourceAccount: entities.sourceAccount || user.accounts[0]?.accountNumber
          });

          if (validationResult.isValid) {
            transactionPreview = {
              type: 'transfer',
              amount: entities.amount,
              currency: entities.currency || 'NGN',
              recipient: {
                name: entities.recipientName,
                account: entities.recipientAccount,
                bank: entities.bankName || 'Same Bank'
              },
              source: {
                account: entities.sourceAccount || user.accounts[0]?.accountNumber,
                balance: user.accounts[0]?.balance
              },
              fee: validationResult.fee || 0,
              total: entities.amount + (validationResult.fee || 0),
              description: entities.description || message
            };
          }
          break;

        case 'BILL_PAYMENT':
          validationResult = await validationService.validateBillPayment({
            userId: user._id,
            billType: entities.billType,
            amount: entities.amount,
            provider: entities.provider,
            accountNumber: entities.accountNumber,
            phoneNumber: entities.phoneNumber
          });

          if (validationResult.isValid) {
            transactionPreview = {
              type: 'bill_payment',
              billType: entities.billType,
              provider: entities.provider,
              amount: entities.amount,
              currency: 'NGN',
              accountNumber: entities.accountNumber || entities.phoneNumber,
              fee: validationResult.fee || 0,
              total: entities.amount + (validationResult.fee || 0)
            };
          }
          break;

        case 'AIRTIME_PURCHASE':
          validationResult = await validationService.validateAirtimePurchase({
            userId: user._id,
            amount: entities.amount,
            phoneNumber: entities.phoneNumber,
            network: entities.network
          });

          if (validationResult.isValid) {
            transactionPreview = {
              type: 'airtime',
              network: entities.network,
              phoneNumber: entities.phoneNumber,
              amount: entities.amount,
              currency: 'NGN',
              fee: validationResult.fee || 0,
              total: entities.amount + (validationResult.fee || 0)
            };
          }
          break;

        case 'BALANCE_INQUIRY': {
          const ledgerAccounts = await ledgerService.getAccountsForUser(user._id.toString());

          // Cache balance data for offline access
          await offlineService.cacheBalanceData(userId, ledgerAccounts);

          const balanceResponse = this.generateBalanceResponse.call(this, ledgerAccounts);

          return res.json({
            success: true,
            intent: 'BALANCE_INQUIRY',
            requiresAuth: false,
            response: balanceResponse,
            data: {
              accounts: ledgerAccounts.map(acc => ({
                id: acc.id,
                currency: acc.currency,
                accountNumber: acc.account_number,
                balance: acc.balance,
                availableBalance: acc.available_balance
              }))
            },
            offlineStatus
          });
        }

        case 'TRANSACTION_HISTORY': {
          const ledgerAccounts = await ledgerService.getAccountsForUser(user._id.toString());

          if (!ledgerAccounts || ledgerAccounts.length === 0) {
            const emptyResponse = this.generateTransactionHistoryResponse.call(this, []);
            return res.json({
              success: true,
              intent: 'TRANSACTION_HISTORY',
              requiresAuth: false,
              response: emptyResponse,
              data: { transactions: [] },
              offlineStatus
            });
          }

          const primaryAccount =
            ledgerAccounts.find(acc => acc.currency === 'NGN') || ledgerAccounts[0];

          const limit = entities.limit || 5;
          const ledgerTransactions = await ledgerService.getAccountTransactions(primaryAccount.id, {
            limit,
            offset: 0
          });

          // Cache transaction history for offline access
          await offlineService.cacheTransactionHistory(userId, ledgerTransactions);

          const historyResponse = this.generateTransactionHistoryResponse.call(this, ledgerTransactions);
          return res.json({
            success: true,
            intent: 'TRANSACTION_HISTORY',
            requiresAuth: false,
            response: historyResponse,
            data: { transactions: ledgerTransactions, accountId: primaryAccount.id },
            offlineStatus
          });
        }

        case 'SPENDING_SUMMARY': {
          const timeRange = entities.timeRange || 'last_30_days';
          const category = entities.category || null;
          const summary = await spendingInsightsService.getUserSpendingByCategory(
            user._id.toString(),
            { timeRange, category }
          );

          const summaryResponse = this.generateSpendingSummaryResponse.call(this, summary);

          return res.json({
            success: true,
            intent: 'SPENDING_SUMMARY',
            requiresAuth: false,
            response: summaryResponse,
            data: summary,
            offlineStatus
          });
        }

        default: {
          let llmFallbackResponse = null;

          try {
            if (process.env.LOCAL_LLM_DISABLED !== 'true') {
              llmFallbackResponse = await localLLMService.generateGeneralResponse(message, {
                userId: user._id,
                name: user.personalInfo?.firstName || user.firstName || 'Customer'
              });
            }
          } catch (llmError) {
            logger.error('Error using local LLM fallback for unsupported intent:', llmError);
          }

          if (llmFallbackResponse) {
            return res.json({
              success: true,
              intent: 'GENERAL_ASSISTANT',
              requiresAuth: false,
              response: llmFallbackResponse,
              offlineStatus
            });
          }

          return res.json({
            success: false,
            error: 'Intent not recognized or not supported',
            response: "I'm sorry, I didn't understand that. Can you try rephrasing?",
            offlineStatus
          });
        }
      }

      // Check validation result
      if (!validationResult.isValid) {
        return res.json({
          success: false,
          error: validationResult.error,
          validationErrors: validationResult.errors,
          riskLevel: validationResult.riskLevel,
          response: this.generateErrorResponse(validationResult, originalLanguage),
          offlineStatus
        });
      }

      // Generate confirmation response
      const confirmationResponse = this.generateConfirmationResponse(
        intent,
        transactionPreview,
        originalLanguage
      );

      // Create transaction session
      const transactionSession = {
        sessionId: sessionId || `session_${Date.now()}_${user._id}`,
        userId: user._id,
        intent,
        entities,
        transactionPreview,
        validationResult,
        confidence,
        originalMessage: message,
        originalLanguage,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };

      // Store session (in production, use Redis)
      global.transactionSessions = global.transactionSessions || {};
      global.transactionSessions[transactionSession.sessionId] = transactionSession;

      return res.json({
        success: true,
        intent,
        confidence,
        requiresAuth: true,
        transactionPreview,
        validationResult: {
          isValid: true,
          riskLevel: validationResult.riskLevel,
          securityChecks: validationResult.securityChecks
        },
        response: confirmationResponse,
        sessionId: transactionSession.sessionId,
        authMethods: this.determineAuthMethods(validationResult.riskLevel, user),
        offlineStatus
      });

    } catch (error) {
      logger.error('Error processing conversational command:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process command',
        response: 'Sorry, something went wrong. Please try again.',
        offlineStatus: offlineService.getSyncStatus()
      });
    }
  }

  /**
   * Handle offline queries using cached data
   */
  async handleOfflineQuery(user, intent, entities, offlineStatus) {
    const userId = user._id.toString();

    switch (intent) {
      case 'BALANCE_INQUIRY': {
        const cachedBalances = await offlineService.getCachedBalanceData(userId);

        if (cachedBalances) {
          const balanceResponse = this.generateBalanceResponse.call(this, cachedBalances);
          return res.json({
            success: true,
            intent: 'BALANCE_INQUIRY',
            requiresAuth: false,
            response: `Offline mode: ${balanceResponse}`,
            data: {
              accounts: cachedBalances.map(acc => ({
                id: acc.id,
                currency: acc.currency,
                accountNumber: acc.account_number,
                balance: acc.balance,
                availableBalance: acc.available_balance
              })),
              offline: true,
              cachedAt: cachedBalances[0]?.cachedAt || new Date().toISOString()
            },
            offlineStatus
          });
        } else {
          return res.json({
            success: false,
            error: 'No cached balance data available offline',
            response: 'Sorry, I don\'t have your latest balance cached. Please check when you\'re back online.',
            offlineStatus
          });
        }
      }

      case 'TRANSACTION_HISTORY': {
        const cachedHistory = await offlineService.getCachedTransactionHistory(userId);

        if (cachedHistory) {
          const historyResponse = this.generateTransactionHistoryResponse.call(this, cachedHistory);
          return res.json({
            success: true,
            intent: 'TRANSACTION_HISTORY',
            requiresAuth: false,
            response: `Offline mode: ${historyResponse}`,
            data: {
              transactions: cachedHistory,
              offline: true,
              cachedAt: cachedHistory[0]?.cachedAt || new Date().toISOString()
            },
            offlineStatus
          });
        } else {
          return res.json({
            success: false,
            error: 'No cached transaction history available offline',
            response: 'Sorry, I don\'t have your transaction history cached. Please check when you\'re back online.',
            offlineStatus
          });
        }
      }

      default:
        return res.json({
          success: false,
          error: 'Unsupported offline query',
          response: 'This query is not supported offline. Please try when you\'re back online.',
          offlineStatus
        });
    }
  }

  /**
   * Execute confirmed transaction
   * Requires authentication and session validation
   */
  async executeTransaction(req, res) {
    try {
      const { sessionId, authCode, biometricToken } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for conversational banking',
          response: 'Please log in again to complete this transaction.'
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      // Retrieve transaction session
      const session = global.transactionSessions?.[sessionId];
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Transaction session not found or expired',
          response: 'This transaction has expired. Please start a new one.'
        });
      }

      // Verify session ownership
      if (session.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to transaction session'
        });
      }

      // Check session expiration
      if (new Date() > session.expiresAt) {
        delete global.transactionSessions[sessionId];
        return res.status(400).json({
          success: false,
          error: 'Transaction session expired',
          response: 'This transaction has expired. Please start a new one.'
        });
      }

      // Verify authentication based on risk level
      let user = await User.findById(userId);

      // In development, use mock user if not found
      if (!user && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
        user = {
          _id: userId,
          personalInfo: { firstName: 'Demo', lastName: 'User' },
          security: { mfa: { enabled: false } }
        };
      }

      const authValid = await this.verifyAuthentication(
        user,
        session.validationResult.riskLevel,
        authCode,
        biometricToken
      );

      if (!authValid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          response: 'Authentication failed. Please try again.'
        });
      }

      let result;

      // Execute transaction based on intent
      switch (session.intent) {
        case 'TRANSFER':
          result = await transactionEngine.processTransfer({
            userId: user._id,
            amount: session.transactionPreview.amount,
            currency: session.transactionPreview.currency,
            recipientAccount: session.transactionPreview.recipient.account,
            recipientName: session.transactionPreview.recipient.name,
            sourceAccount: session.transactionPreview.source.account,
            description: session.transactionPreview.description,
            metadata: {
              conversational: true,
              originalMessage: session.originalMessage,
              sessionId: sessionId
            }
          });
          break;

        case 'BILL_PAYMENT':
          result = await billPaymentService.processBillPayment({
            userId: user._id,
            billType: session.transactionPreview.billType,
            provider: session.transactionPreview.provider,
            amount: session.transactionPreview.amount,
            accountNumber: session.transactionPreview.accountNumber,
            metadata: {
              conversational: true,
              originalMessage: session.originalMessage,
              sessionId: sessionId
            }
          });
          break;

        case 'AIRTIME_PURCHASE':
          result = await billPaymentService.purchaseAirtime({
            userId: user._id,
            amount: session.transactionPreview.amount,
            phoneNumber: session.transactionPreview.phoneNumber,
            network: session.transactionPreview.network,
            metadata: {
              conversational: true,
              originalMessage: session.originalMessage,
              sessionId: sessionId
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid transaction intent'
          });
      }

      // Clean up session
      delete global.transactionSessions[sessionId];

      if (result.success) {
        return res.json({
          success: true,
          transaction: result.transaction,
          response: this.generateSuccessResponse(
            session.intent,
            result.transaction,
            session.originalLanguage
          )
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
          response: this.generateFailureResponse(result.error, session.originalLanguage)
        });
      }

    } catch (error) {
      logger.error('Error executing conversational transaction:', error);
      return res.status(500).json({
        success: false,
        error: 'Transaction execution failed',
        response: 'Sorry, the transaction failed. Please try again.'
      });
    }
  }

  /**
   * Generate balance inquiry response
   */
  generateBalanceResponse(accountsOrUser) {
    const accounts = Array.isArray(accountsOrUser)
      ? accountsOrUser
      : (accountsOrUser?.accounts || []);

    if (!accounts || accounts.length === 0) {
      return 'You do not have any accounts yet.';
    }

    const lines = accounts.map(acc => {
      const currency = acc.currency || 'NGN';
      const rawBalance =
        acc.available_balance ?? acc.balance ?? acc.balanceBefore ?? 0;
      const numericBalance = typeof rawBalance === 'string'
        ? parseFloat(rawBalance)
        : rawBalance;

      const balance = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency
      }).format(numericBalance || 0);

      const label = acc.accountType
        ? acc.accountType
        : `${currency} account`;

      return `${label}: ${balance}`;
    }).join('\n');

    return `Here are your account balances:\n\n${lines}`;
  }

  /**
   * Generate transaction history response
   */
  generateTransactionHistoryResponse(transactions) {
    if (!transactions || transactions.length === 0) {
      return "You don't have any recent transactions.";
    }

    const txList = transactions.map((tx, idx) => {
      const currency = tx.currency || 'NGN';
      const rawAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      const amount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency
      }).format(rawAmount || 0);

      const dateSource = tx.payment_created_at || tx.transaction_created_at || tx.createdAt;
      const date = dateSource
        ? new Date(dateSource).toLocaleDateString('en-NG')
        : 'Unknown date';

      const type = tx.transaction_type || tx.type || 'Payment';

      return `${idx + 1}. ${type} - ${amount} on ${date}`;
    }).join('\n');

    return `Here are your recent transactions:\n\n${txList}`;
  }

  /**
   * Generate spending summary response
   */
  generateSpendingSummaryResponse(summary) {
    if (!summary || !summary.hasAccounts) {
      return 'You do not have any accounts yet.';
    }

    const currency = summary.currency || 'NGN';
    const hasTargetCategory = !!summary.targetCategory;

    if (hasTargetCategory) {
      const rawCategoryTotal = typeof summary.targetCategoryTotal === 'string'
        ? parseFloat(summary.targetCategoryTotal)
        : summary.targetCategoryTotal;

      const period = summary.periodLabel || 'the selected period';
      const label = summary.targetCategory;

      if (!rawCategoryTotal || summary.targetCategoryTxCount === 0) {
        return `You have not spent any money on ${label} in ${period}.`;
      }

      const categoryAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency
      }).format(rawCategoryTotal || 0);

      const txText = summary.targetCategoryTxCount === 1
        ? '1 transaction'
        : `${summary.targetCategoryTxCount} transactions`;

      return `In ${period}, you spent ${categoryAmount} on ${label} across ${txText}.`;
    }

    const rawTotal = typeof summary.totalSpent === 'string'
      ? parseFloat(summary.totalSpent)
      : summary.totalSpent;

    if (!rawTotal || summary.txCount === 0) {
      const period = summary.periodLabel || 'the selected period';
      return `You have not spent any money in ${period}.`;
    }

    const amount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency
    }).format(rawTotal || 0);

    const period = summary.periodLabel || 'the selected period';
    const txText = summary.txCount === 1
      ? '1 transaction'
      : `${summary.txCount} transactions`;

    let base = `In ${period}, you spent ${amount} across ${txText}.`;

    if (Array.isArray(summary.categories) && summary.categories.length > 0) {
      const topCategories = summary.categories
        .filter((c) => c.totalSpent > 0)
        .slice(0, 3);

      if (topCategories.length > 0) {
        const parts = topCategories.map((c) => {
          const catAmount = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency
          }).format(c.totalSpent || 0);
          return `${catAmount} on ${c.category}`;
        });

        base += ` Top categories: ${parts.join(', ')}.`;
      }
    }

    return base;
  }

  /**
   * Generate confirmation response
   */
  generateConfirmationResponse(intent, preview, language = 'en') {
    const amount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: preview.currency || 'NGN'
    }).format(preview.amount);

    const total = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: preview.currency || 'NGN'
    }).format(preview.total);

    let response = '';

    switch (intent) {
      case 'TRANSFER':
        response = language === 'pidgin'
          ? `I wan confirm say you wan send ${amount} to ${preview.recipient.name} (${preview.recipient.account}). Total amount na ${total} (including charges). You dey sure?`
          : `I want to confirm that you want to send ${amount} to ${preview.recipient.name} (${preview.recipient.account}). Total amount is ${total} (including fees). Please confirm to proceed.`;
        break;

      case 'BILL_PAYMENT':
        response = language === 'pidgin'
          ? `I wan confirm say you wan pay ${amount} for ${preview.provider} ${preview.billType}. Account number na ${preview.accountNumber}. Total amount na ${total}. You dey sure?`
          : `I want to confirm that you want to pay ${amount} for ${preview.provider} ${preview.billType}. Account number: ${preview.accountNumber}. Total amount is ${total}. Please confirm to proceed.`;
        break;

      case 'AIRTIME_PURCHASE':
        response = language === 'pidgin'
          ? `I wan confirm say you wan buy ${amount} ${preview.network} airtime for ${preview.phoneNumber}. Total amount na ${total}. You dey sure?`
          : `I want to confirm that you want to purchase ${amount} ${preview.network} airtime for ${preview.phoneNumber}. Total amount is ${total}. Please confirm to proceed.`;
        break;
    }

    return response;
  }

  /**
   * Generate error response
   */
  generateErrorResponse(validationResult, language = 'en') {
    const error = validationResult.error || 'Transaction validation failed';
    
    if (language === 'pidgin') {
      return `Abeg, e get problem: ${error}. Make you check am again.`;
    }
    return `Sorry, there's an issue: ${error}. Please check and try again.`;
  }

  /**
   * Generate success response
   */
  generateSuccessResponse(intent, transaction, language = 'en') {
    const amount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: transaction.currency
    }).format(transaction.amount);

    let response = '';

    switch (intent) {
      case 'TRANSFER':
        response = language === 'pidgin'
          ? `✅ Your transfer of ${amount} don successful! Reference number na ${transaction.reference}.`
          : `✅ Your transfer of ${amount} was successful! Reference number: ${transaction.reference}.`;
        break;

      case 'BILL_PAYMENT':
        response = language === 'pidgin'
          ? `✅ Your payment of ${amount} don successful! Reference number na ${transaction.reference}.`
          : `✅ Your payment of ${amount} was successful! Reference number: ${transaction.reference}.`;
        break;

      case 'AIRTIME_PURCHASE':
        response = language === 'pidgin'
          ? `✅ Your airtime purchase of ${amount} don successful! Reference number na ${transaction.reference}.`
          : `✅ Your airtime purchase of ${amount} was successful! Reference number: ${transaction.reference}.`;
        break;
    }

    return response;
  }

  /**
   * Generate failure response
   */
  generateFailureResponse(error, language = 'en') {
    if (language === 'pidgin') {
      return `❌ Abeg, the transaction no work: ${error}. Make you try again.`;
    }
    return `❌ Sorry, the transaction failed: ${error}. Please try again.`;
  }

  /**
   * Determine required authentication methods based on risk level
   */
  determineAuthMethods(riskLevel, user) {
    const methods = [];

    switch (riskLevel) {
      case 'low':
        methods.push('pin');
        break;
      case 'medium':
        methods.push('pin', 'otp');
        break;
      case 'high':
      case 'critical':
        methods.push('pin', 'otp', 'biometric');
        if (user.security?.mfa?.enabled) {
          methods.push('totp');
        }
        break;
    }

    return methods;
  }

  /**
   * Verify authentication based on risk level
   */
  async verifyAuthentication(user, riskLevel, authCode, biometricToken) {
    // In production, implement proper verification
    // For now, accept any non-empty authCode
    if (!authCode) {
      return false;
    }

    // Verify PIN (simplified)
    if (authCode.length >= 4) {
      return true;
    }

    return false;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    return res.json({
      success: true,
      service: 'Conversational Banking',
      status: 'operational',
      features: {
        intents: ['TRANSFER', 'BILL_PAYMENT', 'AIRTIME_PURCHASE', 'BALANCE_INQUIRY', 'TRANSACTION_HISTORY', 'SPENDING_SUMMARY'],
        languages: ['English', 'Nigerian Pidgin'],
        security: ['Fraud Detection', 'Risk Scoring', 'Compliance Checks']
      }
    });
  }
}

module.exports = new ConversationalBankingController();
