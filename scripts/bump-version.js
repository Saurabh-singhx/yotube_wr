#!/usr/bin/env node

/**
 * Version Bump Automation Script for YouTube_wr
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 1.1.0 -> 1.1.1 (build: +1)
 *   node scripts/bump-version.js minor   # 1.1.0 -> 1.2.0 (build: +1)
 *   node scripts/bump-version.js major   # 1.1.0 -> 2.0.0 (build: +1)
 *   node scripts/bump-version.js 1.2.3   # explicit version
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const APP_JSON_PATH = path.join(ROOT_DIR, 'app.json');
const BUILD_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
const VERSION_TS_PATH = path.join(ROOT_DIR, 'src', 'constants', 'version.ts');

const arg = process.argv[2] || 'patch';

// 1. Read current version from package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

// Read current versionCode from app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
const currentBuild = (appJson.expo && appJson.expo.android && appJson.expo.android.versionCode) || 1;

let [major, minor, patch] = currentVersion.split('.').map((num) => parseInt(num, 10) || 0);

let newVersion;
if (arg === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (arg === 'minor') {
  minor += 1;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (arg === 'patch') {
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVersion = arg;
} else {
  console.error(`Invalid version argument: "${arg}". Use 'patch', 'minor', 'major', or a SemVer like '1.2.0'.`);
  process.exit(1);
}

const newBuild = currentBuild + 1;

console.log(`\n📦 Bumping version: ${currentVersion} (build ${currentBuild}) -> ${newVersion} (build ${newBuild})\n`);

// 2. Update package.json
pkg.version = newVersion;
fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ Updated package.json`);

// 3. Update app.json
appJson.expo.version = newVersion;
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = newBuild;
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');
console.log(`✓ Updated app.json`);

// 4. Update android/app/build.gradle
if (fs.existsSync(BUILD_GRADLE_PATH)) {
  let gradleContent = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newBuild}`);
  gradleContent = gradleContent.replace(/versionName\s+["'][^"']+["']/, `versionName "${newVersion}"`);
  fs.writeFileSync(BUILD_GRADLE_PATH, gradleContent);
  console.log(`✓ Updated android/app/build.gradle`);
}

// 5. Update src/constants/version.ts
const versionTsContent = `/**
 * Application Version Configuration
 * 
 * Automatically updated by scripts/bump-version.js
 * Single source of truth for app versioning across JS and UI
 */
export const APP_VERSION = '${newVersion}';
export const APP_BUILD = ${newBuild};
export const APP_NAME = 'YouTube_wr';
`;
fs.writeFileSync(VERSION_TS_PATH, versionTsContent);
console.log(`✓ Updated src/constants/version.ts`);

console.log(`\n🎉 Successfully upgraded to v${newVersion} (Build ${newBuild})!\n`);
