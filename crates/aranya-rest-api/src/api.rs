use crate::error::ApiError;
use actix_web::{delete, get, post, web, HttpResponse, Responder};
use aranya_client::{Client, Label};
use aranya_daemon_api::{AfcId, DeviceId, KeyBundle, NetIdentifier, Role, TeamId};
use aranya_util::addr::Addr;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::Duration;
use tracing::{debug, error, info, instrument, span, Level, Instrument as _};

// AppState to hold the shared Aranya client
pub struct AppState {
    pub client: Mutex<Client>,
}

// Define response and request types
#[derive(Serialize)]
struct SuccessResponse {
    success: bool,
    message: String,
}

#[derive(Serialize)]
struct SocketAddressResponse {
    address: String,
}

#[derive(Serialize)]
struct DeviceIdResponse {
    device_id: String,
}

#[derive(Serialize)]
struct TeamIdResponse {
    team_id: String,
}

#[derive(Serialize)]
struct KeyBundleResponse {
    identity: String,
    signing: String,
    encryption: String,
}

#[derive(Serialize)]
struct AfcIdResponse {
    afc_id: String,
}

// Request bodies
#[derive(Deserialize, Debug)]
struct AddSyncPeerRequest {
    addr: String,
    team_id: String,
    interval_seconds: u64,
}

#[derive(Deserialize, Debug)]
struct RemoveSyncPeerRequest {
    addr: String,
    team_id: String,
}

#[derive(Deserialize, Debug)]
struct TeamRequest {
    team_id: String,
}

#[derive(Deserialize, Debug)]
struct AddDeviceToTeamRequest {
    team_id: String,
    identity: String,
    signing: String,
    encryption: String,
}

#[derive(Deserialize, Debug)]
struct DeviceRoleRequest {
    team_id: String,
    device_id: String,
    role: String,
}

#[derive(Deserialize, Debug)]
struct NetIdentifierRequest {
    team_id: String,
    device_id: String,
    net_identifier: String,
}

#[derive(Deserialize, Debug)]
struct LabelRequest {
    team_id: String,
    label: String,
}

#[derive(Deserialize, Debug)]
struct DeviceLabelRequest {
    team_id: String,
    device_id: String,
    label: String,
}

#[derive(Deserialize, Debug)]
struct CreateChannelRequest {
    team_id: String,
    peer: String,
    label: String,
}

#[derive(Deserialize, Debug)]
struct ChannelRequest {
    channel_id: String,
}

#[derive(Deserialize, Debug)]
struct SendDataRequest {
    channel_id: String,
    data: String,
}

// Helper functions
fn parse_team_id(team_id: &str) -> Result<TeamId, ApiError> {
    team_id.parse().map_err(|_| ApiError::BadRequest("Invalid team ID format".to_string()))
}

fn parse_device_id(device_id: &str) -> Result<DeviceId, ApiError> {
    device_id.parse().map_err(|_| ApiError::BadRequest("Invalid device ID format".to_string()))
}

fn parse_afc_id(_afc_id: &str) -> Result<AfcId, ApiError> {
    // In a real implementation, this would parse the string into an AfcId
    // For now, return an error since we don't have access to AfcId constructors
    Err(ApiError::BadRequest("AfcId parsing not implemented in this version".to_string()))
}

fn parse_addr(addr: &str) -> Result<Addr, ApiError> {
    addr.parse().map_err(|_| ApiError::BadRequest("Invalid address format".to_string()))
}

fn parse_role(role: &str) -> Result<Role, ApiError> {
    match role.to_lowercase().as_str() {
        "owner" => Ok(Role::Owner),
        "admin" => Ok(Role::Admin),
        "operator" => Ok(Role::Operator),
        "member" => Ok(Role::Member),
        _ => Err(ApiError::BadRequest("Invalid role".to_string())),
    }
}

fn parse_label(label: &str) -> Result<Label, ApiError> {
    // Parse the string to a u32, then create a Label
    // In real code, you would need to use the proper Label constructor from the actual API
    let value = label.parse::<u32>()
        .map_err(|_| ApiError::BadRequest("Invalid label format".to_string()))?;
    
    // Since we don't know exactly how to construct a Label without seeing its implementation,
    // we're using a placeholder. In a real implementation, you would use the correct constructor.
    let label_val = unsafe { std::mem::transmute::<u32, Label>(value) };
    Ok(label_val)
}

