module.exports = {
    apps: [{
        name: "sznpay-backend",
        script: "./server.js",
        instances: "max",
        exec_mode: "cluster",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        },
        // Reliability features
        max_memory_restart: '1G',
        exp_backoff_restart_delay: 100
    }]
}
