use crate::{
    api::{configure_routes, AppState},
    config::Config,
    error::ApiError,
};
use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use aranya_client::Client;
use std::sync::Mutex;
use tracing::{error, info};

/// Starts the REST API server with the given configuration
pub async fn start_server(config: Config) -> Result<(), ApiError> {
    // Configure tracing
    tracing_subscriber::fmt::init();
    
    info!("Starting Aranya REST API server");
    info!("Config: {:?}", config);
    
    // Connect to the Aranya daemon
    info!("Connecting to Aranya daemon at {:?}", config.daemon_sock_path);
    let client = Client::connect(
        &config.daemon_sock_path,
        &config.afc_shm_path,
        config.max_afc_channels,
        config.afc_listen_address,
    )
    .await
    .map_err(|e| ApiError::InternalError(format!("Failed to connect to Aranya daemon: {}", e)))?;
    
    info!("Connected to Aranya daemon");
    
    // Create app state with the client
    let app_state = web::Data::new(AppState {
        client: Mutex::new(client),
    });
    
    // Start HTTP server
    let bind_address = format!("{}:{}", config.bind_address, config.port);
    info!("Starting HTTP server on {}", bind_address);
    
    HttpServer::new(move || {
        // Setup CORS
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        
        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .configure(configure_routes)
    })
    .bind(bind_address)
    .map_err(|e| ApiError::InternalError(format!("Failed to bind server: {}", e)))?
    .run()
    .await
    .map_err(|e| ApiError::InternalError(format!("Server error: {}", e)))?;
    
    info!("Server stopped");
    Ok(())
} 