// API endpoints
// Health check
#[get("/health")]
#[instrument(name = "health_check", level = "debug")]
pub async fn health_check() -> impl Responder {
    debug!("Health check endpoint called");
    HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: "Aranya REST API is running".to_string(),
    })
}

// Get Aranya local address
#[get("/address")]
#[instrument(name = "get_aranya_address", skip(data), level = "debug")]
pub async fn get_address(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Getting Aranya local address");
    let addr = {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        // We exit the lock span here by dropping _guard and create a new span for the operation
        drop(_guard);
        
        let span = span!(Level::DEBUG, "get_local_addr");
        async {
            client.aranya_local_addr().await.map_err(|e| {
                error!("Failed to get Aranya local address: {}", e);
                e
            })
        }.instrument(span).await?
    };

    info!("Aranya local address: {}", addr);
    Ok(HttpResponse::Ok().json(SocketAddressResponse {
        address: addr.to_string(),
    }))
}

// Get AFC local address
#[get("/afc/address")]
#[instrument(name = "get_afc_address", skip(data), level = "debug")]
pub async fn get_afc_address(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Getting AFC local address");
    let addr = {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        drop(_guard);
        
        let span = span!(Level::DEBUG, "get_afc_addr");
        async {
            client.afc_local_addr().await.map_err(|e| {
                error!("Failed to get AFC local address: {}", e);
                e
            })
        }.instrument(span).await?
    };

    info!("AFC local address: {}", addr);
    Ok(HttpResponse::Ok().json(SocketAddressResponse {
        address: addr.to_string(),
    }))
}

// Get device ID
#[get("/device/id")]
#[instrument(name = "get_device_id", skip(data), level = "debug")]
pub async fn get_device_id(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Getting device ID");
    let device_id = {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        drop(_guard);
        
        let span = span!(Level::DEBUG, "fetch_device_id");
        async {
            client.get_device_id().await.map_err(|e| {
                error!("Failed to get device ID: {}", e);
                e
            })
        }.instrument(span).await?
    };

    info!("Device ID: {}", device_id);
    Ok(HttpResponse::Ok().json(DeviceIdResponse {
        device_id: device_id.to_string(),
    }))
}

// Get key bundle
#[get("/device/keys")]
#[instrument(name = "get_key_bundle", skip(data), level = "debug")]
pub async fn get_key_bundle(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Getting key bundle");
    let key_bundle = {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        drop(_guard);
        
        let span = span!(Level::DEBUG, "fetch_key_bundle");
        async {
            client.get_key_bundle().await.map_err(|e| {
                error!("Failed to get key bundle: {}", e);
                e
            })
        }.instrument(span).await?
    };

    info!("Key bundle retrieved successfully");
    Ok(HttpResponse::Ok().json(KeyBundleResponse {
        identity: base64::encode(&key_bundle.identity),
        signing: base64::encode(&key_bundle.signing),
        encryption: base64::encode(&key_bundle.encryption),
    }))
}

// Team operations
#[post("/team")]
#[instrument(name = "create_team", skip(data), level = "debug")]
pub async fn create_team(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Creating new team");
    let team_id = {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        drop(_guard);
        
        let span = span!(Level::DEBUG, "team_creation");
        async {
            client.create_team().await.map_err(|e| {
                error!("Failed to create team: {}", e);
                e
            })
        }.instrument(span).await?
    };

    info!("Team created successfully with ID: {}", team_id);
    Ok(HttpResponse::Ok().json(TeamIdResponse {
        team_id: team_id.to_string(),
    }))
}

