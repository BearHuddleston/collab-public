#!/usr/bin/env node

// Apple notarization — electron-builder afterSign hook.
// Reads credentials from env vars or .env.local.

const { notarize } = require("@electron/notarize");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key.trim()] = value;
    }
  }
}

const KEYCHAIN_PROFILE = process.env.KEYCHAIN_PROFILE;
const APPLE_ID = process.env.APPLE_ID;
const APPLE_ID_PASSWORD =
  process.env.APPLE_ID_PASSWORD ||
  process.env.APPLE_APP_SPECIFIC_PASSWORD;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;

async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (process.env.SKIP_NOTARIZE === "true") {
    console.log("Skipping notarization (SKIP_NOTARIZE is set)");
    return;
  }

  if (electronPlatformName !== "darwin") {
    console.log("Skipping notarization (not macOS)");
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`App bundle not found: ${appPath}`);
  }

  console.log(`Notarizing ${appPath}`);

  const options = {
    appBundleId: "com.collaborator.desktop",
    appPath,
    tool: "notarytool",
  };

  if (KEYCHAIN_PROFILE) {
    console.log(`  Using keychain profile: ${KEYCHAIN_PROFILE}`);
    options.keychainProfile = KEYCHAIN_PROFILE;
  } else if (APPLE_ID && APPLE_ID_PASSWORD && APPLE_TEAM_ID) {
    console.log(`  Using Apple ID: ${APPLE_ID}`);
    options.appleId = APPLE_ID;
    options.appleIdPassword = APPLE_ID_PASSWORD;
    options.teamId = APPLE_TEAM_ID;
  } else {
    throw new Error(
      "Missing notarization credentials. Provide either:\n" +
        "  KEYCHAIN_PROFILE, or\n" +
        "  APPLE_ID + APPLE_ID_PASSWORD + APPLE_TEAM_ID\n" +
        "Set in .env.local or environment variables.",
    );
  }

  const start = Date.now();
  await notarize(options);
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Notarization completed in ${seconds}s`);

  // Staple the ticket (retry up to 3 times)
  console.log("Stapling notarization ticket...");
  const maxAttempts = 3;
  const retryDelay = 30_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = spawnSync("xcrun", ["stapler", "staple", appPath], {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (result.status === 0) {
      console.log("Ticket stapled");
      return;
    }

    if (attempt < maxAttempts) {
      console.log(
        `Staple attempt ${attempt}/${maxAttempts} failed, ` +
          `retrying in ${retryDelay / 1000}s...`,
      );
      await new Promise((r) => setTimeout(r, retryDelay));
    } else {
      console.warn(
        `Could not staple after ${maxAttempts} attempts ` +
          "(app still valid via network check)",
      );
    }
  }
}

module.exports = notarizeApp;
