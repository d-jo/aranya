// Base URL for API calls
const API_BASE_URL = '/api';

// State keys for local storage
const STATE_KEYS = {
    TEAMS: 'aranya_teams',
    SYNC_PEERS: 'aranya_sync_peers',
    CONFIG: 'aranya_config',
    API_ENDPOINTS: 'aranya_api_endpoints'
};

// Default configuration
const DEFAULT_CONFIG = {
    apiUrl: 'http://127.0.0.1:8000',
    apiName: 'Default Local API'
};

// Get current configuration
function getConfig() {
    // Check for URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const apiPort = urlParams.get('api_port');
    const apiEndpoint = urlParams.get('api_endpoint');
    
    // Get stored config
    const configJson = localStorage.getItem(STATE_KEYS.CONFIG);
    let config = configJson ? JSON.parse(configJson) : {...DEFAULT_CONFIG};
    
    // If we haven't initialized the endpoints yet, ensure we store the default one
    let endpoints = getApiEndpoints();
    const hasDefaultEndpoint = endpoints.some(ep => ep.id === 'default');
    
    // Override with URL parameters if available
    if (apiPort && !apiEndpoint) {
        config.apiUrl = `http://127.0.0.1:${apiPort}`;
        config.apiName = `Local API (Port ${apiPort})`;
        config.apiEndpointId = 'default';
        
        // Update default endpoint if needed
        if (hasDefaultEndpoint) {
            endpoints = endpoints.map(ep => {
                if (ep.id === 'default') {
                    return {...ep, url: config.apiUrl};
                }
                return ep;
            });
            saveApiEndpoints(endpoints);
        }
        
        // Save the updated config
        saveConfig(config);
    } else if (apiEndpoint) {
        config.apiUrl = apiEndpoint;
        config.apiName = `Custom API (${new URL(apiEndpoint).hostname})`;
        
        // Try to find if this endpoint already exists
        const existingEndpoint = endpoints.find(ep => ep.url === apiEndpoint);
        if (existingEndpoint) {
            config.apiEndpointId = existingEndpoint.id;
            config.apiName = existingEndpoint.name;
        } else {
            // Add new endpoint
            const id = addApiEndpoint(config.apiName, apiEndpoint);
            config.apiEndpointId = id;
        }
        
        // Save the updated config
        saveConfig(config);
    }
    
    return config;
}

// Save configuration
function saveConfig(config) {
    localStorage.setItem(STATE_KEYS.CONFIG, JSON.stringify(config));
}

// Get current API endpoint ID
function getCurrentApiEndpointId() {
    const config = getConfig();
    return config.apiEndpointId || 'default';
}

// Get storage key for the current API endpoint
function getApiStorageKey(baseKey) {
    const apiId = getCurrentApiEndpointId();
    return `${baseKey}_${apiId}`;
}

