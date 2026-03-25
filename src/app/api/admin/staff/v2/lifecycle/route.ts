import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

type AccountType = "staff" | "doctor";

function normalizeAccountType(value: unknown): AccountType {
  return value === "doctor" ? "doctor" : "staff";
}

function toNullableNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveActorStaffId(userCode: string) {
  const result = await query("SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

async function addLifecycleEvent(input: {
  runId: number;
  taskId?: number | null;
  actorStaffId?: number | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  payload?: unknown;
}) {
  await query(
    `
    INSERT INTO employee_lifecycle_events (
      lifecycle_run_id,
      lifecycle_task_id,
      actor_staff_id,
      event_type,
      from_status,
      to_status,
      event_note,
      payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      input.runId,
      input.taskId ?? null,
      input.actorStaffId ?? null,
      input.eventType,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.note ?? null,
      input.payload == null ? null : JSON.stringify(input.payload),
    ]
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);

    const runId = toNullableNumber(searchParams.get("run_id"));
    const runStatus = searchParams.get("status");
    const lifecycleType = searchParams.get("lifecycle_type");
    const accountType = searchParams.get("account_type");
    const personId = toNullableNumber(searchParams.get("person_id") ?? searchParams.get("staff_id"));
    const department = searchParams.get("department");
    const facilityCode = searchParams.get("facility_code");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const params: any[] = [];
    let where = "WHERE 1=1";

    if (runStatus) {
      params.push(runStatus);
      where += ` AND r.run_status = $${params.length}`;
    }
    if (lifecycleType) {
      params.push(lifecycleType);
      where += ` AND r.lifecycle_type = $${params.length}`;
    }
    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      where += ` AND r.account_type = $${params.length}`;
    }
    if (personId) {
      params.push(personId);
      where += ` AND r.person_id = $${params.length}`;
    }
    if (department) {
      params.push(department);
      where += ` AND COALESCE(s.department, d.specialization) = $${params.length}`;
    }
    if (facilityCode) {
      params.push(facilityCode);
      where += ` AND COALESCE(s.facility_code, 'MAIN') = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      where += ` AND r.started_at::date >= $${params.length}::date`;
    }
    if (toDate) {
      params.push(toDate);
      where += ` AND r.started_at::date <= $${params.length}::date`;
    }

    const runs = await query(
      `
      SELECT
        r.lifecycle_run_id,
        r.account_type,
        r.person_id,
        r.staff_id,
        r.doctor_id,
        r.lifecycle_template_id,
        t.template_code,
        t.template_name,
        r.lifecycle_type,
        r.run_status,
        r.started_at,
        r.completed_at,
        r.initiated_by,
        initiator.name AS initiated_by_name,
        r.summary_note,
        r.created_at,
        r.updated_at,
        COALESCE(s.name, d.doctor_name) AS employee_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.role, 'Doctor') AS role,
        COALESCE(s.department, d.specialization) AS department,
        COALESCE(s.facility_code, 'MAIN') AS facility_code,
        COUNT(lt.lifecycle_task_id)::int AS total_tasks,
        COUNT(*) FILTER (WHERE lt.task_status = 'completed')::int AS completed_tasks,
        COUNT(*) FILTER (WHERE lt.task_status IN ('pending', 'in_progress', 'blocked', 'overdue'))::int AS open_tasks
      FROM employee_lifecycle_runs r
      LEFT JOIN employee_lifecycle_templates t ON t.lifecycle_template_id = r.lifecycle_template_id
      LEFT JOIN staff s ON s.staff_id = r.staff_id
      LEFT JOIN doctor d ON d.doctor_id = r.doctor_id
      LEFT JOIN staff initiator ON initiator.staff_id = r.initiated_by
      LEFT JOIN employee_lifecycle_tasks lt ON lt.lifecycle_run_id = r.lifecycle_run_id
      ${where}
      GROUP BY
        r.lifecycle_run_id,
        t.template_code,
        t.template_name,
        s.name,
        s.user_code,
        s.role,
        s.department,
        s.facility_code,
        d.doctor_name,
        d.user_code,
        d.specialization,
        initiator.name
      ORDER BY r.started_at DESC
      `,
      params
    );

    const summary = await query(
      `
      WITH filtered_runs AS (
        SELECT r.lifecycle_run_id, r.run_status
        FROM employee_lifecycle_runs r
        LEFT JOIN staff s ON s.staff_id = r.staff_id
        LEFT JOIN doctor d ON d.doctor_id = r.doctor_id
        ${where}
      ),
      filtered_tasks AS (
        SELECT t.task_status
        FROM employee_lifecycle_tasks t
        JOIN filtered_runs fr ON fr.lifecycle_run_id = t.lifecycle_run_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM filtered_runs) AS total_runs,
        (SELECT COUNT(*)::int FROM filtered_runs WHERE run_status = 'in_progress') AS in_progress_runs,
        (SELECT COUNT(*)::int FROM filtered_runs WHERE run_status = 'blocked') AS blocked_runs,
        (SELECT COUNT(*)::int FROM filtered_runs WHERE run_status = 'completed') AS completed_runs,
        (SELECT COUNT(*)::int FROM filtered_tasks WHERE task_status = 'pending') AS pending_tasks,
        (SELECT COUNT(*)::int FROM filtered_tasks WHERE task_status = 'in_progress') AS in_progress_tasks,
        (SELECT COUNT(*)::int FROM filtered_tasks WHERE task_status = 'blocked') AS blocked_tasks,
        (SELECT COUNT(*)::int FROM filtered_tasks WHERE task_status = 'overdue') AS overdue_tasks
      `,
      params
    );

    let tasks: any[] = [];
    if (runId) {
      const taskRows = await query(
        `
        SELECT
          t.lifecycle_task_id,
          t.lifecycle_run_id,
          t.lifecycle_template_task_id,
          t.task_code,
          t.task_name,
          t.task_group,
          t.owner_staff_id,
          owner.name AS owner_name,
          t.task_status,
          t.due_at,
          t.completed_at,
          t.completed_by,
          completer.name AS completed_by_name,
          t.completion_note,
          t.evidence_document_id,
          t.created_at,
          t.updated_at
        FROM employee_lifecycle_tasks t
        LEFT JOIN staff owner ON owner.staff_id = t.owner_staff_id
        LEFT JOIN staff completer ON completer.staff_id = t.completed_by
        WHERE t.lifecycle_run_id = $1
        ORDER BY t.due_at NULLS LAST, t.task_name
        `,
        [runId]
      );
      tasks = taskRows.rows;
    }

    const templates = await query(
      `
      SELECT
        t.lifecycle_template_id,
        t.template_code,
        t.template_name,
        t.lifecycle_type,
        t.applies_to,
        t.role_code,
        t.department,
        t.facility_code,
        t.is_active,
        COUNT(tt.lifecycle_template_task_id)::int AS task_count
      FROM employee_lifecycle_templates t
      LEFT JOIN employee_lifecycle_template_tasks tt ON tt.lifecycle_template_id = t.lifecycle_template_id
      WHERE t.is_active = true
      GROUP BY t.lifecycle_template_id
      ORDER BY t.template_name
      `
    );

    return NextResponse.json({
      runs: runs.rows,
      summary: summary.rows[0] ?? {
        total_runs: 0,
        in_progress_runs: 0,
        blocked_runs: 0,
        completed_runs: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        blocked_tasks: 0,
        overdue_tasks: 0,
      },
      tasks,
      templates: templates.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 lifecycle GET error", error);
    return NextResponse.json({ error: "Failed to load lifecycle data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const action = String(body?.action ?? "start_run").toLowerCase();
    const actorStaffId = await resolveActorStaffId(actor.user_code);

    if (action === "start_run") {
      const accountType = normalizeAccountType(body?.account_type);
      const personId = toNullableNumber(body?.person_id ?? body?.staff_id);
      const lifecycleType = String(body?.lifecycle_type ?? "").toLowerCase();
      const templateId = toNullableNumber(body?.lifecycle_template_id);

      if (!personId || !lifecycleType) {
        return NextResponse.json(
          { error: "account_type, person_id (or staff_id), and lifecycle_type are required" },
          { status: 400 }
        );
      }

      const effectiveTemplate =
        templateId ??
        (
          await query(
            `
            SELECT lifecycle_template_id
            FROM employee_lifecycle_templates
            WHERE lifecycle_type = $1
              AND is_active = true
              AND (
                applies_to = 'both'
                OR applies_to = $2
              )
            ORDER BY lifecycle_template_id
            LIMIT 1
            `,
            [lifecycleType, accountType]
          )
        ).rows[0]?.lifecycle_template_id ??
        null;

      const staffId = accountType === "staff" ? personId : null;
      const doctorId = accountType === "doctor" ? personId : null;

      const insertedRun = await query(
        `
        INSERT INTO employee_lifecycle_runs (
          account_type,
          person_id,
          staff_id,
          doctor_id,
          lifecycle_template_id,
          lifecycle_type,
          run_status,
          initiated_by,
          summary_note,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8, COALESCE($9::jsonb, '{}'::jsonb))
        RETURNING *
        `,
        [
          accountType,
          personId,
          staffId,
          doctorId,
          effectiveTemplate,
          lifecycleType,
          actorStaffId,
          body?.summary_note ?? null,
          body?.metadata ? JSON.stringify(body.metadata) : null,
        ]
      );

      const run = insertedRun.rows[0];
      let taskCount = 0;

      if (effectiveTemplate) {
        const createdTasks = await query(
          `
          INSERT INTO employee_lifecycle_tasks (
            lifecycle_run_id,
            lifecycle_template_task_id,
            task_code,
            task_name,
            task_group,
            owner_staff_id,
            task_status,
            due_at,
            metadata
          )
          SELECT
            $1 AS lifecycle_run_id,
            tt.lifecycle_template_task_id,
            tt.task_code,
            tt.task_name,
            tt.task_group,
            NULL::integer AS owner_staff_id,
            'pending'::text AS task_status,
            CASE
              WHEN tt.due_offset_days IS NULL THEN NULL
              ELSE (CURRENT_TIMESTAMP + (tt.due_offset_days::text || ' day')::interval)
            END AS due_at,
            jsonb_build_object(
              'mandatory', tt.mandatory,
              'blocks_transition', tt.blocks_transition,
              'default_owner_role', tt.default_owner_role,
              'requires_document_type_id', tt.requires_document_type_id
            ) AS metadata
          FROM employee_lifecycle_template_tasks tt
          WHERE tt.lifecycle_template_id = $2
          ORDER BY tt.sequence_no, tt.lifecycle_template_task_id
          RETURNING lifecycle_task_id
          `,
          [run.lifecycle_run_id, effectiveTemplate]
        );
        taskCount = createdTasks.rows.length;
      }

      await addLifecycleEvent({
        runId: Number(run.lifecycle_run_id),
        actorStaffId,
        eventType: "run_started",
        toStatus: "in_progress",
        payload: {
          lifecycleType,
          taskCount,
        },
      });

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Lifecycle run started",
        entityType: "employee_lifecycle_run",
        entityId: run.lifecycle_run_id,
        details: {
          accountType,
          personId,
          lifecycleType,
          templateId: effectiveTemplate,
          taskCount,
        },
      });

      return NextResponse.json({ success: true, run, created_tasks: taskCount }, { status: 201 });
    }

    if (action === "create_template") {
      const templateCode = String(body?.template_code ?? "").trim().toUpperCase();
      const templateName = String(body?.template_name ?? "").trim();
      const lifecycleType = String(body?.lifecycle_type ?? "").trim().toLowerCase();

      if (!templateCode || !templateName || !lifecycleType) {
        return NextResponse.json(
          { error: "template_code, template_name and lifecycle_type are required" },
          { status: 400 }
        );
      }

      const insertedTemplate = await query(
        `
        INSERT INTO employee_lifecycle_templates (
          template_code,
          template_name,
          lifecycle_type,
          applies_to,
          role_code,
          department,
          facility_code,
          created_by,
          metadata
        )
        VALUES ($1, $2, $3, COALESCE($4, 'both'), $5, $6, $7, $8, COALESCE($9::jsonb, '{}'::jsonb))
        RETURNING *
        `,
        [
          templateCode,
          templateName,
          lifecycleType,
          body?.applies_to ?? "both",
          body?.role_code ?? null,
          body?.department ?? null,
          body?.facility_code ?? null,
          actorStaffId,
          body?.metadata ? JSON.stringify(body.metadata) : null,
        ]
      );

      const template = insertedTemplate.rows[0];
      const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
      for (let i = 0; i < tasks.length; i += 1) {
        const t = tasks[i];
        if (!t?.task_code || !t?.task_name) continue;
        await query(
          `
          INSERT INTO employee_lifecycle_template_tasks (
            lifecycle_template_id,
            task_code,
            task_name,
            task_group,
            sequence_no,
            default_owner_role,
            mandatory,
            due_offset_days,
            requires_document_type_id,
            blocks_transition,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true), $8, $9, COALESCE($10, true), COALESCE($11::jsonb, '{}'::jsonb))
          `,
          [
            template.lifecycle_template_id,
            String(t.task_code).toUpperCase(),
            t.task_name,
            t.task_group ?? null,
            Number(t.sequence_no ?? i + 1),
            t.default_owner_role ?? null,
            t.mandatory ?? true,
            t.due_offset_days ?? null,
            t.requires_document_type_id ?? null,
            t.blocks_transition ?? true,
            t.metadata ? JSON.stringify(t.metadata) : null,
          ]
        );
      }

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Lifecycle template created",
        entityType: "employee_lifecycle_template",
        entityId: template.lifecycle_template_id,
        details: {
          templateCode,
          lifecycleType,
          taskCount: tasks.length,
        },
      });

      return NextResponse.json({ success: true, template }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 lifecycle POST error", error);
    return NextResponse.json({ error: "Failed to create lifecycle data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const action = String(body?.action ?? "").toLowerCase();
    const actorStaffId = await resolveActorStaffId(actor.user_code);

    if (action === "assign_task") {
      const taskId = toNullableNumber(body?.lifecycle_task_id);
      const ownerStaffId = toNullableNumber(body?.owner_staff_id);
      if (!taskId || !ownerStaffId) {
        return NextResponse.json({ error: "lifecycle_task_id and owner_staff_id are required" }, { status: 400 });
      }

      const before = await query(
        `SELECT lifecycle_task_id, lifecycle_run_id, task_status, owner_staff_id FROM employee_lifecycle_tasks WHERE lifecycle_task_id = $1 LIMIT 1`,
        [taskId]
      );
      if (!before.rows[0]) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const updated = await query(
        `
        UPDATE employee_lifecycle_tasks
        SET owner_staff_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE lifecycle_task_id = $1
        RETURNING *
        `,
        [taskId, ownerStaffId]
      );

      await addLifecycleEvent({
        runId: Number(updated.rows[0].lifecycle_run_id),
        taskId,
        actorStaffId,
        eventType: "task_assigned",
        fromStatus: before.rows[0].task_status,
        toStatus: updated.rows[0].task_status,
        payload: {
          ownerStaffId,
        },
      });

      return NextResponse.json({ success: true, item: updated.rows[0] });
    }

    if (action === "update_task_status" || action === "complete_task") {
      const taskId = toNullableNumber(body?.lifecycle_task_id);
      const nextStatus =
        action === "complete_task"
          ? "completed"
          : String(body?.task_status ?? "").toLowerCase();

      if (!taskId || !nextStatus) {
        return NextResponse.json({ error: "lifecycle_task_id and task_status are required" }, { status: 400 });
      }

      const before = await query(
        `
        SELECT lifecycle_task_id, lifecycle_run_id, task_status
        FROM employee_lifecycle_tasks
        WHERE lifecycle_task_id = $1
        LIMIT 1
        `,
        [taskId]
      );
      if (!before.rows[0]) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const updated = await query(
        `
        UPDATE employee_lifecycle_tasks
        SET
          task_status = $2,
          completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          completed_by = CASE WHEN $2 = 'completed' THEN $3 ELSE completed_by END,
          completion_note = COALESCE($4, completion_note),
          evidence_document_id = COALESCE($5, evidence_document_id),
          updated_at = CURRENT_TIMESTAMP
        WHERE lifecycle_task_id = $1
        RETURNING *
        `,
        [
          taskId,
          nextStatus,
          actorStaffId,
          body?.completion_note ?? null,
          body?.evidence_document_id ?? null,
        ]
      );

      await addLifecycleEvent({
        runId: Number(updated.rows[0].lifecycle_run_id),
        taskId,
        actorStaffId,
        eventType: action,
        fromStatus: before.rows[0].task_status,
        toStatus: nextStatus,
        note: body?.completion_note ?? null,
      });

      return NextResponse.json({ success: true, item: updated.rows[0] });
    }

    if (action === "complete_run" || action === "cancel_run") {
      const runId = toNullableNumber(body?.lifecycle_run_id);
      if (!runId) {
        return NextResponse.json({ error: "lifecycle_run_id is required" }, { status: 400 });
      }

      const run = await query(
        `
        SELECT lifecycle_run_id, run_status
        FROM employee_lifecycle_runs
        WHERE lifecycle_run_id = $1
        LIMIT 1
        `,
        [runId]
      );
      if (!run.rows[0]) {
        return NextResponse.json({ error: "Lifecycle run not found" }, { status: 404 });
      }

      if (action === "complete_run") {
        const blocking = await query(
          `
          SELECT COUNT(*)::int AS open_count
          FROM employee_lifecycle_tasks
          WHERE lifecycle_run_id = $1
            AND task_status IN ('pending', 'in_progress', 'blocked', 'overdue')
            AND COALESCE((metadata->>'blocks_transition')::boolean, true) = true
          `,
          [runId]
        );
        const openCount = Number(blocking.rows[0]?.open_count ?? 0);
        if (openCount > 0) {
          return NextResponse.json(
            { error: `Cannot complete run: ${openCount} blocking task(s) still open` },
            { status: 409 }
          );
        }
      }

      const nextStatus = action === "complete_run" ? "completed" : "cancelled";
      const updatedRun = await query(
        `
        UPDATE employee_lifecycle_runs
        SET
          run_status = $2,
          completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          summary_note = COALESCE($3, summary_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE lifecycle_run_id = $1
        RETURNING *
        `,
        [runId, nextStatus, body?.summary_note ?? null]
      );

      await addLifecycleEvent({
        runId,
        actorStaffId,
        eventType: action,
        fromStatus: run.rows[0].run_status,
        toStatus: nextStatus,
        note: body?.summary_note ?? null,
      });

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: `Lifecycle run ${nextStatus}`,
        entityType: "employee_lifecycle_run",
        entityId: runId,
        details: {
          fromStatus: run.rows[0].run_status,
          toStatus: nextStatus,
        },
      });

      return NextResponse.json({ success: true, item: updatedRun.rows[0] });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 lifecycle PATCH error", error);
    return NextResponse.json({ error: "Failed to update lifecycle data" }, { status: 500 });
  }
}
