const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  token: string,
  organizationId?: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(organizationId ? { "X-Organization-ID": organizationId } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const raw = await response.text();
    let message = raw || "Não foi possível concluir a operação.";
    try {
      const parsed = JSON.parse(raw) as { detail?: string | Array<{ msg?: string }> };
      message = Array.isArray(parsed.detail)
        ? parsed.detail.map((item) => item.msg).filter(Boolean).join("; ")
        : parsed.detail || message;
    } catch {
      // Respostas não JSON continuam legíveis pelo texto bruto.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
