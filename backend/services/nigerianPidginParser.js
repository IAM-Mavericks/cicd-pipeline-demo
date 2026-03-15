/**
 * Nigerian Pidgin Language Parser
 * Handles natural language understanding for Nigerian Pidgin English
 * Supports conversational banking in Pidgin
 */

class NigerianPidginParser {
  constructor() {
    // Pidgin to English intent mappings
    this.intentPatterns = {
      TRANSFER_MONEY: [
        /send.*money/i,
        /transfer/i,
        /make.*pay/i,
        /abeg.*send/i,
        /i.*wan.*send/i,
        /i.*dey.*send/i,
        /give.*person/i,
        /pay.*am/i,
        /drop.*money/i,
        /settle.*person/i
      ],
      CHECK_BALANCE: [
        /how.*much.*i.*get/i,
        /wetin.*my.*balance/i,
        /show.*me.*money/i,
        /check.*balance/i,
        /my.*account.*balance/i,
        /how.*far.*my.*money/i,
        /wetin.*dey.*my.*account/i,
        /i.*get.*money/i
      ],
      BUY_AIRTIME: [
        /buy.*airtime/i,
        /recharge.*card/i,
        /load.*credit/i,
        /i.*wan.*buy.*airtime/i,
        /abeg.*help.*me.*buy/i,
        /make.*you.*load/i
      ],
      PAY_BILLS: [
        /pay.*bill/i,
        /pay.*light/i,
        /buy.*nepa/i,
        /pay.*dstv/i,
        /pay.*gotv/i,
        /settle.*bill/i,
        /i.*wan.*pay/i
      ],
      GREETING: [
        /how.*far/i,
        /wetin.*dey/i,
        /how.*you.*dey/i,
        /good.*morning/i,
        /good.*afternoon/i,
        /good.*evening/i,
        /hello/i,
        /hi/i,
        /hey/i
      ],
      HELP: [
        /help.*me/i,
        /i.*need.*help/i,
        /abeg/i,
        /wetin.*i.*fit.*do/i,
        /show.*me/i
      ]
    };

    // Pidgin number words to digits
    this.numberWords = {
      'one': 1, 'wan': 1,
      'two': 2, 'tu': 2,
      'three': 3, 'tri': 3,
      'four': 4, 'fo': 4,
      'five': 5, 'faiv': 5,
      'six': 6, 'siks': 6,
      'seven': 7, 'seven': 7,
      'eight': 8, 'eit': 8,
      'nine': 9, 'nain': 9,
      'ten': 10, 'ten': 10,
      'hundred': 100, 'handred': 100,
      'thousand': 1000, 'tausand': 1000,
      'million': 1000000, 'milion': 1000000
    };

    // Pidgin currency terms
    this.currencyTerms = {
      'naira': 'NGN',
      'kobo': 'NGN',
      'dollar': 'USD',
      'dola': 'USD',
      'pounds': 'GBP',
      'euro': 'EUR'
    };

    // Common Pidgin phrases and their English equivalents
    this.pidginToEnglish = {
      'i wan': 'I want to',
      'make you': 'please',
      'abeg': 'please',
      'how far': 'how are you',
      'wetin': 'what',
      'dey': 'is/are',
      'no be': 'is not',
      'na': 'is/it is',
      'abi': 'right?',
      'shey': 'is it?',
      'comot': 'remove',
      'enter': 'deposit',
      'carry': 'take',
      'drop': 'send',
      'settle': 'pay',
      'person': 'someone'
    };
  }

