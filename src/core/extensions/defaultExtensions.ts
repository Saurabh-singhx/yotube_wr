import { ExtensionManifest } from '../../types/extension';
import { youtubeAdBlocker } from './youtubeAdBlocker';
import { youtubePlaybackEnhancer } from './youtubePlaybackEnhancer';
import { youtubeDistractionFree } from './youtubeDistractionFree';
import { youtubeSponsorBlock } from './youtubeSponsorBlock';

export const DEFAULT_EXTENSIONS: ExtensionManifest[] = [
  youtubeAdBlocker,
  youtubePlaybackEnhancer,
  youtubeDistractionFree,
  youtubeSponsorBlock,
];

export const CUSTOM_EXTENSION_TEMPLATE: ExtensionManifest = {
  id: '',
  name: 'My Custom Extension',
  description: 'Custom userscript injected into YouTube',
  version: '1.0.0',
  author: 'You',
  icon: 'code-slash',
  category: 'custom',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  injectedCSS: `/* Custom CSS here */\n`,
  injectedJSEnd: `// Custom JavaScript here\nconsole.log('Custom extension running on: ' + window.location.href);`,
  isCustom: true,
  settings: [],
  userSettings: {},
};
