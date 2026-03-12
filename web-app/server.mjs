import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { parse } from "url";
import sql from "mssql";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Database configuration
const connectionString = process.env.SqlConnectionString;
let config;

if (connectionString) {
  // Parse connection string
  const connStr = connectionString.replace(/^["']|["']$/g, '');
  config = {
    server: connStr.match(/Server=tcp:([^,;]+)/i)?.[1] || '',
    database: connStr.match(/Initial Catalog=([^;]+)/i)?.[1] || '',
    user: connStr.match(/User ID=([^;]+)/i)?.[1] || '',
    password: connStr.match(/Password=([^;]+)/i)?.[1] || '',
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
  };
} else {
  config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };
}

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Function to fetch latest sensor data from database
    const fetchLatestData = async () => {
      try {
        const pool = await sql.connect(config);
        const result = await pool.request()
          .query(`
            SELECT TOP 1 DeviceId, SensorType, SensorValue, CreatedAt as Timestamp
            FROM Telemetry 
            ORDER BY CreatedAt DESC
          `);
        
        if (result.recordset.length > 0) {
          socket.emit("sensorData", result.recordset[0]);
        }
        await pool.close();
      } catch (err) {
        console.error('Database error:', err);
      }
    };

    // Send latest data immediately on connection
    fetchLatestData();

    // Poll for new data every 5 seconds
    const sensorInterval = setInterval(fetchLatestData, 5000);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      clearInterval(sensorInterval);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
