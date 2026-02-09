import { Component, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

const CHART_STYLE = {
  colors: {
    primary: '#2563eb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
    bgTooltip: 'rgba(255, 255, 255, 0.95)',
  },
  fonts: { base: 12 },
};

@Component({
  selector: 'app-allocation-pie',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './allocation-pie.html',
  styleUrls: ['./allocation-pie.scss'],
})
export class AllocationPieComponent {
  data = input.required<PieChartData[]>();

  seriesName = input<string>('數據分佈');

  chartOptions: EChartsOption = {};

  constructor() {
    effect(() => {
      const data = this.data();
      if (data && data.length > 0) {
        this.updateChart(data);
      }
    });
  }

  private updateChart(data: PieChartData[]) {
    this.chartOptions = {
      ...this._getBasePieChart(),
      series: [
        {
          ...(this._getBasePieChart().series as any)[0],
          name: this.seriesName(),

          data: data.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: item.color
              ? {
                  color: item.color,
                  borderColor: item.color,
                  borderWidth: 1,
                  opacity: 0.85,
                }
              : undefined,
          })),
        },
      ],
    };
  }

  private _getBasePieChart(): EChartsOption {
    return {
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
        icon: 'circle',
        itemGap: 10,
        textStyle: {
          fontSize: 13,
          color: CHART_STYLE.colors.textSub,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          labelLine: { show: false },
          label: {
            show: true,
            position: 'inner',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            formatter: (params: any) => {
              if (params.percent < 8) return '';
              return `${params.percent.toFixed(0)}%`;
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
            scale: true,
            scaleSize: 5,
            label: { show: false },
          },
        },
      ],
    };
  }

  private _tooltipFormatter(params: any): string {
    const valueFormatted = new Intl.NumberFormat().format(Math.round(params.value));
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
