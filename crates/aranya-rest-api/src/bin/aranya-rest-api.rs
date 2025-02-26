use aranya_rest_api::{config::Config, start_server};
use std::{env, path::PathBuf};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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
    
    // Start the server
    match start_server(config).await {
        Ok(_) => {
            println!("Server shutdown gracefully");
            Ok(())
        }
        Err(e) => {
            eprintln!("Server error: {}", e);
            Err(e.into())
        }
    }
} 