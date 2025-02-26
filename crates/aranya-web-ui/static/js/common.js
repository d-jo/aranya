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