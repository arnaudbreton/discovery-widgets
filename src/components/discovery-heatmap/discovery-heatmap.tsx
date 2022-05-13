import {Component, Element, Event, EventEmitter, h, Method, Prop, State, Watch} from '@stencil/core';
import {DataModel} from "../../model/dataModel";
import {ChartType, ECharts} from "../../model/types";
import {Param} from "../../model/param";
import * as echarts from "echarts";
import {EChartsOption} from "echarts";
import {Logger} from "../../utils/logger";
import {GTSLib} from "../../utils/gts.lib";
import {Utils} from "../../utils/utils";
import {ColorLib} from "../../utils/color-lib";

@Component({
  tag: 'discovery-heatmap',
  styleUrl: 'discovery-heatmap.scss',
  shadow: true,
})
export class DiscoveryHeatmap {
  @Prop() result: DataModel | string;
  @Prop() type: ChartType;
  @Prop() options: Param | string = new Param();
  @Prop() width: number;
  @Prop() height: number;
  @Prop() debug: boolean = false;
  @Prop() unit: string;

  @Element() el: HTMLElement;

  @Event() draw: EventEmitter<void>;
  @Event() dataPointOver: EventEmitter;

  @State() parsing: boolean = false;
  @State() rendering: boolean = false;
  @State() innerOptions: Param;

  private graph: HTMLDivElement;
  private chartOpts: EChartsOption;
  private defOptions: Param = new Param();
  private LOG: Logger;
  private divider: number = 1000;
  private myChart: ECharts;

  @Watch('type')
  updateType(newValue: string, oldValue: string) {
    if (newValue !== oldValue) {
      this.chartOpts = this.convert(GTSLib.getData(this.result));
      setTimeout(() => {
        this.myChart.setOption(this.chartOpts || {}, true, false);
        this.myChart.resize({height: this.height});
      });
    }
  }

  @Watch('result')
  updateRes() {
    this.chartOpts = this.convert(GTSLib.getData(this.result));
    setTimeout(() => {
      this.myChart.setOption(this.chartOpts || {}, true, false);
      this.myChart.resize({height: this.height});
    });
  }

