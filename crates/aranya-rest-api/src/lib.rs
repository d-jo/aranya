//! REST API for interacting with the Aranya daemon.

pub mod api;
pub mod config;
pub mod error;
pub mod server;

pub use server::start_server; 