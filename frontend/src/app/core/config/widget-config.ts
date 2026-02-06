import { Asset, AssetType } from '../models/asset.model';

export type WidgetType = 'PIE_ASSET' | 'PIE_TW' | 'PIE_US' | 'RATE_LIST';

export interface WidgetDefinition {
  id: WidgetType;
  label: string;
  isAvailable: (assets: Asset[]) => boolean;
  defaultSelected: boolean;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'PIE_ASSET',
    label: '總資產分佈',
    isAvailable: (assets) => assets.length > 0,
    defaultSelected: true
  },
  {
    id: 'PIE_TW',
    label: '台股配置',
    isAvailable: (assets) => assets.some(a => a.currency === 'TWD' && a.asset_type === AssetType.STOCK),
    defaultSelected: true
  },
  {
    id: 'PIE_US',
    label: '美股配置',
    isAvailable: (assets) => assets.some(a => a.currency === 'USD' && a.asset_type === AssetType.STOCK),
    defaultSelected: true
  },
  // example：
  // {
  //   id: 'RATE_LIST',
  //   label: '關注匯率',
  //   isAvailable: () => true, // 總是可用
  //   defaultSelected: false
  // }
];