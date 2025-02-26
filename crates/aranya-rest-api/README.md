# Aranya REST API

A REST API service for interacting with the Aranya daemon. This API provides HTTP endpoints to access the functionality of Aranya, a decentralized access governance and secure data exchange platform.

## Overview

The Aranya REST API exposes the functionality of the Aranya daemon through a RESTful HTTP interface. This allows applications to interact with Aranya without having to directly use the client library.

## Features

- Team management (creation, adding devices, roles)
- Device management (adding, removing, roles)
- AFC (Aranya Fast Channels) operations
- Secure data exchange between devices
- Network identifier management
- Label management for data segmentation

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### System Operations

- `GET /health` - Check server health
- `GET /address` - Get Aranya local address
- `GET /afc/address` - Get AFC local address

### Device Operations

- `GET /device/id` - Get device ID
- `GET /device/keys` - Get device key bundle

### Team Operations

- `POST /team` - Create a new team
- `POST /team/add` - Add an existing team
- `DELETE /team/{team_id}` - Close a team
- `POST /team/device` - Add a device to a team
- `DELETE /team/{team_id}/device/{device_id}` - Remove a device from a team

### Role Operations

- `POST /team/role/assign` - Assign a role to a device
- `POST /team/role/revoke` - Revoke a role from a device

### Network Identifier Operations

- `POST /team/net-identifier/assign` - Assign a network identifier to a device
- `POST /team/net-identifier/remove` - Remove a network identifier from a device

### Label Operations

- `POST /team/label` - Create a label
- `DELETE /team/{team_id}/label/{label}` - Delete a label
- `POST /team/label/assign` - Assign a label to a device
- `POST /team/label/revoke` - Revoke a label from a device

### AFC (Aranya Fast Channels) Operations

- `POST /channel` - Create a channel
- `DELETE /channel/{channel_id}` - Delete a channel
- `POST /channel/data` - Send data on a channel
- `GET /channel/poll` - Poll for new messages

### Sync Operations

- `POST /sync/peer` - Add a sync peer
- `DELETE /sync/peer` - Remove a sync peer

## Configuration

The API server can be configured using environment variables:

- `ARANYA_REST_BIND_ADDRESS` - The address to bind the server to (default: `127.0.0.1`)
- `ARANYA_REST_PORT` - The port to bind the server to (default: `8080`)
- `ARANYA_DAEMON_SOCK_PATH` - The path to the daemon socket (default: `/tmp/aranya-daemon.sock`)
- `ARANYA_AFC_SHM_PATH` - The path to the AFC shared memory (default: `/aranya-afc.shm`)
- `ARANYA_MAX_AFC_CHANNELS` - The maximum number of AFC channels (default: `1024`)
- `ARANYA_AFC_LISTEN_ADDRESS` - The address for AFC to listen on (default: `127.0.0.1:0`)

## Usage

1. Make sure the Aranya daemon is running.
2. Start the REST API server:

   ```bash
   cargo run --bin aranya-rest-api
   ```

3. The server will be available at `http://127.0.0.1:8080/api/v1` by default.

## Example Requests

### Create a new team

```bash
curl -X POST http://localhost:8080/api/v1/team
```

### Add a device to a team

```bash
curl -X POST http://localhost:8080/api/v1/team/device \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "your_team_id",
    "identity": "base64_encoded_identity",
    "signing": "base64_encoded_signing",
    "encoding": "base64_encoded_encoding"
  }'
```

### Create a channel

```bash
curl -X POST http://localhost:8080/api/v1/channel \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "your_team_id",
    "peer": "peer_identifier",
    "label": "your_label"
  }'
```

### Send data on a channel

```bash
curl -X POST http://localhost:8080/api/v1/channel/data \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "your_channel_id",
    "data": "your_data"
  }'
``` 