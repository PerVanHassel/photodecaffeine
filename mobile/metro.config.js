const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
/**
 * The "Actiepunten" rule engine is shared with the website's admin panel.
 * Rather than keeping a second copy here (the thresholds are business rules —
 * two answers to "when is an aanvraag late?" is worse than one awkward import),
 * Metro is pointed at the web project's lib folder and it is imported as
 * `@shared/actionItems`. It is framework-free TypeScript with no imports of its
 * own, so Metro transpiles it like any local file.
 */
const sharedRoot = path.join(repoRoot, "src", "app", "lib");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@shared": sharedRoot,
};

// Metro's default hierarchical lookup is left alone on purpose. Disabling it to
// wall off the repo root's node_modules (the website's React DOM and Vite) also
// breaks packages that ship their own nested dependencies — expo-router keeps
// @expo/metro-runtime that way — and this project has a complete tree of its
// own, so nothing ever needs to walk up to find a dependency.

module.exports = config;
