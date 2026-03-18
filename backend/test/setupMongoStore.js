const { MongoMemoryServer } = require('mongodb-memory-server');

// Force the binary download before tests start
async function downloadAndStart() {
  console.log("Starting forced download...");
  const mongod = await MongoMemoryServer.create({
    binary: {
      version: '6.0.4', // specific version to cache
    }
  });
  console.log("Started at URI: " + mongod.getUri());
  await mongod.stop();
  console.log("Stopped. Binary Cached.");
}

downloadAndStart().catch(console.error);
