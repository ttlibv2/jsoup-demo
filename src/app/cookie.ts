import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest
} from '@angular/common/http';

import { Observable, of  } from 'rxjs';
import { map} from 'rxjs/operators';

/** Pass untouched request through to the next request handler. */
@Injectable()
export class TsInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(map(evt => {
		return evt;
	}));
  }
  
}