// Initialize API dropdown in the header
function initApiNavDropdown() {
    const navItems = document.querySelector('.main-nav ul');
    
    if (!navItems) return; // Navigation not found
    
    // Get current configuration
    const config = getConfig();
    
    // Create API status/dropdown
    const apiNavItem = document.createElement('li');
    apiNavItem.className = 'nav-api-selector';
    
    // Create dropdown container
    const apiDropdown = document.createElement('div');
    apiDropdown.className = 'api-dropdown';
    
    // Format display name and URL
    let displayName = config.apiName || 'API';
    let urlParts = new URL(config.apiUrl);
    let portInfo = urlParts.port ? `:${urlParts.port}` : '';
    let displayUrl = `${urlParts.hostname}${portInfo}`;
    
    // Create the toggle button
    const apiToggle = document.createElement('button');
    apiToggle.className = 'api-toggle';
    apiToggle.innerHTML = `
        <span class="api-name">${displayName}</span>
        <span class="api-url">${displayUrl}</span>
        <span class="api-indicator ${checkApiConnected() ? 'connected' : 'disconnected'}"></span>
        <span class="dropdown-arrow">▼</span>
    `;
    
    // Create dropdown content
    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'api-dropdown-content';
    
    // Add endpoints to dropdown
    const endpoints = getApiEndpoints();
    endpoints.forEach(endpoint => {
        const item = document.createElement('a');
        item.className = endpoint.id === (config.apiEndpointId || 'default') ? 'active' : '';
        
        // Parse URL for better display
        let epUrl = new URL(endpoint.url);
        let epPort = epUrl.port ? `:${epUrl.port}` : '';
        let displayEpUrl = `${epUrl.hostname}${epPort}`;
        
        item.innerHTML = `
            <span>${endpoint.name}</span>
            <small>${displayEpUrl}</small>
        `;
        item.href = '#';
        item.onclick = (e) => {
            e.preventDefault();
            setActiveApiEndpoint(endpoint.id);
            window.apiEndpointChanged = true;
            document.location.reload();
        };
        dropdownContent.appendChild(item);
    });
    
    // Add "Manage endpoints" link
    const manageLink = document.createElement('a');
    manageLink.href = '/settings';
    manageLink.className = 'manage-endpoints';
    manageLink.textContent = 'Manage API Endpoints';
    dropdownContent.appendChild(manageLink);
    
    // Toggle dropdown on click
    apiToggle.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!apiToggle.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('show');
        }
    });
    
    // Assemble all elements
    apiDropdown.appendChild(apiToggle);
    apiDropdown.appendChild(dropdownContent);
    apiNavItem.appendChild(apiDropdown);
    
    // Add to navigation
    navItems.appendChild(apiNavItem);
}

// Check if API is connected
function checkApiConnected() {
    const status = document.getElementById('connection-status');
    return status && status.textContent === 'Connected';
}

// Update API connection status in the nav dropdown
function updateApiNavStatus(connected) {
    const indicator = document.querySelector('.api-indicator');
    if (indicator) {
        indicator.className = `api-indicator ${connected ? 'connected' : 'disconnected'}`;
    }
}

// Update a specific configuration setting
function updateConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    saveConfig(config);
}

// API Endpoints management
function getApiEndpoints() {
    const endpointsJson = localStorage.getItem(STATE_KEYS.API_ENDPOINTS);
    
    // Get the current configuration to determine the default endpoint URL
    const configJson = localStorage.getItem(STATE_KEYS.CONFIG);
    const config = configJson ? JSON.parse(configJson) : null;
    
    // Set default endpoint based on current config if available
    const defaultUrl = (config && config.apiUrl && config.apiUrl.includes('127.0.0.1')) 
        ? config.apiUrl 
        : 'http://127.0.0.1:8000';
        
    const defaultEndpoint = {
        id: 'default',
        name: 'Default Local API',
        url: defaultUrl,
        isDefault: true
    };
    
    if (!endpointsJson) {
        return [defaultEndpoint];
    }
    
    const endpoints = JSON.parse(endpointsJson);
    
    // Update or add the default endpoint
    const defaultIndex = endpoints.findIndex(ep => ep.id === 'default');
    if (defaultIndex >= 0) {
        // Update the default endpoint URL if it's a localhost URL
        if (endpoints[defaultIndex].url.includes('127.0.0.1')) {
            endpoints[defaultIndex].url = defaultUrl;
        }
    } else {
        endpoints.push(defaultEndpoint);
    }
    
    // Save updates back to storage
    saveApiEndpoints(endpoints);
    
    return endpoints;
}

function saveApiEndpoints(endpoints) {
    localStorage.setItem(STATE_KEYS.API_ENDPOINTS, JSON.stringify(endpoints));
}

function addApiEndpoint(name, url) {
    const endpoints = getApiEndpoints();
    const id = 'api_' + Date.now();
    
    endpoints.push({
        id,
        name,
        url,
        isDefault: false,
        dateAdded: new Date().toISOString()
    });
    
    saveApiEndpoints(endpoints);
    return id;
}

