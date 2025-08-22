/// <reference types="@angular/localize" />

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { ToastrModule } from 'ngx-toastr';

const myAppConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideHttpClient(),
    provideRouter(routes),
    importProvidersFrom(ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      closeButton: true,
      preventDuplicates: true,
    })),
  ],
};

bootstrapApplication(AppComponent, myAppConfig)
  .catch(err => console.error(err));
