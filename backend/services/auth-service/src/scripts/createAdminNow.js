const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const hosts = [
	"ac-bmwkgyx-shard-00-00.nhuqqsu.mongodb.net",
	"ac-bmwkgyx-shard-00-01.nhuqqsu.mongodb.net",
	"ac-bmwkgyx-shard-00-02.nhuqqsu.mongodb.net",
];

const run = async () => {
	const name = process.env.ADMIN_NAME || "HealthMate Admin";
	const email = (process.env.ADMIN_EMAIL || "admin@healthmate.com").toLowerCase().trim();
	const phone = process.env.ADMIN_PHONE || "+94705153726";
	const password = process.env.ADMIN_PASSWORD || "Admin@123";
	const dbUser = process.env.DB_USER || "shalitha";
	const dbPass = process.env.DB_PASS || "Shali2003";

	for (const host of hosts) {
		const uri = `mongodb://${dbUser}:${dbPass}@${host}:27017/healthmate_auth?tls=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
		try {
			await mongoose.connect(uri);
			const hash = await bcrypt.hash(password, 10);

			await User.updateOne(
				{ email },
				{
					$set: {
						name,
						email,
						phoneNumber: phone,
						password: hash,
						role: "admin",
						accountStatus: "active",
					},
					$unset: {
						doctorProfile: "",
					},
				},
				{ upsert: true }
			);

			console.log(`Admin user upserted successfully via ${host}`);
			await mongoose.disconnect();
			process.exit(0);
		} catch (error) {
			console.log(`Failed on ${host}: ${error.message}`);
			try {
				await mongoose.disconnect();
			} catch {}
		}
	}

	console.error("Unable to write admin user on any node.");
	process.exit(1);
};

run();
