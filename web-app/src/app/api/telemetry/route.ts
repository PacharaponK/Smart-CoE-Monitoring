import { NextRequest, NextResponse } from 'next/server';
import { poolPromise, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const sensorType = searchParams.get('sensorType');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    const offset = (page - 1) * pageSize;

    const pool = await poolPromise;
    let query = `SELECT * FROM Telemetry WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM Telemetry WHERE 1=1`;

    if (deviceId) {
      query += ` AND DeviceId = @deviceId`;
      countQuery += ` AND DeviceId = @deviceId`;
    }
    if (sensorType) {
      query += ` AND SensorType = @sensorType`;
      countQuery += ` AND SensorType = @sensorType`;
    }

    query += ` ORDER BY CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

    const request = pool.request();
    if (deviceId) request.input('deviceId', sql.VarChar(50), deviceId);
    if (sensorType) request.input('sensorType', sql.VarChar(50), sensorType);
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const [dataResult, countResult] = await Promise.all([
      request.query(query),
      request.query(countQuery)
    ]);

    const total = countResult.recordset[0].total;

    return NextResponse.json({
      data: dataResult.recordset,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Database error', details: err.message }, { status: 500 });
  }
}
