type QueueInvalidationEvent = {
  reason: string;
  timestamp: number;
};

type QueueEventListener = (event: QueueInvalidationEvent) => void;

type QueueEventStore = {
  nextListenerId: number;
  listeners: Map<number, QueueEventListener>;
};

declare global {
  var __hmsQueueEventStore__: QueueEventStore | undefined;
}

function getQueueEventStore(): QueueEventStore {
  if (!globalThis.__hmsQueueEventStore__) {
    globalThis.__hmsQueueEventStore__ = {
      nextListenerId: 1,
      listeners: new Map(),
    };
  }

  return globalThis.__hmsQueueEventStore__;
}

export function publishQueueInvalidation(reason: string) {
  const event: QueueInvalidationEvent = {
    reason,
    timestamp: Date.now(),
  };

  for (const listener of getQueueEventStore().listeners.values()) {
    listener(event);
  }
}

export function subscribeToQueueInvalidations(listener: QueueEventListener) {
  const store = getQueueEventStore();
  const id = store.nextListenerId++;
  store.listeners.set(id, listener);

  return () => {
    store.listeners.delete(id);
  };
}

export function createQueueEventStream(request: Request) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false;

        const sendEvent = (event: string, data: QueueInvalidationEvent) => {
          if (closed) {
            return;
          }

          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        const cleanup = () => {
          if (closed) {
            return;
          }

          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        };

        const unsubscribe = subscribeToQueueInvalidations((event) => {
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
