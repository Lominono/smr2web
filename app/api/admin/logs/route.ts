import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { queryEventLogs, logsToCSV } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Acceso restringido a administradores.' },
        { status: authResult.status }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const eventType = searchParams.get('eventType') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const roomId = searchParams.get('roomId') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const format = searchParams.get('format'); // 'csv' or json

    if (format === 'csv') {
      // Export all matching logs up to 1000 items
      const data = await queryEventLogs({
        eventType,
        userId,
        roomId,
        search,
        startDate,
        endDate,
        page: 1,
        limit: 1000,
      });

      const csvContent = logsToCSV(data.logs);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="smr2_audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const result = await queryEventLogs({
      eventType,
      userId,
      roomId,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al consultar logs de auditoría.' },
      { status: 500 }
    );
  }
}
