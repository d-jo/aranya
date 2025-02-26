// Settings page specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Display current API connection
    displayCurrentApiConnection();
    
    // Setup API connection test
    const testButton = document.getElementById('test-connection');
    if (testButton) {
        testButton.addEventListener('click', testApiConnection);
    }
    
    // Setup API endpoints tab
    initializeApiEndpointsList();
    
    // Setup add endpoint form
    const addEndpointForm = document.getElementById('add-endpoint-form');
    if (addEndpointForm) {
        addEndpointForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addEndpoint();
        });
    }
    
    // Display current API storage info
    displayCurrentApiStorageInfo();
    
    // Setup local storage buttons
    setupStorageButtons();
});

function displayCurrentApiConnection() {
    const config = getConfig();
    const connectedTo = document.getElementById('api-connected-to');
    const apiUrl = document.getElementById('api-url');
    const connectionStatus = document.getElementById('connection-status');
    const apiConnectionStatus = document.getElementById('api-connection-status');
    
    if (connectedTo) {
        connectedTo.textContent = config.apiName || 'Default';
    }
    
    if (apiUrl) {
        apiUrl.textContent = config.apiUrl || 'http://127.0.0.1:8000';
    }
    
    // Update the status based on the connection check
    checkHealth().then(connected => {
        if (apiConnectionStatus) {
            apiConnectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
            apiConnectionStatus.className = connected ? 'connected' : 'disconnected';
        }
    });
}

async function testApiConnection() {
    const result = await checkHealth();
    
    const apiConnectionStatus = document.getElementById('api-connection-status');
    if (apiConnectionStatus) {
        apiConnectionStatus.textContent = result ? 'Connected' : 'Failed to connect';
        apiConnectionStatus.className = result ? 'connected' : 'disconnected';
    }
    
    showToast(result ? 'Successfully connected to API' : 'Failed to connect to API', !result);
}

function displayCurrentApiStorageInfo() {
    const storageInfo = document.getElementById('current-api-storage-info');
    if (!storageInfo) return;
    
    const config = getConfig();
    const currentApiId = config.apiEndpointId || 'default';
    const statsData = getApiStorageStats(currentApiId);
    
    // Clear the container
    storageInfo.innerHTML = '';
    
    // Create a formatted display of storage stats
    const statsElement = document.createElement('div');
    statsElement.className = 'storage-stats-content';
    
    const apiNameElement = document.createElement('h5');
    apiNameElement.textContent = config.apiName || 'Default API';
    statsElement.appendChild(apiNameElement);
    
    // Teams info
    const teamsElement = document.createElement('div');
    teamsElement.className = 'stat-item';
    teamsElement.innerHTML = `
        <span class="stat-label">Teams:</span>
        <span class="stat-value">${statsData.teams}</span>
    `;
    statsElement.appendChild(teamsElement);
    
    // Sync peers info
    const peersElement = document.createElement('div');
    peersElement.className = 'stat-item';
    peersElement.innerHTML = `
        <span class="stat-label">Sync Peers:</span>
        <span class="stat-value">${statsData.syncPeers}</span>
    `;
    statsElement.appendChild(peersElement);
    
    storageInfo.appendChild(statsElement);
}

function initializeApiEndpointsList() {
    const endpointsTable = document.getElementById('api-endpoints-table');
    if (!endpointsTable) return;
    
    const endpoints = getApiEndpoints();
    const tbody = endpointsTable.querySelector('tbody') || endpointsTable;
    tbody.innerHTML = '';
    
    // Get current active endpoint ID
    const config = getConfig();
    const activeEndpointId = config.apiEndpointId || 'default';
    
    endpoints.forEach(endpoint => {
        const row = document.createElement('tr');
        
        // Name column (with default indicator)
        const nameCell = document.createElement('td');
        nameCell.textContent = endpoint.name;
        if (endpoint.isDefault) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'badge';
            defaultBadge.textContent = 'Default';
            nameCell.appendChild(document.createTextNode(' '));
            nameCell.appendChild(defaultBadge);
        }
        row.appendChild(nameCell);
        
        // URL column
        const urlCell = document.createElement('td');
        urlCell.textContent = endpoint.url;
        row.appendChild(urlCell);
        
        // Status column - show active if this is the current endpoint
        const statusCell = document.createElement('td');
        if (endpoint.id === activeEndpointId) {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'badge connected';
            statusBadge.textContent = 'Connected';
            statusCell.appendChild(statusBadge);
            
            // Add data info for the current endpoint
            const dataInfo = getApiStorageStats(endpoint.id);
            if (dataInfo.teams > 0 || dataInfo.syncPeers > 0) {
                const dataBadge = document.createElement('span');
                dataBadge.className = 'badge info';
                dataBadge.textContent = `${dataInfo.teams} Teams, ${dataInfo.syncPeers} Peers`;
                statusCell.appendChild(document.createTextNode(' '));
                statusCell.appendChild(dataBadge);
            }
        } else {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'badge inactive';
            statusBadge.textContent = 'Inactive';
            statusCell.appendChild(statusBadge);
            
            // Add data info for inactive endpoints too
            const dataInfo = getApiStorageStats(endpoint.id);
            if (dataInfo.teams > 0 || dataInfo.syncPeers > 0) {
                const dataBadge = document.createElement('span');
                dataBadge.className = 'badge info small';
                dataBadge.textContent = `${dataInfo.teams} Teams, ${dataInfo.syncPeers} Peers`;
                statusCell.appendChild(document.createTextNode(' '));
                statusCell.appendChild(dataBadge);
            }
        }
        row.appendChild(statusCell);
        
        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions';
        
        // Connect button
        if (endpoint.id !== activeEndpointId) {
            const connectBtn = document.createElement('button');
            connectBtn.className = 'button small-button primary-button';
            connectBtn.textContent = 'Connect';
            connectBtn.addEventListener('click', () => selectEndpoint(endpoint.id));
            actionsCell.appendChild(connectBtn);
        }
        
        // Delete button (only for non-default endpoints)
        if (!endpoint.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'button small-button danger-button';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => removeEndpoint(endpoint.id));
            actionsCell.appendChild(deleteBtn);
        }
        
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
}

