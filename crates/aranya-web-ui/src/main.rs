use actix_files as fs;
use actix_web::{App, HttpServer, web, middleware, HttpResponse};
use std::path::PathBuf;
use std::env;
use std::collections::HashMap;
use url::form_urlencoded;

// Helper function to render HTML pages
fn render_page(templates_dir: &PathBuf, page: &str) -> String {
    let path = templates_dir.join(format!("{}.html", page));
    match std::fs::read_to_string(&path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Warning: Could not read {}.html: {}", page, e);
            format!("<html><body><h1>Error: Could not find page {}</h1></body></html>", page)
        }
    }
}

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
        let api_base = api_address.clone();
        let static_dir = static_dir.clone();
        let templates_dir = templates_dir.clone();

        App::new()
            .wrap(middleware::Logger::default())
            // Home page - serve index.html
            .service(web::resource("/").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "index");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            // Serve pages for each main section
            .service(web::resource("/dashboard").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "dashboard");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            .service(web::resource("/teams").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "teams");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            .service(web::resource("/devices").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "devices");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            .service(web::resource("/networking").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "networking");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            .service(web::resource("/channels").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "channels");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
                }
            }))
            .service(web::resource("/settings").to({
                let templates_dir = templates_dir.clone();
                move || {
                    let html = render_page(&templates_dir, "settings");
                    async move {
                        HttpResponse::Ok()
                            .content_type("text/html")
                            .body(html)
                    }
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
                        
                        // Get the API endpoint from the query string if provided
                        let mut api_address_to_use = api_base.clone();
                        let query_string = req.uri().query().unwrap_or("");
                        
                        if query_string.contains("api_endpoint=") {
                            // Parse the query string to get the api_endpoint
                            let params: HashMap<_, _> = form_urlencoded::parse(query_string.as_bytes())
                                .into_owned()
                                .collect();
                            
                            if let Some(endpoint) = params.get("api_endpoint") {
                                if !endpoint.is_empty() {
                                    // Validate URL format
                                    if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
                                        api_address_to_use = endpoint.clone();
                                        println!("Using custom API endpoint: {}", api_address_to_use);
                                    }
                                }
                            }
                        } else if query_string.contains("api_port=") {
                            // Legacy support for api_port parameter
                            let params: HashMap<_, _> = form_urlencoded::parse(query_string.as_bytes())
                                .into_owned()
                                .collect();
                            
                            if let Some(port) = params.get("api_port") {
                                if let Ok(port_num) = port.parse::<u16>() {
                                    if port_num > 0 {
                                        api_address_to_use = format!("http://127.0.0.1:{}", port_num);
                                        println!("Using API port from query string: {}", port_num);
                                    }
                                }
                            }
                        }
                        
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
                        let api_url = format!("{}{}", api_address_to_use, target_path);
                        
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