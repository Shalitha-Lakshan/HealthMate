const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  console.log("appointment-service connected to MongoDB");
};

module.exports = connectDB;