  @Watch('options')
  optionsUpdate(newValue: string, oldValue: string) {
    this.LOG?.debug(['optionsUpdate'], newValue, oldValue);
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      if (!!this.options && typeof this.options === 'string') {
        this.innerOptions = JSON.parse(this.options);
      } else {
        this.innerOptions = {...this.options as Param};
      }
      if (!!this.myChart) {
        this.chartOpts = this.convert(this.result as DataModel || new DataModel());
        setTimeout(() => {
          this.myChart.setOption(this.chartOpts || {}, true, false);
          this.myChart.resize({height: this.height});
        });
      }
      if (this.LOG) {
        this.LOG?.debug(['optionsUpdate 2'], {options: this.innerOptions, newValue, oldValue});
      }
    }
  }

  @Method()
  async resize() {
    if (this.myChart) {
      this.myChart.resize();
    }
  }

  @Method()
  async show(regexp: string) {
    this.myChart.dispatchAction({
      type: 'legendSelect',
      batch: (this.myChart.getOption().series as any[]).map(s => {
        return {name: s.name}
      }).filter(s => new RegExp(regexp).test(s.name))
    });
  }

  @Method()
  async hide(regexp: string) {
    this.myChart.dispatchAction({
      type: 'legendUnSelect',
      batch: (this.myChart.getOption().series as any[]).map(s => {
        return {name: s.name}
      }).filter(s => new RegExp(regexp).test(s.name))
    });
  }

  componentWillLoad() {
    this.parsing = true;
    this.LOG = new Logger(DiscoveryHeatmap, this.debug);
    if (typeof this.options === 'string') {
      this.innerOptions = JSON.parse(this.options);
    } else {
      this.innerOptions = this.options;
    }
    this.result = GTSLib.getData(this.result);
    this.divider = GTSLib.getDivider(this.innerOptions.timeUnit || 'us');
    this.chartOpts = this.convert(this.result as DataModel || new DataModel());
    this.LOG?.debug(['componentWillLoad'], {
      type: this.type,
      options: this.innerOptions,
      chartOpts: this.chartOpts
    });
  }

  convert(data: DataModel) {
    let options = Utils.mergeDeep<Param>(this.defOptions, this.innerOptions || {}) as Param;
    options = Utils.mergeDeep<Param>(options || {} as Param, data.globalParams) as Param;
    this.innerOptions = {...options};
    let series: any[] = [];
    let min = 0;
    let max = 0;
    let gtsList;
    if (GTSLib.isArray(data.data)) {
      data.data = GTSLib.flatDeep(data.data as any[]);
      this.LOG?.debug(['convert', 'isArray']);
      if (data.data.length > 0 && GTSLib.isGts(data.data[0])) {
        this.LOG?.debug(['convert', 'isArray 2']);
        gtsList = GTSLib.flattenGtsIdArray(data.data as any[], 0).res;
      } else {
        this.LOG?.debug(['convert', 'isArray 3']);
        gtsList = data.data as any[];
      }
    } else {
      this.LOG?.debug(['convert', 'not array']);
      gtsList = [data.data];
    }
    this.LOG?.debug(['convert'], {options: this.innerOptions, gtsList});
    const isGtsToPlot = gtsList.some(g => GTSLib.isGtsToPlot(g));
    const isGtsToAnnotate = gtsList.some(g => GTSLib.isGtsToAnnotate(g));
    const isCustomData = gtsList.some(g => !!g.rows && !!g.columns);
    let res;
    if (isGtsToPlot) {
      res = this.convertGtsToPlot(gtsList, data.params);
    } else if (isGtsToAnnotate) {
      res = this.convertGtsToAnnotate(gtsList, data.params);
    } else if (isCustomData) {
      this.innerOptions.timeMode = 'custom';
      res = this.convertCustomData(gtsList);
    }
    if (!!res) {
      series = res.series;
      min = res.min;
      max = res.max;
    }
    this.LOG?.debug(['convert', 'series'], {series});
    return {
      grid: {
        left: 10, top: 10, bottom: 10, right: 10,
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        formatter: (params) => `<div style="font-size:14px;color:#666;font-weight:400;line-height:1;">${
          (this.innerOptions.timeMode || 'date') === 'date'
            ? GTSLib.toISOString(
              GTSLib.toTimestamp(params.value[0], this.divider, this.innerOptions.timeZone),
              this.divider, this.innerOptions.timeZone,
              this.innerOptions.fullDateDisplay ? this.innerOptions.timeFormat : undefined
            ).replace('T', ' ').replace('Z', '')
            : params.value[0]
        }</div>
            ${params.marker}
            <span style="font-size:14px;color:#666;font-weight:400;margin-left:2px">${params.value[1]}</span>
            <span style="float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900">
            ${params.value[2]}</span>`
      },
      toolbox: {
        show: this.innerOptions.showControls,
        feature: {
          saveAsImage: {type: 'png', excludeComponents: ['toolbox']}
        }
      },
      legend: {bottom: 10, left: 'center', show: false},
      visualMap: {
        show: false,
        min, max,
        color: ColorLib.getHeatMap(this.innerOptions.scheme)
      },
      series: [
        {
          type: 'heatmap',
          data: series,
          progressive: 10000,
          animation: false
        }
      ],
      xAxis: {
        show: !this.innerOptions.hideXAxis,
        type: 'category',
        splitArea: {show: true},
        axisLine: {
          lineStyle: {
            color: Utils.getGridColor(this.el)
          }
        },
        axisLabel: {
          color: Utils.getLabelColor(this.el),
          formatter: value => (this.innerOptions.timeMode || 'date') === 'date'
            ? GTSLib.toISOString(GTSLib.zonedTimeToUtc(value, this.divider, this.innerOptions.timeZone), 1, this.innerOptions.timeZone, this.innerOptions.timeFormat)
              .replace('T', '\n').replace(/\+[0-9]{2}:[0-9]{2}$/gi, '')
            : value
        },
        axisTick: {
          lineStyle: {
            color: Utils.getGridColor(this.el)
          }
        }
      },
      yAxis: {
        type: 'category',
        splitArea: {show: true}
      },
    } as EChartsOption;
  }

  @Method()
  async export(type: 'png' | 'svg' = 'png') {
    return this.myChart ? this.myChart.getDataURL({type, excludeComponents: ['toolbox']}) : undefined;
  }

  componentDidLoad() {
    setTimeout(() => {
      this.parsing = false;
      this.rendering = true;
      let initial = false;
      this.myChart = echarts.init(this.graph, null, {
        width: this.width,
        height: this.height ? this.height - 10 : undefined
      });
      this.myChart.on('rendered', () => {
        this.rendering = false;
        if (initial) {
          setTimeout(() => this.draw.emit());
          initial = false;
        }
      });
      this.myChart.on('mouseover', (event: any) => {
        this.dataPointOver.emit({date: event.value[0], name: event.seriesName, value: event.value[1], meta: {}});
      });
      this.myChart.setOption(this.chartOpts || {}, true, false);
      initial = true;
    });
  }

  private convertGtsToPlot(gtsList, params: Param[]) {
    let series: any[] = [];
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    const gtsCount = gtsList.length;
    for (let i = 0; i < gtsCount; i++) {
      const gts = gtsList[i];
      if (GTSLib.isGtsToPlot(gts) && !!gts.v) {
        (gts.v || []).forEach(v => {
          let val = v[v.length - 1];
          if (val < min) {
            min = val;
          }
          if (val > max) {
            max = val;
          }
          series.push(
            [
              (this.innerOptions.timeMode || 'date') === 'date'
                ? GTSLib.utcToZonedTime(v[0], this.divider, this.innerOptions.timeZone)
                : v[0],
              ((params || [])[i] || {key: undefined}).key || GTSLib.serializeGtsMetadata(gts),
              val
            ]
          );
        });
      }
    }
    series = series.sort((a, b) => a[0] - b[0]);
    return {series, min, max};
  }

  private convertGtsToAnnotate(gtsList, params: Param[]) {
    let series: any[] = [];
    let min = 0;
    let max = 1;
    const gtsCount = gtsList.length;
    for (let i = 0; i < gtsCount; i++) {
      const gts = gtsList[i];
      if (GTSLib.isGtsToAnnotate(gts) && !!gts.v) {
        (gts.v || []).forEach(v => {
          let val = v[v.length - 1];
          if (typeof val === "boolean") {
            val = val ? 1 : 0;
          } else {
            val = 1;
          }
          series.push(
            [
              (this.innerOptions.timeMode || 'date') === 'date'
                ? GTSLib.utcToZonedTime(v[0], this.divider, this.innerOptions.timeZone)
                : v[0],
              ((params || [])[i] || {key: undefined}).key || GTSLib.serializeGtsMetadata(gts),
              val
            ]
          );
        });
      }
    }
    series = series.sort((a, b) => a[0] - b[0]);
    return {series, min, max};
  }

  private convertCustomData(gtsList) {
    let series: any[] = [];
    let min = 0;
    let max = 1;
    const gtsCount = gtsList.length;
    for (let i = 0; i < gtsCount; i++) {
      const gts = gtsList[i];
      if (!!gts.rows && !!gts.columns) {
        gts.rows.forEach(r => {
          const l = r.length;
          for (let j = 1; j < l; j++) {
            let val = r[j];
            if (val < min) {
              min = val;
            }
            if (val > max) {
              max = val;
            }
            series.push([gts.columns[j - 1], r[0], val]);
          }
        });
      }
    }
    series = series.sort((a, b) => a[0] - b[0]);
    return {series, min, max};
  }


  render() {
    return <div class="heatmap-wrapper">
      {this.parsing ? <discovery-spinner>Parsing data...</discovery-spinner> : ''}
      {this.rendering ? <discovery-spinner>Rendering data...</discovery-spinner> : ''}
      <div ref={(el) => this.graph = el as HTMLDivElement}/>
    </div>
  }
}
