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
    const copyFullBundleBtn = document.getElementById('copy-full-bundle-btn');
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
            
            // Store the full data for later use
            keyBundle.dataset.fullBundle = JSON.stringify(data);
            
            // Handle the new response format with nested keys object
            if (data.keys) {
                identityKey.textContent = data.keys.identity;
                signingKey.textContent = data.keys.signing;
                encryptionKey.textContent = data.keys.encryption;
            } else {
                // Fallback for legacy API format
                identityKey.textContent = data.identity || 'Not available';
                signingKey.textContent = data.signing || 'Not available';
                encryptionKey.textContent = data.encryption || 'Not available';
            }
            
            addActivityLogEntry('Key bundle loaded');
        } catch (error) {
            identityKey.textContent = 'Failed to load';
            signingKey.textContent = 'Failed to load';
            encryptionKey.textContent = 'Failed to load';
        }
    }
    
    // Copy the full key bundle
    function copyFullKeyBundle() {
        try {
            // Make sure the keys are loaded
            if (identityKey.textContent === 'Loading...' || 
                identityKey.textContent === 'Failed to load') {
                showToast('Keys not loaded yet', true);
                return;
            }
            
            let bundleData;
            
            // Check if we have the full bundle data from the API
            if (keyBundle.dataset.fullBundle) {
                try {
                    // Use the bundle directly from the API if available
                    bundleData = keyBundle.dataset.fullBundle;
                } catch (parseError) {
                    console.error('Error parsing stored bundle:', parseError);
                    // Fall back to creating our own bundle
                    bundleData = createBundleFromElements();
                }
            } else {
                // Create bundle from the individual elements
                bundleData = createBundleFromElements();
            }
            
            navigator.clipboard.writeText(bundleData)
                .then(() => {
                    showToast('Full key bundle copied to clipboard!');
                    addActivityLogEntry('Full key bundle copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy full key bundle: ', err);
                    showToast('Failed to copy full key bundle', true);
                });
        } catch (error) {
            console.error('Error formatting key bundle:', error);
            showToast('Failed to format key bundle', true);
        }
    }
    
    // Create a bundle from the individual key elements
    function createBundleFromElements() {
        return JSON.stringify({
            type: "aranya_key_bundle",
            keys: {
                identity: identityKey.textContent,
                signing: signingKey.textContent,
                encryption: encryptionKey.textContent
            },
            timestamp: new Date().toISOString()
        }, null, 2);
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
    
    // Event: Copy full bundle button
    copyFullBundleBtn.addEventListener('click', copyFullKeyBundle);
    
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