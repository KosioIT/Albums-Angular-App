/// <reference types="@angular/localize" />

import { AppComponent } from './app/app.component';
import { ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { firebaseConfig } from './app/app.config';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideToastr } from 'ngx-toastr';
import { AuthService } from './app/services/auth.service';
import { GlobalErrorHandler } from './app/errors/global-error-handler';

const myAppConfig = {
  providers: [
    ...(firebaseConfig.providers ?? []),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(),
    // Restore the session from the refresh cookie before the first navigation, so guards see the user
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-center',
      closeButton: true,
      preventDuplicates: true,
    }),
    // importProvidersFrom(ToastrModule.forRoot({
    //   timeOut: 3000,
    //   positionClass: 'toast-bottom-right',
    //   closeButton: true,
    //   preventDuplicates: true,
    // })),
  ],
};

bootstrapApplication(AppComponent, myAppConfig).catch((err) =>
  console.error(err),
);
