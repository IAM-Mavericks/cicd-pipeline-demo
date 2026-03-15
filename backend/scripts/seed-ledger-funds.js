require('dotenv').config();

const postgresService = require('../services/postgresService');
const ledgerService = require('../services/ledgerService');

async function main() {
  const [, , accountNumber, amountArg] = process.argv;

  if (!accountNumber) {
    console.error('Usage: node scripts/seed-ledger-funds.js <accountNumber> [amountNGN]');
    console.error('Example: node scripts/seed-ledger-funds.js 1234567890 100000');
    process.exit(1);
  }

  const amount = amountArg || '100000';

  try {
    console.log('🔌 Testing Postgres connection...');
    await postgresService.testConnection();
    console.log('✅ Postgres connection OK');
  } catch (error) {
    console.error('❌ Postgres connection failed:', error.message || error);
    process.exit(1);
  }

  try {
    console.log(`
📄 Looking up ledger account for accountNumber=${accountNumber}...
`);
    const targetAccount = await ledgerService.getAccountByNumber(accountNumber);

    if (!targetAccount) {
      console.error('❌ No ledger account found with that account number.');
      console.error('Make sure you have opened your wallet account in the app (Accounts page).');
      process.exit(1);
    }

    const currency = (targetAccount.currency || 'NGN').toUpperCase();

    console.log(`✅ Found account: id=${targetAccount.id}, currency=${currency}, balance=${targetAccount.balance}, available_balance=${targetAccount.available_balance}`);

    console.log('\n🏦 Ensuring system settlement account exists...');
    const systemAccount = await ledgerService.getOrCreateSystemAccount(currency);

    console.log(
      `✅ System account: id=${systemAccount.id}, account_number=${systemAccount.account_number}, ` +
      `balance=${systemAccount.balance}, available_balance=${systemAccount.available_balance}`
    );

    console.log(`\n💸 Seeding funds... Amount=${amount} ${currency}`);

    const reference = `seed_${Date.now()}`;

    const result = await ledgerService.executeTransfer({
      fromAccountId: systemAccount.id,
      toAccountId: targetAccount.id,
      amount,
      currency,
      reference,
      description: 'Development seed funding from SYSTEM account',
      metadata: {
        seedScript: true,
        environment: process.env.NODE_ENV || 'development'
      }
    });

    console.log('\n✅ Seed transfer completed successfully');
    console.log('   Transaction ID:', result.transactionId);
    console.log('   Payment ID    :', result.paymentId);
    console.log('   From account  :', JSON.stringify(result.fromAccount));
    console.log('   To account    :', JSON.stringify(result.toAccount));

    console.log(`\n🎉 New balance for ${accountNumber}:`, result.toAccount.balance,
      '(available:', result.toAccount.availableBalance + ')');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message || error);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ NODE_ENV=production detected. This script is intended for development/test seeding only.');
  }
  main();
}
