'use client';

// AWS API Gateway endpoint for sensor data
const API_BASE_URL = 'https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com';

export interface SensorData {
  DeviceId: string;
  SensorType: string;
  SensorValue: number;
  Timestamp: string;
  QualityStatus?: number;
}

export interface ApiResponse {
  data: SensorData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  async getTelemetry(params?: {
    page?: number;
    limit?: number;
    deviceId?: string;
    sensorType?: string;
  }): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.deviceId) searchParams.append('deviceId', params.deviceId);
    if (params?.sensorType) searchParams.append('sensorType', params.sensorType);

    const url = `${API_BASE_URL}/sensors${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
      // Return mock data if API fails
      return this.getMockTelemetry(params);
    }
  }

  async getDevices(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Return mock devices if API fails
      return ['Device001', 'Device002', 'Device003'];
    }
  }

  async getSensorTypes(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sensor-types`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensor types:', error);
      // Return mock sensor types if API fails
      return ['Temperature', 'Humidity', 'Pressure'];
    }
  }

  private getMockTelemetry(params?: {
    page?: number;
    limit?: number;
    deviceId?: string;
    sensorType?: string;
  }): ApiResponse {
    const devices = ['Device001', 'Device002', 'Device003'];
    const sensorTypes = ['Temperature', 'Humidity', 'Pressure'];
    const mockData: SensorData[] = [];
    
    // Generate 100 mock records
    for (let i = 1; i <= 100; i++) {
      const device = devices[i % devices.length];
      const sensorType = sensorTypes[i % sensorTypes.length];
      let sensorValue: number;
      
      switch (sensorType) {
        case 'Temperature':
          sensorValue = 20 + Math.random() * 15; // 20-35°C
          break;
        case 'Humidity':
          sensorValue = 40 + Math.random() * 40; // 40-80%
          break;
        case 'Pressure':
          sensorValue = 1000 + Math.random() * 50; // 1000-1050 hPa
          break;
        default:
          sensorValue = Math.random() * 100;
      }
      
      mockData.push({
        DeviceId: device,
        SensorType: sensorType,
        SensorValue: parseFloat(sensorValue.toFixed(2)),
        Timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
        QualityStatus: Math.random() > 0.1 ? 1 : 0
      });
    }
    
    // Apply filters
    let filteredData = mockData;
    if (params?.deviceId) {
      filteredData = filteredData.filter(item => item.DeviceId === params.deviceId);
    }
    if (params?.sensorType) {
      filteredData = filteredData.filter(item => item.SensorType === params.sensorType);
    }
    
    // Apply pagination
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;
    const paginatedData = filteredData.slice(offset, offset + limit);
    
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit)
      }
    };
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
