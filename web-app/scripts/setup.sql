-- SQL Script to create Telemetry table for Azure SQL Database

CREATE TABLE Telemetry (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    DeviceId VARCHAR(50) NOT NULL,
    SensorType VARCHAR(50) NOT NULL,
    SensorValue FLOAT NOT NULL,
    QualityStatus TINYINT NULL, -- 1 for Good, 0 for Bad
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- Index for performance when filtering and sorting
CREATE INDEX IX_Telemetry_DeviceId_SensorType_CreatedAt 
ON Telemetry (DeviceId, SensorType, CreatedAt DESC);

-- Sample Data for initial testing
INSERT INTO Telemetry (DeviceId, SensorType, SensorValue, QualityStatus, CreatedAt)
VALUES 
('DEV-001', 'Temperature', 25.4, 1, GETDATE()),
('DEV-001', 'Humidity', 45.2, 1, GETDATE()),
('DEV-002', 'Temperature', 22.8, 1, GETDATE()),
('DEV-003', 'Pressure', 1013.2, 1, GETDATE());
