use actix_files as fs;
use actix_web::{App, HttpServer, web, middleware};
use std::path::PathBuf;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Configure logging
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    // Get port from environment variable or use default
    let port = env::var("ARANYA_WEB_UI_PORT").unwrap_or_else(|_| "8080".to_string());
    let api_port = env::var("ARANYA_API_PORT").unwrap_or_else(|_| "8000".to_string());
    
    // Parse port or default to 8080 if invalid
    let port = port.parse::<u16>().unwrap_or(8080);
    let api_port = api_port.parse::<u16>().unwrap_or(8000);
    
    let bind_address = format!("127.0.0.1:{}", port);
    let api_address = format!("http://127.0.0.1:{}", api_port);
    
    println!("Starting Aranya Web UI server at http://{}", bind_address);
    println!("API requests will be forwarded to {}", api_address);
    
    // Determine the correct paths for template and static files
    let current_dir = env::current_dir()?;
    println!("Current directory: {}", current_dir.display());
    
    // Try several possible locations for template and static files
    let template_paths = vec![
        PathBuf::from("templates"),
        PathBuf::from("crates/aranya-web-ui/templates"),
        current_dir.join("templates"),
        current_dir.join("crates/aranya-web-ui/templates"),
    ];
    
    let static_paths = vec![
        PathBuf::from("static"),
        PathBuf::from("crates/aranya-web-ui/static"),
        current_dir.join("static"),
        current_dir.join("crates/aranya-web-ui/static"),
    ];
    
    // Find valid template dir
    let templates_dir = template_paths.iter()
        .find(|path| path.exists())
        .unwrap_or(&template_paths[0])
        .clone();
    
    // Find valid static dir
    let static_dir = static_paths.iter()
        .find(|path| path.exists())
        .unwrap_or(&static_paths[0])
        .clone();
    
    println!("Using templates directory: {}", templates_dir.display());
    println!("Using static directory: {}", static_dir.display());

    HttpServer::new(move || {
        let html_content = match std::fs::read_to_string(templates_dir.join("index.html")) {
            Ok(content) => content,
            Err(e) => {
                eprintln!("Warning: Could not read index.html: {}", e);
                include_str!("../templates/index.html").to_string()
            }
        };
        
        let api_base = api_address.clone();
        let static_dir = static_dir.clone();

        App::new()
            .wrap(middleware::Logger::default())
            // Serve the index.html file
            .service(web::resource("/").to(move || {
                let html = html_content.clone();
                async move {
                    actix_web::HttpResponse::Ok()
                        .content_type("text/html")
                        .body(html)
                }
            }))
            // Serve static files
            .service(fs::Files::new("/static", &static_dir))
            // API proxy
            .service(
                web::scope("/api")
                    .route("/{tail:.*}", web::to(move |req: actix_web::HttpRequest, body: web::Bytes| {
                        // Get the path component after /api
                        let orig_path = req.uri().path();
                        let path_without_api = orig_path.trim_start_matches("/api");
                        
                        // Construct the final API path with proper prefixes
                        let target_path = if path_without_api.starts_with("/v1") {
                            // Already has /v1, just keep it
                            format!("/api{}", path_without_api)
                        } else if path_without_api.is_empty() {
                            // Empty path (just /api), add nothing
                            "/api".to_string()
                        } else {
                            // Add /v1 to the path
                            format!("/api/v1{}", path_without_api)
                        };
                        
                        // Create the target API URL
                        let api_url = format!("{}{}", api_base, target_path);
                        
                        println!("Forwarding API request: {} -> {}", req.uri().path(), api_url);
                        
                        async move {
                            let client = awc::Client::default();
                            let mut api_req = client.request(req.method().clone(), &api_url);
                            
                            // Forward headers
                            for (header_name, header_value) in req.headers().iter().filter(|(h, _)| *h != "host") {
                                api_req = api_req.insert_header((header_name.clone(), header_value.clone()));
                            }
                            
                            // Forward the request and return the response
                            match api_req.send_body(body).await {
                                Ok(mut response) => {
                                    let mut client_resp = actix_web::HttpResponse::build(response.status());
                                    
                                    // Copy headers
                                    for (header_name, header_value) in response.headers().iter() {
                                        client_resp.append_header((header_name.clone(), header_value.clone()));
                                    }
                                    
                                    // Get response body
                                    match response.body().await {
                                        Ok(body) => client_resp.body(body),
                                        Err(_) => actix_web::HttpResponse::InternalServerError().finish(),
                                    }
                                },
                                Err(_) => actix_web::HttpResponse::InternalServerError().finish(),
                            }
                        }
                    }))
            )
    })
    .bind(bind_address)?
    .run()
    .await
} 