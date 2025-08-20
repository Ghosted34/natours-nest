import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { deleteMultipleImagesFromS3 } from 'src/utils/s3';
import { IMGRequest } from '../types';

@Injectable()
export class CleanupS3Interceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: IMGRequest = context.switchToHttp().getRequest();
    const uploadedUrls: string[] = [];

    // Collect uploaded URLs
    if (request.uploadedImageUrl) {
      uploadedUrls.push(request.uploadedImageUrl);
    }
    if (request.uploadedImageUrls) {
      uploadedUrls.push(...request.uploadedImageUrls);
    }

    return next.handle().pipe(
      catchError(async (error: Error) => {
        // Clean up uploaded files if request fails
        if (uploadedUrls.length > 0) {
          await deleteMultipleImagesFromS3(uploadedUrls).catch(
            (cleanupError) => {
              console.error('Error cleaning up S3 files:', cleanupError);
            },
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
