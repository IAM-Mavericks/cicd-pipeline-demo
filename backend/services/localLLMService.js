const axios = require('axios');
const logger = require('../utils/logger');
const { setTimeout: sleep } = require('timers/promises');

class LocalLLMService {
  constructor() {
    this.baseUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
    this.model = process.env.LOCAL_LLM_MODEL || 'qwen2:1.5b';
    this.maxRetries = 2;
    this.initialDelay = 1000; // 1 second initial delay
  }

  async chat(messages, options = {}) {
    let maxTokens = options.maxTokens || 256;
    const payload = {
      model: options.model || this.model,
      messages,
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature: 0.3, // More focused and deterministic responses
        top_p: 0.9,
        repeat_penalty: 1.1,
        stop: ["\nUser:", "\nAI:", "\n\n", "<|im_end|>", "<|endoftext|>", "###"]
      }
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/chat`,
          payload,
          {
            timeout: options.timeout || 60000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        const data = response.data;
        if (!data || !data.message?.content) {
          throw new Error('Invalid response format from local LLM');
        }

        let responseText = data.message.content.trim();
        
        // Check for incomplete responses
        const lastPunctuation = Math.max(
          responseText.lastIndexOf('.'),
          responseText.lastIndexOf('!'),
          responseText.lastIndexOf('?')
        );
        
        if (lastPunctuation === -1 || lastPunctuation < responseText.length - 1) {
          const canRetry = attempt <= this.maxRetries;
          logger.warn('Response appears to be incomplete');

          if (canRetry) {
            maxTokens = Math.min(maxTokens * 2, 512);
            payload.options.num_predict = maxTokens;
            logger.info(`Retrying with increased token limit (${maxTokens})...`);
            await sleep(this.initialDelay);
            continue;
          }

          logger.warn('Returning best-effort response after max retries');
        }

        return responseText;
      } catch (error) {
        lastError = error;
        const isRateLimit = error.response?.status === 429;
        const isServerError = error.response?.status >= 500;
        
        if ((isRateLimit || isServerError) && attempt <= this.maxRetries) {
          const delay = this.initialDelay * Math.pow(2, attempt - 1);
          logger.warn(`Attempt ${attempt} failed (${error.message}). Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        
        if (attempt > this.maxRetries) {
          logger.error(`Failed after ${attempt} attempts. Last error:`, error.message);
          throw new Error(`Failed to get response from local LLM: ${error.message}`);
        }
      }
    }
    
    throw lastError;
  }

  async generateGeneralResponse(userMessage, context = {}) {
    const systemPrompt = `# SznPay AI Banking Assistant Guidelines

## Core Identity
- You are SznPay AI, the intelligent assistant for SznPay (ALWAYS spell it as "SznPay" with an 'n')
- You are knowledgeable about digital banking, financial services, and SznPay's specific offerings

## Banking Expertise
- You can explain banking concepts like:
  - Account types and features
  - Transaction processes
  - Security measures
  - Common banking terms
  - Regulatory compliance (CBN guidelines, KYC, etc.)

## SznPay-Specific Knowledge
- SznPay is a leading Nigerian digital bank offering:
  - Instant account opening
  - Free transfers to all Nigerian banks
  - Bill payments
  - Airtime and data purchases
  - Savings and investment products
  - Virtual and physical cards

## Response Guidelines
1. ALWAYS maintain a professional, helpful tone
2. For transaction-specific queries, guide users to the appropriate section of the app
3. Never share or make up account numbers, balances, or transaction details
4. If unsure, direct users to SznPay customer support
5. Keep responses clear and concise (2-3 sentences unless more detail is needed)
6. Always use proper financial terminology
7. Never provide financial advice - only factual information

## Safety & Compliance
- NEVER ask for or store sensitive information
- ALWAYS direct security concerns to SznPay's official support channels
- Remind users to never share their PIN, password, or OTP with anyone`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    return this.chat(messages);
  }
}

module.exports = new LocalLLMService();
