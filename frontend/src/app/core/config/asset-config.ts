// defined color or other configurations for different asset types

export const ASSET_CONFIG = {
  STOCK: { rgb: '37, 99, 235' },        // rgb(37, 99, 235)
  CASH: { rgb: '16, 185, 129' },        // rgb(16, 185, 129)
  CRYPTO: { rgb: '245, 158, 11' },      // rgb(245, 158, 11)
  GOLD: { rgb: '217, 119, 6' },         // rgb(217, 119, 6)
  PENDING: { rgb: '100, 116, 139' },    // rgb(100, 116, 139)
  LIABILITY: { rgb: '220, 38, 38' },    // rgb(220, 38, 38)
  CREDIT_CARD: { rgb: '147, 51, 234' }, // rgb(147, 51, 234)
  DEFAULT: { rgb: '100, 116, 139' },    // rgb(100, 116, 139)
};

type AssetKey = keyof typeof ASSET_CONFIG;

export function getAssetRgb(type: string): string {
  const key = type.toUpperCase();
  if (key in ASSET_CONFIG) {
    return ASSET_CONFIG[key as AssetKey].rgb;
  }
  return ASSET_CONFIG.DEFAULT.rgb;
}