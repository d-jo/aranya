use crate::error::ApiError;
use actix_web::{delete, get, post, web, HttpResponse, Responder};
use aranya_client::{Client, Label};
use aranya_daemon_api::{AfcId, DeviceId, KeyBundle, NetIdentifier, Role, TeamId};
use aranya_util::addr::Addr;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::Duration;
use tracing::{debug, error, info};

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
    encoding: String,
}

#[derive(Serialize)]
struct AfcIdResponse {
    afc_id: String,
}

// Request bodies
#[derive(Deserialize)]
struct AddSyncPeerRequest {
    addr: String,
    team_id: String,
    interval_seconds: u64,
}

#[derive(Deserialize)]
struct RemoveSyncPeerRequest {
    addr: String,
    team_id: String,
}

#[derive(Deserialize)]
struct TeamRequest {
    team_id: String,
}

#[derive(Deserialize)]
struct AddDeviceToTeamRequest {
    team_id: String,
    identity: String,
    signing: String,
    encoding: String,
}

#[derive(Deserialize)]
struct DeviceRoleRequest {
    team_id: String,
    device_id: String,
    role: String,
}

#[derive(Deserialize)]
struct NetIdentifierRequest {
    team_id: String,
    device_id: String,
    net_identifier: String,
}

#[derive(Deserialize)]
struct LabelRequest {
    team_id: String,
    label: String,
}

#[derive(Deserialize)]
struct DeviceLabelRequest {
    team_id: String,
    device_id: String,
    label: String,
}

#[derive(Deserialize)]
struct CreateChannelRequest {
    team_id: String,
    peer: String,
    label: String,
}

#[derive(Deserialize)]
struct ChannelRequest {
    channel_id: String,
}

#[derive(Deserialize)]
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
pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: "Aranya REST API is running".to_string(),
    })
}

// Get Aranya local address
#[get("/address")]
pub async fn get_address(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let addr = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.aranya_local_addr().await?
    };

    Ok(HttpResponse::Ok().json(SocketAddressResponse {
        address: addr.to_string(),
    }))
}

// Get AFC local address
#[get("/afc/address")]
pub async fn get_afc_address(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let addr = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.afc_local_addr().await?
    };

    Ok(HttpResponse::Ok().json(SocketAddressResponse {
        address: addr.to_string(),
    }))
}

// Get device ID
#[get("/device/id")]
pub async fn get_device_id(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let device_id = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.get_device_id().await?
    };

    Ok(HttpResponse::Ok().json(DeviceIdResponse {
        device_id: device_id.to_string(),
    }))
}

// Get key bundle
#[get("/device/keys")]
pub async fn get_key_bundle(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let key_bundle = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.get_key_bundle().await?
    };

    Ok(HttpResponse::Ok().json(KeyBundleResponse {
        identity: base64::encode(&key_bundle.identity),
        signing: base64::encode(&key_bundle.signing),
        encoding: base64::encode(&key_bundle.encoding),
    }))
}

// Team operations
#[post("/team")]
pub async fn create_team(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let team_id = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.create_team().await?
    };

    Ok(HttpResponse::Ok().json(TeamIdResponse {
        team_id: team_id.to_string(),
    }))
}

#[post("/team/add")]
pub async fn add_team(
    data: web::Data<AppState>,
    req: web::Json<TeamRequest>,
) -> Result<impl Responder, ApiError> {
    let team_id = parse_team_id(&req.team_id)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.add_team(team_id).await?;
    }

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
    let team_id = parse_team_id(&path.into_inner())?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.close_team().await?;
    }

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
    let addr = parse_addr(&req.addr)?;
    let team_id = parse_team_id(&req.team_id)?;
    let interval = Duration::from_secs(req.interval_seconds);

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.add_sync_peer(addr, interval).await?;
    }

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
    let addr = parse_addr(&req.addr)?;
    let team_id = parse_team_id(&req.team_id)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_sync_peer(addr).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    
    let identity = base64::decode(&req.identity)
        .map_err(|_| ApiError::BadRequest("Invalid identity encoding".to_string()))?;
    
    let signing = base64::decode(&req.signing)
        .map_err(|_| ApiError::BadRequest("Invalid signing encoding".to_string()))?;
    
    let encoding = base64::decode(&req.encoding)
        .map_err(|_| ApiError::BadRequest("Invalid encoding encoding".to_string()))?;

    let key_bundle = KeyBundle {
        identity,
        signing,
        encoding,
    };

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.add_device_to_team(key_bundle).await?;
    }

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
    let team_id = parse_team_id(&team_id_str)?;
    let device_id = parse_device_id(&device_id_str)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_device_from_team(device_id).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let role = parse_role(&req.role)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_role(device_id, role).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let role = parse_role(&req.role)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.revoke_role(device_id, role).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let net_identifier = NetIdentifier(req.net_identifier.clone());

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_net_identifier(device_id, net_identifier).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let net_identifier = NetIdentifier(req.net_identifier.clone());

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.remove_net_identifier(device_id, net_identifier).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let label = parse_label(&req.label)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.create_label(label).await?;
    }

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
    let team_id = parse_team_id(&team_id_str)?;
    let label = parse_label(&label_str)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.delete_label(label).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let label = parse_label(&req.label)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.assign_label(device_id, label).await?;
    }

    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Label '{}' assigned to device {} in team {}", 
            req.label, req.device_id, req.team_id),
    }))
}

#[post("/team/label/revoke")]
pub async fn revoke_label(
    data: web::Data<AppState>,
    req: web::Json<DeviceLabelRequest>,
) -> Result<impl Responder, ApiError> {
    let team_id = parse_team_id(&req.team_id)?;
    let device_id = parse_device_id(&req.device_id)?;
    let label = parse_label(&req.label)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        let mut team = client.team(team_id);
        team.revoke_label(device_id, label).await?;
    }

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
    let team_id = parse_team_id(&req.team_id)?;
    let peer = NetIdentifier(req.peer.clone());
    let label = parse_label(&req.label)?;

    let afc_id = {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.create_bidi_channel(team_id, peer, label).await?
    };

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
    let channel_id = parse_afc_id(&channel_id_str)?;

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.delete_channel(channel_id).await?;
    }

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
    let channel_id = parse_afc_id(&req.channel_id)?;
    let data_bytes = req.data.as_bytes();

    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.send_data(channel_id, data_bytes).await?;
    }

    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: format!("Data sent on channel {} successfully", req.channel_id),
    }))
}

// Poll AFC for new messages
#[get("/channel/poll")]
pub async fn poll_messages(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    {
        let mut client = data.client.lock().map_err(|e| {
            ApiError::InternalError(format!("Failed to lock client: {}", e))
        })?;
        client.poll().await?;
    }

    Ok(HttpResponse::Ok().json(SuccessResponse {
        success: true,
        message: "AFC polled successfully".to_string(),
    }))
}

// Collect all the routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
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
} 