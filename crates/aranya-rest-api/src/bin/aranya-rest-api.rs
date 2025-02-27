use aranya_rest_api::{config::Config, start_server};
use std::{env, path::PathBuf};
use tracing::{info, Level};
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Check if we should skip tracing initialization (useful for multi-instance scenarios)
    let skip_tracing_init = env::var("ARANYA_SKIP_TRACING_INIT").unwrap_or_default() == "true";

    if !skip_tracing_init {
        // Initialize tracing subscriber with custom environment variable control
        let env_filter = if let Ok(level) = env::var("ARANYA_LOG_LEVEL") {
            // Use our custom environment variable if it exists
            let filter = format!("{},aranya_rest_api={}", level, level);
            println!("Using custom log level from ARANYA_LOG_LEVEL: {}", level);
            EnvFilter::new(filter)
        } else {
            // Fall back to RUST_LOG if ARANYA_LOG_LEVEL is not set
            EnvFilter::try_from_env("RUST_LOG")
                .unwrap_or_else(|_| {
                    // Default to info level if neither env var is set
                    EnvFilter::new("info,aranya_rest_api=info")
                })
        };
        
        tracing_subscriber::registry()
            .with(fmt::layer())
            .with(env_filter)
            .init();
    }

    info!("Starting Aranya REST API server");

    // Create config with defaults or from environment variables
    let config = Config {
        bind_address: env::var("ARANYA_REST_BIND_ADDRESS").unwrap_or_else(|_| "127.0.0.1".to_string()),
        port: env::var("ARANYA_REST_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080),
        daemon_sock_path: env::var("ARANYA_DAEMON_SOCK_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("/tmp/aranya-daemon.sock")),
        afc_shm_path: env::var("ARANYA_AFC_SHM_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("/aranya-afc.shm")),
        max_afc_channels: env::var("ARANYA_MAX_AFC_CHANNELS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1024),
        afc_listen_address: env::var("ARANYA_AFC_LISTEN_ADDRESS").unwrap_or_else(|_| "127.0.0.1:0".to_string()),
    };
    
    info!("Configuration loaded: bind={}:{}, daemon_sock={:?}", 
          config.bind_address, config.port, config.daemon_sock_path);
    
    // Start the server
    match start_server(config).await {
        Ok(_) => {
            info!("Server shutdown gracefully");
            Ok(())
        }
        Err(e) => {
            tracing::error!("Server error: {}", e);
            Err(e.into())
        }
    }
} 