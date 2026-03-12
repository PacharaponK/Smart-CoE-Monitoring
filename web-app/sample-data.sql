-- Sample data for Telemetry table
-- Run this in Azure SQL Database

INSERT INTO Telemetry (DeviceId, SensorType, SensorValue, QualityStatus, CreatedAt) VALUES
('DEV-001', 'Temperature', 25.5, 1, GETDATE()),
('DEV-001', 'Humidity', 65.2, 1, DATEADD(minute, -1, GETDATE())),
('DEV-002', 'Temperature', 23.8, 1, DATEADD(minute, -2, GETDATE())),
('DEV-002', 'Pressure', 1013.25, 1, DATEADD(minute, -3, GETDATE())),
('DEV-003', 'Humidity', 70.1, 1, DATEADD(minute, -4, GETDATE())),
('DEV-003', 'Temperature', 26.3, 1, DATEADD(minute, -5, GETDATE())),
('DEV-001', 'Pressure', 1012.8, 1, DATEADD(minute, -6, GETDATE())),
('DEV-002', 'Humidity', 68.7, 1, DATEADD(minute, -7, GETDATE()));

-- Verify data
SELECT * FROM Telemetry ORDER BY CreatedAt DESC;