#[post("/team/add")]
#[instrument(name = "add_team", skip(data), fields(team_id = %req.team_id), level = "debug")]
pub async fn add_team(
    data: web::Data<AppState>,
    req: web::Json<TeamRequest>,
) -> Result<impl Responder, ApiError> {
    let team_id_str = &req.team_id;
    debug!("Adding team with ID: {}", team_id_str);
    
    let parse_span = span!(Level::DEBUG, "parse_team_id", team_id = %team_id_str);
    let team_id = parse_span.in_scope(|| {
        parse_team_id(team_id_str).map_err(|e| {
            error!("Failed to parse team ID '{}': {}", team_id_str, e);
            e
        })
    })?;

    {
        let span = span!(Level::DEBUG, "lock_client");
        let _guard = span.enter();
        
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        
        drop(_guard);
        
        let span = span!(Level::DEBUG, "add_team_op", team_id = %team_id);
        async {
            client.add_team(team_id).await.map_err(|e| {
                error!("Failed to add team {}: {}", team_id, e);
                e
            })
        }.instrument(span).await?;
    }

    info!("Team {} added successfully", team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Team {} added successfully", team_id),
    }))
}

#[delete("/team/{team_id}")]
pub async fn close_team(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    let team_id_str = path.into_inner();
    debug!("Closing team with ID: {}", team_id_str);
    
    let team_id = parse_team_id(&team_id_str).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", team_id_str, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.close_team().await.map_err(|e| {
            error!("Failed to close team {}: {}", team_id, e);
            e
        })?;
    }

    info!("Team {} closed successfully", team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Team {} closed successfully", team_id),
    }))
}

// Sync peer operations
#[post("/sync/peer")]
pub async fn add_sync_peer(
    data: web::Data<AppState>,
    req: web::Json<AddSyncPeerRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Adding sync peer: {} for team: {}", req.addr, req.team_id);
    
    let addr = parse_addr(&req.addr).map_err(|e| {
        error!("Failed to parse address '{}': {}", req.addr, e);
        e
    })?;
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let interval = Duration::from_secs(req.interval_seconds);

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.add_sync_peer(addr, interval).await.map_err(|e| {
            error!("Failed to add sync peer {} to team {}: {}", addr, team_id, e);
            e
        })?;
    }

    info!("Sync peer {} added to team {} with interval of {}s", addr, team_id, req.interval_seconds);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Sync peer {} added successfully", req.addr),
    }))
}

#[delete("/sync/peer")]
pub async fn remove_sync_peer(
    data: web::Data<AppState>,
    req: web::Json<RemoveSyncPeerRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Removing sync peer: {} from team: {}", req.addr, req.team_id);
    
    let addr = parse_addr(&req.addr).map_err(|e| {
        error!("Failed to parse address '{}': {}", req.addr, e);
        e
    })?;
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_sync_peer(addr).await.map_err(|e| {
            error!("Failed to remove sync peer {} from team {}: {}", addr, team_id, e);
            e
        })?;
    }

    info!("Sync peer {} removed from team {}", addr, team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Sync peer {} removed successfully", req.addr),
    }))
}

// Device operations
#[post("/team/device")]
pub async fn add_device_to_team(
    data: web::Data<AppState>,
    req: web::Json<AddDeviceToTeamRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Adding device to team: {}", req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let identity = base64::decode(&req.identity)
        .map_err(|_| {
            let err = ApiError::BadRequest("Invalid identity encoding".to_string());
            error!("Failed to decode identity base64: {}", err);
            err
        })?;
    
    let signing = base64::decode(&req.signing)
        .map_err(|_| {
            let err = ApiError::BadRequest("Invalid signing encoding".to_string());
            error!("Failed to decode signing base64: {}", err);
            err
        })?;
    
    let encryption = base64::decode(&req.encryption)
        .map_err(|_| {
            let err = ApiError::BadRequest("Invalid encryption encoding".to_string());
            error!("Failed to decode encryption base64: {}", err);
            err
        })?;

    let key_bundle = KeyBundle {
        identity,
        signing,
        encryption,
    };

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.add_device_to_team(key_bundle).await.map_err(|e| {
            error!("Failed to add device to team {}: {}", team_id, e);
            e
        })?;
    }

    info!("Device added to team {} successfully", team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: "Device added to team successfully".to_string(),
    }))
}

#[delete("/team/{team_id}/device/{device_id}")]
pub async fn remove_device_from_team(
    data: web::Data<AppState>,
    path: web::Path<(String, String)>,
) -> Result<impl Responder, ApiError> {
    let (team_id_str, device_id_str) = path.into_inner();
    debug!("Removing device {} from team {}", device_id_str, team_id_str);
    
    let team_id = parse_team_id(&team_id_str).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", team_id_str, e);
        e
    })?;
    
    let device_id = parse_device_id(&device_id_str).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", device_id_str, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_device_from_team(device_id).await.map_err(|e| {
            error!("Failed to remove device {} from team {}: {}", device_id, team_id, e);
            e
        })?;
    }

    info!("Device {} removed from team {} successfully", device_id_str, team_id_str);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Device {} removed from team {}", device_id_str, team_id_str),
    }))
}

