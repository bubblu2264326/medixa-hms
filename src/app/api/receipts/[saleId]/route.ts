import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/src/lib/types';
import { getReceiptPayload } from '../receiptPayload';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { saleId } = await params;
    const payload = await getReceiptPayload(saleId);

    if (!payload) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({ success: true, data: payload });
  } catch (error) {
    console.error('Receipt payload error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to load receipt payload' },
      { status: 500 }
    );
  }
}
