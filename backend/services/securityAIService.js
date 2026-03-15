/**
 * Security AI Service
 * AI-powered cyber security agent for threat detection and user education
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class SecurityAIService {
  constructor() {
    this.securityKnowledge = this.loadSecurityData('security_knowledge.json');
    this.securityPatterns = this.loadSecurityData('security_patterns.json');
    this.threatDatabase = new Map(); // In-memory threat tracking
    this.userEducationHistory = new Map(); // Track what users have learned
  }

  /**
   * Load security training data
   */
  loadSecurityData(filename) {
    try {
      const filePath = path.join(__dirname, '../data/training', filename);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error loading ${filename}:`, error);
      return null;
    }
  }

  /**
   * Analyze message for security threats
   */
  async analyzeMessage(message, context = {}) {
    const threats = [];
    const warnings = [];
    let riskScore = 0;

    // Check for phishing keywords
    const phishingDetected = this.detectPhishing(message);
    if (phishingDetected.detected) {
      threats.push({
        type: 'phishing',
        severity: 'high',
        indicators: phishingDetected.indicators,
        response: phishingDetected.response
      });
      riskScore += 40;
    }

    // Check for social engineering
    const socialEngineering = this.detectSocialEngineering(message);
    if (socialEngineering.detected) {
      threats.push({
        type: 'social_engineering',
        severity: 'high',
        indicators: socialEngineering.indicators,
        response: socialEngineering.response
      });
      riskScore += 35;
    }

    // Check for credential requests
    if (this.detectCredentialRequest(message)) {
      threats.push({
        type: 'credential_theft',
        severity: 'critical',
        response: '🚨 CRITICAL: Never share your PIN, password, or OTP with anyone!'
      });
      riskScore += 50;
    }

    // Check for scam patterns
    const scamDetected = this.detectScamPattern(message);
    if (scamDetected.detected) {
      threats.push({
        type: 'scam',
        severity: 'high',
        scamType: scamDetected.scamType,
        response: scamDetected.response
      });
      riskScore += 45;
    }

    return {
      safe: threats.length === 0,
      riskScore: Math.min(riskScore, 100),
      threats,
      warnings,
      recommendation: this.generateSecurityRecommendation(threats, riskScore)
    };
  }

  /**
   * Detect phishing attempts
   */
  detectPhishing(message) {
    const phishingKeywords = this.securityPatterns.suspicious_patterns.phishing_keywords;
    const detected = [];

    for (const keyword of phishingKeywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        detected.push(keyword);
      }
    }

    if (detected.length > 0) {
      return {
        detected: true,
        indicators: detected,
        response: this.securityKnowledge.security_threats.phishing.responses[0]
      };
    }

    return { detected: false };
  }

  /**
   * Detect social engineering
   */
  detectSocialEngineering(message) {
    const phrases = this.securityPatterns.suspicious_patterns.social_engineering_phrases;
    const detected = [];

    for (const phrase of phrases) {
      if (message.toLowerCase().includes(phrase.toLowerCase())) {
        detected.push(phrase);
      }
    }

    // Check for urgency indicators
    const urgencyWords = ['urgent', 'immediately', 'now', 'quick', 'hurry', 'asap'];
    const hasUrgency = urgencyWords.some(word => message.toLowerCase().includes(word));

    if (detected.length > 0 || hasUrgency) {
      return {
        detected: true,
        indicators: detected,
        hasUrgency,
        response: this.securityKnowledge.security_threats.social_engineering.responses[0]
      };
    }

    return { detected: false };
  }

  /**
   * Detect credential requests
   */
  detectCredentialRequest(message) {
    const credentialKeywords = [
      'pin', 'password', 'otp', 'bvn', 'cvv', 'card number',
      'account number', 'login', 'username', 'passcode'
    ];

    const requestWords = ['send', 'share', 'give', 'provide', 'tell', 'what is'];

    const hasCredentialKeyword = credentialKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    const hasRequestWord = requestWords.some(word => 
      message.toLowerCase().includes(word)
    );

    return hasCredentialKeyword && hasRequestWord;
  }

  /**
   * Detect scam patterns
   */
  detectScamPattern(message) {
    const threatPatterns = this.securityPatterns.security_questions.threat_detection;

    for (const pattern of threatPatterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(message)) {
        return {
          detected: true,
          scamType: pattern.threat_type,
          severity: pattern.severity,
          response: pattern.response
        };
      }
    }

    return { detected: false };
  }

  /**
   * Analyze transaction for fraud
   */
  async analyzeTransaction(transaction, userContext) {
    let riskScore = 0;
    const riskFactors = [];

    const rules = this.securityPatterns.risk_scoring_rules.transaction_risk;

    // Check amount vs user average
    if (transaction.amount > userContext.averageTransaction * 3) {
      riskScore += 30;
      riskFactors.push('Amount significantly higher than normal');
    }

    // Check for new recipient
    if (transaction.newRecipient && transaction.amount > 50000) {
      riskScore += 25;
      riskFactors.push('Large transfer to new recipient');
    }

    // Check transaction time
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) {
      riskScore += 20;
      riskFactors.push('Transaction during unusual hours');
    }

    // Check velocity
    if (userContext.transactionsLastHour > 5) {
      riskScore += 35;
      riskFactors.push('High velocity of transactions');
    }

    // Check for round numbers
    if (transaction.amount % 100000 === 0 && transaction.amount >= 100000) {
      riskScore += 15;
      riskFactors.push('Large round number (common in fraud)');
    }

    // Check device fingerprint
    if (userContext.deviceMismatch) {
      riskScore += 40;
      riskFactors.push('Transaction from unrecognized device');
    }

    // Check location
    if (userContext.locationMismatch) {
      riskScore += 30;
      riskFactors.push('Transaction from unusual location');
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Log security event
    logger.logSecurityEvent({
      eventType: 'transaction_risk_analysis',
      userId: userContext.userId,
      transactionId: transaction.id,
      riskScore,
      riskLevel,
      riskFactors,
      severity: riskLevel === 'critical' ? 'high' : 'medium'
    });

    return {
      riskScore,
      riskLevel,
      riskFactors,
      requiresEnhancedAuth: riskScore > 60,
      shouldBlock: riskScore > 80,
      authMethods: this.getRequiredAuthMethods(riskLevel),
      userMessage: this.generateRiskMessage(riskLevel, riskFactors)
    };
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score <= 30) return 'low';
    if (score <= 60) return 'medium';
    if (score <= 80) return 'high';
    return 'critical';
  }

  /**
   * Get required authentication methods based on risk
   */
  getRequiredAuthMethods(riskLevel) {
    const levels = this.securityPatterns.risk_scoring_rules.risk_levels;
    return levels[riskLevel]?.auth_required || 'PIN only';
  }

  /**
   * Generate risk message for user
   */
  generateRiskMessage(riskLevel, factors) {
    const messages = {
      low: '✅ Transaction appears normal. Proceed with PIN.',
      medium: '⚠️ This transaction requires additional verification. We\'ll send you an OTP.',
      high: '🛡️ For your security, this transaction requires enhanced verification (PIN + OTP + Biometric).',
      critical: '🚨 This transaction has been flagged for review. Our security team will verify it shortly.'
    };

    let message = messages[riskLevel] || messages.medium;

    if (factors.length > 0) {
      message += '\n\nSecurity notes:\n' + factors.map(f => `• ${f}`).join('\n');
    }

    return message;
  }

  /**
   * Educate user about security
   */
  async educateUser(userId, topic) {
    const education = this.securityKnowledge.security_education;

    switch (topic) {
      case 'phishing':
        return this.formatEducationResponse(
          'What is Phishing?',
          education.common_scams.find(s => s.name.includes('Fake'))
        );

      case 'password_security':
        return this.formatEducationResponse(
          'Password Security Best Practices',
          this.securityKnowledge.security_best_practices.password_security
        );

      case 'safe_banking':
        return this.formatEducationResponse(
          'Safe Banking Habits',
          { tips: education.safe_banking_habits }
        );

      case 'common_scams':
        return this.formatScamsResponse(education.common_scams);

      case 'red_flags':
        return this.formatRedFlagsResponse(education.red_flags);

      default:
        return this.getGeneralSecurityTips();
    }
  }

  /**
   * Format education response
   */
  formatEducationResponse(title, content) {
    let response = `📚 ${title}\n\n`;

    if (content.description) {
      response += `${content.description}\n\n`;
    }

    if (content.rules) {
      response += '✅ Key Rules:\n';
      content.rules.forEach(rule => {
        response += `• ${rule}\n`;
      });
    }

    if (content.tips) {
      response += '\n💡 Pro Tips:\n';
      content.tips.forEach(tip => {
        response += `• ${tip}\n`;
      });
    }

    return response;
  }

  /**
   * Format scams response
   */
  formatScamsResponse(scams) {
    let response = '🚨 Common Scams to Watch Out For:\n\n';

    scams.forEach((scam, index) => {
      response += `${index + 1}. ${scam.name}\n`;
      response += `   ${scam.description}\n`;
      response += `   Prevention: ${scam.prevention}\n\n`;
    });

    return response;
  }

  /**
   * Format red flags response
   */
  formatRedFlagsResponse(redFlags) {
    let response = '🚩 Security Red Flags:\n\n';
    response += 'Be suspicious if you encounter:\n\n';

    redFlags.forEach(flag => {
      response += `• ${flag}\n`;
    });

    response += '\nIf you see any of these, stop and verify through official channels!';

    return response;
  }

  /**
   * Get general security tips
   */
  getGeneralSecurityTips() {
    return `🔐 SznPay Security Tips:

✅ DO:
• Use strong, unique passwords
• Enable two-factor authentication
• Check your account regularly
• Report suspicious activity immediately
• Keep your app updated
• Use official channels only

❌ DON'T:
• Share your PIN, password, or OTP
• Click suspicious links
• Use public WiFi for banking
• Save passwords in browsers
• Ignore security alerts
• Trust unsolicited messages

Need specific advice? Ask me about:
• Phishing
• Password security
• Common scams
• Safe banking habits`;
  }

  /**
   * Generate security recommendation
   */
  generateSecurityRecommendation(threats, riskScore) {
    if (threats.length === 0) {
      return '✅ No security threats detected. Stay vigilant!';
    }

    let recommendation = '⚠️ Security Recommendations:\n\n';

    threats.forEach((threat, index) => {
      recommendation += `${index + 1}. ${threat.response}\n\n`;
    });

    if (riskScore > 70) {
      recommendation += '🚨 High risk detected. Consider:\n';
      recommendation += '• Changing your password\n';
      recommendation += '• Reviewing recent activity\n';
      recommendation += '• Contacting support\n';
      recommendation += '• Enabling additional security features\n';
    }

    return recommendation;
  }

  /**
   * Check if user query is security-related
   */
  isSecurityQuery(message) {
    const securityKeywords = [
      'security', 'safe', 'secure', 'protect', 'scam', 'fraud',
      'phishing', 'hack', 'suspicious', 'threat', 'risk',
      'password', 'pin', 'otp', 'account safety'
    ];

    return securityKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Handle security question
   */
  async handleSecurityQuestion(message, userId) {
    const questions = this.securityPatterns.security_questions.user_education;

    // Find matching question
    for (const q of questions) {
      const matches = q.triggers.some(trigger => 
        message.toLowerCase().includes(trigger.toLowerCase())
      );

      if (matches) {
        // Log education event
        logger.logSecurityEvent({
          eventType: 'security_education',
          userId,
          question: q.question,
          severity: 'low'
        });

        return {
          success: true,
          response: q.response,
          educationProvided: true
        };
      }
    }

    // If no specific match, provide general security info
    return {
      success: true,
      response: this.getGeneralSecurityTips(),
      educationProvided: true
    };
  }

  /**
   * Detect account takeover attempt
   */
  detectAccountTakeover(loginAttempts, userContext) {
    const indicators = [];
    let riskScore = 0;

    // Multiple failed logins
    if (loginAttempts.failedCount > 3) {
      indicators.push('Multiple failed login attempts');
      riskScore += 40;
    }

    // Device mismatch
    if (userContext.deviceFingerprint !== userContext.lastKnownDevice) {
      indicators.push('Login from unrecognized device');
      riskScore += 35;
    }

    // Location mismatch
    if (userContext.location !== userContext.lastKnownLocation) {
      indicators.push('Login from unusual location');
      riskScore += 30;
    }

    // Unusual time
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) {
      indicators.push('Login during unusual hours');
      riskScore += 15;
    }

    const shouldBlock = riskScore > 60;

    if (shouldBlock) {
      logger.logSecurityEvent({
        eventType: 'account_takeover_attempt',
        userId: userContext.userId,
        riskScore,
        indicators,
        severity: 'critical',
        action: 'account_locked'
      });
    }

    return {
      detected: shouldBlock,
      riskScore,
      indicators,
      action: shouldBlock ? 'lock_account' : 'challenge',
      message: shouldBlock ? 
        this.securityPatterns.automated_responses.security_alerts.account_takeover_suspected.message :
        this.securityPatterns.automated_responses.security_alerts.unusual_login.message
    };
  }
}

module.exports = new SecurityAIService();
