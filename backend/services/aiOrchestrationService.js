const logger = require('../utils/logger');

class AIOrchestrationService {
  constructor() {
    this.intentPatterns = {
      PAYMENT: {
        keywords: ['transfer', 'pay', 'send', 'send money', 'transfer to'],
        entities: ['amount', 'recipient_name', 'recipient_account']
      },
      BALANCE_INQUIRY: {
        keywords: ['balance', 'how much', 'check balance', 'my balance'],
        entities: []
      },
      TRANSACTION_HISTORY: {
        keywords: ['history', 'transactions', 'recent transactions', 'transaction history'],
        entities: ['date_range', 'amount_range']
      },
      SECURITY: {
        keywords: ['lock', 'unlock', 'security', 'fraud', 'report', 'enable mfa', 'disable mfa'],
        entities: []
      },
      GREETING: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        entities: []
      },
      GENERAL_CHAT: {
        keywords: [],
        entities: []
      }
    };
  }

  /**
   * Process user message and determine intent
   */
  async processUserMessage(message, userContext) {
    try {
      const cleanedMessage = message.toLowerCase().trim();
      const intent = this.classifyIntent(cleanedMessage);
      const entities = this.extractEntities(cleanedMessage, intent);

      return {
        intent,
        entities,
        confidence: this.calculateConfidence(cleanedMessage, intent),
        originalMessage: message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error processing user message:', error);
      return {
        intent: 'GENERAL_CHAT',
        entities: {},
        confidence: 0.1,
        originalMessage: message,
        error: error.message
      };
    }
  }

  /**
   * Classify intent based on message content
   */
  classifyIntent(message) {
    // Check for payment intents
    if (this.containsKeywords(message, this.intentPatterns.PAYMENT.keywords)) {
      return 'PAYMENT';
    }

    // Check for balance inquiries
    if (this.containsKeywords(message, this.intentPatterns.BALANCE_INQUIRY.keywords)) {
      return 'BALANCE_INQUIRY';
    }

    // Check for transaction history
    if (this.containsKeywords(message, this.intentPatterns.TRANSACTION_HISTORY.keywords)) {
      return 'TRANSACTION_HISTORY';
    }

    // Check for security commands
    if (this.containsKeywords(message, this.intentPatterns.SECURITY.keywords)) {
      return 'SECURITY';
    }

    // Check for greetings
    if (this.containsKeywords(message, this.intentPatterns.GREETING.keywords)) {
      return 'GREETING';
    }

    return 'GENERAL_CHAT';
  }

  /**
   * Extract entities from message based on intent
   */
  extractEntities(message, intent) {
    const entities = {};

    switch (intent) {
      case 'PAYMENT':
        // Extract amount (e.g., "500 NGN", "$100", "100 dollars")
        const amountMatch = message.match(/(\d+(?:\.\d{2})?)\s*(?:NGN|USD|dollars?|naira)/i);
        if (amountMatch) {
          entities.amount = parseFloat(amountMatch[1]);
          entities.currency = amountMatch[2] || 'NGN';
        }

        // Extract recipient (simplified - in real implementation, use NLP)
        const recipientMatch = message.match(/(?:to|for)\s+([A-Za-z\s]+)/i);
        if (recipientMatch) {
          entities.recipient_name = recipientMatch[1].trim();
        }
        break;

      case 'TRANSACTION_HISTORY':
        // Extract date ranges if mentioned
        const dateMatch = message.match(/(?:last|past)\s+(\d+)\s+(days?|weeks?|months?)/i);
        if (dateMatch) {
          entities.date_range = `${dateMatch[1]} ${dateMatch[2]}`;
        }
        break;
    }

    return entities;
  }

  /**
   * Calculate confidence score for intent classification
   */
  calculateConfidence(message, intent) {
    if (intent === 'GENERAL_CHAT') return 0.3;

    const keywords = this.intentPatterns[intent].keywords;
    const matches = keywords.filter(keyword =>
      message.includes(keyword.toLowerCase())
    ).length;

    // Base confidence on keyword matches
    let confidence = Math.min(matches * 0.3, 0.8);

    // Boost confidence for clear patterns
    if (intent === 'PAYMENT' && message.match(/\d+/)) {
      confidence += 0.1;
    }

    if (intent === 'GREETING' && message.split(' ').length <= 3) {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Validate intent against user context and business rules
   */
  validateIntent(intent, userContext) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresAdditionalAuth: false
    };

    switch (intent.intent) {
      case 'PAYMENT':
        // Check if amount is specified
        if (!intent.entities.amount || intent.entities.amount <= 0) {
          validation.isValid = false;
          validation.errors.push('Payment amount must be specified and greater than 0');
        }

        // Check balance
        if (intent.entities.amount > (userContext.balance || 0)) {
          validation.isValid = false;
          validation.errors.push('Insufficient balance for this transaction');
        }

        // Check transfer limits
        const limits = userContext.limits || {};
        if (intent.entities.amount > (limits.single_transfer_limit || 10000)) {
          validation.isValid = false;
          validation.errors.push(`Amount exceeds single transfer limit of ₦${limits.single_transfer_limit || 10000}`);
        }

        // High-value transactions require additional auth
        if (intent.entities.amount > 50000) {
          validation.requiresAdditionalAuth = true;
          validation.warnings.push('High-value transaction requires additional verification');
        }
        break;

      case 'SECURITY':
        // Security operations always require additional auth
        validation.requiresAdditionalAuth = true;
        break;
    }

    return validation;
  }

  /**
   * Generate response based on intent and validation
   */
  generateResponse(intent, validation, userContext) {
    const response = {
      message: '',
      actionRequired: null,
      suggestedActions: []
    };

    if (!validation.isValid) {
      response.message = `I encountered some issues: ${validation.errors.join(', ')}`;
      response.actionRequired = 'fix_errors';
      return response;
    }

    switch (intent.intent) {
      case 'GREETING':
        response.message = `Hello ${userContext.firstName || 'there'}! I'm your SznPay AI assistant. How can I help you with your banking needs today?`;
        response.suggestedActions = ['Check my balance', 'Transfer money', 'View transactions'];
        break;

      case 'BALANCE_INQUIRY':
        const balance = userContext.balance || 0;
        response.message = `Your current account balance is ₦${balance.toLocaleString()}.`;
        response.actionRequired = null;
        break;

      case 'PAYMENT':
        const amount = intent.entities.amount;
        const recipient = intent.entities.recipient_name || 'the recipient';
        response.message = `I'll help you transfer ₦${amount.toLocaleString()} to ${recipient}. ${validation.requiresAdditionalAuth ? 'This requires additional verification.' : 'Please confirm this transaction.'}`;
        response.actionRequired = validation.requiresAdditionalAuth ? 'authenticate' : 'confirm';
        response.suggestedActions = ['Confirm Transfer', 'Cancel'];
        break;

      case 'TRANSACTION_HISTORY':
        response.message = 'Here are your recent transactions. You can view the full history in your transaction dashboard.';
        response.actionRequired = null;
        break;

      case 'SECURITY':
        response.message = 'I can help you with security-related actions. This requires additional verification for your safety.';
        response.actionRequired = 'authenticate';
        response.suggestedActions = ['Lock Account', 'Enable MFA', 'Report Fraud'];
        break;

      default:
        response.message = "I'm here to help with your banking needs. You can ask me about transfers, balance inquiries, transaction history, or security settings.";
        response.actionRequired = null;
    }

        // Add warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      response.message += `\n\n⚠️ ${validation.warnings.join(', ')}`;
    }

    return response;
  }

  /**
   * Check if message contains any of the given keywords
   */
  containsKeywords(message, keywords) {
    return keywords.some(keyword =>
      message.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      supportedIntents: Object.keys(this.intentPatterns),
      totalIntents: Object.keys(this.intentPatterns).length,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new AIOrchestrationService();