"use strict";

/**
 * Loads compiled backend ESM from a CJS Vercel handler.
 * Path segments are joined so @vercel/node does not rewrite import() to require().
 */
async function loadServerlessApp(databaseUrl) {
  const serverlessModule = ["..", "backend", "dist", "serverless.js"].join("/");
  const { getServerlessApp } = await import(serverlessModule);
  return getServerlessApp(databaseUrl);
}

module.exports = { loadServerlessApp };