// Helper function to get storage stats for a specific API endpoint
function getApiStorageStats(endpointId) {
    // Count teams for this endpoint
    const teamsKey = `${STATE_KEYS.TEAMS}_${endpointId}`;
    const teamsJson = localStorage.getItem(teamsKey);
    const teams = teamsJson ? JSON.parse(teamsJson).length : 0;
    
    // Count sync peers for this endpoint
    const syncPeersKey = `${STATE_KEYS.SYNC_PEERS}_${endpointId}`;
    const syncPeersJson = localStorage.getItem(syncPeersKey);
    const syncPeers = syncPeersJson ? JSON.parse(syncPeersJson).length : 0;
    
    return { teams, syncPeers };
}

function selectEndpoint(endpointId) {
    if (setActiveApiEndpoint(endpointId)) {
        showToast('API endpoint changed successfully');
        // Reload the page to apply the new endpoint
        window.apiEndpointChanged = true;
        window.location.reload();
    } else {
        showToast('Failed to change API endpoint', true);
    }
}

function removeEndpoint(endpointId) {
    if (confirm('Are you sure you want to remove this API endpoint?')) {
        if (removeApiEndpoint(endpointId)) {
            showToast('API endpoint removed successfully');
            initializeApiEndpointsList();
            displayCurrentApiConnection();
            displayCurrentApiStorageInfo();
        } else {
            showToast('Failed to remove API endpoint', true);
        }
    }
}

function addEndpoint() {
    const nameInput = document.getElementById('endpoint-name');
    const urlInput = document.getElementById('endpoint-url');
    
    if (!nameInput || !urlInput) return;
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    
    // Validate inputs
    if (!name) {
        showToast('Please enter a name for the endpoint', true);
        return;
    }
    
    if (!url) {
        showToast('Please enter a URL for the endpoint', true);
        return;
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }
    
    try {
        // Validate URL format
        new URL(url);
        
        // Add the endpoint
        const id = addApiEndpoint(name, url);
        
        // Clear the form
        nameInput.value = '';
        urlInput.value = '';
        
        // Ask if user wants to connect to the new endpoint
        if (confirm('Endpoint added successfully. Do you want to connect to this endpoint now?')) {
            selectEndpoint(id);
        } else {
            // Just refresh the list
            initializeApiEndpointsList();
            displayCurrentApiStorageInfo();
        }
        
        showToast('API endpoint added successfully');
    } catch (error) {
        showToast('Invalid URL format', true);
    }
}

function setupStorageButtons() {
    // Local storage management elements
    const clearStorageBtn = document.getElementById('clear-storage-btn');
    const reloadStorageBtn = document.getElementById('reload-storage-btn');
    
    // Add a new button for clearing all API endpoint data
    const storageButtonGroup = document.querySelector('.button-group');
    if (storageButtonGroup) {
        const clearAllApisBtn = document.createElement('button');
        clearAllApisBtn.id = 'clear-all-apis-btn';
        clearAllApisBtn.className = 'button danger';
        clearAllApisBtn.textContent = 'Clear Data for ALL APIs';
        storageButtonGroup.appendChild(clearAllApisBtn);
        
        // Event handler for the new button
        clearAllApisBtn.addEventListener('click', () => {
            clearAllStoredStateForAllApis();
            initializeApiEndpointsList(); // Refresh the list to show updated counts
            displayCurrentApiStorageInfo();
        });
    }
    
    // Event: Clear Storage button click
    if (clearStorageBtn) {
        clearStorageBtn.textContent = 'Clear Data for Current API';
        clearStorageBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all stored data for the current API endpoint? This will not affect other API endpoints.')) {
                clearAllStoredState();
                // Show updated storage info
                initializeApiEndpointsList();
                displayCurrentApiStorageInfo();
                showToast('All stored data has been cleared for the current API endpoint');
            }
        });
    }
    
    // Event: Reload Storage button click
    if (reloadStorageBtn) {
        reloadStorageBtn.addEventListener('click', () => {
            reloadState();
            displayCurrentApiConnection();
            initializeApiEndpointsList();
            displayCurrentApiStorageInfo();
        });
    }
}

// Setup tab switching for the settings page tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
}); 