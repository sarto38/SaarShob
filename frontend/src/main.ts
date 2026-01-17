import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, HTTP_INTERCEPTORS, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { TokenInterceptor } from './app/core/interceptors/token.interceptor';
import { AuthService } from './app/core/services/auth.service';
import { WebSocketService } from './app/core/services/websocket.service';
import { TodoService } from './app/features/todos/services/todo.service';
import { AuthGuard } from './app/core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/todos',
    pathMatch: 'full' as const
  },
  {
    path: 'auth',
    loadChildren: () => import('./app/features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'login',
    redirectTo: '/auth',
    pathMatch: 'full' as const
  },
  {
    path: 'register',
    redirectTo: '/auth/register',
    pathMatch: 'full' as const
  },
  {
    path: 'todos',
    loadChildren: () => import('./app/features/todos/todos.module').then(m => m.TodosModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/todos'
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    AuthService,
    WebSocketService,
    TodoService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));
