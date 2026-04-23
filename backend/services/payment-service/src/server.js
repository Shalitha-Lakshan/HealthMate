// Entry point for payment-service backend
// Loads environment variables, connects to DB, and starts server
// Only comments added, no code changes
// Load environment variables
require("dotenv").config();
// Import app and DB connector
const app = require("./app");
const connectDB = require("./config/db");

// Get port and Mongo URI from environment
const PORT = process.env.PORT || 5005;
const MONGO_URI = process.env.MONGO_URI;

// Exit if Mongo URI is missing
if (!MONGO_URI) {
	console.error("MONGO_URI is missing in environment variables");
	process.exit(1);
}

// Connect to DB and start server
connectDB(MONGO_URI)
	.then(() => {
		app.listen(PORT, () => {
			console.log(`payment-service running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error("payment-service DB connection failed", err.message);
		process.exit(1);
	});
