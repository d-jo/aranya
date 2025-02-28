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
        } else {
            detailNameContainer.classList.add('hidden');
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
        
        // Show the details section
        teamDetails.classList.remove('hidden');
    }
    
    // Manually track a team ID without joining it
    function trackTeam(teamId, teamName = '') {
        try {
            // Add to localStorage
            addTeamToStorage(teamId, teamName);
            
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
        
        if (!teamId) {
            showToast('Please enter a team ID', true);
            return;
        }
        
        trackTeam(teamId, teamName);
    });
    
    // Event: Close Team button click
    closeTeamBtn.addEventListener('click', () => {
        const teamId = document.getElementById('close-team-id').value;
        closeTeam(teamId);
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