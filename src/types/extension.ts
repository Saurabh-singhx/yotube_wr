export type ExtensionCategory = 'adblock' | 'playback' | 'privacy' | 'ui' | 'enhancement' | 'custom';

export type SettingType = 'boolean' | 'number' | 'select';

export interface ExtensionSettingOption {
  label: string;
  value: string | number;
}

export interface ExtensionSetting {
  id: string;
  label: string;
  description: string;
  type: SettingType;
  default: boolean | number | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: ExtensionSettingOption[];
}

export interface ExtensionManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string; // Ionicons / MaterialCommunityIcons name
  category: ExtensionCategory;
  enabled: boolean;
  urlMatches: string[]; // e.g. ["*://*.youtube.com/*"]
  runAt: 'document_start' | 'document_end' | 'both';
  
  // Script / CSS definitions
  injectedCSS?: string | ((settings: Record<string, any>) => string);
  injectedJSStart?: string | ((settings: Record<string, any>) => string); // For document_start
  injectedJSEnd?: string | ((settings: Record<string, any>) => string); // For document_end
  
  settings?: ExtensionSetting[];
  userSettings?: Record<string, any>;
  
  isCustom?: boolean; // User-created extension
  createdAt?: number;
}

export interface BridgeMessage<T = any> {
  extensionId: string;
  type: string;
  payload: T;
  timestamp?: number;
}

export interface AdBlockStats {
  adsBlocked: number;
  trackersBlocked: number;
  timeSavedSeconds: number; // estimated seconds saved
  lastBlockedAt?: number;
}
