// Networking page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Networking elements
    const addSyncPeerForm = document.getElementById('add-sync-peer-form');
    const addPeerResult = document.getElementById('add-peer-result');
    const removeSyncPeerForm = document.getElementById('remove-sync-peer-form');
    const removePeerResult = document.getElementById('remove-peer-result');
    const syncPeerList = document.getElementById('sync-peer-list');
    
    const netIdentifierForm = document.getElementById('net-identifier-form');
    const netIdResult = document.getElementById('net-id-result');
    const assignNetIdBtn = document.getElementById('assign-net-id-btn');
    const removeNetIdBtn = document.getElementById('remove-net-id-btn');
    const netIdList = document.getElementById('net-id-list');
    
    // Add sync peer
    async function addSyncPeer(teamId, peerAddr, intervalSeconds) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/sync/peer/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    addr: peerAddr,
                    interval_seconds: parseInt(intervalSeconds)
                })
            });
            
            addPeerResult.classList.remove('hidden');
            addPeerResult.textContent = data.message || 'Sync peer added successfully';
            showToast('Sync peer added successfully');
            
            // Refresh sync peer list
            loadSyncPeers();
        } catch (error) {
            addPeerResult.classList.remove('hidden');
            addPeerResult.textContent = `Failed to add sync peer: ${error.message}`;
        }
    }
    
    // Remove sync peer
    async function removeSyncPeer(teamId, peerAddr) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/sync/peer/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    addr: peerAddr
                })
            });
            
            removePeerResult.classList.remove('hidden');
            removePeerResult.textContent = data.message || 'Sync peer removed successfully';
            showToast('Sync peer removed successfully');
            
            // Refresh sync peer list
            loadSyncPeers();
        } catch (error) {
            removePeerResult.classList.remove('hidden');
            removePeerResult.textContent = `Failed to remove sync peer: ${error.message}`;
        }
    }
    
    // Assign network identifier
    async function assignNetId(teamId, deviceId, netId) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}/net_id/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    net_id: netId
                })
            });
            
            netIdResult.classList.remove('hidden');
            netIdResult.textContent = data.message || 'Network identifier assigned successfully';
            showToast('Network identifier assigned successfully');
            
            // Refresh network identifier list
            loadNetIds();
        } catch (error) {
            netIdResult.classList.remove('hidden');
            netIdResult.textContent = `Failed to assign network identifier: ${error.message}`;
        }
    }
    
    // Remove network identifier
    async function removeNetId(teamId, deviceId, netId) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/device/${deviceId}/net_id/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    net_id: netId
                })
            });
            
            netIdResult.classList.remove('hidden');
            netIdResult.textContent = data.message || 'Network identifier removed successfully';
            showToast('Network identifier removed successfully');
            
            // Refresh network identifier list
            loadNetIds();
        } catch (error) {
            netIdResult.classList.remove('hidden');
            netIdResult.textContent = `Failed to remove network identifier: ${error.message}`;
        }
    }
    
    // Load sync peers
    async function loadSyncPeers() {
        try {
            // Simulated data for demo - replace with actual API call
            const demoSyncPeers = [];
            
            // Update the sync peer list UI
            if (demoSyncPeers.length === 0) {
                syncPeerList.innerHTML = '<p>No sync peers configured</p>';
                return;
            }
            
            let peerListHtml = '<ul class="peer-list">';
            demoSyncPeers.forEach(peer => {
                peerListHtml += `
                    <li class="peer-item">
                        <div class="peer-info">
                            <strong>Team ID:</strong> ${peer.team_id}<br>
                            <strong>Peer Address:</strong> ${peer.addr}<br>
                            <strong>Sync Interval:</strong> ${peer.interval_seconds} seconds
                        </div>
                    </li>
                `;
            });
            peerListHtml += '</ul>';
            
            syncPeerList.innerHTML = peerListHtml;
        } catch (error) {
            syncPeerList.innerHTML = `<p>Error loading sync peers: ${error.message}</p>`;
        }
    }
    
    // Load network identifiers
    async function loadNetIds() {
        try {
            // Simulated data for demo - replace with actual API call
            const demoNetIds = [];
            
            // Update the network identifier list UI
            if (demoNetIds.length === 0) {
                netIdList.innerHTML = '<p>No network identifiers configured</p>';
                return;
            }
            
            let netIdListHtml = '<ul class="net-id-list">';
            demoNetIds.forEach(item => {
                netIdListHtml += `
                    <li class="net-id-item">
                        <div class="net-id-info">
                            <strong>Team ID:</strong> ${item.team_id}<br>
                            <strong>Device ID:</strong> ${item.device_id}<br>
                            <strong>Network ID:</strong> ${item.net_id}
                        </div>
                    </li>
                `;
            });
            netIdListHtml += '</ul>';
            
            netIdList.innerHTML = netIdListHtml;
        } catch (error) {
            netIdList.innerHTML = `<p>Error loading network identifiers: ${error.message}</p>`;
        }
    }
    
    // Event: Add sync peer form submit
    addSyncPeerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('sync-team-id').value;
        const peerAddr = document.getElementById('sync-peer-addr').value;
        const intervalSeconds = document.getElementById('sync-interval').value;
        
        if (!teamId || !peerAddr) {
            showToast('Please enter both team ID and peer address', true);
            return;
        }
        
        addSyncPeer(teamId, peerAddr, intervalSeconds);
    });
    
    // Event: Remove sync peer form submit
    removeSyncPeerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('remove-sync-team-id').value;
        const peerAddr = document.getElementById('remove-sync-peer-addr').value;
        
        if (!teamId || !peerAddr) {
            showToast('Please enter both team ID and peer address', true);
            return;
        }
        
        removeSyncPeer(teamId, peerAddr);
    });
    
    // Event: Assign network identifier button click
    assignNetIdBtn.addEventListener('click', () => {
        const teamId = document.getElementById('net-id-team-id').value;
        const deviceId = document.getElementById('net-id-device-id').value;
        const netId = document.getElementById('net-identifier').value;
        
        if (!teamId || !deviceId || !netId) {
            showToast('Please fill in all fields', true);
            return;
        }
        
        assignNetId(teamId, deviceId, netId);
    });
    
    // Event: Remove network identifier button click
    removeNetIdBtn.addEventListener('click', () => {
        const teamId = document.getElementById('net-id-team-id').value;
        const deviceId = document.getElementById('net-id-device-id').value;
        const netId = document.getElementById('net-identifier').value;
        
        if (!teamId || !deviceId || !netId) {
            showToast('Please fill in all fields', true);
            return;
        }
        
        removeNetId(teamId, deviceId, netId);
    });
    
    // Format network IDs on page load
    formatNetworkIds();
    
    // Initial load
    loadSyncPeers();
    loadNetIds();
});

function formatNetworkIds() {
    // Find all elements that contain network IDs and apply the formatter
    const networkIdElements = document.querySelectorAll('.network-id');
    networkIdElements.forEach(element => {
        if (element.dataset.fullId === undefined) {
            const fullId = element.textContent.trim();
            formatAndSetupId(fullId, element);
        }
    });
} 