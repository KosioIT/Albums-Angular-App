import { User } from '../models/user';

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  field?: string; // which form field caused the error (e.g. a taken email on register)
  errors?: { path?: string; msg: string }[]; // express-validator details
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Returned by login, register, refresh and reset-password
export interface AuthResponse {
  success: true;
  message?: string;
  token: string;
  user: User;
}