function removeApiEndpoint(id) {
    let endpoints = getApiEndpoints();
    // Don't allow removing the default endpoint
    if (id === 'default') {
        return false;
    }
    
    // If we're removing the current API, switch back to default
    const config = getConfig();
    if (config.apiEndpointId === id) {
        updateConfig('apiEndpointId', 'default');
        const defaultEndpoint = endpoints.find(ep => ep.id === 'default');
        if (defaultEndpoint) {
            updateConfig('apiUrl', defaultEndpoint.url);
            updateConfig('apiName', defaultEndpoint.name);
        }
    }
    
    endpoints = endpoints.filter(endpoint => endpoint.id !== id);
    saveApiEndpoints(endpoints);
    return true;
}

function setActiveApiEndpoint(id) {
    const endpoints = getApiEndpoints();
    const endpoint = endpoints.find(ep => ep.id === id);
    
    if (!endpoint) return false;
    
    updateConfig('apiEndpointId', id);
    updateConfig('apiUrl', endpoint.url);
    updateConfig('apiName', endpoint.name);
    
    return true;
}

// Get API URL (for direct API calls that bypass the proxy)
function getDirectApiUrl() {
    const config = getConfig();
    return config.apiUrl;
}

// Toast notification system
const toast = document.getElementById('toast');

// State storage for persistence between page loads
function saveTeams(teams) {
    const key = getApiStorageKey(STATE_KEYS.TEAMS);
    localStorage.setItem(key, JSON.stringify(teams));
}

// Clear all stored state data
function clearAllStoredState() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear all saved teams and sync peers? This action cannot be undone.')) {
        return; // User cancelled
    }
    
    const apiId = getCurrentApiEndpointId();
    localStorage.removeItem(getApiStorageKey(STATE_KEYS.TEAMS));
    localStorage.removeItem(getApiStorageKey(STATE_KEYS.SYNC_PEERS));
    
    // Update UI after clearing
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    showToast('All state data cleared successfully for current API endpoint');
}

// Clear all stored state data for all APIs
function clearAllStoredStateForAllApis() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear ALL saved data for ALL API endpoints? This action cannot be undone.')) {
        return; // User cancelled
    }
    
    // Get all API endpoints
    const endpoints = getApiEndpoints();
    
    // Clear data for each endpoint
    endpoints.forEach(endpoint => {
        localStorage.removeItem(`${STATE_KEYS.TEAMS}_${endpoint.id}`);
        localStorage.removeItem(`${STATE_KEYS.SYNC_PEERS}_${endpoint.id}`);
    });
    
    // Also clear any legacy data (without API ID)
    localStorage.removeItem(STATE_KEYS.TEAMS);
    localStorage.removeItem(STATE_KEYS.SYNC_PEERS);
    
    // Update UI after clearing
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    showToast('All state data cleared successfully for ALL API endpoints');
}

// Reload state from localStorage and update UI
function reloadState() {
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    showToast('State data reloaded successfully');
}

function getTeams() {
    const key = getApiStorageKey(STATE_KEYS.TEAMS);
    const teamsJson = localStorage.getItem(key);
    
    // If no teams found for current API, try legacy storage
    if (!teamsJson) {
        const legacyTeamsJson = localStorage.getItem(STATE_KEYS.TEAMS);
        if (legacyTeamsJson) {
            // Migrate teams to new per-API storage
            const teams = JSON.parse(legacyTeamsJson);
            saveTeams(teams);
            return teams;
        }
    }
    
    return teamsJson ? JSON.parse(teamsJson) : [];
}

function addTeamToStorage(teamId, name = '') {
    const teams = getTeams();
    if (!teams.some(team => team.id === teamId)) {
        teams.push({ id: teamId, name: name || teamId, dateAdded: new Date().toISOString() });
        saveTeams(teams);
    }
}

