use std::path::PathBuf;

/// Configuration for the REST API server
#[derive(Debug, Clone)]
pub struct Config {
    /// The address to bind the server to
    pub bind_address: String,
    
    /// The port to bind the server to
    pub port: u16,
    
    /// The socket path to communicate with the daemon
    pub daemon_sock_path: PathBuf,
    
    /// AFC's shared memory path. The daemon must also use the same path.
    pub afc_shm_path: PathBuf,
    
    /// The maximum number of channels that AFC should support
    pub max_afc_channels: usize,
    
    /// The address that AFC listens for incoming connections on
    pub afc_listen_address: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind_address: "127.0.0.1".to_string(),
            port: 8080,
            daemon_sock_path: PathBuf::from("/tmp/aranya-daemon.sock"),
            afc_shm_path: PathBuf::from("/aranya-afc.shm"),
            max_afc_channels: 1024,
            afc_listen_address: "127.0.0.1:0".to_string(),
        }
    }
} 