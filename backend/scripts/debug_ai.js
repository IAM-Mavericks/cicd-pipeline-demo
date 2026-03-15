const aiParsingService = require('../services/aiParsingService');

async function run() {
    console.log('--- Debugging AI Parsing ---');

    const text = 'Biko send 1000 to Mum';
    console.log(`Original: "${text}"`);

    // Inspect internal state if possible, or just run parseCommand
    console.log('Slang Variations Loaded:', Object.keys(aiParsingService.slangVariations || {}).length);

    const result = await aiParsingService.parseCommand(text, { user: { id: '123' } });
    console.log('Result:', JSON.stringify(result, null, 2));

    // Test another one
    const text2 = 'Abeg wetin dey my account';
    const result2 = await aiParsingService.parseCommand(text2);
    console.log(`Command: "${text2}"`);
    console.log('Result:', JSON.stringify(result2, null, 2));

    // Test explicit failure case from before
    if (!result.intent) {
        console.log('FAIL: Intent not recognized for Biko');
    } else {
        console.log('SUCCESS: Intent recognized:', result.intent);
    }
}

run();
