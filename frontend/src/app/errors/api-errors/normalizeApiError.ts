import { AxiosError } from 'axios';
import { ApiErrorResponse } from '../../core/api-repsonse';

// Error thrown by every API call: the server message plus what a form needs to react to it
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly field: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeApiError(err: unknown): never {
  if (err instanceof ApiError) throw err;

  const error = err as AxiosError<ApiErrorResponse>;
  const data = error.response?.data;
  const message = data?.message || error.message || 'Unexpected error occurred!';

  throw new ApiError(message, error.response?.status ?? null, data?.field ?? null);
}
