import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/devices`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const devices = await response.json();
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error in devices API:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
