require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// SQL Database Configuration
const sqlConfig = {
  server: 'smartcoe.database.windows.net',
  database: 'smartcoe-database',
  user: 'smartcoe',
  password: '123456789aA!',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'smartcoe',
      password: '123456789aA!'
    }
  }
};

// Store connected clients
const connectedClients = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  connectedClients.add(socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket);
  });

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });
});

// Broadcast telemetry data to all connected clients
const broadcastTelemetry = (data) => {
  io.emit('new-telemetry', data);
};

// Mock data generator for testing when database is not available
const generateMockTelemetryData = () => {
  const devices = ['Device001', 'Device002', 'Device003'];
  const sensorTypes = ['Temperature', 'Humidity', 'Pressure'];
  const mockData = [];
  
  // Generate 100 mock records
  for (let i = 1; i <= 100; i++) {
    const device = devices[i % devices.length];
    const sensorType = sensorTypes[i % sensorTypes.length];
    let sensorValue;
    
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
    }
    
    mockData.push({
      Id: i,
      DeviceId: device,
      SensorType: sensorType,
      SensorValue: parseFloat(sensorValue.toFixed(2)),
      QualityStatus: Math.random() > 0.1 ? 1 : 0,
      CreatedAt: new Date(Date.now() - (i * 60000)).toISOString()
    });
  }
  
  return mockData;
};

// API Routes

// Get historical telemetry data with pagination and filtering
app.get('/api/telemetry', async (req, res) => {
  try {
    const { page = 1, limit = 50, deviceId, sensorType } = req.query;
    const offset = (page - 1) * limit;

    try {
      let pool = await sql.connect(sqlConfig);
      
      let whereClause = 'WHERE 1=1';
      
      if (deviceId) {
        whereClause += ' AND DeviceId = @deviceId';
      }
      
      if (sensorType) {
        whereClause += ' AND SensorType = @sensorType';
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM Telemetry ${whereClause}`;
      const countResult = await pool.request()
        .input('deviceId', sql.VarChar(50), deviceId || null)
        .input('sensorType', sql.VarChar(50), sensorType || null)
        .query(countQuery);
      
      const total = countResult.recordset[0].total;

      // Get paginated data
      const dataQuery = `
        SELECT * FROM Telemetry 
        ${whereClause} 
        ORDER BY CreatedAt DESC 
        OFFSET ${offset} ROWS 
        FETCH NEXT ${limit} ROWS ONLY
      `;
      
      const result = await pool.request()
        .input('deviceId', sql.VarChar(50), deviceId || null)
        .input('sensorType', sql.VarChar(50), sensorType || null)
        .query(dataQuery);

      await pool.close();

      res.json({
        data: result.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (dbError) {
      console.log('Database connection failed, using mock data. Please configure Azure SQL firewall:', dbError.message);
      
      // Return mock data when database is not available
      const mockData = generateMockTelemetryData();
      const filteredMockData = mockData.filter(item => {
        if (deviceId && item.DeviceId !== deviceId) return false;
        if (sensorType && item.SensorType !== sensorType) return false;
        return true;
      });
      
      const startIndex = offset;
      const endIndex = startIndex + parseInt(limit);
      const paginatedData = filteredMockData.slice(startIndex, endIndex);

      res.json({
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredMockData.length,
          totalPages: Math.ceil(filteredMockData.length / parseInt(limit))
        }
      });
    }
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry data' });
  }
});

// Post new telemetry data
app.post('/api/telemetry', async (req, res) => {
  try {
    const { deviceId, sensorType, sensorValue, qualityStatus } = req.body;

    if (!deviceId || !sensorType || sensorValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let pool = await sql.connect(sqlConfig);
    
    const result = await pool.request()
      .input('deviceId', sql.VarChar(50), deviceId)
      .input('sensorType', sql.VarChar(50), sensorType)
      .input('sensorValue', sql.Float, sensorValue)
      .input('qualityStatus', sql.TinyInt, qualityStatus || null)
      .query(`
        INSERT INTO Telemetry (DeviceId, SensorType, SensorValue, QualityStatus, CreatedAt)
        OUTPUT INSERTED.Id, INSERTED.DeviceId, INSERTED.SensorType, INSERTED.SensorValue, INSERTED.QualityStatus, INSERTED.CreatedAt
        VALUES (@deviceId, @sensorType, @sensorValue, @qualityStatus, GETDATE())
      `);

    await pool.close();

    const newTelemetry = result.recordset[0];
    
    // Broadcast to all connected clients
    broadcastTelemetry(newTelemetry);

    res.status(201).json(newTelemetry);
  } catch (error) {
    console.error('Error saving telemetry data:', error);
    res.status(500).json({ error: 'Failed to save telemetry data' });
  }
});

// Get unique device IDs for filtering
app.get('/api/devices', async (req, res) => {
  try {
    try {
      let pool = await sql.connect(sqlConfig);
      
      const result = await pool.request()
        .query('SELECT DISTINCT DeviceId FROM Telemetry ORDER BY DeviceId');
      
      await pool.close();

      const devices = result.recordset.map(row => row.DeviceId);
      res.json(devices);
    } catch (dbError) {
      console.log('Database connection failed for devices, using mock data:', dbError.message);
      // Return mock device IDs
      const mockDevices = ['Device001', 'Device002', 'Device003'];
      res.json(mockDevices);
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get unique sensor types for filtering
app.get('/api/sensor-types', async (req, res) => {
  try {
    try {
      let pool = await sql.connect(sqlConfig);
      
      const result = await pool.request()
        .query('SELECT DISTINCT SensorType FROM Telemetry ORDER BY SensorType');
      
      await pool.close();

      const sensorTypes = result.recordset.map(row => row.SensorType);
      res.json(sensorTypes);
    } catch (dbError) {
      console.log('Database connection failed for sensor types, using mock data:', dbError.message);
      // Return mock sensor types
      const mockSensorTypes = ['Temperature', 'Humidity', 'Pressure'];
      res.json(mockSensorTypes);
    }
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Azure SQL Database: Attempting connection to ${sqlConfig.server}/${sqlConfig.database}`);
  console.log(`If connection fails, mock data will be used for testing`);
  
  // Start sending mock telemetry data for testing (every 5 seconds)
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const mockData = generateMockTelemetryData();
      // Send a random mock telemetry entry
      const randomEntry = mockData[Math.floor(Math.random() * mockData.length)];
      randomEntry.CreatedAt = new Date().toISOString();
      randomEntry.Id = Date.now();
      broadcastTelemetry(randomEntry);
    }, 5000);
    console.log('Mock data broadcasting started (every 5 seconds)');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await sql.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
