// Base URL for API calls
const API_BASE_URL = '/api';

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const apiHealth = document.getElementById('api-health');
const aranyaAddress = document.getElementById('aranya-address');
const afcAddress = document.getElementById('afc-address');
const deviceId = document.getElementById('device-id');
const viewKeysBtn = document.getElementById('view-keys-btn');
const keyBundle = document.getElementById('key-bundle');
const identityKey = document.getElementById('identity-key');
const signingKey = document.getElementById('signing-key');
const encryptionKey = document.getElementById('encryption-key');
const toast = document.getElementById('toast');

// Navigation Links
const navLinks = document.querySelectorAll('.nav-link');

// Forms
const createTeamBtn = document.getElementById('create-team-btn');
const newTeamResult = document.getElementById('new-team-result');
const addTeamForm = document.getElementById('add-team-form');
const addTeamResult = document.getElementById('add-team-result');
const closeTeamForm = document.getElementById('close-team-form');
const addDeviceForm = document.getElementById('add-device-form');
const removeDeviceForm = document.getElementById('remove-device-form');
const assignRoleForm = document.getElementById('assign-role-form');
const assignRoleBtn = document.getElementById('assign-role-btn');
const revokeRoleBtn = document.getElementById('revoke-role-btn');
const addSyncPeerForm = document.getElementById('add-sync-peer-form');
const removeSyncPeerForm = document.getElementById('remove-sync-peer-form');
const netIdentifierForm = document.getElementById('net-identifier-form');
const assignNetIdBtn = document.getElementById('assign-net-id-btn');
const removeNetIdBtn = document.getElementById('remove-net-id-btn');
const createChannelForm = document.getElementById('create-channel-form');
const createChannelResult = document.getElementById('create-channel-result');
const deleteChannelForm = document.getElementById('delete-channel-form');
const sendDataForm = document.getElementById('send-data-form');
const pollMessagesBtn = document.getElementById('poll-messages-btn');
const pollResult = document.getElementById('poll-result');

// Helper Functions
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.remove('hidden', 'error');
    if (isError) {
        toast.classList.add('error');
    }
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function handleApiError(error) {
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.message) {
        errorMessage = error.message;
    }
    
    showToast(errorMessage, true);
    connectionStatus.textContent = 'Error connecting to API';
}

async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

// Set active navigation link
function setActiveSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the active section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // Update navigation links
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });
}

// API Functions
async function checkHealth() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/v1/health`);
        apiHealth.textContent = data.message || 'OK';
        connectionStatus.textContent = 'Connected';
        return true;
    } catch (error) {
        apiHealth.textContent = 'Offline';
        return false;
    }
}

async function getAddress() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/v1/address`);
        aranyaAddress.textContent = data.address;
    } catch (error) {
        aranyaAddress.textContent = 'Failed to load';
    }
}

async function getAfcAddress() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/v1/afc/address`);
        afcAddress.textContent = data.address;
    } catch (error) {
        afcAddress.textContent = 'Failed to load';
    }
}

async function getDeviceId() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/v1/device/id`);
        deviceId.textContent = data.device_id;
    } catch (error) {
        deviceId.textContent = 'Failed to load';
    }
}

