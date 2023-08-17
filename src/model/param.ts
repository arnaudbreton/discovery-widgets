/*
 *   Copyright 2022-2023  SenX S.A.S.
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

// noinspection JSUnusedGlobalSymbols

import {ChartType, DiscoveryEvent, MapParams, TimeMode, TimeUnit} from './types';

export class Param {
  skippedVars?: string[];
  mutedVars?: string[];
  scheme = 'WARP10';
  bgColor?: string;
  datasetColor?: string;
  fillColor?: string;
  fontColor?: string;
  timeZone = 'UTC';
  timeFormat?: string;
  unit?: string;
  title?: string;
  type?: ChartType;
  subType?: ChartType;
  showRangeSelector?: boolean = false;
  timeMode?: TimeMode;
  showDots = false;
  timeUnit: TimeUnit = 'us';
  borderColor?: string;
  minColorValue?: string;
  maxColorValue?: string;
  startColor?: string;
  endColor?: string;
  numColorSteps?: number;
  maxValue: number;
  minValue: number;
  key?: string;
  properties?: any;
  yAxis?: number;
  xAxis?: number;
  hideYAxis = false;
  hideXAxis = false;
  showLegend = false;
  showValues = false;
  fullDateDisplay = false;
  responsive?: boolean;
  autoRefresh?: number;
  showControls = false;
  thresholds?: { color?: string; fill?: boolean, value?: number; name?: string, type?: 'solid' | 'dashed' | 'dotted' }[];
  markers?: { color?: string; value?: number; start?: number; fill?: boolean; name?: string, type?: 'solid' | 'dashed' | 'dotted', alpha?: number; }[];
  pieces?: { color?: string; lte?: number; gte?: number }[];
  yLabelsMapping?: { [key: number]: string };
  xpieces?: boolean;
  showErrors?: boolean;
  showStatus?: boolean;
  expandAnnotation = false;
  displayExpander = true;
  showGTSTree?: boolean;
  foldGTSTree?: boolean;
  split?: 'Y' | 'M' | 'D' | 'h' | 'm' | 's';
  popupButtonValidateClass?: string;
  popupButtonValidateLabel?: string;
  bounds?: {
    minDate?: number;
    maxDate?: number;
    yRanges?: [number, number];
  };
  isRefresh?: boolean;
  elemsCount?: number;
  windowed?: number;
  eventHandler?: string;
  customStyles?: { [key: string]: string; };
  httpHeaders?: { [key: string]: string; };
  leftMargin = 0;
  showLoader = false;
  noDataLabel = 'No data';
  tooltipDelay?: number;
  polygons?: { shape: number[][]; color?: string; name?: string; fill?: boolean }[];
  xCursor?: boolean;
  yCursor?: boolean;
  poi?: boolean;
  poiColor: '#D81B60';
  poiLine: 'dashed';
  dotSize = 5;
  strokeWidth = 1;
// components specific params
  bar?: {
    horizontal?: boolean,
    stacked?: boolean,
    animate?: boolean,
    startAngle?: number,
    fillGap?: boolean,
  };
  button?: {
    label: string
  };
  tabular?: {
    fixedWidth: boolean,
    sortable: boolean,
    filterable: boolean,
    onTop: boolean
  };
  gauge?: {
    horizontal: boolean,
    showTicks: false,
  };
  input?: {
    showButton?: boolean,
    value?: string | number | number[],
    min?: number,
    max?: number,
    step?: number,
    stepCount?: number,
    horizontal?: boolean,
    progress?: boolean,
    showTicks?: boolean,
    showFilter?: boolean,
    immediate?: boolean,
  }
  map?: MapParams;
  svg?: {
    handlers?: { selector?: string, event: DiscoveryEvent, hover: boolean, click: boolean }[],
  }
  calendar?: {
    horizontal?: boolean,
    firstDay?: number,
    dayLabel?: string[],
    monthLabel?: string[],
  };
  extra?: any;
}
