// frontend/src/lib/sse.ts
export type SSEEvent<T = unknown> = { event: string; data: T };

/**
 * `Response.body`(ReadableStream)를 SSE 프레임 단위로 파싱해
 * { event, data } 객체로 yield하는 async generator.
 *
 * - data가 JSON 파싱 가능하면 그 결과를 반환한다.
 * - 비-JSON 데이터는 raw 문자열을 그대로 반환한다.
 */
export async function* readSSE<T = unknown>(
  res: Response,
): AsyncGenerator<SSEEvent<T>, void, unknown> {
  if (!res.body) throw new Error("response has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let frameEnd: number;
      while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);

        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataLines.push(line.slice(6));
          }
        }
        if (dataLines.length === 0) continue;

        const raw = dataLines.join("\n");
        try {
          yield { event: eventName, data: JSON.parse(raw) as T };
        } catch {
          yield { event: eventName, data: raw as unknown as T };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