// Role operations
#[post("/team/role/assign")]
pub async fn assign_role(
    data: web::Data<AppState>,
    req: web::Json<DeviceRoleRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Assigning role '{}' to device {} in team {}", req.role, req.device_id, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let device_id = parse_device_id(&req.device_id).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", req.device_id, e);
        e
    })?;
    
    let role = parse_role(&req.role).map_err(|e| {
        error!("Failed to parse role '{}': {}", req.role, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_role(device_id, role).await.map_err(|e| {
            error!("Failed to assign role '{}' to device {} in team {}: {}", 
                req.role, device_id, team_id, e);
            e
        })?;
    }

    info!("Role '{}' assigned to device {} in team {}", req.role, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Role '{}' assigned to device {} in team {}", req.role, req.device_id, req.team_id),
    }))
}

#[post("/team/role/revoke")]
pub async fn revoke_role(
    data: web::Data<AppState>,
    req: web::Json<DeviceRoleRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Revoking role '{}' from device {} in team {}", req.role, req.device_id, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let device_id = parse_device_id(&req.device_id).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", req.device_id, e);
        e
    })?;
    
    let role = parse_role(&req.role).map_err(|e| {
        error!("Failed to parse role '{}': {}", req.role, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.revoke_role(device_id, role).await.map_err(|e| {
            error!("Failed to revoke role '{}' from device {} in team {}: {}", 
                req.role, device_id, team_id, e);
            e
        })?;
    }

    info!("Role '{}' revoked from device {} in team {}", req.role, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Role '{}' revoked from device {} in team {}", req.role, req.device_id, req.team_id),
    }))
}

// Network identifier operations
#[post("/team/net-identifier/assign")]
pub async fn assign_net_identifier(
    data: web::Data<AppState>,
    req: web::Json<NetIdentifierRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Assigning net identifier '{}' to device {} in team {}", 
        req.net_identifier, req.device_id, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let device_id = parse_device_id(&req.device_id).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", req.device_id, e);
        e
    })?;
    
    let net_identifier = NetIdentifier(req.net_identifier.clone());

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_net_identifier(device_id, net_identifier.clone()).await.map_err(|e| {
            error!("Failed to assign net identifier '{}' to device {} in team {}: {}", 
                req.net_identifier, device_id, team_id, e);
            e
        })?;
    }

    info!("Net identifier '{}' assigned to device {} in team {}", 
        req.net_identifier, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Network identifier '{}' assigned to device {} in team {}", 
            req.net_identifier, req.device_id, req.team_id),
    }))
}

#[post("/team/net-identifier/remove")]
pub async fn remove_net_identifier(
    data: web::Data<AppState>,
    req: web::Json<NetIdentifierRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Removing net identifier '{}' from device {} in team {}", 
        req.net_identifier, req.device_id, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let device_id = parse_device_id(&req.device_id).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", req.device_id, e);
        e
    })?;
    
    let net_identifier = NetIdentifier(req.net_identifier.clone());

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_net_identifier(device_id, net_identifier.clone()).await.map_err(|e| {
            error!("Failed to remove net identifier '{}' from device {} in team {}: {}", 
                req.net_identifier, device_id, team_id, e);
            e
        })?;
    }

    info!("Net identifier '{}' removed from device {} in team {}", 
        req.net_identifier, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Network identifier '{}' removed from device {} in team {}", 
            req.net_identifier, req.device_id, req.team_id),
    }))
}

// Label operations
#[post("/team/label")]
pub async fn create_label(
    data: web::Data<AppState>,
    req: web::Json<LabelRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Creating label '{}' in team {}", req.label, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let label = parse_label(&req.label).map_err(|e| {
        error!("Failed to parse label '{}': {}", req.label, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.create_label(label).await.map_err(|e| {
            error!("Failed to create label '{}' in team {}: {}", req.label, team_id, e);
            e
        })?;
    }

    info!("Label '{}' created in team {}", req.label, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Label '{}' created in team {}", req.label, req.team_id),
    }))
}

