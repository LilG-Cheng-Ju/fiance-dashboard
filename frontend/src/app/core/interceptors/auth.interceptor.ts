import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, idToken } from '@angular/fire/auth';
import { switchMap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);

  const publicEndpoints = [
    '/market/stock',
    '/market/rate',
  ];

  const isPublicRequest = publicEndpoints.some(url => req.url.includes(url));

  if (isPublicRequest) {
    return next(req);
  }

  return idToken(auth).pipe(
    switchMap((token) => {
      if (token) {
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`),
        });
        return next(authReq);
      }
      
      return next(req);
    })
  );
};