  /**
   * Parse Pidgin input and extract intent
   * @param {string} input - User input in Pidgin
   * @returns {Object} - Parsed intent and entities
   */
  parseIntent(input) {
    const normalizedInput = input.toLowerCase().trim();

    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedInput)) {
          return {
            intent,
            confidence: 0.85,
            originalInput: input,
            normalizedInput
          };
        }
      }
    }

    return {
      intent: 'UNKNOWN',
      confidence: 0.3,
      originalInput: input,
      normalizedInput
    };
  }

  /**
   * Extract amount from Pidgin text
   * @param {string} text - Input text
   * @returns {number|null} - Extracted amount
   */
  extractAmount(text) {
    const normalizedText = text.toLowerCase();

    // Try to find numeric amount first
    const numericMatch = normalizedText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (numericMatch) {
      return parseFloat(numericMatch[1].replace(/,/g, ''));
    }

    // Try to extract from word form
    // e.g., "five thousand naira" or "faiv tausand naira"
    let amount = 0;
    let currentNumber = 0;

    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (this.numberWords[word]) {
        const value = this.numberWords[word];
        
        if (value >= 100) {
          // Multiplier (hundred, thousand, million)
          currentNumber = currentNumber === 0 ? value : currentNumber * value;
        } else {
          // Regular number
          currentNumber += value;
        }
      } else if (this.currencyTerms[word]) {
        // Currency term found, finalize amount
        amount += currentNumber;
        break;
      }
    }

    return amount > 0 ? amount : null;
  }

  /**
   * Extract recipient from Pidgin text
   * @param {string} text - Input text
   * @returns {string|null} - Recipient name or identifier
   */
  extractRecipient(text) {
    const normalizedText = text.toLowerCase();

    // Patterns for recipient extraction
    const patterns = [
      /(?:send|transfer|give|pay|drop|settle)\s+(?:money\s+)?(?:to|for|give)\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|account|number)/i,
      /(?:for|to)\s+([a-zA-Z\s]+?)(?:'s|s)?\s+account/i,
      /person\s+wey\s+name\s+(?:be\s+)?([a-zA-Z\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract phone number from text
   * @param {string} text - Input text
   * @returns {string|null} - Phone number
   */
  extractPhoneNumber(text) {
    // Nigerian phone number patterns
    const patterns = [
      /\b(0[789][01]\d{8})\b/,  // 080, 081, 070, 090, etc.
      /\b(\+234[789][01]\d{8})\b/,  // +234 format
      /\b(234[789][01]\d{8})\b/  // 234 format without +
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Translate Pidgin to English for better processing
   * @param {string} pidginText - Text in Pidgin
   * @returns {string} - Translated English text
   */
  translateToEnglish(pidginText) {
    let englishText = pidginText.toLowerCase();

    // Replace common Pidgin phrases
    for (const [pidgin, english] of Object.entries(this.pidginToEnglish)) {
      const regex = new RegExp(pidgin, 'gi');
      englishText = englishText.replace(regex, english);
    }

    return englishText;
  }

  /**
   * Generate response in Pidgin
   * @param {string} intent - Intent type
   * @param {Object} data - Response data
   * @returns {string} - Pidgin response
   */
  generatePidginResponse(intent, data = {}) {
    const responses = {
      TRANSFER_MONEY: {
        confirm: `Abeg confirm say you wan send ${data.amount ? '₦' + data.amount : 'money'} to ${data.recipient || 'this person'}. Na correct?`,
        success: `E don enter! ${data.recipient || 'Person'} don receive the ${data.amount ? '₦' + data.amount : 'money'}. ✅`,
        error: 'Wahala dey o! The transfer no work. Make you try again.'
      },
      CHECK_BALANCE: {
        success: `Your balance na ${data.balance ? '₦' + data.balance : 'loading...'}. You dey kampe! 💰`,
        error: 'Abeg, I no fit check your balance now. Try again.'
      },
      BUY_AIRTIME: {
        confirm: `You wan buy ${data.amount ? '₦' + data.amount : ''} airtime for ${data.phoneNumber || 'this number'}. Abi?`,
        success: `Airtime don load! ${data.amount ? '₦' + data.amount : 'Your credit'} don enter ${data.phoneNumber || 'the number'}. 📱`,
        error: 'The airtime no load. Make you try again abeg.'
      },
      PAY_BILLS: {
        confirm: `You wan pay ${data.billType || 'bill'} - ${data.amount ? '₦' + data.amount : ''}. Na so?`,
        success: `Bill don pay finish! Your ${data.billType || 'payment'} successful. ✅`,
        error: 'The payment no work. Try again abeg.'
      },
      GREETING: {
        success: 'How far! I dey here to help you with your money matter. Wetin you wan do? 😊'
      },
      HELP: {
        success: `I fit help you with:\n- Send money (talk say "send 5000 to John")\n- Check balance (talk say "wetin my balance be")\n- Buy airtime (talk say "buy 500 airtime")\n- Pay bills (talk say "pay my DSTV")\n\nWetin you wan do?`
      },
      UNKNOWN: {
        error: 'Abeg, I no understand wetin you talk. Make you talk am again or ask for help.'
      }
    };

    const intentResponses = responses[intent] || responses.UNKNOWN;
    return intentResponses[data.type || 'success'] || intentResponses.success || intentResponses.error;
  }

  /**
   * Full parse pipeline for Pidgin input
   * @param {string} input - User input in Pidgin
   * @returns {Object} - Complete parsed result
   */
  parse(input) {
    const intentResult = this.parseIntent(input);
    const amount = this.extractAmount(input);
    const recipient = this.extractRecipient(input);
    const phoneNumber = this.extractPhoneNumber(input);
    const englishTranslation = this.translateToEnglish(input);

    return {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: {
        amount,
        recipient,
        phoneNumber,
        currency: 'NGN' // Default to Naira for Nigerian users
      },
      originalInput: input,
      englishTranslation,
      language: 'pidgin'
    };
  }

  /**
   * Detect if input is in Pidgin
   * @param {string} text - Input text
   * @returns {boolean} - True if likely Pidgin
   */
  isPidgin(text) {
    const pidginIndicators = [
      'abeg', 'wetin', 'dey', 'wan', 'how far', 'na so', 'abi', 'shey',
      'comot', 'enter', 'carry', 'drop', 'settle', 'no be'
    ];

    const normalizedText = text.toLowerCase();
    return pidginIndicators.some(indicator => normalizedText.includes(indicator));
  }
}

module.exports = new NigerianPidginParser();
