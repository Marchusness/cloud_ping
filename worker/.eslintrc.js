/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["mg-custom/base-eslint.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
