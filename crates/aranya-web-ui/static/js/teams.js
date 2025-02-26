// Teams page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Team elements
    const createTeamBtn = document.getElementById('create-team-btn');
    const newTeamResult = document.getElementById('new-team-result');
    const addTeamForm = document.getElementById('add-team-form');
    const addTeamResult = document.getElementById('add-team-result');
    const closeTeamBtn = document.getElementById('close-team-btn');
    const teamList = document.getElementById('team-list');
    const teamDetails = document.getElementById('team-details');
    const detailTeamId = document.getElementById('detail-team-id');
    const detailRole = document.getElementById('detail-role');
    const detailMemberCount = document.getElementById('detail-member-count');
    
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
            
            // Update team list
            loadTeams();
        } catch (error) {
            newTeamResult.classList.remove('hidden');
            newTeamResult.textContent = `Failed to create team: ${error.message}`;
        }
    }
    
    // Join an existing team
    async function addTeam(teamId) {
        try {
            const data = await fetchWithErrorHandling(`${API_BASE_URL}/team/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ team_id: teamId })
            });
            
            addTeamResult.classList.remove('hidden');
            addTeamResult.textContent = data.message || 'Team added successfully';
            showToast('Team added successfully');
            
            // Update team list
            loadTeams();
        } catch (error) {
            addTeamResult.classList.remove('hidden');
            addTeamResult.textContent = `Failed to add team: ${error.message}`;
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
            
            // Update team list
            loadTeams();
        } catch (error) {
            showToast(`Failed to close team: ${error.message}`, true);
        }
    }
    
    // Get list of teams
    async function loadTeams() {
        try {
            // Simulated API call for now - replace with actual endpoint when available
            // const data = await fetchWithErrorHandling(`${API_BASE_URL}/teams`);
            
            // For demo purposes, let's simulate a team list
            // In a real implementation, this would come from the API
            const demoTeams = [];
            
            // Check if we've created a team in this session
            if (newTeamResult.textContent) {
                // Try to get the team ID from the child span element
                const teamIdSpan = newTeamResult.querySelector('.team-id');
                if (teamIdSpan && teamIdSpan.dataset.fullId) {
                    demoTeams.push({
                        team_id: teamIdSpan.dataset.fullId,
                        role: 'owner',
                        member_count: 1
                    });
                } else {
                    // Fallback to old method
                    const match = newTeamResult.textContent.match(/Team created with ID: (.+)/);
                    if (match && match[1]) {
                        demoTeams.push({
                            team_id: match[1],
                            role: 'owner',
                            member_count: 1
                        });
                    }
                }
            }
            
            // Update the team list UI
            teamList.innerHTML = '';
            
            if (demoTeams.length === 0) {
                teamList.innerHTML = '<p>No teams found. Create a new team or join an existing one.</p>';
                return;
            }
            
            const teamListEl = document.createElement('ul');
            teamListEl.className = 'teams-list';
            
            demoTeams.forEach(team => {
                const teamItem = document.createElement('li');
                teamItem.className = 'team-item';
                
                const teamLink = document.createElement('a');
                teamLink.href = '#';
                
                // Create a span for the team ID and format it
                const teamIdSpan = document.createElement('span');
                teamIdSpan.className = 'team-id';
                formatAndSetupId(team.team_id, teamIdSpan);
                
                // Add the text around the formatted ID
                teamLink.textContent = 'Team: ';
                teamLink.appendChild(teamIdSpan);
                teamLink.appendChild(document.createTextNode(` (${team.role})`));
                
                teamLink.onclick = (e) => {
                    e.preventDefault();
                    showTeamDetails(team);
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
        
        detailRole.textContent = team.role;
        detailMemberCount.textContent = team.member_count;
        
        // Auto-fill the close team ID
        document.getElementById('close-team-id').value = team.team_id;
        
        // Show the details section
        teamDetails.classList.remove('hidden');
    }
    
    // Event: Create Team button click
    createTeamBtn.addEventListener('click', () => {
        createTeam();
    });
    
    // Event: Add Team form submit
    addTeamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = document.getElementById('team-id').value;
        if (!teamId) {
            showToast('Please enter a team ID', true);
            return;
        }
        addTeam(teamId);
    });
    
    // Event: Close Team button click
    closeTeamBtn.addEventListener('click', () => {
        const teamId = document.getElementById('close-team-id').value;
        closeTeam(teamId);
    });
    
    // Initial load: Get teams
    loadTeams();
}); 