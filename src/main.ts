import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// 🔥 Firebase imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import {
  provideAuth,
  getAuth,
  connectAuthEmulator,
} from '@angular/fire/auth';
import {
  provideFirestore,
  getFirestore,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';

import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // 🔥 Firebase App
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),

    // 🔐 Firebase Auth (with Emulator)
    provideAuth(() => {
      const auth = getAuth();

      if (location.hostname === 'localhost') {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }

      return auth;
    }),

    // 📦 Firestore (with Emulator)
    provideFirestore(() => {
      const firestore = getFirestore();

      if (location.hostname === 'localhost') {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      return firestore;
    }),
  ],
});