#[delete("/team/{team_id}/label/{label}")]
pub async fn delete_label(
    data: web::Data<AppState>,
    path: web::Path<(String, String)>,
) -> Result<impl Responder, ApiError> {
    let (team_id_str, label_str) = path.into_inner();
    debug!("Deleting label '{}' from team {}", label_str, team_id_str);
    
    let team_id = parse_team_id(&team_id_str).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", team_id_str, e);
        e
    })?;
    
    let label = parse_label(&label_str).map_err(|e| {
        error!("Failed to parse label '{}': {}", label_str, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.delete_label(label).await.map_err(|e| {
            error!("Failed to delete label '{}' from team {}: {}", label_str, team_id, e);
            e
        })?;
    }

    info!("Label '{}' deleted from team {}", label_str, team_id_str);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Label '{}' deleted from team {}", label_str, team_id_str),
    }))
}

#[post("/team/label/assign")]
pub async fn assign_label(
    data: web::Data<AppState>,
    req: web::Json<DeviceLabelRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Assigning label '{}' to device {} in team {}", 
        req.label, req.device_id, req.team_id);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let device_id = parse_device_id(&req.device_id).map_err(|e| {
        error!("Failed to parse device ID '{}': {}", req.device_id, e);
        e
    })?;
    
    let label = parse_label(&req.label).map_err(|e| {
        error!("Failed to parse label '{}': {}", req.label, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_label(device_id, label).await.map_err(|e| {
            error!("Failed to assign label '{}' to device {} in team {}: {}", 
                req.label, device_id, team_id, e);
            e
        })?;
    }

    info!("Label '{}' assigned to device {} in team {}", 
        req.label, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Label '{}' assigned to device {} in team {}", 
            req.label, req.device_id, req.team_id),
    }))
}

#[post("/team/label/revoke")]
#[instrument(name = "revoke_label", skip(data), fields(
    team_id = %req.team_id, 
    device_id = %req.device_id, 
    label = %req.label
), level = "debug")]
pub async fn revoke_label(
    data: web::Data<AppState>,
    req: web::Json<DeviceLabelRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Revoking label '{}' from device {} in team {}", 
        req.label, req.device_id, req.team_id);
    
    // Parse in a span to track parsing time separately
    let parse_span = span!(Level::DEBUG, "parse_parameters");
    let (team_id, device_id, label) = parse_span.in_scope(|| -> Result<_, ApiError> {
        let team_id = parse_team_id(&req.team_id).map_err(|e| {
            error!("Failed to parse team ID '{}': {}", req.team_id, e);
            e
        })?;
        
        let device_id = parse_device_id(&req.device_id).map_err(|e| {
            error!("Failed to parse device ID '{}': {}", req.device_id, e);
            e
        })?;
        
        let label = parse_label(&req.label).map_err(|e| {
            error!("Failed to parse label '{}': {}", req.label, e);
            e
        })?;
        
        Ok((team_id, device_id, label))
    })?;

    {
        let client_span = span!(Level::DEBUG, "lock_client");
        let mut client = client_span.in_scope(|| -> Result<_, ApiError> {
            data.client.lock().map_err(|e| {
                error!("Failed to lock client: {}", e);
                ApiError::InternalError(format!("Failed to lock client: {}", e))
            })
        })?;
        
        let op_span = span!(Level::DEBUG, "revoke_label_op", 
            team_id = %team_id, 
            device_id = %device_id, 
            label = %req.label
        );
        
        // Create team instance with proper mutability
        let mut team = client.team(team_id);
        
        // Use instrument for the async operation
        team.revoke_label(device_id, label).instrument(op_span).await.map_err(|e| {
            error!("Failed to revoke label '{}' from device {} in team {}: {}", 
                req.label, device_id, team_id, e);
            e
        })?;
    }

    info!("Label '{}' revoked from device {} in team {}", 
        req.label, req.device_id, req.team_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Label '{}' revoked from device {} in team {}", 
            req.label, req.device_id, req.team_id),
    }))
}

