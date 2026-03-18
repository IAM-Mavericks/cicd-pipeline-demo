module.exports = async () => {
  console.log("Mocking Global Setup");
  process.env.MONGODB_URI = "mongodb://localhost:27017/test-local-db-mock-only";
};
