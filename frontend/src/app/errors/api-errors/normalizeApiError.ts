import { AxiosError } from 'axios';
import { ApiErrorResponse } from '../../core/api-repsonse';

export function normalizeApiError(err: unknown): never {
  const error = err as AxiosError<ApiErrorResponse>;
  const message =
    error.response?.data?.message ||
    error.message ||
    'Unexpected error occurred!';

  throw new Error(message);
}
