use actix_web::{HttpResponse, ResponseError};
use aranya_client;
use aranya_daemon_api::Error as DaemonError;
use std::fmt;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("Client error: {0}")]
    ClientError(String),

    #[error("Daemon error: {0}")]
    DaemonError(#[from] DaemonError),

    #[error("Aranya client error: {0}")]
    AranyaClientError(#[from] aranya_client::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let status = match self {
            ApiError::InternalError(_) => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::ClientError(_) => actix_web::http::StatusCode::BAD_REQUEST,
            ApiError::DaemonError(_) => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::AranyaClientError(_) => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::NotFound(_) => actix_web::http::StatusCode::NOT_FOUND,
            ApiError::BadRequest(_) => actix_web::http::StatusCode::BAD_REQUEST,
            ApiError::Unauthorized(_) => actix_web::http::StatusCode::UNAUTHORIZED,
        };

        HttpResponse::build(status).json(ErrorResponse {
            error: self.to_string(),
        })
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        ApiError::InternalError(err.to_string())
    }
}

#[derive(serde::Serialize)]
struct ErrorResponse {
    error: String,
} 