import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/sensor-types`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const sensorTypes = await response.json();
    return NextResponse.json(sensorTypes);
  } catch (error) {
    console.error('Error in sensor-types API:', error);
    return NextResponse.json({ error: 'Failed to fetch sensor types' }, { status: 500 });
  }
}
