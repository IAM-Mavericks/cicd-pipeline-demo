const MerkleSumTree = require('../services/merkleSumTree');
const { performance } = require('perf_hooks');

async function runStressTest(userCount) {
    console.log(`\n🚀 Starting Stress Test for ${userCount.toLocaleString()} users...`);

    // 1. Generate dummy users
    const users = [];
    for (let i = 0; i < userCount; i++) {
        users.push({
            id: `user-${i}`,
            balance: Math.floor(Math.random() * 1000000)
        });
    }

    // 2. Calculate required levels
    const levels = Math.ceil(Math.log2(userCount));
    console.log(`📊 Tree Configuration: ${levels} levels (Capacity: ${Math.pow(2, levels).toLocaleString()})`);

    // 3. Measure Build Time
    const startTime = performance.now();
    const mst = new MerkleSumTree(users, levels);
    await mst.init();
    const endTime = performance.now();
    const buildTime = (endTime - startTime) / 1000;

    // 4. Measure Proof Generation Time
    const proofStartTime = performance.now();
    const sampleSize = Math.min(100, userCount);
    for (let i = 0; i < sampleSize; i++) {
        mst.getProof(Math.floor(Math.random() * userCount));
    }
    const proofEndTime = performance.now();
    const avgProofTime = (proofEndTime - proofStartTime) / sampleSize;

    // 5. Memory Usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(`Results for ${userCount.toLocaleString()} users:`);
    console.log(`⏱️  Build Time: ${buildTime.toFixed(3)}s`);
    console.log(`⏱️  Avg Proof Gen Time: ${avgProofTime.toFixed(3)}ms`);
    console.log(`🧠 Heap Memory Used: ${memoryUsage.toFixed(2)} MB`);

    return { userCount, buildTime, avgProofTime, memoryUsage };
}

async function main() {
    try {
        const results = [];

        // Test 1: 1,000 users (baseline)
        results.push(await runStressTest(1000));

        // Test 2: 10,000 users
        results.push(await runStressTest(10000));

        // Test 3: 100,000 users (Bonus)
        results.push(await runStressTest(100000));

        console.log('\n📈 Summary Table:');
        console.table(results);

        process.exit(0);
    } catch (error) {
        console.error('❌ Stress test failed:', error);
        process.exit(1);
    }
}

main();
