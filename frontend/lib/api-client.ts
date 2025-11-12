export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const defaultBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function apiFetch<TResponse>(
  input: string,
  init?: RequestInit,
  options?: { baseUrl?: string; parseJson?: boolean },
): Promise<TResponse> {
  const baseUrl = options?.baseUrl ?? defaultBaseUrl;
  const url = `${baseUrl}${input.startsWith('/') ? input : `/${input}`}`;

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const parseJson = options?.parseJson ?? true;
  const payload = parseJson ? await safeParseJson(response) : undefined;

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message?: string }).message
        : undefined) ?? response.statusText;
    throw new ApiError(response.status, message ?? 'Request failed', payload);
  }

  return (payload ?? (undefined as TResponse)) as TResponse;
}

async function safeParseJson(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return undefined;
}

export const api = {
  get: <TResponse>(path: string, init?: RequestInit) =>
    apiFetch<TResponse>(path, { method: 'GET', ...init }),
  post: <TResponse, TBody>(path: string, body?: TBody, init?: RequestInit) =>
    apiFetch<TResponse>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    }),
  patch: <TResponse, TBody>(path: string, body?: TBody, init?: RequestInit) =>
    apiFetch<TResponse>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    }),
  delete: <TResponse>(path: string, init?: RequestInit) =>
    apiFetch<TResponse>(path, { method: 'DELETE', ...init }),
};

