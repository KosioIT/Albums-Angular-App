import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { GlobalErrorHandler } from './errors/global-error-handler';

// The app talks only to the Express API; Firestore is reached by the backend (firebase-admin)
export const appConfig: ApplicationConfig = {
  providers: [
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
  ],
};
