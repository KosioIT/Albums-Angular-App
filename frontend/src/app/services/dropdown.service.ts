import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, Subscription } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DropdownService implements OnDestroy {
  private dropdownStates = new Map<string, BehaviorSubject<boolean>>();
  private resizeSub!: Subscription;

  // Reactive mobile state
  private isMobileSubject = new BehaviorSubject<boolean>(
    window.innerWidth <= 768,
  );
  isMobile$ = this.isMobileSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.setupResizeListener();
  }

  private setupResizeListener(): void {
    this.ngZone.runOutsideAngular(() => {
      this.resizeSub = fromEvent(window, 'resize')
        .pipe(
          debounceTime(150),
          map(() => window.innerWidth <= 768),
          startWith(window.innerWidth <= 768),
        )
        .subscribe((isMobile) => {
          this.ngZone.run(() => this.isMobileSubject.next(isMobile));
        });
    });
  }

  isMobile(): boolean {
    return this.isMobileSubject.value;
  }

  private ensureDropdown(key: string): BehaviorSubject<boolean> {
    if (!this.dropdownStates.has(key)) {
      this.dropdownStates.set(key, new BehaviorSubject(false));
    }
    return this.dropdownStates.get(key)!;
  }

  getState(key: string) {
    return this.ensureDropdown(key).asObservable();
  }

  toggle(key: string) {
    const state = this.ensureDropdown(key);
    state.next(!state.value);
  }

  open(key: string) {
    this.ensureDropdown(key).next(true);
  }

  close(key: string) {
    this.ensureDropdown(key).next(false);
  }

  closeAll() {
    this.dropdownStates.forEach((state) => state.next(false));
  }

  // Hover / click logic
  onMouseEnter(key: string) {
    if (!this.isMobile()) this.open(key);
  }

  onMouseLeave(key: string) {
    if (!this.isMobile()) this.close(key);
  }

  onClick(key: string) {
    if (this.isMobile()) this.toggle(key);
  }

  ngOnDestroy(): void {
    this.resizeSub?.unsubscribe();
  }
}
