// Dashboard specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Dashboard elements
    const aranyaAddress = document.getElementById('aranya-address');
    const afcAddress = document.getElementById('afc-address');
    const deviceId = document.getElementById('device-id');
    const viewKeysBtn = document.getElementById('view-keys-btn');
    const keyBundle = document.getElementById('key-bundle');
    const identityKey = document.getElementById('identity-key');
    const signingKey = document.getElementById('signing-key');
    const encryptionKey = document.getElementById('encryption-key');
    const refreshStatusBtn = document.getElementById('refresh-status-btn');
    const activityLog = document.getElementById('activity-log');
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Get Aranya address
            const addressData = await fetchWithErrorHandling(`${API_BASE_URL}/v1/address`);
            aranyaAddress.textContent = addressData.address;
            
            // Get AFC address
            const afcAddressData = await fetchWithErrorHandling(`${API_BASE_URL}/v1/afc/address`);
            afcAddress.textContent = afcAddressData.address;
            
            // Get device ID and format it with our new function
            const deviceIdData = await fetchWithErrorHandling(`${API_BASE_URL}/v1/device/id`);
            formatAndSetupId(deviceIdData.device_id, deviceId);
            
            // Add to activity log
            addActivityLogEntry('Dashboard data refreshed');
            
            showToast('Dashboard updated successfully');
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    // Load key bundle
    async function loadKeyBundle() {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/device/keys`);
            identityKey.textContent = data.identity;
            signingKey.textContent = data.signing;
            encryptionKey.textContent = data.encryption;
            
            addActivityLogEntry('Key bundle loaded');
        } catch (error) {
            identityKey.textContent = 'Failed to load';
            signingKey.textContent = 'Failed to load';
            encryptionKey.textContent = 'Failed to load';
        }
    }
    
    // Add entry to activity log
    function addActivityLogEntry(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'activity-entry';
        entry.innerHTML = `<span class="timestamp">${timestamp}</span> <span class="message">${message}</span>`;
        
        // Check if there's a placeholder message
        if (activityLog.querySelector('p')) {
            activityLog.innerHTML = '';
        }
        
        // Insert at top
        activityLog.insertBefore(entry, activityLog.firstChild);
        
        // Limit to 10 entries
        const entries = activityLog.querySelectorAll('.activity-entry');
        if (entries.length > 10) {
            activityLog.removeChild(entries[entries.length - 1]);
        }
    }
    
    // Copy to clipboard functionality
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-copy-target');
            const textToCopy = document.getElementById(targetId).textContent;
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    showToast('Copied to clipboard!');
                    addActivityLogEntry('Key copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast('Failed to copy text', true);
                });
        });
    });
    
    // Event: Toggle key bundle visibility
    viewKeysBtn.addEventListener('click', () => {
        keyBundle.classList.toggle('hidden');
        viewKeysBtn.textContent = keyBundle.classList.contains('hidden') 
            ? 'View Key Bundle' 
            : 'Hide Key Bundle';
        
        if (!keyBundle.classList.contains('hidden') && identityKey.textContent === 'Loading...') {
            loadKeyBundle();
        }
    });
    
    // Event: Refresh status button
    refreshStatusBtn.addEventListener('click', async () => {
        await checkHealth();
        await loadDashboardData();
    });
    
    // Load initial data
    await loadDashboardData();
}); 