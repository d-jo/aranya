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
}); 