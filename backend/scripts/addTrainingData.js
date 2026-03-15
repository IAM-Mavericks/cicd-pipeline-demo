/**
 * Training Data Management Script
 * Add, update, and manage training data for the AI
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const TRAINING_DIR = path.join(__dirname, '../data/training');

// Load existing training data
function loadTrainingData(filename) {
  const filePath = path.join(TRAINING_DIR, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return null;
  }
}

// Save training data
function saveTrainingData(filename, data) {
  const filePath = path.join(TRAINING_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved to ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message);
    return false;
  }
}

// Add new intent pattern
function addIntentPattern() {
  const intentsData = loadTrainingData('intents.json');
  if (!intentsData) return;

  console.log('\n📝 Add New Intent Pattern\n');
  console.log('Available intents:');
  intentsData.intents.forEach((intent, index) => {
    console.log(`${index + 1}. ${intent.intent}`);
  });

  rl.question('\nSelect intent number: ', (intentNum) => {
    const intentIndex = parseInt(intentNum) - 1;
    if (intentIndex < 0 || intentIndex >= intentsData.intents.length) {
      console.log('❌ Invalid intent number');
      rl.close();
      return;
    }

    const selectedIntent = intentsData.intents[intentIndex];
    
    rl.question('Enter new pattern: ', (pattern) => {
      if (!pattern.trim()) {
        console.log('❌ Pattern cannot be empty');
        rl.close();
        return;
      }

      selectedIntent.patterns.push(pattern.trim());
      
      if (saveTrainingData('intents.json', intentsData)) {
        console.log(`✅ Added pattern "${pattern}" to ${selectedIntent.intent}`);
        console.log(`Total patterns for ${selectedIntent.intent}: ${selectedIntent.patterns.length}`);
      }
      
      rl.close();
    });
  });
}

// Add new Pidgin phrase
function addPidginPhrase() {
  const pidginData = loadTrainingData('pidgin_dictionary.json');
  if (!pidginData) return;

  console.log('\n🇳🇬 Add New Pidgin Phrase\n');
  
  rl.question('Enter Pidgin phrase: ', (pidgin) => {
    rl.question('Enter English translation: ', (english) => {
      rl.question('Enter intent (TRANSFER/BILL_PAYMENT/AIRTIME/BALANCE/HISTORY): ', (intent) => {
        rl.question('Enter confidence (0.0-1.0): ', (confidence) => {
          
          const newPhrase = {
            pidgin: pidgin.trim(),
            english: english.trim(),
            intent: intent.trim().toUpperCase(),
            confidence: parseFloat(confidence) || 0.9
          };

          pidginData.common_phrases.push(newPhrase);
          
          if (saveTrainingData('pidgin_dictionary.json', pidginData)) {
            console.log('✅ Added new Pidgin phrase');
            console.log(JSON.stringify(newPhrase, null, 2));
          }
          
          rl.close();
        });
      });
    });
  });
}

// Add new entity example
function addEntityExample() {
  const entitiesData = loadTrainingData('entities.json');
  if (!entitiesData) return;

  console.log('\n🏷️  Add New Entity Example\n');
  console.log('Available entities:');
  const entityNames = Object.keys(entitiesData.entities);
  entityNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });

  rl.question('\nSelect entity number: ', (entityNum) => {
    const entityIndex = parseInt(entityNum) - 1;
    if (entityIndex < 0 || entityIndex >= entityNames.length) {
      console.log('❌ Invalid entity number');
      rl.close();
      return;
    }

    const entityName = entityNames[entityIndex];
    const entity = entitiesData.entities[entityName];
    
    rl.question(`Enter new example for ${entityName}: `, (example) => {
      if (!example.trim()) {
        console.log('❌ Example cannot be empty');
        rl.close();
        return;
      }

      entity.examples.push(example.trim());
      
      if (saveTrainingData('entities.json', entitiesData)) {
        console.log(`✅ Added example "${example}" to ${entityName}`);
        console.log(`Total examples for ${entityName}: ${entity.examples.length}`);
      }
      
      rl.close();
    });
  });
}

// View training statistics
function viewStatistics() {
  console.log('\n📊 Training Data Statistics\n');
  
  // Intents
  const intentsData = loadTrainingData('intents.json');
  if (intentsData) {
    console.log('🎯 Intents:');
    intentsData.intents.forEach(intent => {
      console.log(`  - ${intent.intent}: ${intent.patterns.length} patterns`);
    });
    console.log(`  Total: ${intentsData.intents.length} intents\n`);
  }

  // Entities
  const entitiesData = loadTrainingData('entities.json');
  if (entitiesData) {
    console.log('🏷️  Entities:');
    Object.entries(entitiesData.entities).forEach(([name, entity]) => {
      console.log(`  - ${name}: ${entity.examples.length} examples`);
    });
    console.log(`  Total: ${Object.keys(entitiesData.entities).length} entities\n`);
  }

  // Pidgin
  const pidginData = loadTrainingData('pidgin_dictionary.json');
  if (pidginData) {
    console.log('🇳🇬 Pidgin:');
    console.log(`  - Translations: ${Object.keys(pidginData.pidgin_translations).length}`);
    console.log(`  - Common phrases: ${pidginData.common_phrases.length}`);
    console.log(`  - Slang variations: ${Object.keys(pidginData.slang_variations).length}\n`);
  }

  rl.close();
}

// Export training data to CSV
function exportToCSV() {
  const intentsData = loadTrainingData('intents.json');
  if (!intentsData) return;

  console.log('\n📤 Exporting to CSV...\n');

  let csv = 'Intent,Pattern,Language\n';
  
  intentsData.intents.forEach(intent => {
    intent.patterns.forEach(pattern => {
      const isPidgin = /\b(wetin|dey|abeg|make|wan|don)\b/i.test(pattern);
      const language = isPidgin ? 'Pidgin' : 'English';
      csv += `"${intent.intent}","${pattern}","${language}"\n`;
    });
  });

  const csvPath = path.join(TRAINING_DIR, 'training_data.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`✅ Exported to ${csvPath}`);
  
  rl.close();
}

// Add security threat
function addSecurityThreat() {
  const securityData = loadTrainingData('security_patterns.json');
  if (!securityData) return;

  console.log('\n🛡️ Add New Security Threat Pattern\n');
  
  rl.question('Enter threat keyword/phrase: ', (pattern) => {
    rl.question('Threat type (phishing/scam/social_engineering): ', (type) => {
      rl.question('Severity (low/medium/high/critical): ', (severity) => {
        rl.question('Response message: ', (response) => {
          
          const newThreat = {
            pattern: pattern.trim(),
            threat_type: type.trim(),
            severity: severity.trim(),
            response: response.trim()
          };

          securityData.security_questions.threat_detection.push(newThreat);
          
          if (saveTrainingData('security_patterns.json', securityData)) {
            console.log('✅ Added new security threat pattern');
            console.log(JSON.stringify(newThreat, null, 2));
          }
          
          rl.close();
        });
      });
    });
  });
}

// Add ZKP knowledge article
function addZKPKnowledge() {
  const zkpData = loadTrainingData('zkp_knowledge.json');
  if (!zkpData) return;

  console.log('\n🧠 Add Zero Knowledge Proof Knowledge\n');
  
  rl.question('Enter article title: ', (title) => {
    rl.question('Enter key insight: ', (insight) => {
      rl.question('Enter use case for SznPay: ', (useCase) => {
        
        // Add to ZKP knowledge base
        if (!zkpData.articles) {
          zkpData.articles = [];
        }

        const newArticle = {
          title: title.trim(),
          insight: insight.trim(),
          useCase: useCase.trim(),
          addedAt: new Date().toISOString(),
          category: 'privacy_technology'
        };

        zkpData.articles.push(newArticle);
        
        if (saveTrainingData('zkp_knowledge.json', zkpData)) {
          console.log('✅ Added ZKP knowledge');
          console.log(JSON.stringify(newArticle, null, 2));
        }
        
        rl.close();
      });
    });
  });
}

// Main menu
function showMenu() {
  console.log('\n🧠 SznPay AI Training Data Manager\n');
  console.log('1. Add Intent Pattern');
  console.log('2. Add Pidgin Phrase');
  console.log('3. Add Entity Example');
  console.log('4. Add Security Threat Pattern');
  console.log('5. Add ZKP Knowledge');
  console.log('6. View Statistics');
  console.log('7. Export to CSV');
  console.log('8. Exit\n');

  rl.question('Select option: ', (option) => {
    switch (option) {
      case '1':
        addIntentPattern();
        break;
      case '2':
        addPidginPhrase();
        break;
      case '3':
        addEntityExample();
        break;
      case '4':
        addSecurityThreat();
        break;
      case '5':
        addZKPKnowledge();
        break;
      case '6':
        viewStatistics();
        break;
      case '7':
        exportToCSV();
        break;
      case '8':
        console.log('👋 Goodbye!');
        rl.close();
        break;
      default:
        console.log('❌ Invalid option');
        rl.close();
    }
  });
}

// Run
if (require.main === module) {
  showMenu();
}

module.exports = {
  loadTrainingData,
  saveTrainingData,
  addIntentPattern,
  addPidginPhrase,
  addEntityExample
};
