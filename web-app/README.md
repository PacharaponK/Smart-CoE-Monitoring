# Smart COE IoT Dashboard

A modern IoT data aggregation and visualization platform built with Next.js, Tailwind CSS, Socket.io, and Azure SQL.

## Project Structure

```text
├── scripts/                # SQL setup scripts
├── src/
│   ├── app/                # Next.js App Router (Pages, API Routes)
│   │   ├── api/            # Backend API endpoints
│   │   ├── history/        # Historical Data page
│   │   └── page.tsx        # Main Real-time Dashboard
│   ├── components/         # Reusable UI components
│   │   ├── dashboard/      # StatusCards and RealTimeCharts
│   │   ├── layout/         # Navigation components
│   │   └── ui/             # Atomic UI components (ClayCard)
│   └── lib/                # Shared libraries (Database connection)
├── .env.local              # Environment variables
├── server.mjs              # Custom server (Next.js + Socket.io)
└── package.json            # Dependencies and scripts
```

## Setup & Running

### 1. Database Setup
Execute the script in `scripts/setup.sql` on your Azure SQL Database to create the `Telemetry` table.

### 2. Environment Variables
Ensure your `.env.local` file contains the correct `SqlConnectionString`:
```env
SqlConnectionString="Server=tcp:smartcoe.database.windows.net,1433;Initial Catalog=smartcoe-database;Persist Security Info=False;User ID=smartcoe;Password=your_password;..."
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Project
Start the custom server which handles both the Web Application and Real-time WebSockets:
```bash
npm run dev:server
```
Visit `http://localhost:3000` to view the dashboard.

## Key Features

- **Claymorphism Design**: Soft 3D cards with vibrant gradients using Tailwind CSS.
- **Real-time Monitoring**: WebSocket integration (Socket.io) for live sensor updates.
- **Historical Data**: Advanced filtering and pagination for database records.
- **Responsive Layout**: Fully optimized for mobile, tablet, and desktop views.
```
