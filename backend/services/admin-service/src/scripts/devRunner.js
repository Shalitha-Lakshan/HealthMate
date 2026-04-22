// Dev helper script
// Frees service port and starts nodemon for local development
require("dotenv").config();
const { spawn } = require("child_process");
const killPort = require("kill-port");

const port = Number(process.env.PORT || 5009);

// Kill existing process on the port, then run nodemon
const run = async () => {
	try {
		await killPort(port, "tcp");
		console.log(`Freed port ${port} before dev start.`);
	} catch {
		console.log(`Port ${port} was already free.`);
	}

	const child = spawn("nodemon", ["src/server.js"], {
		stdio: "inherit",
		shell: true,
	});

	child.on("exit", (code) => {
		process.exit(code || 0);
	});
};

run();
