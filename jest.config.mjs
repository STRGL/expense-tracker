import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: ["<rootDir>/__tests__/**/*.test.[jt]s?(x)"],
}

export default createJestConfig(config)