function removeTeamFromStorage(teamId) {
    const teams = getTeams();
    const filteredTeams = teams.filter(team => team.id !== teamId);
    saveTeams(filteredTeams);
}

function saveSyncPeers(peers) {
    const key = getApiStorageKey(STATE_KEYS.SYNC_PEERS);
    localStorage.setItem(key, JSON.stringify(peers));
}

function getSyncPeers() {
    const key = getApiStorageKey(STATE_KEYS.SYNC_PEERS);
    const peersJson = localStorage.getItem(key);
    
    // If no peers found for current API, try legacy storage
    if (!peersJson) {
        const legacyPeersJson = localStorage.getItem(STATE_KEYS.SYNC_PEERS);
        if (legacyPeersJson) {
            // Migrate peers to new per-API storage
            const peers = JSON.parse(legacyPeersJson);
            saveSyncPeers(peers);
            return peers;
        }
    }
    
    return peersJson ? JSON.parse(peersJson) : [];
}

function addSyncPeerToStorage(teamId, addr, intervalSeconds) {
    const peers = getSyncPeers();
    if (!peers.some(peer => peer.teamId === teamId && peer.addr === addr)) {
        peers.push({ 
            teamId, 
            addr, 
            intervalSeconds, 
            dateAdded: new Date().toISOString() 
        });
        saveSyncPeers(peers);
    }
}

function removeSyncPeerFromStorage(teamId, addr) {
    const peers = getSyncPeers();
    const filteredPeers = peers.filter(peer => !(peer.teamId === teamId && peer.addr === addr));
    saveSyncPeers(filteredPeers);
}

// Create UI for displaying saved teams and sync peers
function createSavedItemsList(containerId, items, itemType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (items.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = `No ${itemType} saved`;
        container.appendChild(emptyMessage);
        return;
    }
    
    const list = document.createElement('ul');
    list.className = 'saved-items-list';
    
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'saved-item';
        
        if (itemType === 'teams') {
            listItem.textContent = `Team: ${item.name || item.id}`;
        } else if (itemType === 'sync peers') {
            listItem.textContent = `Peer: ${item.addr} (Team: ${item.teamId}, Interval: ${item.intervalSeconds}s)`;
        }
        
        list.appendChild(listItem);
    });
    
    container.appendChild(list);
}

// UI Update functions
function updateTeamDisplays() {
    const teams = getTeams();
    createSavedItemsList('saved-teams-list', teams, 'teams');
    
    // Update team dropdowns
    const teamDropdowns = document.querySelectorAll('.team-dropdown');
    teamDropdowns.forEach(dropdown => {
        // Save current selection
        const currentValue = dropdown.value;
        
        // Clear options except the default "Select a team" option
        const defaultOption = dropdown.querySelector('option[value=""]');
        dropdown.innerHTML = '';
        if (defaultOption) {
            dropdown.appendChild(defaultOption);
        } else {
            // Create default option if it doesn't exist
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Select a team";
            dropdown.appendChild(option);
        }
        
        // Add saved teams as options
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name || team.id;
            dropdown.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (currentValue && [...dropdown.options].some(option => option.value === currentValue)) {
            dropdown.value = currentValue;
        }
    });
}

function updateSyncPeerDisplays() {
    const peers = getSyncPeers();
    createSavedItemsList('saved-sync-peers-list', peers, 'sync peers');
}

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

/**
 * Format an ID to show only the first 7 characters with click-to-copy functionality
 * @param {string} id - The full ID to format
 * @param {HTMLElement} element - The element to update with the formatted ID
 */
function formatAndSetupId(id, element) {
    if (!id || !element) return;
    
    // Store the full ID as a data attribute
    element.dataset.fullId = id;
    
    // Show only the first 7 characters
    const shortId = id.substring(0, 7);
    element.textContent = shortId;
    
    // Add styling to indicate it's clickable
    element.classList.add('copyable-id');
    element.title = 'Click to copy full ID';
    
    // Add click handler to copy the full ID
    element.addEventListener('click', function() {
        // Copy the full ID to clipboard
        navigator.clipboard.writeText(this.dataset.fullId)
            .then(() => {
                showToast('Full ID copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy ID: ', err);
                showToast('Failed to copy ID', true);
            });
    });
}

