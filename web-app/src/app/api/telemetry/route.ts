import { NextRequest, NextResponse } from 'next/server';

// AWS API Gateway endpoint
const API_BASE_URL = 'https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || searchParams.get('pageSize') || '50';
    const deviceId = searchParams.get('deviceId');
    const sensorType = searchParams.get('sensorType');
    
    // Build query parameters for AWS API
    const params = new URLSearchParams({
      page,
      limit,
      ...(deviceId && { deviceId }),
      ...(sensorType && { sensorType })
    });
    
    const apiUrl = `${API_BASE_URL}/sensors?${params.toString()}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in telemetry API:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry data' }, { status: 500 });
  }
}
