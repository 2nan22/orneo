// frontend/src/lib/ai-service.ts

const AI_SERVICE_URL =
  process.env.AI_SERVICE_INTERNAL_URL ?? "http://ai_service:8001";
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? "";

export async function fetchAiService<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_SERVICE_SECRET,
      ...options.headers,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`AI Service error: ${res.status} ${path}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}
