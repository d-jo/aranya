// Devices page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Load and populate team dropdowns
    updateTeamDisplays();
    
    // Device elements
    const addDeviceForm = document.getElementById('add-device-form');
    const addDeviceResult = document.getElementById('add-device-result');
    const removeDeviceForm = document.getElementById('remove-device-form');
    const removeDeviceResult = document.getElementById('remove-device-result');
    const assignRoleForm = document.getElementById('assign-role-form');
    const roleResult = document.getElementById('role-result');
    const assignRoleBtn = document.getElementById('assign-role-btn');
    const revokeRoleBtn = document.getElementById('revoke-role-btn');
    
    // Input method toggle elements
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const individualKeysInput = document.getElementById('individual-keys-input');
    const bundleInput = document.getElementById('bundle-input');
    const parseBundleBtn = document.getElementById('parse-bundle-btn');
    const keyBundleJson = document.getElementById('key-bundle-json');
    const identityKeyInput = document.getElementById('device-identity-key');
    const signingKeyInput = document.getElementById('device-signing-key');
    const encryptionKeyInput = document.getElementById('device-encryption-key');
    
    // Toggle between individual keys and bundle input methods
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show/hide the appropriate input section
            const method = button.getAttribute('data-method');
            if (method === 'individual') {
                individualKeysInput.classList.remove('hidden');
                bundleInput.classList.add('hidden');
            } else if (method === 'bundle') {
                individualKeysInput.classList.add('hidden');
                bundleInput.classList.remove('hidden');
            }
        });
    });
    
    // Parse key bundle JSON and fill individual fields
    parseBundleBtn.addEventListener('click', () => {
        try {
            const bundleText = keyBundleJson.value.trim();
            if (!bundleText) {
                showToast('Please paste a key bundle first', true);
                return;
            }
            
            // Check if this is likely a JSON object
            if (!bundleText.startsWith('{') || !bundleText.endsWith('}')) {
                showToast('This doesn\'t appear to be a valid JSON key bundle', true);
                return;
            }
            
            const bundleData = JSON.parse(bundleText);
            
            // Verify this is an Aranya key bundle
            if (bundleData.type !== 'aranya_key_bundle' && 
                !(bundleData.identity || (bundleData.keys && bundleData.keys.identity))) {
                showToast('This doesn\'t appear to be an Aranya key bundle', true);
                return;
            }
            
            // Handle both new format (with keys object) and old format
            if (bundleData.keys) {
                identityKeyInput.value = bundleData.keys.identity || '';
                signingKeyInput.value = bundleData.keys.signing || '';
                encryptionKeyInput.value = bundleData.keys.encryption || '';
            } else {
                identityKeyInput.value = bundleData.identity || '';
                signingKeyInput.value = bundleData.signing || '';
                encryptionKeyInput.value = bundleData.encryption || '';
            }
            
            // If the bundle contains a device ID, display it
            if (bundleData.device_id) {
                addDeviceResult.classList.remove('hidden');
                addDeviceResult.textContent = 'Source device ID: ';
                
                const deviceIdSpan = document.createElement('span');
                deviceIdSpan.className = 'device-id';
                formatAndSetupId(bundleData.device_id, deviceIdSpan);
                
                addDeviceResult.appendChild(deviceIdSpan);
                
                // Also add a note about what this means
                const noteSpan = document.createElement('span');
                noteSpan.className = 'form-help';
                noteSpan.style.display = 'block';
                noteSpan.style.marginTop = '5px';
                noteSpan.textContent = 'This is the source device ID. The newly added device will have a different ID.';
                
                addDeviceResult.appendChild(noteSpan);
            }
            
            // Switch to individual keys view to show the parsed data
            toggleButtons.forEach(btn => {
                if (btn.getAttribute('data-method') === 'individual') {
                    btn.click();
                }
            });
            
            showToast('Key bundle parsed successfully');
            
            // Log this as an activity
            if (typeof addActivityLogEntry === 'function') {
                addActivityLogEntry('Key bundle parsed for device addition');
            }
        } catch (error) {
            console.error('Failed to parse key bundle:', error);
            showToast('Invalid key bundle format', true);
        }
    });
    
    // Keyboard shortcut: Ctrl+V in the bundle input automatically parses
    keyBundleJson.addEventListener('paste', (e) => {
        // Let the paste complete first, then parse
        setTimeout(() => {
            if (keyBundleJson.value.trim()) {
                parseBundleBtn.click();
            }
        }, 100);
    });
    
    // Keyboard shortcut: Ctrl+Enter in the bundle input to parse
    keyBundleJson.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            parseBundleBtn.click();
        }
    });
    
    // Add device to team
    async function addDevice(formData) {
        try {
            const teamId = formData.get('team-id');
            
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/device`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    team_id: teamId,
                    identity: formData.get('identity'),
                    signing: formData.get('signing'),
                    encryption: formData.get('encryption')
                })
            });
            
            addDeviceResult.classList.remove('hidden');
            
            // Format the device ID with the new function
            addDeviceResult.textContent = 'Device added successfully. Device ID: ';
            
            // Create a span for the formatted device ID
            const deviceIdSpan = document.createElement('span');
            deviceIdSpan.className = 'device-id';
            formatAndSetupId(data.device_id, deviceIdSpan);
            
            // Append the formatted device ID
            addDeviceResult.appendChild(deviceIdSpan);
            
            showToast('Device added successfully');
        } catch (error) {
            addDeviceResult.classList.remove('hidden');
            addDeviceResult.textContent = `Failed to add device: ${error.message}`;
        }
    }
    
    // Remove device from team
    async function removeDevice(teamId, deviceId) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}`, {
                method: 'DELETE'
            });
            
            removeDeviceResult.classList.remove('hidden');
            removeDeviceResult.textContent = data.message || 'Device removed successfully';
            showToast('Device removed successfully');
        } catch (error) {
            removeDeviceResult.classList.remove('hidden');
            removeDeviceResult.textContent = `Failed to remove device: ${error.message}`;
        }
    }
    
    // Assign role to device
    async function assignRole(teamId, deviceId, role) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}/role/${role}`, {
                method: 'PUT'
            });
            
            roleResult.classList.remove('hidden');
            roleResult.textContent = data.message || `Role ${role} assigned successfully`;
            showToast(`Role ${role} assigned successfully`);
        } catch (error) {
            roleResult.classList.remove('hidden');
            roleResult.textContent = `Failed to assign role: ${error.message}`;
        }
    }
    
    // Revoke role from device
    async function revokeRole(teamId, deviceId, role) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}/role/${role}`, {
                method: 'DELETE'
            });
            
            roleResult.classList.remove('hidden');
            roleResult.textContent = data.message || `Role ${role} revoked successfully`;
            showToast(`Role ${role} revoked successfully`);
        } catch (error) {
            roleResult.classList.remove('hidden');
            roleResult.textContent = `Failed to revoke role: ${error.message}`;
        }
    }
    
    // Event: Add device form submit
    addDeviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if bundle input is active and not empty
        if (!bundleInput.classList.contains('hidden') && keyBundleJson.value.trim()) {
            // Parse the bundle first
            parseBundleBtn.click();
        }
        
        // Validate required fields
        const teamId = document.getElementById('team-select').value;
        const identity = identityKeyInput.value.trim();
        const signing = signingKeyInput.value.trim();
        const encryption = encryptionKeyInput.value.trim();
        
        if (!teamId) {
            showToast('Please select a team', true);
            return;
        }
        
        if (!identity || !signing || !encryption) {
            showToast('All key fields are required', true);
            return;
        }
        
        const formData = new FormData(addDeviceForm);
        addDevice(formData);
    });
    
    // Event: Remove device form submit
    removeDeviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('remove-device-team-id').value;
        const deviceId = document.getElementById('remove-device-id').value;
        
        if (!teamId || !deviceId) {
            showToast('Please enter both team ID and device ID', true);
            return;
        }
        
        removeDevice(teamId, deviceId);
    });
    
    // Event: Assign role button click
    assignRoleBtn.addEventListener('click', () => {
        const teamId = document.getElementById('role-team-id').value;
        const deviceId = document.getElementById('role-device-id').value;
        const role = document.getElementById('role-select').value;
        
        if (!teamId || !deviceId || !role) {
            showToast('Please fill in all fields', true);
            return;
        }
        
        assignRole(teamId, deviceId, role);
    });
    
    // Event: Revoke role button click
    revokeRoleBtn.addEventListener('click', () => {
        const teamId = document.getElementById('role-team-id').value;
        const deviceId = document.getElementById('role-device-id').value;
        const role = document.getElementById('role-select').value;
        
        if (!teamId || !deviceId || !role) {
            showToast('Please fill in all fields', true);
            return;
        }
        
        revokeRole(teamId, deviceId, role);
    });
    
    // Add a clear fields button to the form
    const addClearButton = () => {
        // Create a button element
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'button secondary clear-fields-btn';
        clearButton.textContent = 'Clear Fields';
        clearButton.style.marginRight = '10px';
        
        // Add click event listener
        clearButton.addEventListener('click', () => {
            // Clear all inputs
            identityKeyInput.value = '';
            signingKeyInput.value = '';
            encryptionKeyInput.value = '';
            keyBundleJson.value = '';
            
            // Clear the result area
            addDeviceResult.classList.add('hidden');
            addDeviceResult.textContent = '';
            
            showToast('Fields cleared');
        });
        
        // Get the submit button
        const submitButton = addDeviceForm.querySelector('button[type="submit"]');
        
        // Insert the clear button before the submit button
        if (submitButton) {
            submitButton.parentNode.insertBefore(clearButton, submitButton);
        }
    };
    
    // Call the function to add the clear button
    addClearButton();
}); 