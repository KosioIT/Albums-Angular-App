/// <reference types="@angular/localize" />

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

const myAppConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideHttpClient(),
    provideRouter(routes),
  ],
};

bootstrapApplication(AppComponent, myAppConfig)
  .catch(err => console.error(err));
