// MongoDB connection helper for notification-service database
const mongoose = require("mongoose");

// Connect to MongoDB using the given URI
const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("notification-service connected to MongoDB");
};

// Export DB connector function
module.exports = connectDB;