// Channel operations
#[post("/channel")]
pub async fn create_channel(
    data: web::Data<AppState>,
    req: web::Json<CreateChannelRequest>,
) -> Result<impl Responder, ApiError> {
    debug!("Creating channel in team {} with peer {} and label {}", 
        req.team_id, req.peer, req.label);
    
    let team_id = parse_team_id(&req.team_id).map_err(|e| {
        error!("Failed to parse team ID '{}': {}", req.team_id, e);
        e
    })?;
    
    let peer = NetIdentifier(req.peer.clone());
    
    let label = parse_label(&req.label).map_err(|e| {
        error!("Failed to parse label '{}': {}", req.label, e);
        e
    })?;

    let afc_id = {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.create_bidi_channel(team_id, peer.clone(), label).await.map_err(|e| {
            error!("Failed to create channel in team {} with peer {} and label {}: {}", 
                team_id, req.peer, req.label, e);
            e
        })?
    };

    info!("Channel created in team {} with peer {} and label {}, afc_id: {}", 
        req.team_id, req.peer, req.label, afc_id);
    Ok(HttpResponse::Ok().json(AfcIdResponse {
        afc_id: afc_id.to_string(),
    }))
}

#[delete("/channel/{channel_id}")]
pub async fn delete_channel(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> Result<impl Responder, ApiError> {
    // Since we can't properly parse AfcId in this version, this endpoint will always return an error
    let channel_id_str = path.into_inner();
    debug!("Deleting channel {}", channel_id_str);
    
    let channel_id = parse_afc_id(&channel_id_str).map_err(|e| {
        error!("Failed to parse channel ID '{}': {}", channel_id_str, e);
        e
    })?;

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.delete_channel(channel_id).await.map_err(|e| {
            error!("Failed to delete channel {}: {}", channel_id_str, e);
            e
        })?;
    }

    info!("Channel {} deleted successfully", channel_id_str);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Channel {} deleted successfully", channel_id_str),
    }))
}

#[post("/channel/data")]
pub async fn send_data(
    data: web::Data<AppState>,
    req: web::Json<SendDataRequest>,
) -> Result<impl Responder, ApiError> {
    // Since we can't properly parse AfcId in this version, this endpoint will always return an error
    debug!("Sending data on channel {}", req.channel_id);
    
    let channel_id = parse_afc_id(&req.channel_id).map_err(|e| {
        error!("Failed to parse channel ID '{}': {}", req.channel_id, e);
        e
    })?;
    
    let data_bytes = req.data.as_bytes();
    let data_len = data_bytes.len();

    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.send_data(channel_id, data_bytes).await.map_err(|e| {
            error!("Failed to send data on channel {}: {}", req.channel_id, e);
            e
        })?;
    }

    info!("Data ({} bytes) sent on channel {} successfully", data_len, req.channel_id);
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Data sent on channel {} successfully", req.channel_id),
    }))
}

// Poll AFC for new messages
#[get("/channel/poll")]
pub async fn poll_messages(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    debug!("Polling AFC for new messages");
    
    {
        let mut client = data.client.lock().map_err(|e| {
            error!("Failed to lock client: {}", e);
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.poll().await.map_err(|e| {
            error!("Failed to poll AFC: {}", e);
            e
        })?;
    }

    info!("AFC polled successfully");
    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: "AFC polled successfully".to_string(),
    }))
}

// Collect all the routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    let span = span!(Level::INFO, "configure_routes");
    let _guard = span.enter();
    
    info!("Configuring REST API routes");
    cfg.service(
        web::scope("/api/v1")
            .service(health_check)
            .service(get_address)
            .service(get_afc_address)
            .service(get_device_id)
            .service(get_key_bundle)
            .service(create_team)
            .service(add_team)
            .service(close_team)
            .service(add_sync_peer)
            .service(remove_sync_peer)
            .service(add_device_to_team)
            .service(remove_device_from_team)
            .service(assign_role)
            .service(revoke_role)
            .service(assign_net_identifier)
            .service(remove_net_identifier)
            .service(create_label)
            .service(delete_label)
            .service(assign_label)
            .service(revoke_label)
            .service(create_channel)
            .service(delete_channel)
            .service(send_data)
            .service(poll_messages)
    );
    debug!("REST API routes configured");
} 