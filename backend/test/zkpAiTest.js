/**
 * Test script for ZKP AI integration
 * Run this to verify ZKP knowledge base is working
 */

const AIParsingService = require('../services/aiParsingService');

async function testZKPAI() {
  const aiService = new AIParsingService();
  
  console.log('🧪 Testing ZKP AI Integration\n');
  
  const testQueries = [
    "What is zero knowledge proof?",
    "How can ZKP help SznPay?",
    "Explain private transactions",
    "Can you hide transaction amounts?",
    "How do I learn zero knowledge proofs?",
    "What are the benefits of ZKP in banking?",
    "zkp privacy features"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await aiService.parseCommand(query);
      
      if (result.success && result.intent === 'ZKP_INQUIRY') {
        console.log('✅ ZKP Intent Recognized');
        console.log(`📋 Type: ${result.type}`);
        console.log(`💬 Response: ${result.response.substring(0, 100)}...`);
        if (result.followUp) {
          console.log(`🔄 Follow-up: ${result.followUp}`);
        }
      } else {
        console.log('❌ ZKP Intent Not Recognized');
        console.log(`🎯 Detected Intent: ${result.intent || 'None'}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n🎉 ZKP AI Test Complete!');
}

// Run the test
if (require.main === module) {
  testZKPAI().catch(console.error);
}

module.exports = testZKPAI;
