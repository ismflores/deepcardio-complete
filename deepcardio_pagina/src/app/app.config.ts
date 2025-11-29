import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    //provideRouter(routes),  //nuevo
    //provideHttpClient(withFetch()) // Enable fetch for HttpClient -- nuevo
  ]
};
