// Base URL for API calls
const API_BASE_URL = '/api';

// Toast notification system
const toast = document.getElementById('toast');

// State storage for persistence between page loads
const STATE_KEYS = {
    TEAMS: 'aranya_teams',
    SYNC_PEERS: 'aranya_sync_peers'
};

// State management functions
function saveTeams(teams) {
    localStorage.setItem(STATE_KEYS.TEAMS, JSON.stringify(teams));
}

// Clear all stored state data
function clearAllStoredState() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear all saved teams and sync peers? This action cannot be undone.')) {
        return; // User cancelled
    }
    
    localStorage.removeItem(STATE_KEYS.TEAMS);
    localStorage.removeItem(STATE_KEYS.SYNC_PEERS);
    
    // Update UI after clearing
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    showToast('All state data cleared successfully');
}

// Reload state from localStorage and update UI
function reloadState() {
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    showToast('State data reloaded successfully');
}

function getTeams() {
    const teamsJson = localStorage.getItem(STATE_KEYS.TEAMS);
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
    localStorage.setItem(STATE_KEYS.SYNC_PEERS, JSON.stringify(peers));
}

function getSyncPeers() {
    const peersJson = localStorage.getItem(STATE_KEYS.SYNC_PEERS);
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
        
        return true;
    } catch (error) {
        const apiHealth = document.getElementById('api-health');
        if (apiHealth) {
            apiHealth.textContent = 'Offline';
        }
        return false;
    }
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Hide all tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to clicked tab
                button.classList.add('active');
                
                // Show corresponding tab content
                const tabId = button.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // Check API health on page load
    checkHealth();
    
    // Load and display saved teams and sync peers
    updateTeamDisplays();
    updateSyncPeerDisplays();
    
    // Create state management buttons
    createStateManagementButtons();
    
    // Create global event listener for localStorage changes
    window.addEventListener('storage', (event) => {
        // When localStorage changes in another tab/window, update our displays
        if (event.key === STATE_KEYS.TEAMS) {
            updateTeamDisplays();
        } else if (event.key === STATE_KEYS.SYNC_PEERS) {
            updateSyncPeerDisplays();
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