function handleApiError(error) {
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.message) {
        errorMessage = error.message;
    }
    
    showToast(errorMessage, true);
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        connectionStatus.textContent = 'Error connecting to API';
    }
}

async function fetchWithErrorHandling(url, options = {}) {
    try {
        // Process URL for API requests
        let processedUrl = url;
        const config = getConfig();
        
        // Only process API calls
        if (url.startsWith(API_BASE_URL)) {
            // Get API path without the /api prefix
            const apiPath = url.substring(API_BASE_URL.length);
            
            // Construct the proxy URL with the api_endpoint parameter
            const separator = url.includes('?') ? '&' : '?';
            processedUrl = `${url}${separator}api_endpoint=${encodeURIComponent(config.apiUrl)}`;
        }
        
        const response = await fetch(processedUrl, options);
        
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

// Common API Functions
async function checkHealth() {
    try {
        const data = await fetchWithErrorHandling(`${API_BASE_URL}/v1/health`);
        const apiHealth = document.getElementById('api-health');
        const connectionStatus = document.getElementById('connection-status');
        
        if (apiHealth) {
            apiHealth.textContent = data.message || 'OK';
        }
        
        if (connectionStatus) {
            connectionStatus.textContent = 'Connected';
        }
        
        // Update API status in nav dropdown
        updateApiNavStatus(true);
        
        return true;
    } catch (error) {
        const apiHealth = document.getElementById('api-health');
        if (apiHealth) {
            apiHealth.textContent = 'Offline';
        }
        
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = 'Error connecting to API';
        }
        
        // Update API status in nav dropdown
        updateApiNavStatus(false);
        
        return false;
    }
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Find which tab content to show
            const tabId = button.dataset.tab;
            
            // Hide all tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show the selected tab content
            const selectedContent = document.getElementById(tabId);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
            
            // Add active class to the clicked button
            button.classList.add('active');
        });
    });
    
    // Ensure we get the latest config at page load
    const config = getConfig();
    
    // Store the current config in memory for change detection
    window.lastKnownConfig = { ...config };
    
    // Initialize API dropdown in the navigation
    initApiNavDropdown();
    
    // Initialize toast system
    document.querySelectorAll('[data-toast]').forEach(element => {
        element.addEventListener('click', () => {
            const message = element.dataset.toast;
            const isError = element.dataset.toastError === 'true';
            showToast(message, isError);
        });
    });
    
    // Check API health immediately on page load
    checkHealth();
    
    // Also periodically check health
    setInterval(checkHealth, 30000); // Check every 30 seconds
    
    // Load and display saved teams and sync peers
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    // Create state management buttons
    createStateManagementButtons();
    
    // If app just loaded after API endpoint change, show a message
    if (window.apiEndpointChanged) {
        const apiName = config.apiName || 'new API';
        showToast(`Switched to ${apiName}. Showing data for this API endpoint.`);
        window.apiEndpointChanged = false;
    }
    
    // Create global event listener for localStorage changes
    window.addEventListener('storage', (event) => {
        // When localStorage changes in another tab/window, update our displays
        const currentApiId = getCurrentApiEndpointId();
        const teamKey = getApiStorageKey(STATE_KEYS.TEAMS);
        const syncPeerKey = getApiStorageKey(STATE_KEYS.SYNC_PEERS);
        
        // Check if the change is for our current API's data
        if (event.key === teamKey || event.key === STATE_KEYS.TEAMS) {
            updateTeamDisplays();
        } else if (event.key === syncPeerKey || event.key === STATE_KEYS.SYNC_PEERS) {
            updateSyncPeerDisplays();
        } else if (event.key.startsWith(`${STATE_KEYS.TEAMS}_`) || event.key.startsWith(`${STATE_KEYS.SYNC_PEERS}_`)) {
            // Another API's data changed, only update if it's the current API
            const keyParts = event.key.split('_');
            const keyApiId = keyParts[keyParts.length - 1];
            
            if (keyApiId === currentApiId) {
                if (event.key.startsWith(`${STATE_KEYS.TEAMS}_`)) {
                    updateTeamDisplays();
                } else {
                    updateSyncPeerDisplays();
                }
            }
        } else if (event.key === STATE_KEYS.CONFIG || event.key === STATE_KEYS.API_ENDPOINTS) {
            // Config or API endpoints changed, might need to refresh displays
            const newConfig = JSON.parse(localStorage.getItem(STATE_KEYS.CONFIG) || '{}');
            const oldConfig = window.lastKnownConfig || {};
            
            // If API endpoint changed, update displays
            if (newConfig.apiEndpointId !== oldConfig.apiEndpointId) {
                // Set page reload flag to ensure UI fully updates with the new API data
                window.apiEndpointChanged = true;
                
                // Store the new config
                window.lastKnownConfig = { ...newConfig };
                
                // Force reload to show the new API's data
                window.location.reload();
            }
        }
    });
});

