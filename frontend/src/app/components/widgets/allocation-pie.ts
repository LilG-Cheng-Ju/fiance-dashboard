import { Component, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { Asset } from '../../core/models/asset.model';
import { getAssetRgb } from '../../core/config/asset-config';

export type PieChartType = 'ASSET_TYPE' | 'TW_STOCK' | 'US_STOCK';

const CHART_STYLE = {
  colors: {
    primary: '#2563eb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
    bgTooltip: 'rgba(255, 255, 255, 0.95)',
  },
  fonts: {
    base: 12,
    title: 14,
    emphasis: 10,
  },
};

@Component({
  selector: 'app-allocation-pie',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './allocation-pie.html',
  styleUrls: ['./allocation-pie.scss'],
})
export class AllocationPieComponent {
  assets = input.required<Asset[]>();
  chartType = input<PieChartType>('ASSET_TYPE');
  title = input<string>('資產配置');

  chartOptions: EChartsOption = {};

  constructor() {
    effect(() => {
      const data = this.assets();
      const chartType = this.chartType();

      if (data.length > 0) {
        this.updateChart(data, chartType);
      }
    });
  }

  private updateChart(assets: Asset[], type: PieChartType) {
    let chartData: { name: string; value: number }[] = [];

    switch (type) {
      case 'ASSET_TYPE':
        const grouped = this._groupByAssetType(assets);
        chartData = grouped.map((item) => {
          const rgb = getAssetRgb(item.name);

          return {
            name: item.name,
            value: item.value,

            itemStyle: {
              color: `rgba(${rgb}, 0.85)`,
              borderColor: `rgba(${rgb}, 1)`,
              borderWidth: 1,
            },
          };
        });
        break;
      case 'TW_STOCK':
        chartData = this._filterStockByCurrency(assets, 'TWD');
        break;
      case 'US_STOCK':
        chartData = this._filterStockByCurrency(assets, 'USD');
        break;
    }

    this.chartOptions = {
      ...this._getBasePieChart(),
      title: {
        ...this._getBasePieChart().title,
        text: this.title(),
      },
      series: [
        {
          ...(this._getBasePieChart().series as any)[0],
          name: this.title(),
          data: chartData,
        },
      ],
    };
  }

  /** 計算總資產配置 (Group By Type) */
  private _groupByAssetType(assets: Asset[]) {
    const grouped = assets.reduce(
      (acc, curr) => {
        acc[curr.asset_type] = (acc[curr.asset_type] || 0) + curr.current_value;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(grouped).map((key) => ({
      name: key,
      value: grouped[key],
    }));
  }

  /** 通用的股票過濾器 (Filter Stock + Currency) */
  private _filterStockByCurrency(assets: Asset[], currency: string) {
    return assets
      .filter((a) => a.asset_type === 'STOCK' && a.currency === currency)
      .map((a) => ({
        name: a.name,
        value: a.current_value,
      }));
  }

  // --- 👇 樣式設定區 (View Configuration) ---

  private _getBasePieChart(): EChartsOption {
    return {
      title: {
        left: 'center',
        top: '5%',
        textStyle: { fontSize: CHART_STYLE.fonts.title, color: CHART_STYLE.colors.textSub },
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: CHART_STYLE.colors.bgTooltip,
        borderColor: CHART_STYLE.colors.border,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: CHART_STYLE.colors.textMain,
          fontSize: CHART_STYLE.fonts.base,
        },
        formatter: this._tooltipFormatter,
      },
      legend: {
        bottom: '0%',
        left: 'center',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          labelLine: {
            show: false,
          },
          label: {
            show: true,
            position: 'inner',
            color: '#e9edf7',
            fontSize: 11,
            fontWeight: 'bold',
            textShadowColor: 'rgba(0, 0, 0, 0.4)',
            textShadowBlur: 3,
            textShadowOffsetY: 1,

            formatter: (params: any) => {
              if (params.percent < 5) {
                return '';
              }
              return `${params.percent.toFixed(1)}%`;
            },
          },
          // 🔥 更新重點：滑鼠懸停時，中間顯示名稱與數值
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
            scale: true,
            scaleSize: 5,
            label: {
              show: false,
            },
          },
        },
      ],
    };
  }

  // 獨立出來的 Tooltip Formatter，保持主設定乾淨
  private _tooltipFormatter(params: any): string {
    const valueFormatted = new Intl.NumberFormat().format(params.value);
    return `
      <div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div>
      <div style="font-size: 11px; color: ${CHART_STYLE.colors.textSub};">
        ${params.marker} $${valueFormatted}
        <span style="float: right; margin-left: 10px; font-weight: bold; color: ${CHART_STYLE.colors.primary};">
          ${params.percent}%
        </span>
      </div>
    `;
  }
}
