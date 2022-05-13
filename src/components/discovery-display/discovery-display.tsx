/*
 *   Copyright 2022  SenX S.A.S.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import {Component, Element, Event, EventEmitter, h, Listen, Method, Prop, State, Watch} from '@stencil/core';
import {DataModel} from "../../model/dataModel";
import {ChartType} from "../../model/types";
import {Param} from "../../model/param";
import {Logger} from "../../utils/logger";
import {GTSLib} from "../../utils/gts.lib";
import fitty, {FittyInstance} from 'fitty';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime'
import {Utils} from "../../utils/utils";
import {DiscoveryEvent} from "../../model/discoveryEvent";
import domtoimage from 'dom-to-image';

dayjs.extend(relativeTime)

@Component({
  tag: 'discovery-display',
  styleUrl: 'discovery-display.scss',
  shadow: true,
})
export class DiscoveryDisplayComponent {

  @Prop({mutable: true}) result: DataModel | string;
  @Prop() type: ChartType;
  @Prop() options: Param | string = new Param();
  @State() @Prop({mutable: true}) width: number;
  @State() @Prop({mutable: true}) height: number;
  @Prop() debug: boolean = false;
  @Prop() unit: string = '';

  @Element() el: HTMLElement;

  @Event() draw: EventEmitter<void>;

  @State() parsing: boolean = false;
  @State() rendering: boolean = false;
  @State() message: string;
  @State() innerStyle: { [k: string]: string; };
  @State() innerOptions: Param;

  private wrapper: HTMLDivElement;
  private pngWrapper: HTMLDivElement;
  private defOptions: Param = new Param();
  private divider: number = 1000;
  private LOG: Logger;
  private timer: any;
  private fitties: FittyInstance;
  private innerHeight: number;
  private initial = false;

  @Watch('result')
  updateRes() {
    this.result = GTSLib.getData(this.result);
    this.message = this.convert(this.result as DataModel || new DataModel());
    this.flexFont();
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
      this.message = this.convert(this.result as DataModel || new DataModel());
      this.flexFont();
      if (this.LOG) {
        this.LOG?.debug(['optionsUpdate 2'], {options: this.innerOptions, newValue, oldValue});
      }
    }
  }

  @Listen('discoveryEvent', {target: 'window'})
  discoveryEventHandler(event: CustomEvent<DiscoveryEvent>) {
    const res = Utils.parseEventData(event.detail, this.innerOptions.eventHandler);
    if (res.style) {
      this.innerStyle = {...this.innerStyle, ...res.style as { [k: string]: string }};
    }
  }

  @Method()
  async resize() {
    const dims = Utils.getContentBounds(this.el.parentElement);
    this.width = dims.w;
    this.height = dims.h;
    this.flexFont();
  }

  // noinspection JSUnusedLocalSymbols
  @Method()
  async export(type: 'png' | 'svg' = 'png') {
    let bgColor = Utils.getCSSColor(this.el, '--warp-view-bg-color', 'transparent');
    bgColor = ((this.innerOptions as Param) || {bgColor}).bgColor || bgColor;
    const dm: Param = (((this.result as unknown as DataModel) || {
      globalParams: {bgColor}
    }).globalParams || {bgColor}) as Param;
    bgColor = dm.bgColor || bgColor;
    return await domtoimage.toPng(this.pngWrapper, {height: this.height, width: this.width, bgcolor: bgColor});
  }

  componentWillLoad() {
    this.parsing = true;
    this.LOG = new Logger(DiscoveryDisplayComponent, this.debug);
    if (typeof this.options === 'string') {
      this.innerOptions = JSON.parse(this.options);
    } else {
      this.innerOptions = this.options;
    }
    this.result = GTSLib.getData(this.result);
    this.divider = GTSLib.getDivider(this.innerOptions.timeUnit || 'us');
    this.message = this.convert(this.result as DataModel || new DataModel())
    this.LOG?.debug(['componentWillLoad'], {
      type: this.type,
      options: this.innerOptions,
    });
  }

  componentDidLoad() {
    setTimeout(() => {
      this.height = Utils.getContentBounds(this.el.parentElement).h;
      this.initial = true;
      this.flexFont();
      this.parsing = false;
    });
  }

  // noinspection JSUnusedGlobalSymbols
  disconnectedCallback() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.fitties) {
      this.fitties.unsubscribe();
    }
  }

  private convert(dataModel: DataModel) {
    let options = Utils.mergeDeep<Param>(this.defOptions, this.innerOptions || {}) as Param;
    options = Utils.mergeDeep<Param>(options || {} as Param, dataModel.globalParams) as Param;
    this.innerOptions = {...options};
    if (this.innerOptions.customStyles) {
      this.innerStyle = {...this.innerStyle, ...this.innerOptions.customStyles || {}};
    }
    this.LOG?.debug(['convert'], 'dataModel', dataModel);

    let display: any;
    if (dataModel.data) {
      display = GTSLib.isArray(dataModel.data) ? dataModel.data[0] : dataModel.data;
    } else {
      display = GTSLib.isArray(dataModel) ? dataModel[0] : dataModel;
    }
    if (display && display.hasOwnProperty('text')) {
      if (display.hasOwnProperty('url')) {
        display = `<a href="${display.url}" target="_blank">${display.text}</a>`;
      } else {
        display = display.text;
      }
    }
    switch (this.innerOptions.timeMode) {
      case 'date':
        display = GTSLib.toISOString(parseInt(display, 10), this.divider, this.innerOptions.timeZone,
          this.innerOptions.fullDateDisplay ? this.innerOptions.timeFormat : undefined);
        break;
      case 'duration':
        const start = GTSLib.toISOString(parseInt(display, 10), this.divider, this.innerOptions.timeZone,
          this.innerOptions.fullDateDisplay ? this.innerOptions.timeFormat : undefined);
        display = this.displayDuration(dayjs(start));
        break;
      case 'custom':
      case 'timestamp':
        display = decodeURIComponent(decodeURIComponent(display));
    }
    return display;
  }

  flexFont() {
    if (!!this.wrapper) {
      const height = Utils.getContentBounds(this.wrapper.parentElement).h - 20;
      if (height !== this.innerHeight) {
        this.innerHeight = height;
        this.LOG?.debug(['flexFont'], height);
        if (this.fitties) {
          this.fitties.unsubscribe();
        }
        this.fitties = fitty(this.wrapper, {maxSize: height * 0.80, minSize: 14});
        this.fitties.element.addEventListener('fit', () => {
          if (this.initial) {
            setTimeout(() => this.draw.emit(), 100);
            this.initial = false;
          }
        });
        this.fitties.fit();
      }
    }
  }

  render() {
    return <div ref={(el) => this.pngWrapper = el as HTMLDivElement} class="png-wrapper">
      <style>{this.generateStyle(this.innerStyle)}</style>
      <div style={{color: this.innerOptions.fontColor}} class="display-container">
        {this.parsing ? <discovery-spinner>Parsing data...</discovery-spinner> : ''}
        {this.rendering ? <discovery-spinner>Rendering data...</discovery-spinner> : ''}
        <div ref={(el) => this.wrapper = el as HTMLDivElement} class="value">
          <span innerHTML={this.message}/><small>{this.unit ? this.unit : ''}</small>
        </div>
      </div>
    </div>
  }

  private displayDuration(start: dayjs.Dayjs) {
    this.timer = setInterval(() => this.message = dayjs().to(start), 1000);
    return dayjs().to(start);
  }

  private generateStyle(innerStyle: { [k: string]: string }): string {
    return Object.keys(innerStyle || {}).map(k => k + ' { ' + innerStyle[k] + ' }').join('\n');
  }
}
