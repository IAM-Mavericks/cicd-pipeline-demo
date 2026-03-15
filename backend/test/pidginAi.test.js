const assert = require('assert');
const aiParsingService = require('../services/aiParsingService');

// Mock context for tests
const mockContext = {
    user: {
        firstName: 'Emeka',
        id: 'user123'
    },
    accounts: [
        { accountNumber: '1234567890', balance: 50000 }
    ]
};

describe('Pidgin AI Parsing Tests', () => {

    describe('Language Detection', () => {
        it('should detect Pidgin language correctly', async () => {
            // Direct detection via public method if available, or implied via parsing result
            const result = await aiParsingService.parseCommand('Abeg wetin dey my account?', mockContext);
            // We can't check internal state easily, but we can check if the response/handling works
            assert.strictEqual(result.intent, 'BALANCE_INQUIRY', 'Should detect balance inquiry from "wetin dey my account"');
        });

        it('should detect slang variation "akant"', async () => {
            const result = await aiParsingService.parseCommand('Check my akant balance', mockContext);
            // "akant" is in slang_variations
            assert.strictEqual(result.intent, 'BALANCE_INQUIRY', 'Should understand "akant" as account');
        });
    });

    describe('Intent Classification', () => {
        it('should classify TRANSFER intent with "send give"', async () => {
            const result = await aiParsingService.parseCommand('Abeg send 5k give Chinedu', mockContext);
            assert.strictEqual(result.intent, 'TRANSFER');
            assert.strictEqual(result.entities.amount, 5000);
            assert.strictEqual(result.entities.recipientName.toLowerCase(), 'chinedu');
        });

        it('should classify BILL_PAYMENT intent with "nepa"', async () => {
            const result = await aiParsingService.parseCommand('I wan buy nepa light 2000 naira for 1234567890', mockContext);
            assert.strictEqual(result.intent, 'BILL_PAYMENT');
            assert.strictEqual(result.entities.amount, 2000);
            assert.strictEqual(result.entities.billType, 'electricity'); // "light" -> electricity
        });

        it('should classify AIRTIME intent with "load credit"', async () => {
            const result = await aiParsingService.parseCommand('Abeg load 500 naira credit for 08012345678', mockContext);
            assert.strictEqual(result.intent, 'AIRTIME_PURCHASE');
            assert.strictEqual(result.entities.amount, 500);
        });
    });

    describe('Synonym/Slang Handling', () => {
        it('should handle "moni" as "money"', async () => {
            const result = await aiParsingService.parseCommand('Show me my moni', mockContext);
            // "Show me my money" -> BALANCE_INQUIRY
            assert.strictEqual(result.intent, 'BALANCE_INQUIRY');
        });

        it('should handle "kudi" as "money" (Hausa slang)', async () => {
            const result = await aiParsingService.parseCommand('Wetin be my kudi?', mockContext);
            assert.strictEqual(result.intent, 'BALANCE_INQUIRY');
        });
    });

    describe('Regional Variations', () => {
        // These might need specific logic in the service to pass if they aren't globally mapped
        it('should handle "biko" as "please" (Igbo influence)', async () => {
            const result = await aiParsingService.parseCommand('Biko send 1000 to Mum', mockContext);
            assert.strictEqual(result.intent, 'TRANSFER');
        });
    });
});
