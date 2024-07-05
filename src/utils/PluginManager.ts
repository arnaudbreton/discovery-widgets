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

// noinspection JSUnusedGlobalSymbols

import {Logger} from './logger';
import {PluginDef} from '../model/PluginDef';
import { CHART_TYPES } from '../model/types';

export class PluginManager {
  LOG: Logger;
  registry: any;
  static instance: PluginManager;

  constructor() {
    this.LOG = new Logger(PluginManager);
    if (!window) {
      return;
    }
    const win = window as any;
    win.DiscoveryPluginRegistry = {
      ...(win.DiscoveryPluginRegistry || {})
    };
    this.registry = win.DiscoveryPluginRegistry;
  }

  static getInstance() {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  register(plugin: PluginDef) {
    this.registry[plugin.type] = plugin;
    CHART_TYPES.push(plugin.type);
    this.LOG?.info(['Registration', plugin.name], `${plugin.toString()}`);
    this.LOG?.debug(['Registration of', plugin.name], this.registry);
  }

  get(type: string): PluginDef {
    this.LOG?.debug(['getPlugin'], this.registry, type);
    return this.registry[type];
  }

  has(type: string): boolean {
    return this.registry[type] !== undefined;
  }
}
