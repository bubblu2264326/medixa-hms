import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/database/db';
import type { ApiResponse } from '@/src/lib/types';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { resolveActorStaffId } from '@/src/lib/server/actor';

type ReceiptConfigRow = {
  config_id: number;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_phone: string | null;
  clinic_email: string | null;
  tax_registration_number: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  logo_url: string | null;
  printer_name: string | null;
  paper_size: string | null;
  is_active: boolean;
  created_at: string;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const result = await query(
      `SELECT * FROM pos_receipt_config WHERE is_active = true LIMIT 1`
    );
    const config = (result.rows[0] as ReceiptConfigRow | undefined) ?? null;
    return NextResponse.json<ApiResponse>({ success: true, data: config });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Get receipt config error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to load receipt config' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const body = await request.json();

    const nextClinicName = normalizeString(body?.clinic_name);
    const nextClinicAddress = normalizeString(body?.clinic_address);
    const nextClinicPhone = normalizeString(body?.clinic_phone);
    const nextReceiptHeader = normalizeString(body?.receipt_header);
    const nextReceiptFooter = normalizeString(body?.receipt_footer);
    const nextLogoUrl = normalizeString(body?.logo_url);
    const nextPaperSize = normalizeString(body?.paper_size);

    const activeResult = await query(
      `SELECT config_id FROM pos_receipt_config WHERE is_active = true LIMIT 1`
    );
    const activeId = activeResult.rows[0]?.config_id as number | undefined;
    if (!activeId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No active receipt config found' },
        { status: 404 }
      );
    }

    const updateResult = await query(
      `
        UPDATE pos_receipt_config
        SET
          clinic_name = COALESCE($2, clinic_name),
          clinic_address = COALESCE($3, clinic_address),
          clinic_phone = COALESCE($4, clinic_phone),
          receipt_header = COALESCE($5, receipt_header),
          receipt_footer = COALESCE($6, receipt_footer),
          logo_url = COALESCE($7, logo_url),
          paper_size = COALESCE($8, paper_size)
        WHERE config_id = $1
        RETURNING *
      `,
      [
        activeId,
        nextClinicName,
        nextClinicAddress,
        nextClinicPhone,
        nextReceiptHeader,
        nextReceiptFooter,
        nextLogoUrl,
        nextPaperSize,
      ]
    );

    const staffId = await resolveActorStaffId(request, { query });
    await query(
      `
        INSERT INTO pos_audit_log (
          staff_id,
          action_type,
          sale_id,
          description
        ) VALUES ($1, $2, $3, $4)
      `,
      [staffId, 'RECEIPT_CONFIG_UPDATED', null, `Updated receipt config ${activeId}`]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updateResult.rows[0] ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Update receipt config error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update receipt config' },
      { status: 500 }
    );
  }
}

