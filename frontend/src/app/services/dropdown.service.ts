import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private dropdownStates = new Map<string, BehaviorSubject<boolean>>();
  private _isMobile = window.innerWidth <= 768;
  private mobileListenersAdded = false;

  constructor() {
    this.setupResizeListener();
  }

  private setupResizeListener() {
    if (!this.mobileListenersAdded) {
      window.addEventListener('resize', () => {
        this._isMobile = window.innerWidth <= 768;
      });
      this.mobileListenersAdded = true;
    }
  }

  isMobile() {
    return this._isMobile;
  }

  initDropdown(key: string) {
    if (!this.dropdownStates.has(key)) {
      this.dropdownStates.set(key, new BehaviorSubject(false));
    }
  }

  getState(key: string) {
    this.initDropdown(key);
    return this.dropdownStates.get(key)!.asObservable();
  }

  toggle(key: string) {
    this.initDropdown(key);
    const current = this.dropdownStates.get(key)!.value;
    this.dropdownStates.get(key)!.next(!current);
  }

  open(key: string) {
    this.initDropdown(key);
    this.dropdownStates.get(key)!.next(true);
  }

  close(key: string) {
    this.initDropdown(key);
    this.dropdownStates.get(key)!.next(false);
  }

  // Логика за hover / click:
  onMouseEnter(key: string) {
    if (!this.isMobile()) {
      this.open(key);
    }
  }

  onMouseLeave(key: string) {
    if (!this.isMobile()) {
      this.close(key);
    }
  }

  onClick(key: string) {
    if (this.isMobile()) {
      this.toggle(key);
    }
  }
}
