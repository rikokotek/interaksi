module.exports = {
  apps: [{
    name: "tikflow-dashboard",
    script: "./server.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3005
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3005
    }
  }]
};
