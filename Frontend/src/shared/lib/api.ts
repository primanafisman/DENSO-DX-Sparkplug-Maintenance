import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { apiBase } from '../../config/env';
import type { ApiResponse } from './contracts';
import { csrfToken, resetCsrf } from './csrf';
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = 'NETWORK_ERROR',
    public request_id = '',
    public details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export const api = axios.create({ baseURL: apiBase, withCredentials: true, timeout: 125000 });
api.interceptors.request.use(async (config) => {
  if (
    !['get', 'head', 'options'].includes(config.method ?? 'get') &&
    !['/auth/login', '/auth/token'].includes(config.url ?? '')
  ) {
    config.headers.set(
      'X-CSRF-Token',
      await csrfToken(async () => {
        const response = await api.get<ApiResponse<{ csrf_token: string }>>('/auth/csrf');
        if (!response.data.success)
          throw new ApiError(response.data.message, 403, response.data.code);
        return response.data.data.csrf_token;
      }),
    );
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error instanceof ApiError) return Promise.reject(error);
    if (axios.isCancel(error)) return Promise.reject(error);
    const data = error.response?.data as
      | Partial<{
          message: string;
          code: string;
          request_id: string;
          details: { field: string; message: string }[];
        }>
      | undefined;
    const mapped = new ApiError(
      data?.message ?? 'Tidak dapat terhubung. Periksa koneksi dan coba lagi.',
      error.response?.status ?? 0,
      data?.code ?? 'NETWORK_ERROR',
      data?.request_id ?? '',
      data?.details,
    );
    if (mapped.status === 401 && !String(error.config?.url).startsWith('/auth/')) {
      resetCsrf();
      window.dispatchEvent(new Event('spm:session-expired'));
    }
    if (mapped.code === 'CSRF_INVALID') resetCsrf();
    return Promise.reject(mapped);
  },
);
function unwrap<T>(payload: ApiResponse<T>): T {
  if (!payload.success)
    throw new ApiError(payload.message, 0, payload.code, payload.request_id, payload.details);
  return payload.data;
}
export async function read<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap((await api.get<ApiResponse<T>>(path, config)).data);
}
export async function write<T>(
  path: string,
  body: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return unwrap((await api.post<ApiResponse<T>>(path, body, config)).data);
}
export async function update<T>(path: string, body: unknown): Promise<T> {
  return unwrap((await api.put<ApiResponse<T>>(path, body)).data);
}
export async function remove<T>(path: string): Promise<T> {
  return unwrap((await api.delete<ApiResponse<T>>(path)).data);
}
export async function binary(path: string, config?: AxiosRequestConfig): Promise<Blob> {
  return (await api.get<Blob>(path, { ...config, responseType: 'blob' })).data;
}
export async function cropBinary(path: string, body: unknown, signal?: AbortSignal): Promise<Blob> {
  return (await api.post<Blob>(path, body, { responseType: 'blob', signal })).data;
}
