const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("telemedicine-service connected to MongoDB");
};

module.exports = connectDB;
