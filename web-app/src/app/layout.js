import "./globals.css";

export const metadata = {
  title: "Smart CoE Monitoring - IoT Dashboard",
  description:
    "Real-time IoT sensor data monitoring and visualization platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased text-gray-800">{children}</body>
    </html>
  );
}
