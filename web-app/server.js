require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const awsIoTClient = require('./src/lib/aws-iot-client').awsIoTClient;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes

// Get historical telemetry data (proxy to AWS API)
app.get('/api/telemetry', async (req, res) => {
  try {
    const { page = 1, limit = 50, deviceId, sensorType } = req.query;
    
    // Proxy to AWS API Gateway
    const apiUrl = `https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com/sensors?${new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(deviceId && { deviceId }),
      ...(sensorType && { sensorType })
    })}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry data' });
  }
});

// Post new telemetry data (not used with AWS IoT, but keeping for compatibility)
app.post('/api/telemetry', async (req, res) => {
  try {
    const { deviceId, sensorType, sensorValue, qualityStatus } = req.body;

    if (!deviceId || !sensorType || sensorValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Since we're using AWS IoT, we don't store in database
    // Just broadcast to clients and return success
    const newTelemetry = {
      Id: Date.now(),
      DeviceId: deviceId,
      SensorType: sensorType,
      SensorValue: parseFloat(sensorValue),
      QualityStatus: qualityStatus || 1,
      CreatedAt: new Date().toISOString()
    };
    
    // Broadcast to all connected clients
    broadcastTelemetry(newTelemetry);

    res.status(201).json(newTelemetry);
  } catch (error) {
    console.error('Error processing telemetry data:', error);
    res.status(500).json({ error: 'Failed to process telemetry data' });
  }
});

// Get unique device IDs for filtering (proxy to AWS API)
app.get('/api/devices', async (req, res) => {
  try {
    // Proxy to AWS API Gateway
    const response = await fetch('https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com/devices');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const devices = await response.json();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get unique sensor types for filtering (proxy to AWS API)
app.get('/api/sensor-types', async (req, res) => {
  try {
    // Proxy to AWS API Gateway
    const response = await fetch('https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com/sensor-types');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const sensorTypes = await response.json();
    res.json(sensorTypes);
  } catch (error) {
    console.error('Error fetching sensor types:', error);
    res.status(500).json({ error: 'Failed to fetch sensor types' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Using AWS IoT for real-time data`);
  console.log(`Using AWS API Gateway for historical data: https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com`);
  
  // Connect to AWS IoT
  try {
    await awsIoTClient.connect();
    console.log('AWS IoT client connected successfully');
  } catch (error) {
    console.error('Failed to connect to AWS IoT:', error);
    console.log('Continuing without AWS IoT connection...');
  }
  
  console.log('Production mode: Real AWS APIs only');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await awsIoTClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
