import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { parse } from "url";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

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

    // Simulation of real-time sensor data
    const sensorInterval = setInterval(() => {
      const devices = ["DEV-001", "DEV-002", "DEV-003"];
      const sensorTypes = ["Temperature", "Humidity", "Pressure"];
      
      const randomData = {
        DeviceId: devices[Math.floor(Math.random() * devices.length)],
        SensorType: sensorTypes[Math.floor(Math.random() * sensorTypes.length)],
        SensorValue: (Math.random() * (100 - 10) + 10).toFixed(2),
        Timestamp: new Date().toISOString(),
      };

      socket.emit("sensorData", randomData);
    }, 2000);

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
