import { getState, subscribe } from "@/lib/bus";
import type { StreamMessage } from "@/lib/types";

const HEARTBEAT_MS = 20_000;
const encoder = new TextEncoder();

function frame(message: StreamMessage): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
}

export function GET(request: Request): Response {
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };
      const send = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          stop();
        }
      };

      const unsubscribe = subscribe((message) => send(frame(message)));
      const heartbeat = setInterval(() => send(encoder.encode(": ping\n\n")), HEARTBEAT_MS);
      cleanup = stop;
      request.signal.addEventListener("abort", stop, { once: true });

      send(encoder.encode("retry: 1500\n\n"));
      send(frame({ kind: "state", state: getState() }));
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}