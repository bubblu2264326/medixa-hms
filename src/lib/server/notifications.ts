// Notification outbox — enqueue WhatsApp/SMS/email messages for a gateway worker.
// Live delivery requires a configured gateway (credentials are env config, not
// code); enqueue is always safe and durable. Callers should treat enqueue as
// best-effort (a notification failure must never fail the business action).

export type NotificationRunner = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };
export type NotificationChannel = "sms" | "whatsapp" | "email";

export type EnqueueInput = {
  channel: NotificationChannel;
  recipient: string | null | undefined;
  template: string;
  payload?: Record<string, unknown>;
  relatedEntity?: string | null;
};

// Queue a message. Returns the notification_id, or null if there's no recipient
// (nothing to send) — callers can ignore the result.
export async function enqueueNotification(runner: NotificationRunner, input: EnqueueInput): Promise<number | null> {
  const recipient = String(input.recipient ?? "").trim();
  if (!recipient) return null;
  const r = await runner.query(
    `INSERT INTO notification_outbox (channel, recipient, template, payload, related_entity)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING notification_id`,
    [input.channel, recipient, input.template, JSON.stringify(input.payload ?? {}), input.relatedEntity ?? null]
  );
  return r?.rows?.[0]?.notification_id ?? null;
}
