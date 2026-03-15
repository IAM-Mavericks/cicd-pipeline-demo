const LocalLLMService = require('./services/localLLMService');

async function testLLM() {
  try {
    console.log('Testing LocalLLMService integration...');

    const testQueries = [
      'How do I check my balance?',
      'I lost my card',
      'How do I send money?',
      "What's the daily transfer limit?"
    ];

    for (const query of testQueries) {
      console.log(`\nQuery: ${query}`);
      const response = await LocalLLMService.generateGeneralResponse(query);
      console.log(`Response: ${response}`);
      console.log('---');
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLLM();
