import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  ArrowRight, Check, ChevronDown, CircleAlert, Clock, Crosshair, Download, Eye, EyeOff, FileDown,
  Layers, LoaderCircle, LogOut, Map, MapPin, Maximize2, Menu, Minus, Moon, Package, Pencil, Play,
  Plus, Route, Search, Sun, Trash2, Truck, Upload, User, Users, Warehouse, X,
} from 'lucide-static';

const ICONS = {
  'arrow-right': ArrowRight, check: Check, 'chevron-down': ChevronDown, alert: CircleAlert, clock: Clock,
  crosshair: Crosshair, download: Download, eye: Eye, 'eye-off': EyeOff, 'file-down': FileDown,
  layers: Layers, loader: LoaderCircle, logout: LogOut, map: Map, pin: MapPin, fit: Maximize2, menu: Menu,
  minus: Minus, moon: Moon, package: Package, pencil: Pencil, play: Play, plus: Plus, route: Route,
  search: Search, sun: Sun, trash: Trash2, truck: Truck, upload: Upload, user: User, users: Users,
  depot: Warehouse, x: X,
} as const;

export type IconName = keyof typeof ICONS;

/** Lucide icon, inherits `currentColor`. Decorative unless `label` is set. */
@Component({
  selector: 'app-icon',
  template: '',
  host: {
    '[innerHTML]': 'svg()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  styles: `
    :host { display: inline-flex; width: 1.15em; height: 1.15em; flex: none; }
    :host ::ng-deep svg { width: 100%; height: 100%; stroke-width: 1.85; }
  `,
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<IconName>();
  readonly label = input<string>();
  protected readonly svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]));
}
