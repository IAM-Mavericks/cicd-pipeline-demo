const aiParsingService = require('../services/aiParsingService');

async function run() {
    console.log('--- Debugging Multi-Language AI ---');

    // Check loaded languages
    console.log('Supported Languages:', aiParsingService.supportedLanguages);
    console.log('Dictionaries Loaded:', Object.keys(aiParsingService.dictionaries));
    console.log('Common Phrases Keys:', Object.keys(aiParsingService.commonPhrases));

    const testCases = [
        { text: 'bawo ni owo mi se to', lang: 'yoruba' },
        { text: 'nataka kutuma pesa', lang: 'swahili' },
        { text: 'borrow me money', lang: 'pidgin' }
    ];

    for (const test of testCases) {
        console.log(`\nTesting [${test.lang}]: "${test.text}"`);
        const detected = aiParsingService.detectLanguage(test.text);
        console.log(`Detected Language: ${detected}`);

        const phrases = aiParsingService.commonPhrases[detected];
        console.log(`Common Phrases for ${detected}:`, phrases ? phrases.length : 'None');

        if (phrases) {
            const match = phrases.find(p => test.text.includes((p.text || p.pidgin).toLowerCase()));
            console.log('Found common phrase match?', match);
        }

        const result = await aiParsingService.parseCommand(test.text);
        console.log('Parse Result:', JSON.stringify(result, null, 2));
    }
}

run();
