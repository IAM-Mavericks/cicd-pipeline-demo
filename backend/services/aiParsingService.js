/**
 * AI Parsing Service
 * Natural Language Processing for banking commands
 * Supports English and Nigerian Pidgin
 */

const logger = require('../utils/logger');
const ZKPKnowledgeBase = require('../knowledge/zkpKnowledgeBase');

class AIParsingService {
  constructor() {
    // Intent patterns for English
    this.intentPatterns = {
      TRANSFER: {
        keywords: [
          'send', 'transfer', 'pay', 'give', 'wire', 'remit',
          'move money', 'send money', 'transfer to', 'pay to'
        ],
        pidginKeywords: [
          'send', 'transfer', 'give', 'pay', 'move', 'carry',
          'send money', 'give money', 'pay am', 'send give'
        ]
      },
      BILL_PAYMENT: {
        keywords: [
          'pay bill', 'bill payment', 'pay my', 'pay for',
          'dstv', 'gotv', 'startimes', 'electricity', 'nepa', 'phcn',
          'cable', 'subscription', 'recharge', 'renew'
        ],
        pidginKeywords: [
          'pay', 'pay bill', 'pay my', 'buy',
          'dstv', 'gotv', 'nepa', 'light', 'cable'
        ]
      },
      AIRTIME_PURCHASE: {
        keywords: [
          'buy airtime', 'recharge', 'top up', 'airtime',
          'mtn', 'glo', 'airtel', '9mobile', 'etisalat'
        ],
        pidginKeywords: [
          'buy airtime', 'buy credit', 'recharge', 'load',
          'mtn', 'glo', 'airtel', '9mobile'
        ]
      },
      BALANCE_INQUIRY: {
        keywords: [
          'balance', 'check balance', 'how much', 'account balance',
          'what is my balance', 'show balance', 'my balance',
          'my money', 'how much money', 'how much is in my account'
        ],
        pidginKeywords: [
          'balance', 'how much', 'wetin dey my account',
          'check balance', 'show me', 'how much I get'
        ]
      },
      TRANSACTION_HISTORY: {
        keywords: [
          'history', 'transactions', 'recent', 'last transactions',
          'show transactions', 'transaction history', 'statement'
        ],
        pidginKeywords: [
          'history', 'show me', 'wetin I don do',
          'my transactions', 'last transactions'
        ]
      },
      SPENDING_SUMMARY: {
        keywords: [
          'spend', 'spent', 'spending', 'expenses', 'expense',
          'how much did i spend', 'where did my money go',
          'spending summary', 'spending report'
        ],
        pidginKeywords: [
          'how much i don spend', 'how much i spend',
          'where my money go', 'my expenses', 'spending'
        ]
      },
      ZKP_INQUIRY: {
        keywords: [
          'zero knowledge', 'zkp', 'zk proof', 'zero knowledge proof',
          'private transaction', 'anonymous payment', 'privacy',
          'hide amount', 'private balance', 'secure proof',
          'what is zkp', 'explain zero knowledge', 'privacy features'
        ],
        pidginKeywords: [
          'privacy', 'hide', 'secret', 'anonymous',
          'private payment', 'secure transaction'
        ]
      },
      LOAN_REQUEST: {
        keywords: [
          'borrow', 'loan', 'lend', 'owe', 'debt', 'credit me'
        ],
        pidginKeywords: [
          'borrow', 'loan', 'gbese', 'owe'
        ]
      },
      SAVINGS_DEPOSIT: {
        keywords: [
          'save', 'savings', 'deposit', 'invest', 'kolo', 'piggybank'
        ],
        pidginKeywords: [
          'save', 'kolo', 'keep money'
        ]
      },
      TRANSACTION_ISSUE: {
        keywords: [
          'failed', 'fail', 'debit', 'pending', 'error', 'mistake',
          'reverse', 'refund'
        ],
        pidginKeywords: [
          'fail', 'cut my money', 'money hang', 'error'
        ]
      },
      CARD_MANAGEMENT: {
        keywords: [
          'block card', 'card stolen', 'lost card', 'new card', 'atm card'
        ],
        pidginKeywords: [
          'block card', 'thief carry my card', 'card don loss'
        ]
      },
      SECURITY_ISSUE: {
        keywords: [
          'fraud', 'hack', 'scam', 'pin', 'password', 'compromised'
        ],
        pidginKeywords: [
          'wayo', '419', 'ole', 'thief'
        ]
      }
    };

    // Load Dictionaries Dynamically
    this.supportedLanguages = ['pidgin', 'yoruba', 'igbo', 'hausa', 'swahili'];
    this.dictionaries = {};

    // Initialize empty structures for fallback
    this.slangVariations = {};
    this.contextMarkers = {};
    this.commonPhrases = {};

    this.supportedLanguages.forEach(lang => {
      try {
        const data = require(`../data/training/${lang}_dictionary.json`);
        this.dictionaries[lang] = data;

        // Aggregate markers and slangs
        if (data.context_markers) {
          this.contextMarkers[lang] = data.context_markers;
        }

        // Flatten slang variations for global lookup or per-language (currently per-language in logic)
        // Pidgin has specific structure for slang
        if (lang === 'pidgin' && data.slang_variations) {
          this.slangVariations = data.slang_variations;
        }

        // Aggregate common phrases for intent matching
        if (data.common_phrases) {
          this.commonPhrases[lang] = data.common_phrases;
        }

      } catch (e) {
        logger.warn(`Failed to load dictionary for ${lang}:`, e.message);
        this.dictionaries[lang] = { translations: {} };
      }
    });

    // Keep Amharic fallback directly since we didn't create a JSON for it yet
    this.dictionaries['amharic'] = {
      translations: {
        'ምን': 'what', 'ነው': 'is', 'እባክህ': 'please', 'ተያያዥ': 'let', 'አንተ': 'you', 'እኔ': 'I',
        'ስጥ': 'give', 'ላክ': 'send', 'ገዛ': 'buy', 'ክፈል': 'pay', 'እንዴት': 'how', 'አለ': 'have',
        'አካውንት': 'account', 'ገንዘብ': 'money', 'airtime': 'airtime', 'recharge': 'recharge',
        'ብርሃን': 'light', 'nepa': 'electricity'
      },
      context_markers: {
        question: ['ምን', 'እንዴት'],
        polite_request: ['እባክህ']
      }
    };
    this.contextMarkers['amharic'] = this.dictionaries['amharic'].context_markers;

    // Amount patterns
    this.amountPatterns = [
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:naira|ngn|₦)?/i,
      /₦\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /ngn\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*)\s*k/i, // e.g., "50k" = 50,000
      /(\d+)\s*thousand/i
    ];

    // Phone number patterns
    this.phonePatterns = [
      /\b(0[789][01]\d{8})\b/,  // Nigerian format: 080xxxxxxxx
      /\b(\+234[789][01]\d{8})\b/, // International format
      /\b(234[789][01]\d{8})\b/    // Without +
    ];

    // Account number patterns
    this.accountPatterns = [
      /\b(\d{10})\b/,  // 10-digit account number
      /account\s*(?:number|no\.?)?\s*:?\s*(\d{10})/i,
      /to\s+account\s+(\d{10})/i,  // "to account 0123456789"
      /account\s+(\d{10})/i  // "account 0123456789"
    ];

    // Network providers
    this.networks = ['mtn', 'glo', 'airtel', '9mobile', 'etisalat'];

    // Initialize ZKP Knowledge Base
    this.zkpKnowledge = new ZKPKnowledgeBase();
  }

  /**
   * Main parsing function
   */
  async parseCommand(message, context = {}) {
    try {
      const cleanedMessage = message.toLowerCase().trim();

      // Detect language
      const detectedLanguage = this.detectLanguage(cleanedMessage);

      // Translate to English if needed
      const translatedMessage = this.translateToEnglish(cleanedMessage, detectedLanguage);

      // Classify intent
      const intent = this.classifyIntent(translatedMessage, cleanedMessage, detectedLanguage);

      // Handle ZKP-related queries first
      if (intent === 'ZKP_INQUIRY') {
        const zkpResponse = this.zkpKnowledge.generateZKPResponse(translatedMessage);
        if (zkpResponse) {
          return {
            success: true,
            intent: 'ZKP_INQUIRY',
            response: zkpResponse.response,
            type: zkpResponse.type,
            followUp: zkpResponse.followUp,
            educationalContent: true
          };
        }
      }

      if (!intent) {
        return {
          success: false,
          error: 'Could not understand the command',
          suggestion: 'Try saying something like "Send 5000 naira to John" or "Check my balance"',
          response: detectedLanguage === 'pidgin'
            ? 'Abeg, I no understand wetin you talk. Try talk am again.'
            : 'Sorry, I didn\'t understand that. Can you rephrase?',
          originalLanguage: detectedLanguage,
          originalMessage: message
        };
      }

      // Extract entities based on intent
      const entities = this.extractEntities(translatedMessage, intent, context);

      // Validate extracted entities
      const validation = this.validateEntities(intent, entities);

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          missingFields: validation.missingFields,
          response: detectedLanguage === 'pidgin'
            ? `Abeg, I need more information: ${validation.error}`
            : `I need more information: ${validation.error}`,
          originalLanguage: detectedLanguage,
          intent
        };
      }

      // Calculate confidence score
      const confidence = this.calculateConfidence(translatedMessage, intent, entities);

      return {
        success: true,
        intent,
        entities,
        confidence,
        originalLanguage: detectedLanguage,
        translatedMessage: detectedLanguage === 'pidgin' ? translatedMessage : null,
        originalMessage: message
      };

    } catch (error) {
      logger.error('Error parsing command:', error);
      console.error(error);
      return {
        success: false,
        error: 'Failed to parse command',
        response: 'Sorry, something went wrong. Please try again.'
      };
    }
  }

  /**
   * Detect language from message
   */
  detectLanguage(message) {
    const cleanedMessage = message.toLowerCase().trim();
    let detectedLanguage = 'en';
    let highestScore = 0;

    // Check all loaded dictionaries
    const languages = [...this.supportedLanguages, 'amharic'];

    for (const lang of languages) {
      // Get context markers for the language
      const markersObj = this.contextMarkers[lang] || {};

      // Flatten all marker arrays into one list of indicators
      const indicators = Object.values(markersObj).flat();

      if (indicators.length === 0) continue;

      const score = indicators.filter(word =>
        cleanedMessage.includes(word.toLowerCase())
      ).length;

      if (score > highestScore) {
        highestScore = score;
        detectedLanguage = lang;
      }
    }

    // If no strong match, default to English
    return highestScore >= 1 ? detectedLanguage : 'en';
  }

  /**
   * Translate message to English based on detected language
   */
  translateToEnglish(message, language) {
    let translated = message;

    // 1. Handle Slang Variations (currently mostly Pidgin-based but applies globally if loaded)
    // e.g., "moni" -> "money", "akant" -> "account"
    if (this.slangVariations) {
      for (const [standard, variations] of Object.entries(this.slangVariations)) {
        for (const variant of variations) {
          const regex = new RegExp(`\\b${variant}\\b`, 'gi');
          translated = translated.replace(regex, standard);
        }
      }
    }

    // 2. Identify and use appropriate translation map
    let translationMap = {};
    if (this.dictionaries[language]) {
      // Handle Pidgin vs others structure (pidgin_translations vs translations)
      if (language === 'pidgin') {
        translationMap = this.dictionaries[language].pidgin_translations || {};
      } else {
        translationMap = this.dictionaries[language].translations || {};
      }
    }

    // 3. Apply Direct Translations
    for (const [nativeWord, english] of Object.entries(translationMap)) {
      // Use logic to replace words - handle exact matches or word boundaries
      const regex = new RegExp(`\\b${nativeWord}\\b`, 'gi');
      translated = translated.replace(regex, english);
    }

    return translated;
  }

  /**
   * Classify intent using both translated (English) and original (Pidgin/Native) messages
   */
  classifyIntent(translatedMessage, originalMessage, language = 'en') {
    let bestMatch = null;
    let highestScore = 0;
    const cleanedOriginal = originalMessage.toLowerCase();

    // 1. Check for Exact Phrase Match in Common Phrases (Highest Priority)
    // This allows for idiomatic expressions that don't translate well word-for-word
    if (this.commonPhrases[language]) {
      for (const phraseObj of this.commonPhrases[language]) {
        // Check if the original message contains the common phrase text
        // phraseObj format: { text: "...", english: "...", intent: "...", confidence: ... }
        // Note: Pidgin Dictionary uses "pidgin" key instead of "text"
        const phraseText = phraseObj.text || phraseObj.pidgin;
        if (phraseText && cleanedOriginal.includes(phraseText.toLowerCase())) {
          return phraseObj.intent; // Return immediately if strong match found
        }
      }
    }

    // 2. Keyword Matching (Fallback)
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      // 2a. Check English keywords against translated message
      const englishScore = patterns.keywords.filter(keyword =>
        this.keywordMatches(translatedMessage, keyword)
      ).length;

      // 2b. If Pidgin (Legacy check, eventually move all to Common Phrases or Generic method)
      let pidginScore = 0;
      if (language === 'pidgin' && patterns.pidginKeywords) {
        pidginScore = patterns.pidginKeywords.filter(keyword =>
          this.keywordMatches(originalMessage, keyword)
        ).length;
      }

      // Total score is max of either approach
      const totalScore = Math.max(englishScore, pidginScore);

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestMatch = intent;
      }
    }

    // Check translated message for context rules
    const message = translatedMessage;

    // Bias towards spending summaries when the user explicitly talks about
    // spending but not about "balance". This helps queries like
    // "How much have I spent on transport this week?" route to
    // SPENDING_SUMMARY instead of BALANCE_INQUIRY.
    const containsSpendWord =
      message.includes('spend') ||
      message.includes('spent') ||
      message.includes('spending');
    const mentionsBalance = message.includes('balance');

    if (containsSpendWord && !mentionsBalance) {
      if (!bestMatch || bestMatch === 'BALANCE_INQUIRY') {
        bestMatch = 'SPENDING_SUMMARY';
        highestScore = Math.max(highestScore, 1);
      }
    }

    return highestScore > 0 ? bestMatch : null;
  }

  keywordMatches(message, keyword) {
    const text = message.toLowerCase();
    const kw = String(keyword).toLowerCase();

    if (!kw.includes(' ')) {
      if (text === kw) return true;
      if (text.startsWith(kw + ' ')) return true;
      if (text.endsWith(' ' + kw)) return true;
      return text.includes(' ' + kw + ' ');
    }

    return text.includes(kw);
  }

  /**
   * Extract entities from message based on intent
   */
  extractEntities(message, intent, context) {
    const entities = {};

    // Extract amount
    const amount = this.extractAmount(message);
    if (amount) entities.amount = amount;

    // Extract phone number
    const phone = this.extractPhoneNumber(message);
    if (phone) entities.phoneNumber = phone;

    // Extract account number
    const account = this.extractAccountNumber(message);
    if (account) {
      if (intent === 'TRANSFER') {
        entities.recipientAccount = account; // For transfers, account number is recipient
      } else {
        entities.accountNumber = account;
      }
    }

    // Extract recipient name
    const recipientName = this.extractRecipientName(message);
    if (recipientName) entities.recipientName = recipientName;

    // Extract network provider
    const network = this.extractNetwork(message);
    if (network) entities.network = network;

    // Extract bill type and provider
    if (intent === 'BILL_PAYMENT') {
      const billInfo = this.extractBillInfo(message);
      Object.assign(entities, billInfo);
    }

    // Extract description/purpose
    const description = this.extractDescription(message);
    if (description) entities.description = description;

    // Extract simple time range indicators for history/spending intents
    if (intent === 'TRANSACTION_HISTORY' || intent === 'SPENDING_SUMMARY') {
      const timeRange = this.extractTimeRange(message);
      if (timeRange) {
        Object.assign(entities, timeRange);
      }
    }

    if (intent === 'SPENDING_SUMMARY') {
      const category = this.extractSpendingCategory(message);
      if (category) {
        entities.category = category;
      }
    }

    // Set defaults
    entities.currency = 'NGN';
    entities.sourceAccount = context.accounts?.[0]?.accountNumber;

    return entities;
  }

  /**
   * Extract simple time range indicators from the message
   */
  extractTimeRange(message) {
    const result = {};

    if (message.includes('today')) {
      result.timeRange = 'today';
    } else if (message.includes('yesterday')) {
      result.timeRange = 'yesterday';
    } else if (message.includes('this month') || message.includes('current month')) {
      result.timeRange = 'this_month';
    } else if (message.includes('last month') || message.includes('previous month')) {
      result.timeRange = 'last_month';
    } else if (message.includes('this week') || message.includes('current week')) {
      result.timeRange = 'this_week';
    } else if (message.includes('last week')) {
      result.timeRange = 'last_week';
    } else if (message.includes('last 7 days') || message.includes('last seven days')) {
      result.timeRange = 'last_7_days';
    } else if (message.includes('last 30 days') || message.includes('last thirty days')) {
      result.timeRange = 'last_30_days';
    }

    return result.timeRange ? result : null;
  }

  extractSpendingCategory(message) {
    const text = message.toLowerCase();

    if (
      text.includes('food') ||
      text.includes('restaurant') ||
      text.includes('eatery') ||
      text.includes('eat out') ||
      text.includes('jollof') ||
      text.includes('pizza') ||
      text.includes('chicken') ||
      text.includes('grocer') ||
      text.includes('supermarket')
    ) {
      return 'food';
    }

    if (
      text.includes('uber') ||
      text.includes('bolt') ||
      text.includes('ride') ||
      text.includes('taxi') ||
      text.includes('transport') ||
      text.includes('bus') ||
      text.includes('fuel') ||
      text.includes('petrol')
    ) {
      return 'transport';
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
      text.includes('bill') ||
      text.includes('electricity') ||
      text.includes('nepa') ||
      text.includes('phcn') ||
      text.includes('cable') ||
      text.includes('subscription') ||
      text.includes('tv')
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

    return null;
  }

  /**
   * Extract amount from message
   */
  extractAmount(message) {
    for (const pattern of this.amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        let amount = match[1].replace(/,/g, '');

        // Handle "k" suffix (thousands)
        if (message.match(/\d+\s*k/i)) {
          amount = parseFloat(amount) * 1000;
        }
        // Handle "thousand"
        else if (message.match(/\d+\s*thousand/i)) {
          amount = parseFloat(amount) * 1000;
        }

        return parseFloat(amount);
      }
    }
    return null;
  }

  /**
   * Extract phone number
   */
  extractPhoneNumber(message) {
    for (const pattern of this.phonePatterns) {
      const match = message.match(pattern);
      if (match) {
        let phone = match[1];
        // Normalize to Nigerian format
        phone = phone.replace(/^\+234/, '0').replace(/^234/, '0');
        return phone;
      }
    }
    return null;
  }

  /**
   * Extract account number
   */
  extractAccountNumber(message) {
    for (const pattern of this.accountPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Extract recipient name
   */
  extractRecipientName(message) {
    // Look for "to [name]" or "for [name]" patterns
    const patterns = [
      /(?:to|for|give)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,
      /(?:send|transfer|pay)\s+(?:\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:naira|ngn|₦)?\s+)?(?:to|for|give)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Exclude common words
        const name = match[1].trim();
        const excludeWords = ['account', 'number', 'naira', 'ngn', 'balance', 'bank', 'transfer'];
        if (!excludeWords.includes(name.toLowerCase()) && name.length > 1) {
          return name;
        }
      }
    }
    return null;
  }

  /**
   * Extract network provider
   */
  extractNetwork(message) {
    for (const network of this.networks) {
      if (message.includes(network)) {
        return network.toUpperCase();
      }
    }
    return null;
  }

  /**
   * Extract bill payment information
   */
  extractBillInfo(message) {
    const billInfo = {};

    // Cable TV providers
    const cableProviders = {
      'dstv': 'DSTV',
      'gotv': 'GOTV',
      'startimes': 'Startimes'
    };

    // Electricity providers
    const electricityProviders = {
      'eko': 'Eko Electricity',
      'ikeja': 'Ikeja Electric',
      'abuja': 'Abuja Electricity',
      'phcn': 'PHCN',
      'nepa': 'NEPA'
    };

    // Check for cable TV
    for (const [key, provider] of Object.entries(cableProviders)) {
      if (message.includes(key)) {
        billInfo.billType = 'cable_tv';
        billInfo.provider = provider;
        break;
      }
    }

    // Check for electricity
    if (!billInfo.billType) {
      for (const [key, provider] of Object.entries(electricityProviders)) {
        if (message.includes(key) || message.includes('electricity') || message.includes('light')) {
          billInfo.billType = 'electricity';
          billInfo.provider = provider;
          break;
        }
      }
    }

    // Check for internet
    if (!billInfo.billType && (message.includes('internet') || message.includes('data'))) {
      billInfo.billType = 'internet';
    }

    return billInfo;
  }

  /**
   * Extract description/purpose
   */
  extractDescription(message) {
    const patterns = [
      /for\s+(.+?)(?:\.|$)/i,
      /purpose:?\s+(.+?)(?:\.|$)/i,
      /description:?\s+(.+?)(?:\.|$)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Validate extracted entities
   */
  validateEntities(intent, entities) {
    const missingFields = [];

    switch (intent) {
      case 'TRANSFER':
        if (!entities.amount) missingFields.push('amount');
        if (!entities.recipientAccount && !entities.recipientName && !entities.accountNumber) {
          missingFields.push('recipient account or name');
        }
        break;

      case 'BILL_PAYMENT':
        if (!entities.amount) missingFields.push('amount');
        if (!entities.billType) missingFields.push('bill type');
        if (!entities.amount) missingFields.push('amount');
        if (!entities.billType) missingFields.push('bill type');
        // For electricity/cable, we might use saved beneficiaries or context, so strictly requiring account/phone here breaks simple NLP
        // Check if provider is known (e.g. NEPA/DSTV) which is enough for first pass
        if (!entities.provider && !entities.accountNumber && !entities.phoneNumber) {
          // Only enforce if we don't even know the provider
        }
        // But the previous code enforced it. Let's relax it for electricity if provider is known.
        if (entities.billType === 'electricity' || entities.billType === 'cable_tv') {
          // Allow proceeding if we at least know the bill type, prompts can happen later
        } else if (!entities.accountNumber && !entities.phoneNumber) {
          missingFields.push('account number or phone number');
        }
        break;

      case 'AIRTIME_PURCHASE':
        if (!entities.amount) missingFields.push('amount');
        if (!entities.phoneNumber) missingFields.push('phone number');
        break;

      case 'BALANCE_INQUIRY':
      case 'TRANSACTION_HISTORY':
        // No required fields
        break;
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required information: ${missingFields.join(', ')}`,
        missingFields
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(message, intent, entities) {
    let score = 0.5; // Base score

    // Increase score based on matched keywords
    const keywords = this.intentPatterns[intent]?.keywords || [];
    const matchedKeywords = keywords.filter(kw =>
      message.includes(kw.toLowerCase())
    ).length;
    score += (matchedKeywords / keywords.length) * 0.3;

    // Increase score based on extracted entities
    const entityCount = Object.keys(entities).length;
    score += Math.min(entityCount / 5, 0.2);

    return Math.min(score, 1.0);
  }
}

module.exports = new AIParsingService();
