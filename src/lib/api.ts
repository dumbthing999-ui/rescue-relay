// Rescue Relay — API helpers
// Error envelope (ApiResult<T>) + a tiny client-side fetch wrapper.
// Every route handler returns the same envelope: { ok, data } | { ok, error, code }.

import type { ApiError, ApiOk, ApiResult } from "@/types";

/** Build a success envelope. */
export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

/** Build a failure envelope. Optionally attach a machine-readable code. */
export function fail(error: string, code?: string): ApiError {
  return { ok: false, error, ...(code ? { code } : {}) };
}

/**
 * Tiny fetch wrapper for client → route-handler calls.
 * Resolves with the typed envelope; network and non-2xx responses become ApiError.
 */
export async function apiFetch<T>(
  input: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return fail("Network error — please try again.", "network_error");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail("The server returned an unparseable response.", "bad_response");
  }

  if (!response.ok) {
    const err = body as Partial<ApiError>;
    return fail(err.error ?? `Request failed (${response.status}).`, err.code);
  }

  return body as ApiOk<T>;
}
