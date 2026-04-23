// MongoDB connection helper for payment-service
// Only comments added, no code changes
// Import mongoose
const mongoose = require("mongoose");

// Connect to MongoDB
const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("payment-service connected to MongoDB");
};

// Export DB connector
module.exports = connectDB;
