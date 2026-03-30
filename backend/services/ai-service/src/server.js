require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
	console.log(`ai-service running on port ${PORT}`);
});
