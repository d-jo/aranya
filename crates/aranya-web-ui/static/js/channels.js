// Channels page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Channel elements
    const channelsContainer = document.getElementById('channels-container');
    const pollMessagesBtn = document.getElementById('poll-messages-btn');
    const pollResult = document.getElementById('poll-result');
    const createChannelForm = document.getElementById('create-channel-form');
    const createChannelResult = document.getElementById('create-channel-result');
    const sendDataForm = document.getElementById('send-data-form');
    const sendDataResult = document.getElementById('send-data-result');
    const deleteChannelForm = document.getElementById('delete-channel-form');
    const deleteChannelResult = document.getElementById('delete-channel-result');
    const channelMessages = document.getElementById('channel-messages');
    const messageList = document.querySelector('.message-list');
    
    // Selected channel for viewing messages
    let selectedChannelId = null;
    
    // Create new channel
    async function createChannel(teamId, peer, label) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}/channel/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    peer: peer,
                    label: label
                })
            });
            
            createChannelResult.classList.remove('hidden');
            createChannelResult.textContent = `Channel created with ID: ${data.channel_id}`;
            showToast('Channel created successfully');
            
            // Update channel list
            loadChannels();
        } catch (error) {
            createChannelResult.classList.remove('hidden');
            createChannelResult.textContent = `Failed to create channel: ${error.message}`;
        }
    }
    
    // Send data through channel
    async function sendData(channelId, data) {
        try {
            const response = await fetchWithErrorHandling(`${API_BASE_URL}/channel/${channelId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data
                })
            });
            
            sendDataResult.classList.remove('hidden');
            sendDataResult.textContent = response.message || 'Data sent successfully';
            showToast('Data sent successfully');
        } catch (error) {
            sendDataResult.classList.remove('hidden');
            sendDataResult.textContent = `Failed to send data: ${error.message}`;
        }
    }
    
    // Delete channel
    async function deleteChannel(channelId) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/channel/${channelId}`, {
                method: 'DELETE'
            });
            
            deleteChannelResult.classList.remove('hidden');
            deleteChannelResult.textContent = data.message || 'Channel deleted successfully';
            showToast('Channel deleted successfully');
            
            // Update channel list
            loadChannels();
        } catch (error) {
            deleteChannelResult.classList.remove('hidden');
            deleteChannelResult.textContent = `Failed to delete channel: ${error.message}`;
        }
    }
    
    // Poll for messages
    async function pollMessages() {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/channels/poll`, {
                method: 'POST'
            });
            
            pollResult.classList.remove('hidden');
            pollResult.textContent = data.message || `Received ${data.messages_count || 0} messages`;
            showToast('Messages polled successfully');
            
            // If we have a selected channel, reload its messages
            if (selectedChannelId) {
                loadChannelMessages(selectedChannelId);
            }
        } catch (error) {
            pollResult.classList.remove('hidden');
            pollResult.textContent = `Failed to poll messages: ${error.message}`;
        }
    }
    
    // Load channel list
    async function loadChannels() {
        try {
            // For demo purposes, simulated data
            // In a real implementation, this would come from the API
            const demoChannels = [];
            
            // Check if we've created a channel in this session
            if (createChannelResult.textContent) {
                const match = createChannelResult.textContent.match(/Channel created with ID: (.+)/);
                if (match && match[1]) {
                    demoChannels.push({
                        channel_id: match[1],
                        team_id: document.getElementById('channel-team-id').value || 'unknown',
                        peer: document.getElementById('channel-peer').value || 'unknown',
                        label: document.getElementById('channel-label').value || 'default',
                        status: 'active'
                    });
                }
            }
            
            // Update the channel list UI
            if (demoChannels.length === 0) {
                channelsContainer.innerHTML = '<p>No active channels found. Create a new channel to get started.</p>';
                return;
            }
            
            let channelListHtml = '<div class="channel-list">';
            demoChannels.forEach(channel => {
                channelListHtml += `
                    <div class="channel-item" data-channel-id="${channel.channel_id}">
                        <div class="channel-header">
                            <h4>${channel.label || 'Unnamed Channel'}</h4>
                            <span class="channel-status ${channel.status}">${channel.status}</span>
                        </div>
                        <div class="channel-info">
                            <span><strong>ID:</strong> ${channel.channel_id}</span>
                            <span><strong>Team:</strong> ${channel.team_id}</span>
                            <span><strong>Peer:</strong> ${channel.peer}</span>
                        </div>
                        <div class="channel-actions">
                            <button class="view-messages-btn button" data-channel-id="${channel.channel_id}">View Messages</button>
                        </div>
                    </div>
                `;
            });
            channelListHtml += '</div>';
            
            channelsContainer.innerHTML = channelListHtml;
            
            // Add event listeners to view message buttons
            document.querySelectorAll('.view-messages-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const channelId = e.target.dataset.channelId;
                    loadChannelMessages(channelId);
                });
            });
        } catch (error) {
            channelsContainer.innerHTML = `<p>Error loading channels: ${error.message}</p>`;
        }
    }
    
    // Load messages for a specific channel
    async function loadChannelMessages(channelId) {
        try {
            selectedChannelId = channelId;
            
            // For demo purposes, simulated data
            // In a real implementation, this would come from the API
            const demoMessages = [
                { timestamp: new Date().toISOString(), content: 'This is a demo message', sender: 'demo' }
            ];
            
            // Update the channel info
            const selectedChannelInfo = document.querySelector('.selected-channel-info');
            selectedChannelInfo.innerHTML = `<p><strong>Viewing messages for channel:</strong> ${channelId}</p>`;
            
            // Update the message list
            messageList.innerHTML = '';
            
            if (demoMessages.length === 0) {
                messageList.innerHTML = '<p>No messages in this channel</p>';
                return;
            }
            
            demoMessages.forEach(message => {
                const messageItem = document.createElement('div');
                messageItem.className = 'message-item';
                
                const timestamp = new Date(message.timestamp).toLocaleString();
                messageItem.innerHTML = `
                    <div class="message-header">
                        <span class="message-timestamp">${timestamp}</span>
                        <span class="message-sender">${message.sender}</span>
                    </div>
                    <div class="message-content">${message.content}</div>
                `;
                
                messageList.appendChild(messageItem);
            });
            
            // Show the messages section
            channelMessages.style.display = 'block';
        } catch (error) {
            messageList.innerHTML = `<p>Error loading messages: ${error.message}</p>`;
        }
    }
    
    // Event: Create channel form submit
    createChannelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('channel-team-id').value;
        const peer = document.getElementById('channel-peer').value;
        const label = document.getElementById('channel-label').value;
        
        if (!teamId || !peer) {
            showToast('Please enter both team ID and peer identifier', true);
            return;
        }
        
        createChannel(teamId, peer, label);
    });
    
    // Event: Send data form submit
    sendDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const channelId = document.getElementById('send-channel-id').value;
        const data = document.getElementById('send-data').value;
        
        if (!channelId || !data) {
            showToast('Please enter both channel ID and data', true);
            return;
        }
        
        sendData(channelId, data);
    });
    
    // Event: Delete channel form submit
    deleteChannelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const channelId = document.getElementById('delete-channel-id').value;
        
        if (!channelId) {
            showToast('Please enter a channel ID', true);
            return;
        }
        
        deleteChannel(channelId);
    });
    
    // Event: Poll messages button click
    pollMessagesBtn.addEventListener('click', () => {
        pollMessages();
    });
    
    // Initial load
    loadChannels();
}); 