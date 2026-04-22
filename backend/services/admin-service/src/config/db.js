// MongoDB connection helper for admin-service database
const mongoose = require("mongoose");

// Connect to MongoDB using the given URI
const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("admin-service connected to MongoDB");
};

// Export DB connector function
module.exports = connectDB;
