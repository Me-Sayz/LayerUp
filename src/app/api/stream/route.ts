import { getState, subscribe } from "@/lib/bus";
import { requireTenant } from "@/lib/tenant";
import type { StreamMessage } from "@/lib/types";

const HEARTBEAT_MS = 20_000;
const encoder = new TextEncoder();

function frame(message: StreamMessage): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
}

export async function GET(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["session", "overlay"]);
  if (tenant instanceof Response) return tenant;
  const { userId, channel } = tenant;

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      const heartbeat = setInterval(() => send(encoder.encode(": ping\n\n")), HEARTBEAT_MS);
      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
      };
      const send = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          stop();
        }
      };
      const kick = () => {
        stop();
        try {
          controller.close();
        } catch {
          // sudah tertutup
        }
      };

      cleanup = stop;
      request.signal.addEventListener("abort", stop, { once: true });

      try {
        unsubscribe = await subscribe(userId, (message) => send(frame(message)), channel === "overlay" ? kick : undefined);
        if (closed) {
          unsubscribe();
          return;
        }
        send(encoder.encode("retry: 1500\n\n"));
        send(frame({ kind: "state", state: await getState(userId) }));
      } catch (error) {
        console.error("[stream] gagal:", error);
        kick();
      }
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
