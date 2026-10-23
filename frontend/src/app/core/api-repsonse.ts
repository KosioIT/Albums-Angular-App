export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>; // optional: field-level validation errors
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
