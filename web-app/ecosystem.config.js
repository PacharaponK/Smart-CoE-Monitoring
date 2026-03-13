module.exports = {
  apps: [
    {
      name: "coe-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "coe-backend",
      cwd: "./backend",
      script: "node",
      args: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      }
    }
  ]
};
