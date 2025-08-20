// src/shared/interceptors/alias-top-tours.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthRequest } from 'src/auth/dto';

@Injectable()
export class AliasTopToursInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: AuthRequest = context.switchToHttp().getRequest();

    // Set query parameters for top tours
    request.query = {
      ...request.query,
      limit: '5',
      sort: '-ratingsAverage,price',
      fields: 'name,price,ratingsAverage,summary,difficulty,duration',
    };

    return next.handle();
  }
}

@Injectable()
export class AliasPremiumToursInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: AuthRequest = context.switchToHttp().getRequest();

    // Set query parameters for premium tours
    request.query = {
      ...request.query,
      premium: 'true',
      sort: '-ratingsAverage,price',
      fields: 'name,price,ratingsAverage,summary,difficulty,premium,duration',
    };

    return next.handle();
  }
}

@Injectable()
export class UserTourReviewsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: AuthRequest = context.switchToHttp().getRequest();

    // Set query parameters for user-specific tour reviews
    if (!request.body.tourId) request.body.tourId = request.params.tourId;
    if (!request.body.userId) request.body.userId = request.user?.id;

    return next.handle();
  }
}
