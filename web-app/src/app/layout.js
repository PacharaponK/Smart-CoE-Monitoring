import "./globals.css";

export const metadata = {
  title: "Smart CoE Monitoring - IoT Dashboard",
  description:
    "Real-time IoT sensor data monitoring and visualization platform",
  icons: {
    icon: "/images/coe-icon.jpg",
    shortcut: "/images/coe-icon.jpg",
    apple: "/images/coe-icon.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Kanit:wght@200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/images/coe-icon.jpg" />
        <link rel="shortcut icon" href="/images/coe-icon.jpg" />
        <link rel="apple-touch-icon" href="/images/coe-icon.jpg" />
      </head>
      <body className="antialiased text-gray-800">{children}</body>
    </html>
  );
}
