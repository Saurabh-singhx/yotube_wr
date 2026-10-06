#!/usr/bin/env node

/**
 * Release APK Build & Packaging Script for YouTube_wr
 *
 * Runs release build with Gradle and automatically tags output APK with current version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const APK_SRC = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const GENERATED_DIR = path.join(ROOT_DIR, 'generated_apk');

const { bumpVersion } = require('./bump-version');

// Optional auto-bump flag: e.g. node scripts/build-apk.js --bump (or --bump=patch, --bump=build)
const bumpArg = process.argv.find((a) => a.startsWith('--bump'));
if (bumpArg) {
  const bumpMode = bumpArg.includes('=') ? bumpArg.split('=')[1] : 'build';
  console.log(`Auto-bumping version (${bumpMode}) before build...`);
  bumpVersion(bumpMode);
}

// Read current version
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app.json'), 'utf8'));
const build = (appJson.expo && appJson.expo.android && appJson.expo.android.versionCode) || 1;

console.log(`\n========================================`);
console.log(`🚀 Building Release APK for YouTube_wr v${version} (Build ${build})`);
console.log(`========================================\n`);

try {
  // Execute Gradle build
  execSync('./gradlew assembleRelease', {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
  });

  if (!fs.existsSync(APK_SRC)) {
    throw new Error(`Build finished, but APK not found at: ${APK_SRC}`);
  }

  // Ensure generated_apk directory exists
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  // Target outputs
  const versionedApkName = `YouTube_wr-v${version}.apk`;
  const buildTaggedApkName = `YouTube_wr-v${version}-b${build}.apk`;
  const versionedApkPath = path.join(GENERATED_DIR, versionedApkName);
  const buildTaggedApkPath = path.join(GENERATED_DIR, buildTaggedApkName);
  const stableApkPath = path.join(GENERATED_DIR, 'YouTube_wr.apk');
  const releaseApkPath = path.join(GENERATED_DIR, 'app-release.apk');

  // Copy outputs
  fs.copyFileSync(APK_SRC, versionedApkPath);
  fs.copyFileSync(APK_SRC, buildTaggedApkPath);
  fs.copyFileSync(APK_SRC, stableApkPath);
  fs.copyFileSync(APK_SRC, releaseApkPath);

  const stats = fs.statSync(stableApkPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n========================================`);
  console.log(`✅ Build Complete!`);
  console.log(`📦 Version: v${version} (versionCode: ${build})`);
  console.log(`📁 File Size: ${sizeMb} MB`);
  console.log(`📍 Output Files:`);
  console.log(`   - ${versionedApkPath}`);
  console.log(`   - ${stableApkPath}`);
  console.log(`   - ${releaseApkPath}`);
  console.log(`========================================\n`);
} catch (err) {
  console.error(`\n❌ APK Build Failed:`, err.message);
  process.exit(1);
}
