require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5008;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
	console.error("MONGO_URI is missing in environment variables");
	process.exit(1);
}

connectDB(MONGO_URI)
	.then(() => {
		app.listen(PORT, () => {
			console.log(`admin-service running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error("admin-service DB connection failed", err.message);
		process.exit(1);
	});
