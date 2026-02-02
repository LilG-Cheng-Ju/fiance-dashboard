// src/app/core/config/asset-config.ts

export const ASSET_CONFIG = {
  STOCK:  { rgb: '37, 99, 235' },    // 藍色
  CASH:   { rgb: '16, 185, 129' },   // 綠色
  CRYPTO: { rgb: '245, 158, 11' },   // 橘色
  GOLD:   { rgb: '217, 119, 6' },    // 金色
  DEFAULT:{ rgb: '100, 116, 139' }   // 灰色
};

type AssetKey = keyof typeof ASSET_CONFIG;

export function getAssetRgb(type: string): string {
  const key = type.toUpperCase();
  if (key in ASSET_CONFIG) {
    return ASSET_CONFIG[key as AssetKey].rgb;
  }
  return ASSET_CONFIG.DEFAULT.rgb;
}