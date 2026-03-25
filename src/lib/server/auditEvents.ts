type AuditInvalidationEvent = {
  reason: string;
  timestamp: number;
  logId?: string | number | null;
};

type AuditEventListener = (event: AuditInvalidationEvent) => void;

type AuditEventStore = {
  nextListenerId: number;
  listeners: Map<number, AuditEventListener>;
};

declare global {
  var __hmsAuditEventStore__: AuditEventStore | undefined;
}

function getAuditEventStore(): AuditEventStore {
  if (!globalThis.__hmsAuditEventStore__) {
    globalThis.__hmsAuditEventStore__ = {
      nextListenerId: 1,
      listeners: new Map(),
    };
  }

  return globalThis.__hmsAuditEventStore__;
}

export function publishAuditInvalidation(reason: string, logId?: string | number | null) {
  const event: AuditInvalidationEvent = {
    reason,
    timestamp: Date.now(),
    logId: logId ?? null,
  };

  for (const listener of getAuditEventStore().listeners.values()) {
    listener(event);
  }
}

export function subscribeToAuditInvalidations(listener: AuditEventListener) {
  const store = getAuditEventStore();
  const id = store.nextListenerId++;
  store.listeners.set(id, listener);

  return () => {
    store.listeners.delete(id);
  };
}

export function createAuditEventStream(request: Request) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false;

        const sendEvent = (event: string, data: AuditInvalidationEvent) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        };

        const unsubscribe = subscribeToAuditInvalidations((event) => {
          sendEvent("invalidate", event);
        });

        const heartbeat = setInterval(() => {
          sendEvent("ping", {
            reason: "heartbeat",
            timestamp: Date.now(),
          });
        }, 25000);

        sendEvent("connected", {
          reason: "connected",
          timestamp: Date.now(),
        });

        request.signal.addEventListener("abort", cleanup, { once: true });
      },
    }),
    {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
      },
    }
  );
}
