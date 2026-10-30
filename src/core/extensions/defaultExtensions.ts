import { ExtensionManifest } from '../../types/extension';
import { contentShield } from './contentShield';
import { distractionFree } from './distractionFree';
import { sponsorSkipper } from './sponsorSkipper';
import { autoQualityHD } from './autoQualityHD';

export const DEFAULT_EXTENSIONS: ExtensionManifest[] = [
  contentShield,
  autoQualityHD,
  distractionFree,
  sponsorSkipper,
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
