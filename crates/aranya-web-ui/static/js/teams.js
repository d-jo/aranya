// Teams page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Team elements
    const createTeamBtn = document.getElementById('create-team-btn');
    const newTeamResult = document.getElementById('new-team-result');
    const closeTeamBtn = document.getElementById('close-team-btn');
    const teamList = document.getElementById('team-list');
    const teamDetails = document.getElementById('team-details');
    const detailTeamId = document.getElementById('detail-team-id');
    const detailRole = document.getElementById('detail-role');
    const detailMemberCount = document.getElementById('detail-member-count');
    const detailNameContainer = document.getElementById('detail-name-container');
    const detailName = document.getElementById('detail-name');
    const detailDateAdded = document.getElementById('detail-date-added');
    const renameTeamBtn = document.getElementById('rename-team-btn');
    
    // Manual team tracking elements
    const trackTeamForm = document.getElementById('track-team-form');
    const trackTeamResult = document.getElementById('track-team-result');
    
    // Create a new team
    async function createTeam() {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            newTeamResult.classList.remove('hidden');
            
            // Create a span for the formatted team ID
            const teamIdSpan = document.createElement('span');
            teamIdSpan.className = 'team-id';
            formatAndSetupId(data.team_id, teamIdSpan);
            
            // Update the result message
            newTeamResult.textContent = 'Team created with ID: ';
            newTeamResult.appendChild(teamIdSpan);
            
            // Add "Distribute to All Daemons" button
            const distributeBtn = document.createElement('button');
            distributeBtn.className = 'button secondary mt-2';
            distributeBtn.textContent = 'Distribute to All Daemons';
            distributeBtn.onclick = () => distributeTeamToAllEndpoints(data.team_id);
            newTeamResult.appendChild(document.createElement('br'));
            newTeamResult.appendChild(distributeBtn);
            
            showToast('Team created successfully');
            
            // Add to localStorage
            addTeamToStorage(data.team_id);
            
            // Update UI
            updateTeamDisplays();
            
            // Update team list
            loadTeams();
        } catch (error) {
            newTeamResult.classList.remove('hidden');
            newTeamResult.textContent = `Failed to create team: ${error.message}`;
        }
    }
    
    // Distribute a team ID to all configured API endpoints
    function distributeTeamToAllEndpoints(teamId, teamName = '') {
        try {
            // Get current endpoint ID to exclude it (team is already added there)
            const currentEndpointId = getCurrentApiEndpointId();
            
            // Get all API endpoints
            const endpoints = getApiEndpoints();
            
            // Count of endpoints where the team was added
            let addedCount = 0;
            
            // Add the team to each endpoint's storage
            endpoints.forEach(endpoint => {
                // Skip the current endpoint (team is already added there)
                if (endpoint.id === currentEndpointId) return;
                
                // Create the storage key for this endpoint
                const storageKey = `${STATE_KEYS.TEAMS}_${endpoint.id}`;
                
                // Get existing teams for this endpoint
                const teamsJson = localStorage.getItem(storageKey);
                const teams = teamsJson ? JSON.parse(teamsJson) : [];
                
                // Add the team if it doesn't already exist
                if (!teams.some(team => team.id === teamId)) {
                    teams.push({
                        id: teamId, 
                        name: teamName || teamId, 
                        dateAdded: new Date().toISOString()
                    });
                    localStorage.setItem(storageKey, JSON.stringify(teams));
                    addedCount++;
                }
            });
            
            // Show toast with result
            if (addedCount > 0) {
                showToast(`Team added to ${addedCount} other daemon${addedCount === 1 ? '' : 's'}`);
            } else {
                showToast('No other daemons to add the team to');
            }
        } catch (error) {
            showToast(`Failed to distribute team: ${error.message}`, true);
        }
    }
    
    // Synchronize team name across all API endpoints
    function syncTeamNameAcrossEndpoints(teamId, newName) {
        try {
            // Get all API endpoints
            const endpoints = getApiEndpoints();
            
            // Track how many endpoints were updated
            let updatedCount = 0;
            
            // Update the team name in each endpoint's storage
            endpoints.forEach(endpoint => {                
                // Create the storage key for this endpoint
                const storageKey = `${STATE_KEYS.TEAMS}_${endpoint.id}`;
                
                // Get existing teams for this endpoint
                const teamsJson = localStorage.getItem(storageKey);
                if (!teamsJson) return;
                
                const teams = JSON.parse(teamsJson);
                
                // Find and update the team name if it exists
                const teamIndex = teams.findIndex(team => team.id === teamId);
                if (teamIndex >= 0) {
                    teams[teamIndex].name = newName;
                    localStorage.setItem(storageKey, JSON.stringify(teams));
                    updatedCount++;
                }
            });
            
            // Update UI
            updateTeamDisplays();
            
            // Show toast with result
            if (updatedCount > 0) {
                showToast(`Team name updated in ${updatedCount} daemon${updatedCount === 1 ? '' : 's'}`);
            } else {
                showToast('No team names were updated');
            }
        } catch (error) {
            showToast(`Failed to sync team name: ${error.message}`, true);
        }
    }
    
    // Close a team
    async function closeTeam(teamId) {
        if (!teamId) {
            showToast('Please enter a team ID', true);
            return;
        }
        
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/${teamId}`, {
                method: 'DELETE'
            });
            
            showToast(data.message || 'Team closed successfully');
            
            // Remove from localStorage
            removeTeamFromStorage(teamId);
            
            // Update UI
            updateTeamDisplays();
            
            // Update team list
            loadTeams();
        } catch (error) {
            showToast(`Failed to close team: ${error.message}`, true);
        }
    }
    
    // Get list of teams
    async function loadTeams() {
        try {
            // Get teams from localStorage
            const savedTeams = getTeams();
            
            // Update the team list UI
            teamList.innerHTML = '';
            
            if (savedTeams.length === 0) {
                teamList.innerHTML = '<p>No teams found. Create a new team or join an existing one.</p>';
                return;
            }
            
            const teamListEl = document.createElement('ul');
            teamListEl.className = 'teams-list';
            
            savedTeams.forEach(team => {
                const teamItem = document.createElement('li');
                teamItem.className = 'team-item';
                
                const teamLink = document.createElement('a');
                teamLink.href = '#';
                
                // Create a span for the team ID and format it
                const teamIdSpan = document.createElement('span');
                teamIdSpan.className = 'team-id';
                formatAndSetupId(team.id, teamIdSpan);
                
                // Display format: "Team: [Name] (ID: [actual ID])"
                if (team.name && team.name !== team.id) {
                    teamLink.textContent = `Team: ${team.name} (ID: `;
                    teamLink.appendChild(teamIdSpan);
                    teamLink.appendChild(document.createTextNode(')'));
                } else {
                    teamLink.textContent = 'Team: ';
                    teamLink.appendChild(teamIdSpan);
                }
                
                teamLink.onclick = (e) => {
                    e.preventDefault();
                    showTeamDetails({
                        team_id: team.id,
                        role: 'unknown', // May be manually tracked
                        member_count: 'N/A'  // May be manually tracked
                    });
                };
                
                teamItem.appendChild(teamLink);
                teamListEl.appendChild(teamItem);
            });
            
            teamList.appendChild(teamListEl);
        } catch (error) {
            teamList.innerHTML = `<p>Error loading teams: ${error.message}</p>`;
        }
    }
    
    // Show team details
    function showTeamDetails(team) {
        // Format and set up the team ID for copying
        formatAndSetupId(team.team_id, detailTeamId);
        
        // Get the complete team info from storage
        const savedTeams = getTeams();
        const savedTeam = savedTeams.find(t => t.id === team.team_id);
        
        // Display friendly name if available
        if (savedTeam && savedTeam.name && savedTeam.name !== savedTeam.id) {
            detailNameContainer.classList.remove('hidden');
            detailName.textContent = savedTeam.name;
            // Pre-fill the rename field with current name
            document.getElementById('rename-team').value = savedTeam.name;
        } else {
            detailNameContainer.classList.add('hidden');
            document.getElementById('rename-team').value = '';
        }
        
        // Display team role (or "Manually tracked" if appropriate)
        if (team.role === 'unknown') {
            detailRole.textContent = 'Manually tracked';
        } else {
            detailRole.textContent = team.role;
        }
        
        // Display member count (or "N/A" if not available)
        detailMemberCount.textContent = team.member_count;
        
        // Display date added if available
        if (savedTeam && savedTeam.dateAdded) {
            const date = new Date(savedTeam.dateAdded);
            detailDateAdded.textContent = date.toLocaleString();
        } else {
            detailDateAdded.textContent = 'Unknown';
        }
        
        // Auto-fill the close team ID
        document.getElementById('close-team-id').value = team.team_id;
        
        // Add operations buttons
        const operationsDiv = document.querySelector('.team-details .team-operations');
        if (!operationsDiv) {
            // If the team-operations div doesn't exist yet, create it
            const div = document.createElement('div');
            div.className = 'team-operations';
            
            // Add distribute button
            const distributeBtn = document.createElement('button');
            distributeBtn.className = 'button secondary';
            distributeBtn.textContent = 'Distribute to All Daemons';
            distributeBtn.onclick = () => distributeTeamToAllEndpoints(team.team_id, savedTeam ? savedTeam.name : '');
            
            div.appendChild(distributeBtn);
            
            // Insert before the close team input
            const closeTeamDiv = document.querySelector('.team-details .form-group');
            closeTeamDiv.parentNode.insertBefore(div, closeTeamDiv);
        } else {
            // If it exists, just update it
            operationsDiv.innerHTML = '';
            const distributeBtn = document.createElement('button');
            distributeBtn.className = 'button secondary';
            distributeBtn.textContent = 'Distribute to All Daemons';
            distributeBtn.onclick = () => distributeTeamToAllEndpoints(team.team_id, savedTeam ? savedTeam.name : '');
            operationsDiv.appendChild(distributeBtn);
        }
        
        // Set up rename button data
        renameTeamBtn.dataset.teamId = team.team_id;
        
        // Show the details section
        teamDetails.classList.remove('hidden');
    }
    
    // Manually track a team ID without joining it
    function trackTeam(teamId, teamName = '', distributeToAll = false) {
        try {
            // Add to localStorage
            addTeamToStorage(teamId, teamName);
            
            // Distribute to all daemons if requested
            if (distributeToAll) {
                distributeTeamToAllEndpoints(teamId, teamName);
            }
            
            // Update UI
            updateTeamDisplays();
            
            // Update team list
            loadTeams();
            
            trackTeamResult.classList.remove('hidden');
            trackTeamResult.textContent = 'Team ID tracked successfully';
            showToast('Team ID added to tracking successfully');
            
            // Reset form
            document.getElementById('track-team-id').value = '';
            document.getElementById('track-team-name').value = '';
            document.getElementById('distribute-to-all').checked = false;
        } catch (error) {
            trackTeamResult.classList.remove('hidden');
            trackTeamResult.textContent = `Failed to track team ID: ${error.message}`;
            showToast(`Failed to track team ID: ${error.message}`, true);
        }
    }
    
    // Event: Create Team button click
    createTeamBtn.addEventListener('click', () => {
        createTeam();
    });
    
    // Event: Track Team form submit
    trackTeamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('track-team-id').value;
        const teamName = document.getElementById('track-team-name').value;
        const distributeToAll = document.getElementById('distribute-to-all').checked;
        
        if (!teamId) {
            showToast('Please enter a team ID', true);
            return;
        }
        
        trackTeam(teamId, teamName, distributeToAll);
    });
    
    // Event: Close Team button click
    closeTeamBtn.addEventListener('click', () => {
        const teamId = document.getElementById('close-team-id').value;
        closeTeam(teamId);
    });
    
    // Event: Rename Team button click
    renameTeamBtn.addEventListener('click', () => {
        const teamId = renameTeamBtn.dataset.teamId;
        const newName = document.getElementById('rename-team').value.trim();
        const syncToAllDaemons = document.getElementById('sync-rename').checked;
        
        if (!teamId || !newName) {
            showToast('Please enter a valid team name', true);
            return;
        }
        
        // Get the teams
        const teams = getTeams();
        const teamIndex = teams.findIndex(team => team.id === teamId);
        
        if (teamIndex >= 0) {
            // Update the team name
            teams[teamIndex].name = newName;
            saveTeams(teams);
            
            // Update UI display
            if (detailNameContainer) {
                detailNameContainer.classList.remove('hidden');
                detailName.textContent = newName;
            }
            
            showToast('Team renamed successfully');
            
            // Sync to all daemons if requested
            if (syncToAllDaemons) {
                syncTeamNameAcrossEndpoints(teamId, newName);
            }
            
            // Update displays
            updateTeamDisplays();
            loadTeams();
        } else {
            showToast('Team not found', true);
        }
    });
    
    // Initialize teams
    loadTeams();
    
    // Set up tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}); 