// Base URL for API calls
const API_BASE_URL = '/api';

// Toast notification system
const toast = document.getElementById('toast');

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
}); 