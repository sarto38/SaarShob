import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred!';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          errorMessage = error.error?.message || error.message || errorMessage;

          if (error.status === 401) {
            // Auto logout if 401 response returned from api
            this.authService.logout();
            this.router.navigate(['/auth/login']);
            errorMessage = 'Session expired. Please login again.';
          } else if (error.status === 409) {
            // Specific handling for conflict/locked tasks
            errorMessage = error.error?.message || 'Task is currently locked by another user.';
          } else if (error.status === 0) {
            errorMessage = 'Cannot connect to the server. Please check your internet connection.';
          }
        }

        // Don't show snackbar for 404 on health checks or similar if they occur
        // But for our app, showing errors is generally good.
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });

        return throwError(() => error);
      })
    );
  }
}
