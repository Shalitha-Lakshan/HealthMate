require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
const requiredEnvVars = ["MONGO_URI", "INTERNAL_SERVICE_TOKEN"];

const missingVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingVars.length > 0) {
	console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
	process.exit(1);
}

connectDB(MONGO_URI)
	.then(() => {
		app.listen(PORT, () => {
			console.log(`auth-service running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error("auth-service DB connection failed", err.message);
		process.exit(1);
	});