// Create UI buttons for state management
function createStateManagementButtons() {
    // Check if state management container already exists
    let stateManagementContainer = document.getElementById('state-management-container');
    
    // If it doesn't exist, create it
    if (!stateManagementContainer) {
        stateManagementContainer = document.createElement('div');
        stateManagementContainer.id = 'state-management-container';
        stateManagementContainer.className = 'state-management-container';
        
        // Add a header
        const header = document.createElement('h4');
        header.textContent = 'State Management';
        header.style.margin = '0 0 10px 0';
        header.style.fontSize = '14px';
        header.style.fontWeight = 'bold';
        header.style.color = '#333';
        stateManagementContainer.appendChild(header);
        
        // Create clear state button
        const clearStateBtn = document.createElement('button');
        clearStateBtn.id = 'clear-state-btn';
        clearStateBtn.className = 'button danger-button';
        clearStateBtn.textContent = 'Clear All State';
        clearStateBtn.title = 'Clear all saved teams and sync peers';
        clearStateBtn.addEventListener('click', clearAllStoredState);
        
        // Create reload state button
        const reloadStateBtn = document.createElement('button');
        reloadStateBtn.id = 'reload-state-btn';
        reloadStateBtn.className = 'button primary-button';
        reloadStateBtn.textContent = 'Reload State';
        reloadStateBtn.title = 'Reload teams and sync peers from storage';
        reloadStateBtn.addEventListener('click', reloadState);
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '10px';
        
        // Add buttons to container
        buttonsContainer.appendChild(clearStateBtn);
        buttonsContainer.appendChild(reloadStateBtn);
        stateManagementContainer.appendChild(buttonsContainer);
        
        // Add container to page - first try to add it to a common location
        const commonLocations = [
            'page-controls',
            'main-controls',
            'control-panel',
            'footer'
        ];
        
        let added = false;
        for (const location of commonLocations) {
            const container = document.getElementById(location);
            if (container) {
                container.appendChild(stateManagementContainer);
                added = true;
                break;
            }
        }
        
        // If no common location found, add to the bottom of the body
        if (!added) {
            // Create a fixed position container at the bottom of the page
            const fixedContainer = document.createElement('div');
            fixedContainer.style.position = 'fixed';
            fixedContainer.style.bottom = '20px';
            fixedContainer.style.right = '20px';
            fixedContainer.style.zIndex = '1000';
            fixedContainer.style.padding = '15px';
            fixedContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            fixedContainer.style.borderRadius = '8px';
            fixedContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            fixedContainer.style.border = '1px solid #e0e0e0';
            
            fixedContainer.appendChild(stateManagementContainer);
            document.body.appendChild(fixedContainer);
        }
    }
} 