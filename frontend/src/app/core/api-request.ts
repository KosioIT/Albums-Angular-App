import { from, catchError, map, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { normalizeApiError } from '../errors/api-errors/normalizeApiError';
import { ApiResponse } from './api-repsonse';

export function apiRequest<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Observable<T> {
  return from(promise).pipe(
    map((res) => {
      if (!res.data.success) {
        throw new Error(res.data.message);
      }
      return res.data.data as T;
    }),
    catchError((err) => {
      throw normalizeApiError(err);
    }),
  );
}

// For endpoints that answer with top-level fields instead of `data` (e.g. { success, liked, likes })
export function apiBody<T>(promise: Promise<AxiosResponse<T>>): Observable<T> {
  return from(promise).pipe(
    map((res) => res.data),
    catchError((err) => {
      throw normalizeApiError(err);
    }),
  );
}
