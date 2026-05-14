export class ApiError extends Error {
  readonly name = "ApiError"
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message)
  }
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init)
  const text = await res.text()
  let parsed: unknown = undefined
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // Body wasn't JSON — leave parsed undefined and fall through.
    }
  }

  if (!res.ok) {
    const fromBody = (parsed as { error?: string } | undefined)?.error
    const message =
      fromBody ||
      (text ? text.slice(0, 200) : `${res.status} ${res.statusText || "Request failed"}`)
    throw new ApiError(res.status, message, parsed)
  }

  return parsed as T
}
