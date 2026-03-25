import { query } from "@/database/db";
import { publishAuditInvalidation } from "@/src/lib/server/auditEvents";

type QueryRunner = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

type LogAuditInput = {
  actorUserCode?: string | null;
  actorStaffId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: string | number | null;
  details?: unknown;
};

function normalizeEntityId(entityId: string | number | null | undefined) {
  if (entityId == null || entityId === "") {
    return null;
  }
  return String(entityId);
}

async function resolveStaffIdByUserCode(userCode: string, runner: QueryRunner) {
  const result = await runner.query(
    "SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1",
    [userCode]
  );
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function logAuditEvent(
  input: LogAuditInput,
  runner?: QueryRunner
): Promise<any | null> {
  const dbRunner: QueryRunner = runner ?? { query };
  try {
    const actorStaffId =
      input.actorStaffId != null
        ? Number(input.actorStaffId)
        : input.actorUserCode
          ? await resolveStaffIdByUserCode(String(input.actorUserCode), dbRunner)
          : null;

    const detailsJson =
      input.details == null
        ? null
        : typeof input.details === "string"
          ? JSON.stringify({ message: input.details })
          : JSON.stringify(input.details);

    const inserted = await dbRunner.query(
      `
        INSERT INTO audit_logs (staff_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `,
      [
        actorStaffId,
        String(input.action || "System event"),
        input.entityType ? String(input.entityType) : null,
        normalizeEntityId(input.entityId),
        detailsJson,
      ]
    );

    const row = inserted.rows[0] ?? null;
    publishAuditInvalidation("audit_log_inserted", row?.log_id ?? null);
    return row;
  } catch (error) {
    console.warn("audit log write failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
  return null;
}
