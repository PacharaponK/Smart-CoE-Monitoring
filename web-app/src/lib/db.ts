import sql from 'mssql';

// Parse connection string or use individual env variables
const connectionString = process.env.SqlConnectionString;

let config: sql.config;

if (connectionString) {
  // If connection string provided, use it as connectionString property
  config = { connectionString } as unknown as sql.config;
} else {
  // Use individual env variables
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
