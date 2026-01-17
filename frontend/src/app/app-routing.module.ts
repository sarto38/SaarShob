import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/todos',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'login',
    redirectTo: '/auth',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: '/auth/register',
    pathMatch: 'full'
  },
  {
    path: 'todos',
    loadChildren: () => import('./features/todos/todos.module').then(m => m.TodosModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/todos'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