async function getKeyBundle() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/device/keys`);
        identityKey.textContent = data.identity;
        signingKey.textContent = data.signing;
        encryptionKey.textContent = data.encryption;
        return data;
    } catch (error) {
        identityKey.textContent = 'Failed to load';
        signingKey.textContent = 'Failed to load';
        encryptionKey.textContent = 'Failed to load';
        throw error;
    }
}

async function createTeam() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        newTeamResult.classList.remove('hidden');
        newTeamResult.textContent = `Team created with ID: ${data.team_id}`;
        showToast('Team created successfully');
    } catch (error) {
        newTeamResult.classList.remove('hidden');
        newTeamResult.textContent = `Failed to create team: ${error.message}`;
    }
}

async function addTeam(teamId) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ team_id: teamId })
        });
        
        addTeamResult.classList.remove('hidden');
        addTeamResult.textContent = data.message;
        showToast('Team added successfully');
    } catch (error) {
        addTeamResult.classList.remove('hidden');
        addTeamResult.textContent = `Failed to add team: ${error.message}`;
    }
}

async function closeTeam(teamId) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}`, {
            method: 'DELETE'
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function addDeviceToTeam(teamId, identity, signing, encryption) {
    try {
        const response = await fetchWithErrorHandling(`${API_BASE_URL}/team/device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_id: teamId,
                identity,
                signing,
                encryption
            })
        });
        return response;
    } catch (error) {
        throw error;
    }
}

async function removeDeviceFromTeam(teamId, deviceId) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}`, {
            method: 'DELETE'
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function assignRole(teamId, deviceId, role) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/role/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                device_id: deviceId,
                role
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function revokeRole(teamId, deviceId, role) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/role/revoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                device_id: deviceId,
                role
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function addSyncPeer(teamId, addr, intervalSeconds) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/sync/peer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                addr,
                interval_seconds: intervalSeconds
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function removeSyncPeer(teamId, addr) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/sync/peer`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                addr
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function assignNetIdentifier(teamId, deviceId, netIdentifier) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/net-identifier/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                device_id: deviceId,
                net_identifier: netIdentifier
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function removeNetIdentifier(teamId, deviceId, netIdentifier) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/net-identifier/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                device_id: deviceId,
                net_identifier: netIdentifier
            })
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function createChannel(teamId, peer, label) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/channel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                team_id: teamId,
                peer,
                label
            })
        });
        
        createChannelResult.classList.remove('hidden');
        createChannelResult.textContent = `Channel created with ID: ${data.afc_id}`;
        showToast('Channel created successfully');
    } catch (error) {
        createChannelResult.classList.remove('hidden');
        createChannelResult.textContent = `Failed to create channel: ${error.message}`;
    }
}

async function deleteChannel(channelId) {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/channel/${channelId}`, {
            method: 'DELETE'
        });
        
        showToast(data.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function sendData(channelId, data) {
    try {
        const response = await fetchWithErrorHandling(`${API_BASE_URL}/channel/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: channelId,
                data
            })
        });
        
        showToast(response.message);
    } catch (error) {
        // Error already handled in fetchWithErrorHandling
    }
}

async function pollMessages() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/channel/poll`);
        
        pollResult.classList.remove('hidden');
        pollResult.textContent = data.message;
        showToast('Messages polled successfully');
    } catch (error) {
        pollResult.classList.remove('hidden');
        pollResult.textContent = `Failed to poll messages: ${error.message}`;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Check health and load initial data
    const isHealthy = await checkHealth();
    
    if (isHealthy) {
        // Load dashboard data
        getAddress();
        getAfcAddress();
        getDeviceId();
        
        // Also pre-load the key bundle data but keep it hidden
        getKeyBundle();
    }
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            setActiveSection(section);
        });
    });
    
    // View keys button
    viewKeysBtn.addEventListener('click', () => {
        keyBundle.classList.toggle('hidden');
        viewKeysBtn.textContent = keyBundle.classList.contains('hidden') 
            ? 'View Key Bundle' 
            : 'Hide Key Bundle';
    });
    
    // Team operations
    createTeamBtn.addEventListener('click', createTeam);
    
    addTeamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('team-id').value;
        addTeam(teamId);
    });
    
    closeTeamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('close-team-id').value;
        closeTeam(teamId);
    });
    
    // Device operations
    addDeviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teamId = document.getElementById('team-select').value;
        const identity = document.getElementById('device-identity-key').value;
        const signing = document.getElementById('device-signing-key').value;
        const encryption = document.getElementById('device-encryption-key').value;
        
        addDeviceToTeam(teamId, identity, signing, encryption);
    });
    
    removeDeviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('remove-device-team-id').value;
        const deviceId = document.getElementById('remove-device-id').value;
        
        removeDeviceFromTeam(teamId, deviceId);
    });
    
    // Role management
    assignRoleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // This prevents the form from submitting through its default behavior
    });
    
    assignRoleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('role-team-id').value;
        const deviceId = document.getElementById('role-device-id').value;
        const role = document.getElementById('role-select').value;
        
        assignRole(teamId, deviceId, role);
    });
    
    revokeRoleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('role-team-id').value;
        const deviceId = document.getElementById('role-device-id').value;
        const role = document.getElementById('role-select').value;
        
        revokeRole(teamId, deviceId, role);
    });
    
    // Sync peer operations
    addSyncPeerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('sync-team-id').value;
        const addr = document.getElementById('sync-peer-addr').value;
        const intervalSeconds = parseInt(document.getElementById('sync-interval').value, 10);
        
        addSyncPeer(teamId, addr, intervalSeconds);
    });
    
    removeSyncPeerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('remove-sync-team-id').value;
        const addr = document.getElementById('remove-sync-peer-addr').value;
        
        removeSyncPeer(teamId, addr);
    });
    
    // Net identifier operations
    netIdentifierForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // This prevents the form from submitting through its default behavior
    });
    
    assignNetIdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('net-id-team-id').value;
        const deviceId = document.getElementById('net-id-device-id').value;
        const netIdentifier = document.getElementById('net-identifier').value;
        
        assignNetIdentifier(teamId, deviceId, netIdentifier);
    });
    
    removeNetIdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('net-id-team-id').value;
        const deviceId = document.getElementById('net-id-device-id').value;
        const netIdentifier = document.getElementById('net-identifier').value;
        
        removeNetIdentifier(teamId, deviceId, netIdentifier);
    });
    
    // Channel operations
    createChannelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('channel-team-id').value;
        const peer = document.getElementById('channel-peer').value;
        const label = document.getElementById('channel-label').value;
        
        createChannel(teamId, peer, label);
    });
    
    deleteChannelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const channelId = document.getElementById('delete-channel-id').value;
        
        deleteChannel(channelId);
    });
    
    sendDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const channelId = document.getElementById('send-channel-id').value;
        const data = document.getElementById('send-data').value;
        
        sendData(channelId, data);
    });
    
    pollMessagesBtn.addEventListener('click', () => {
        pollMessages();
    });
}); 