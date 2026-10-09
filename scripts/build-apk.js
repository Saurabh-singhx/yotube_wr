#!/usr/bin/env node

/**
 * Release APK Build & Packaging Script for YouTube_wr
 *
 * Builds production release APK packages across target variants:
 * - Release channel: Remote-synchronized distribution build for GitHub Releases
 * - Standalone channel: Offline-independent package for direct archiving
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const APK_SRC = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const GENERATED_DIR = path.join(ROOT_DIR, 'generated_apk');
const BUILD_CONFIG_PATH = path.join(ROOT_DIR, 'src', 'constants', 'buildConfig.ts');

const { bumpVersion } = require('./bump-version');

function setBuildConfig(channel, enableRemoteSync) {
  const content = `/**
 * Application Build Configuration
 *
 * Configured per release channel and package variant
 */

export interface BuildConfig {
  channel: 'release' | 'standalone';
  enableRemoteSync: boolean;
  configEndpoint: string;
  fallbackEndpoint: string;
}

export const BUILD_CONFIG: BuildConfig = {
  channel: '${channel}',
  enableRemoteSync: ${enableRemoteSync},
  configEndpoint:
    'https://gist.githubusercontent.com/Saurabh-singhx/2e6a3e1916b3717325d6794dbed62851/raw/app-config.json',
  fallbackEndpoint:
    'https://raw.githubusercontent.com/Saurabh-singhx/yotube_wr/master/config/app-config.json',
};
`;
  fs.writeFileSync(BUILD_CONFIG_PATH, content, 'utf8');
}

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

// Parse variant flag
const isReleaseOnly = process.argv.includes('--release-only') || process.argv.includes('--variant=release');
const isStandaloneOnly = process.argv.includes('--standalone-only') || process.argv.includes('--variant=standalone');

// By default (for upcoming builds), build both variants unless specifically constrained
const buildStandalone = !isReleaseOnly;
const buildRelease = !isStandaloneOnly;

function compileVariant(variantName) {
  console.log(`\n========================================`);
  console.log(`🔨 Compiling [${variantName.toUpperCase()}] variant v${version} (Build ${build})`);
  console.log(`========================================\n`);

  if (variantName === 'standalone') {
    setBuildConfig('standalone', false);
  } else {
    setBuildConfig('release', true);
  }

  // Force clean bundle intermediates to ensure new buildConfig is baked in
  const bundleDir = path.join(ANDROID_DIR, 'app', 'build', 'intermediates', 'assets', 'release');
  if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }

  // Execute Gradle assembleRelease
  execSync('./gradlew assembleRelease', {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
  });

  if (!fs.existsSync(APK_SRC)) {
    throw new Error(`Build finished, but APK not found at: ${APK_SRC}`);
  }

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  if (variantName === 'standalone') {
    const standaloneVersioned = path.join(GENERATED_DIR, `YouTube_wr-v${version}-standalone.apk`);
    const standaloneBuildTagged = path.join(GENERATED_DIR, `YouTube_wr-v${version}-b${build}-standalone.apk`);
    const standaloneStable = path.join(GENERATED_DIR, 'YouTube_wr-standalone.apk');

    fs.copyFileSync(APK_SRC, standaloneVersioned);
    fs.copyFileSync(APK_SRC, standaloneBuildTagged);
    fs.copyFileSync(APK_SRC, standaloneStable);

    const stats = fs.statSync(standaloneStable);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Standalone Package Generated (${sizeMb} MB):`);
    console.log(`   - ${standaloneVersioned}`);
    console.log(`   - ${standaloneStable}`);
  } else {
    const versionedApkPath = path.join(GENERATED_DIR, `YouTube_wr-v${version}.apk`);
    const buildTaggedApkPath = path.join(GENERATED_DIR, `YouTube_wr-v${version}-b${build}.apk`);
    const stableApkPath = path.join(GENERATED_DIR, 'YouTube_wr.apk');
    const releaseApkPath = path.join(GENERATED_DIR, 'app-release.apk');

    fs.copyFileSync(APK_SRC, versionedApkPath);
    fs.copyFileSync(APK_SRC, buildTaggedApkPath);
    fs.copyFileSync(APK_SRC, stableApkPath);
    fs.copyFileSync(APK_SRC, releaseApkPath);

    const stats = fs.statSync(stableApkPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Release Package Generated (${sizeMb} MB):`);
    console.log(`   - ${versionedApkPath} (Upload to GitHub Release)`);
    console.log(`   - ${stableApkPath}`);
    console.log(`   - ${releaseApkPath}`);
  }
}

try {
  if (buildStandalone && buildRelease) {
    console.log(`\n🚀 Multi-Channel Build: Compiling both Standalone and Release variants...`);
    compileVariant('standalone');
    compileVariant('release');
  } else if (buildRelease) {
    compileVariant('release');
  } else if (buildStandalone) {
    compileVariant('standalone');
  }

  // Restore default build config to release channel
  setBuildConfig('release', true);

  console.log(`\n========================================`);
  console.log(`🎉 All packaging completed successfully!`);
  console.log(`📦 Version: v${version} (versionCode: ${build})`);
  console.log(`========================================\n`);
} catch (err) {
  console.error(`\n❌ APK Build Failed:`, err.message);
  // Restore default build config on failure
  try { setBuildConfig('release', true); } catch (_) {}
  process.exit(1);
}
