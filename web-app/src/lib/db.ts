import sql from 'mssql';

// Parse connection string or use individual env variables
const connectionString = process.env.SqlConnectionString;

function parseConnectionString(connStr: string): sql.config {
  // Remove quotes if present
  connStr = connStr.replace(/^["']|["']$/g, '');
  
  const config: Partial<sql.config> = {
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000, // 30 seconds
      requestTimeout: 30000,
    },
  };

  // Parse Server - handle both Server=tcp:host,port and Server=host
  const serverMatch = connStr.match(/Server=tcp:([^,;]+)(?:,(\d+))?/i) || connStr.match(/Server=([^,;]+)/i);
  if (serverMatch) {
    config.server = serverMatch[1];
    if (serverMatch[2]) {
      config.port = parseInt(serverMatch[2], 10);
    }
  }

  // Parse Database (Initial Catalog)
  const dbMatch = connStr.match(/Initial Catalog=([^;]+)/i) || connStr.match(/Database=([^;]+)/i);
  if (dbMatch) {
    config.database = dbMatch[1];
  }

  // Parse User ID
  const userMatch = connStr.match(/User ID=([^;]+)/i) || connStr.match(/Uid=([^;]+)/i);
  if (userMatch) {
    config.user = userMatch[1];
  }

  // Parse Password
  const passMatch = connStr.match(/Password=([^;]+)/i) || connStr.match(/Pwd=([^;]+)/i);
  if (passMatch) {
    config.password = passMatch[1];
  }

  return config as sql.config;
}

let config: sql.config;

if (connectionString) {
  config = parseConnectionString(connectionString);
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

export const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log('Connected to Azure SQL Database');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

export { sql };
