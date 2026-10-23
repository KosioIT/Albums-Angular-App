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
