/** @type {import('jest').Config} */
const config = {
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.(t|j)sx?$": "@swc/jest",
	},
	transformIgnorePatterns: [
		// "node_modules"
	],
	collectCoverageFrom: ["./lib/**"],
};

// noinspection JSUnusedGlobalSymbols
export default config;
