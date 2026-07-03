import { loadNavbar } from './utils.js';
import { handleAuthButtons } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, where, updateDoc, Timestamp, orderBy, limit, deleteDoc, writeBatch, startAt, endAt } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db, auth } from "./firebase.js";


function loadAdminInterface(user) {
    const adminSection = document.getElementById('admin-interface');
    const verifierSection = document.getElementById('verifier-interface');
    const moddedVerifierSection = document.getElementById('modded-verifier-interface');
    const recentVerifiedRunsSection = document.getElementById('recent-verified-runs-interface');
    const sidebar = document.getElementById('sidebar');

    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        getDoc(userDocRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const roles = userData.roles || [];

                sidebar.innerHTML = '';

                if (roles.includes('admin') || roles.includes('site-developer')) {
                    const adminBtn = document.createElement("button");
                    adminBtn.id = "admin-btn";
                    adminBtn.classList.add("sidebar-btn");
                    adminBtn.textContent = "Admin";
                    sidebar.appendChild(adminBtn);
                }
                if (roles.includes('verifier') || roles.includes('site-developer') || roles.includes('admin')) {
                    const verifierBtn = document.createElement("button");
                    verifierBtn.id = "verifier-btn";
                    verifierBtn.classList.add("sidebar-btn");
                    verifierBtn.textContent = "Verifier";
                    sidebar.appendChild(verifierBtn);
                }
                if (roles.includes('modded-verifier') || roles.includes('site-developer') || roles.includes('admin')) {
                    const moddedVerifierBtn = document.createElement("button");
                    moddedVerifierBtn.id = "modded-verifier-btn";
                    moddedVerifierBtn.classList.add("sidebar-btn");
                    moddedVerifierBtn.textContent = "Modded Verifier";
                    sidebar.appendChild(moddedVerifierBtn);
                }
                if (roles.includes('admin') || roles.includes('verifier') || roles.includes('modded-verifier') || roles.includes('site-developer')) {
                    const recentVerifiedRunsBtn = document.createElement("button");
                    recentVerifiedRunsBtn.id = "recent-verified-runs-btn";
                    recentVerifiedRunsBtn.classList.add("sidebar-btn");
                    recentVerifiedRunsBtn.textContent = "Recently Verified Runs";
                    sidebar.appendChild(recentVerifiedRunsBtn);
                }

                const adminBtn = document.getElementById("admin-btn");
                const verifierBtn = document.getElementById("verifier-btn");
                const moddedVerifierBtn = document.getElementById("modded-verifier-btn");
                const recentVerifiedRunsBtn = document.getElementById("recent-verified-runs-btn");

                if (adminBtn) {
                    adminBtn.addEventListener("click", () => {
                        console.log('Admin button clicked');
                        hideAllInterfaces();
                        adminSection.classList.add("show");
                        highlightActiveButton(adminBtn);
                    });
                }

                if (verifierBtn) {
                    verifierBtn.addEventListener("click", () => {
                        console.log('Verifier button clicked');
                        hideAllInterfaces();
                        verifierSection.classList.add("show");
                        highlightActiveButton(verifierBtn);
                        loadVerifierInterface();
                    });
                }

                if (moddedVerifierBtn) {
                    moddedVerifierBtn.addEventListener("click", () => {
                        console.log('Modded Verifier button clicked');
                        hideAllInterfaces();
                        moddedVerifierSection.classList.add("show");
                        highlightActiveButton(moddedVerifierBtn);
                        loadModdedVerifierInterface();
                    });
                }

                if (recentVerifiedRunsBtn) {
                    recentVerifiedRunsBtn.addEventListener("click", () => {
                        console.log('recent runs button clicked');
                        hideAllInterfaces();
                        recentVerifiedRunsSection.classList.add("show");
                        highlightActiveButton(recentVerifiedRunsBtn);
                        
                    });
                }

                hideAllInterfaces();
            }
        }).catch((error) => {
            console.error("Error fetching user data: ", error);
        });
    } else {
        console.log("No user logged in");
    }
}

const highlightActiveButton = (button) => {
    const buttons = document.querySelectorAll(".sidebar-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    button.classList.add("active");
};

const hideAllInterfaces = () => {
    const adminSection = document.getElementById('admin-interface');
    const verifierSection = document.getElementById('verifier-interface');
    const moddedVerifierSection = document.getElementById('modded-verifier-interface');
    const recentVerifiedRunsSection = document.getElementById('recent-verified-runs-interface');
    
    console.log('Hiding all interfaces');
    adminSection.classList.remove("show");
    verifierSection.classList.remove("show");
    moddedVerifierSection.classList.remove("show");
    recentVerifiedRunsSection.classList.remove("show");
};

// admin interface

const assignRolesButton = document.getElementById('assign-roles-button');
const removeRoleButton = document.getElementById('remove-role-button');
const banUserButton = document.getElementById('ban-user-button');
const unbanUserButton = document.getElementById('unban-user-button');
const usernameInput = document.getElementById('username');
const roleSelect = document.getElementById('role');
const feedbackDiv = document.getElementById('feedback');

const assignRole = async () => {
    const username = usernameInput.value.trim();
    const role = roleSelect.value;

    if (!username) {
        feedbackDiv.textContent = 'Please enter a username.';
        feedbackDiv.style.display = 'block';
        return;
    }

    try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedbackDiv.textContent = `User with username ${username} not found.`;
            feedbackDiv.style.display = 'block';
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const roles = userData.roles || [];

        if (!roles.includes(role)) {
            roles.push(role);
        }

        await updateDoc(userDoc.ref, { roles });

        feedbackDiv.textContent = `Role ${role} assigned to ${username}.`;
        feedbackDiv.style.display = 'block';
    } catch (error) {
        feedbackDiv.textContent = `Error assigning role: ${error.message}`;
        feedbackDiv.style.display = 'block';
    }
};

const removeRole = async () => {
    const username = usernameInput.value.trim();
    const role = roleSelect.value;

    if (!username) {
        feedbackDiv.textContent = 'Please enter a username.';
        feedbackDiv.style.display = 'block';
        return;
    }

    try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedbackDiv.textContent = `User with username ${username} not found.`;
            feedbackDiv.style.display = 'block';
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const roles = userData.roles || [];

        const updatedRoles = roles.filter((roleName) => roleName !== role);

        await updateDoc(userDoc.ref, { roles: updatedRoles });

        feedbackDiv.textContent = `Role ${role} removed from ${username}.`;
        feedbackDiv.style.display = 'block';
    } catch (error) {
        feedbackDiv.textContent = `Error removing role: ${error.message}`;
        feedbackDiv.style.display = 'block';
    }
};

const banUser = async () => {
    const username = usernameInput.value.trim();

    if (!username) {
        feedbackDiv.textContent = 'Please enter a username.';
        feedbackDiv.style.display = 'block';
        return;
    }

    const confirmBan = window.confirm(`Are you sure you want to ban ${username}?`);
    if (!confirmBan) return;

    try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedbackDiv.textContent = `User with username ${username} not found.`;
            feedbackDiv.style.display = 'block';
            return;
        }

        const userDoc = querySnapshot.docs[0];

        await updateDoc(userDoc.ref, { banned: true });

        const collections = [
            'leaderboards_hq', 
            'leaderboards_sdc', 
            'leaderboards_smhq',
            'lc_modded_brutal_hq',
            'lc_modded_brutal_smhq',
            'lc_modded_brutal_sdc',
            'lc_modded_eclipsed_hq',
            'lc_modded_eclipsed_smhq',
            'lc_modded_wesleysmoons_hq',
            'lc_modded_wesleysmoons_smhq',
            'lc_modded_wesleysmoons_sdc',
            'lc_modded_classicmoons_hq',
            'lc_modded_classicmoons_smhq',
            'lc_modded_classicmoons_sdc'
        ];

        const batch = writeBatch(db);

        for (const collectionName of collections) {
            const runsRef = collection(db, collectionName);
            const runsQuery = query(runsRef, where("players", "array-contains", username));
            const runsSnapshot = await getDocs(runsQuery);

            runsSnapshot.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
        }

        await batch.commit();

        feedbackDiv.textContent = `${username} has been banned, and all their runs have been deleted.`;
        feedbackDiv.style.display = 'block';
    } catch (error) {
        feedbackDiv.textContent = `Error banning user: ${error.message}`;
        feedbackDiv.style.display = 'block';
        console.error("Error banning user:", error);
    }
};

const unbanUser = async () => {
    const username = usernameInput.value.trim();

    if (!username) {
        feedbackDiv.textContent = 'Please enter a username.';
        feedbackDiv.style.display = 'block';
        return;
    }

    try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedbackDiv.textContent = `User with username ${username} not found.`;
            feedbackDiv.style.display = 'block';
            return;
        }

        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, { banned: false });

        feedbackDiv.textContent = `${username} has been unbanned.`;
        feedbackDiv.style.display = 'block';
    } catch (error) {
        feedbackDiv.textContent = `Error unbanning user: ${error.message}`;
        feedbackDiv.style.display = 'block';
    }
};

// verifier interface

const LATE_THRESHOLDS = [28, 35, 42, 56];
const THRESHOLD_COLORS = {
    28: '#dd8',
    35: '#d86',
    42: '#d53',
    56: '#d22'
}
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function fetchUnverifiedRuns(role) {

    let collections = [];
    let runListContainer = null;
    const collectionDisplayNames = {
        'leaderboards_hq': 'High Quota',
        'leaderboards_smhq': 'Single Moon High Quota',
        'leaderboards_sdc': 'Single Day Clear',
        'lc_modded_brutal_hq': 'Brutal Company High Quota',
        'lc_modded_brutal_smhq': 'Brutal Company Single Moon High Quota',
        'lc_modded_brutal_sdc': 'Brutal Company Single Day Clear',
        'lc_modded_eclipsed_hq': 'Eclipsed Only High Quota',
        'lc_modded_eclipsed_smhq': 'Eclipsed Only Single Moon High Quota',
        'lc_modded_wesleysmoons_hq': "Wesley's Moons High Quota",
        'lc_modded_wesleysmoons_smhq': "Wesley's Moons Single Moon High Quota",
        'lc_modded_wesleysmoons_sdc': "Wesley's Moons Single Day Clear",
        'lc_modded_classicmoons_hq': 'Classic Moons High Quota',
        'lc_modded_classicmoons_smhq': 'Classic Moons Single Moon High Quota',
        'lc_modded_classicmoons_sdc': 'Classic Moons Single Day Clear'
    };

    if (role == "verifier") {
        collections = ['leaderboards_hq', 'leaderboards_smhq', 'leaderboards_sdc'];
        runListContainer = document.getElementById('run-list');
    } else if (role == "moddedVerifier") {
        collections = [
            'lc_modded_brutal_hq',
            'lc_modded_brutal_smhq',
            'lc_modded_brutal_sdc',
            'lc_modded_eclipsed_hq',
            'lc_modded_eclipsed_smhq',
            'lc_modded_wesleysmoons_hq',
            'lc_modded_wesleysmoons_smhq',
            'lc_modded_wesleysmoons_sdc',
            'lc_modded_classicmoons_hq',
            'lc_modded_classicmoons_smhq',
            'lc_modded_classicmoons_sdc'
        ];
        runListContainer = document.getElementById('modded-run-list');
    }

    runListContainer.innerHTML = '';
    let displayNoRunsMessage = true;

    const promises = collections.map(collectionName => {
        const runsRef = collection(db, collectionName); 
        const q = query(runsRef, where('verified', '==', false), orderBy('date', 'asc'));
        return getDocs(q);
    });

    try {
        const querySnapshots = await Promise.all(promises);


        collections.forEach((collectionName, index) => {
            const querySnapshot = querySnapshots[index];

            if (querySnapshot.empty){
                return;
            }

            displayNoRunsMessage = false;

            const sectionHeader = document.createElement('h3');
            sectionHeader.textContent = collectionDisplayNames[collectionName] || collectionName;
            runListContainer.appendChild(sectionHeader);

            const collectionContainer = document.createElement('div');
            runListContainer.appendChild(collectionContainer);

            querySnapshot.forEach((docSnapshot) => {
                    const run = docSnapshot.data();
                    const runId = docSnapshot.id;
                    const claimedBy = run.claimedBy || 'Unclaimed';

                    const players = run.players || ['Unknown Player'];
                    const runMs = run.submissionDate ? run.submissionDate.seconds * 1000 : run.date.seconds * 1000;
                    const daysAgo = Math.round((runMs - Date.now()) / MS_PER_DAY);
                    const ageInDays = (Date.now() - (runMs)) / MS_PER_DAY;
                    const runDateThreshold = LATE_THRESHOLDS.findLast(t => ageInDays >= t) || null;

                    const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
                    const submissionDateDisplay = rtf.format(daysAgo, 'day');
                    const version = run.version || 'Unknown Version';
                    const videos = run.videos || {};

                    const runItem = document.createElement('div');
                    runItem.classList.add('run-item');
                    runItem.classList.add('clickable-run-item');
                    runItem.setAttribute('data-run-id', runId);
                    runItem.setAttribute('data-collection', collectionName);

                    const leftSide = document.createElement('div');
                    leftSide.classList.add("runLeft");
                    const rightSide = document.createElement('div');
                    rightSide.classList.add("runRight");

                    const playersElement = document.createElement('p');
                    const additionalDataElement = document.createElement('p');
                    const claimedByElement = document.createElement('p');

                    const submissionDateElement = document.createElement('p');
                    const versionElement = document.createElement('p');

                    const claimButton = document.createElement('button');

                    const morePlayersCount = players.length - 2;
                    if (morePlayersCount > 0){
                        const playerCountSpanElement = document.createElement('span');
                        playerCountSpanElement.textContent = ` + ${morePlayersCount} more`;
                        playersElement.textContent = `${players.slice(0, 2).join(', ')}`;
                        playersElement.appendChild(playerCountSpanElement);
                    }else {
                        playersElement.textContent = `${players.slice(0, 2).join(', ')}`;
                    }
                    leftSide.appendChild(playersElement);
                    
                    if (collectionName.endsWith('_hq')){
                        additionalDataElement.textContent = `Quota ${run.quotaReached}: ${run.quotaAmount}`;
                    } else if (collectionName.endsWith('_smhq')){
                        additionalDataElement.textContent = `${run.moon} - Quota ${run.quotaReached}: ${run.quotaAmount}`;
                    } else if (collectionName.endsWith('_sdc')){
                        if (collectionName.startsWith('lc_modded_brutal')){
                            additionalDataElement.textContent = `${run.moon} - Collected: ${run.totalScrap}`;
                        }else{
                            additionalDataElement.textContent = `${run.moon} - Collected: ${run.totalScrap} - Scrap Type: ${run.scrapType}`;
                        }
                        
                    }else {
                        additionalDataElement.textContent = `Unknown category1! Please contact site-developers!`;
                    }
                    leftSide.appendChild(additionalDataElement);

                    versionElement.textContent = `${version}`;
                    rightSide.appendChild(versionElement);

                    submissionDateElement.textContent = `${submissionDateDisplay}`;
                    if (runDateThreshold !== null){
                        submissionDateElement.style = `color: ${THRESHOLD_COLORS[runDateThreshold]};`;
                        if (runDateThreshold === LATE_THRESHOLDS[2] || runDateThreshold === LATE_THRESHOLDS[3]){
                            runItem.classList.add("run-item-old");
                        }
                    }
                    rightSide.appendChild(submissionDateElement);

                    if (!claimedBy || claimedBy == "Unclaimed"){
                        claimedByElement.textContent = `Unclaimed`;
                        claimButton.innerText = 'Claim Run';
                        claimButton.classList.add('claim-button');
                        claimButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            claimRun(runId, collectionName, role);
                        });
                        rightSide.appendChild(claimButton);
                        runItem.classList.add("unclaimed");
                    }else{
                        claimedByElement.textContent = `Claimed by ${claimedBy}`;
                    }
                    leftSide.appendChild(claimedByElement);
                    
                    runItem.appendChild(leftSide);
                    runItem.appendChild(rightSide);
                    
                    collectionContainer.appendChild(runItem);

                    runItem.addEventListener('click', () => {
                        showRunDetails(runId, collectionName, run, role);
                    });
            });
        });
    } catch (error) {
        console.error(error);
        const errorMessage = document.createElement('h3');
        errorMessage.textContent = "Error trying to fetch pending runs! If this happens again, ask for help from managers or site developers!";
        errorMessage.style = "color: #f44;";
        displayNoRunsMessage = false;
        runListContainer.appendChild(errorMessage);
    }

    if (displayNoRunsMessage){
        const noRunsMessage = document.createElement('h3');
        noRunsMessage.textContent = "No pending runs.";
        runListContainer.appendChild(noRunsMessage);
    }



}

export function showRunDetails(runId, collectionName, run, role) {
    
    const user = auth.currentUser;
    let runListContainer = null;
    let runDetailsContainer = null;

    if (role == "verifier") {
        runListContainer = document.getElementById('run-list');
        runDetailsContainer = document.getElementById('run-details-container');
    } else if (role == "moddedVerifier") {
        runListContainer = document.getElementById('modded-run-list');
        runDetailsContainer = document.getElementById('modded-run-details-container');
    }


    runListContainer.style.display = 'none';

    runDetailsContainer.style.display = 'block';

    const claimedBy = run.claimedBy || 'Unclaimed';
    
    const claimButton = document.getElementById('claim-button');

    if (claimButton) {
        if (claimedBy && claimedBy !== user?.username) {
            claimButton.style.display = 'none';
        }
    }
    const submitter = run.submitter || 'Unknown Submitter';
    const submissionDate = run.submissionDate? run.submissionDate.toDate().toLocaleString() : 'Unknown Date';
    const players = run.players || ['Unknown Player'];
    const date = run.date ? run.date.toDate().toLocaleString() : 'Unknown Date';
    const version = run.version || 'Unknown Version';
    const videos = run.videos || {};
    const logs = run.logs || 'Unknown Logs';
    const comments = run.comments || '';
    const publicComments = run.publicComments || '';
    const verProg = run.verificationProgress || 0;
    const spreadsheet = run.spreadsheet || '';

    let additionalInfo = '';
    let equipmentField = '';

    if (collectionName.endsWith('_hq')) {
        const quotaAmount = run.quotaAmount || 0;
        const quotaFulfilled = run.quotaFulfilled || 0;
        const quotaReached = run.quotaReached || 0;
        const totalScrap = run.totalScrap || 0;

        additionalInfo = `
            <label>Quota Amount: <input type="number" value="${quotaAmount}" disabled data-field="quotaAmount"></label><br>
            <label>Quota Fulfilled: <input type="number" value="${quotaFulfilled}" disabled data-field="quotaFulfilled"></label><br>
            <label>Number of Quotas Reached: <input type="number" value="${quotaReached}" disabled data-field="quotaReached"></label><br>
            <label>Total Scrap: <input type="number" value="${totalScrap}" disabled data-field="totalScrap"></label><br>
        `;
    } else if (collectionName.endsWith('_sdc')) {
        const equipment = Array.isArray(run.equipment) ? run.equipment.join(', ') : (typeof run.equipment === 'string' ? run.equipment : '');
        const moon = run.moon || 'Unknown Moon';
        const scrapType = run.scrapType || 'Unknown Scrap Type';
        const totalScrap = run.totalScrap || 0;
        if (collectionName.startsWith('lc_modded_brutal')){
            additionalInfo = `
                <label>Equipment: <input type="text" value="${equipment}" disabled data-field="equipment"></label><br>
                <label>Moon: <input type="text" value="${moon}" disabled data-field="moon"></label><br>
                <label>Total Scrap: <input type="number" value="${totalScrap}" disabled data-field="totalScrap"></label><br>
        `;
        } else {
            additionalInfo = `
                <label>Equipment: <input type="text" value="${equipment}" disabled data-field="equipment"></label><br>
                <label>Moon: <input type="text" value="${moon}" disabled data-field="moon"></label><br>
                <label>Scrap Type: <input type="text" value="${scrapType}" disabled data-field="scrapType"></label><br>
                <label>Total Scrap: <input type="number" value="${totalScrap}" disabled data-field="totalScrap"></label><br>
            `;
        }
    } else if (collectionName.endsWith('_smhq')) {
        const moon = run.moon || 'Unknown Moon';
        const quotaAmount = run.quotaAmount || 0;
        const quotaFulfilled = run.quotaFulfilled || 0;
        const quotaReached = run.quotaReached || 0;
        const totalScrap = run.totalScrap || 0;

        additionalInfo = `
            <label>Moon: <input type="text" value="${moon}" disabled data-field="moon"></label><br>
            <label>Quota Amount: <input type="number" value="${quotaAmount}" disabled data-field="quotaAmount"></label><br>
            <label>Quota Fulfilled: <input type="number" value="${quotaFulfilled}" disabled data-field="quotaFulfilled"></label><br>
            <label>Number of Quotas Reached: <input type="number" value="${quotaReached}" disabled data-field="quotaReached"></label><br>
            <label>Total Scrap: <input type="number" value="${totalScrap}" disabled data-field="totalScrap"></label><br>
        `;
    }

    let runDetails = `
        <h4>Run Details</h4>
        <p>ID: ${runId}</p>
        <p>Submitted by: ${submitter}</p>
        <p>Submission date: ${submissionDate}</p>
        <br>
        <label>Players: <input type="text" value="${Array.isArray(players) ? players.join(', ') : players}" disabled data-field="players"></label><br>
        <label>Date: <input type="text" value="${date}" disabled data-field="date"></label><br>
        <label>Version: <input type="text" value="${version}" disabled data-field="version"></label><br>
        <label>Claimed By: <input type="text" value="${claimedBy}" disabled data-field="claimedBy"></label><br>
        <label>Logs: <input type="text" value="${logs}" disabled data-field="logs"></label><br>
        <label>Comments: <input type="text" value="${comments}" disabled data-field="comments"></label><br>
        <label>Public Comments: <input type="text" value="${publicComments}" disabled data-field="publicComments"></label><br>
        <label>Spreadsheet: <input type="text" value="${spreadsheet}" disabled data-field="spreadsheet"></label><br>
        ${additionalInfo}
        <h5>Video Links:</h5>
    `;

    for (const [player, urls] of Object.entries(videos)) {
        runDetails += `<label>${player}: 
            <input type="text" value="${urls.join(', ')}" disabled data-field="videos-${player}">
        </label>
        <div class="video-links-container"></div>
        <br>`;
    }

    runDetails += `
        <div class="button-group">
            <button class="edit-button" id="edit-button">Edit</button>
            <button class="save-button" id="save-button" style="display: none;">Save</button>
            <button class="cancel-button" id="cancel-button" style="display: none;">Cancel</button>
            <button class="verify-button" id="verify-button">Verify</button>
            <button class="reject-button" id="reject-button">Reject</button>
        </div>
        <div class="update-progress-group">
            <p class="verification-progress-title">${verProg}%</p>
            <input type="range" id="verification-progress" name="update-progress" min="0" max="100" value="${verProg}">
            <button class="update-progress" id="update-progress">Update Progress</button>
        </div>
        <button id="back-to-list">Back to List</button>
    `;

    console.log("Updating runDetailsContainer with:", runDetails);

    runDetailsContainer.innerHTML = runDetails;

    const videoLinksContainers = document.querySelectorAll('.video-links-container');

    videoLinksContainers.forEach(container => {
        const previousLabel = container.previousElementSibling;
        if (previousLabel) {
            const input = previousLabel.querySelector('input');
            if (input){
                const urls = input.value.split(',').map(url => url.trim());
                
                urls.forEach(url => {
                    const urlElement = document.createElement('a');
                    urlElement.href = url;
                    urlElement.classList.add('video-url-link');
                    urlElement.textContent = url;
                    container.appendChild(urlElement);
                    const brElement = document.createElement('br');
                    container.appendChild(brElement);
                });
            } else console.warn('No input box found for video link container!');
        } else console.warn('No previous label found for video link container!');
    })

    resetButtonStates();

    runDetailsContainer.removeEventListener('click', handleRunDetailsClick);
    runDetailsContainer.addEventListener('click', handleRunDetailsClick);
    const verifProgressBar = runDetailsContainer.querySelector('#verification-progress');
    if (verifProgressBar) {
        verifProgressBar.addEventListener('input', () => {
            runDetailsContainer.querySelector('.verification-progress-title').textContent = `${verifProgressBar.value}%`;
        });
    }


    function handleRunDetailsClick(event) {
        const target = event.target;
        if (target.matches('#edit-button')) {
            console.log("Edit button clicked");
            const fields = runDetailsContainer.querySelectorAll('[data-field]');
            fields.forEach(field => field.disabled = false);
            resetButtonStates('edit');
        } else if (target.matches('#save-button')) {
            console.log("Save button clicked");
            const fields = runDetailsContainer.querySelectorAll('[data-field]');
            const updatedRun = {};

            fields.forEach(field => {
                const fieldName = field.getAttribute('data-field');
                if (fieldName === 'date' && field.value) {
                    updatedRun[fieldName] = Timestamp.fromDate(new Date(field.value));
                } else if (fieldName.startsWith('videos-')) {
                    const player = fieldName.split('-')[1];
                    updatedRun.videos = updatedRun.videos || {};
                    updatedRun.videos[player] = field.value.split(',').map(url => url.trim());
                } else if (field.type === 'select-one') {
                    updatedRun[fieldName] = field.value === 'true';
                } else if (field.type === 'number') {
                    updatedRun[fieldName] = parseFloat(field.value);
                } else if (Array.isArray(run[fieldName])) {
                    updatedRun[fieldName] = field.value.split(',').map(item => item.trim());
                } else {
                    updatedRun[fieldName] = field.value;
                }
                field.disabled = true;
            });

            saveRunDetails(runId, collectionName, updatedRun)
                .then(() => {
                    console.log(`Run ${runId} updated successfully.`);
                    resetButtonStates('save');
                })
                .catch((error) => {
                    console.error('Error updating run:', error);
                });
        } else if (target.matches('#cancel-button')) {
            console.log("Cancel button clicked");
            const fields = runDetailsContainer.querySelectorAll('[data-field]');
            fields.forEach(field => field.disabled = true);
            resetButtonStates('cancel');
        } else if (target.matches('#verify-button')) {
            console.log("Verify button clicked");
            verifyRun(runId, collectionName, role);
        } else if (target.matches('#reject-button')) {
            console.log("Reject button clicked");
            rejectRun(runId, collectionName, role);
        } else if (target.matches('#back-to-list')) {
            console.log("🔄 Back button clicked via delegation!");
            backToList(role);
        } else if (target.matches('#update-progress')) {
            console.log("Update progress clicked");
            updateVerificationProgress(runId, collectionName, role);
        }
    }

    function resetButtonStates(buttonClicked = '') {
        const editButton = document.getElementById('edit-button');
        const saveButton = document.getElementById('save-button');
        const cancelButton = document.getElementById('cancel-button');

        editButton.style.display = 'inline-block';
        saveButton.style.display = 'none';
        cancelButton.style.display = 'none';

        if (buttonClicked === 'edit') {
            editButton.style.display = 'none';
            saveButton.style.display = 'inline-block';
            cancelButton.style.display = 'inline-block';
        } else if (buttonClicked === 'save') {
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
            cancelButton.style.display = 'none';
        } else if (buttonClicked === 'cancel') {
            editButton.style.display = 'inline-block';
            saveButton.style.display = 'none';
            cancelButton.style.display = 'none';
        }
    }
}

async function saveRunDetails(runId, collectionName, updatedRun) {
    const runRef = doc(db, collectionName, runId);
    await updateDoc(runRef, updatedRun);
}

export function backToList(role) {
    console.log(`📌 backToList() triggered for role: ${role}`);
    let runDetailsContainer = null;
    let runListContainer = null;


    if (role == "verifier") {
        runDetailsContainer = document.getElementById('run-details-container');
        runListContainer = document.getElementById('run-list');
    } else if (role == "moddedVerifier") {
        runDetailsContainer = document.getElementById('modded-run-details-container');
        runListContainer = document.getElementById('modded-run-list');
    }


    location.reload();
}
  
async function verifyRun(runId, collectionName, role) {
    const user = auth.currentUser;

    if (!user) return;

    const username = await getUsername(user.uid);
    if (!username) return;

    const confirmVerify = window.confirm(`Are you sure you want to verify this run?`);
    if (!confirmVerify) return;

    const runRef = doc(db, collectionName, runId);
    const newRunSnap = await getDoc(runRef);

    if (!newRunSnap.exists()) {
        console.error(`Run ${runId} not found in ${collectionName}.`);
        return;
    }

    const newRun = newRunSnap.data();
    const batch = writeBatch(db);

    let queryConstraints = [
        where("players", "==", newRun.players),
        where("version", "==", newRun.version)
    ];

    if (newRun.hasOwnProperty("moon")) {
        queryConstraints.push(where("moon", "==", newRun.moon));
    }

    if (newRun.hasOwnProperty("scrapType")){
        queryConstraints.push(where("scrapType", "==", newRun.scrapType));
    }

    const obsoleteRunsQuery = query(collection(db, collectionName), ...queryConstraints);
    const obsoleteRunsSnap = await getDocs(obsoleteRunsQuery);

    obsoleteRunsSnap.forEach(docSnap => {
        if (docSnap.id !== runId) {
            batch.delete(doc(db, collectionName, docSnap.id));
        }
    });

    batch.update(runRef, {
        verified: true,
        verifiedBy: username,
        verifiedAt: new Date()
    });

    try {
        await batch.commit();
        console.log(`Run ${runId} from ${collectionName} verified. Deleted ${obsoleteRunsSnap.size} obsolete runs.`);
        fetchUnverifiedRuns(role);
    } catch (error) {
        console.error(`Error verifying run ${runId}:`, error);
    }

    location.reload();
}


export function rejectRun(runId, collectionName, role) {

    const confirmReject = window.confirm(`Are you sure you want to reject this run?`);
    if (!confirmReject) return;

    const runRef = doc(db, collectionName, runId);
    deleteDoc(runRef)
    .then(() => {
        console.log(`Run ${runId} from ${collectionName} rejected.`);
        fetchUnverifiedRuns(role);
    })
    .catch((error) => {
        console.error(`Error rejecting run ${runId} from ${collectionName}:`, error);
    });

}

async function getUsername(uid) {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data().username;
  } else {
    console.log('No user document found');
    return null;
  }
}

async function claimRun(runId, collectionName, role) {
    const user = auth.currentUser;

    if (user) {
        const username = await getUsername(user.uid);

        if (username) {
            const runRef = doc(db, collectionName, runId);
            await updateDoc(runRef, {
                claimedBy: username,
                claimedAt: new Date()
            })
            .then(() => {
                console.log(`Run ${runId} claimed by ${username}`);
                fetchUnverifiedRuns(role);
            })
            .catch((error) => {
                console.error('Error claiming run:', error);
            });
        }
    }
}

async function updateVerificationProgress(runId, collectionName, role) {
    const user = auth.currentUser;
    const currentUpdateProgress = document.getElementById('verification-progress');
    if (user) {
        const runRef = doc(db, collectionName, runId);
        await updateDoc(runRef, {
            verificationProgress: Number(currentUpdateProgress.value)
        })
        .then(() => {
            alert('Verification progress updated successfully.');
            console.log(`Verification progress for run ${runId} from ${collectionName} has been updated.`);
            fetchUnverifiedRuns(role);
        })
        .catch((error) => {
            console.error('Error updating verification progress for run:', error);
        });
    }
}

async function displayRecentlyVerifiedRuns() {
    const collections = [
        'leaderboards_hq',
        'leaderboards_sdc',
        'leaderboards_smhq',
        'lc_modded_brutal_hq',
        'lc_modded_brutal_smhq',
        'lc_modded_brutal_sdc',
        'lc_modded_eclipsed_hq',
        'lc_modded_eclipsed_smhq',
        'lc_modded_wesleysmoons_hq',
        'lc_modded_wesleysmoons_smhq',
        'lc_modded_wesleysmoons_sdc',
        'lc_modded_classicmoons_hq',
        'lc_modded_classicmoons_smhq',
        'lc_modded_classicmoons_sdc'
    ];
    const tableBody = document.getElementById("recent-verified-runs").getElementsByTagName("tbody")[0];
    
    tableBody.innerHTML = '';
    let allRuns = [];

    for (const collectionName of collections) {
        const runsRef = collection(db, collectionName);

        const q = query(runsRef, where("verifiedAt", ">", new Date(0)), orderBy("verifiedAt", "desc"), limit(10));

        try {
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                allRuns.push({
                    id: doc.id,
                    verifiedBy: doc.data().verifiedBy || 'Unknown',
                    verifiedAt: doc.data().verifiedAt.seconds * 1000,
                });
            });

        } catch (error) {
            console.error(`Error fetching recent verified runs from ${collectionName}:`, error);
        }
    }

    allRuns.sort((a, b) => b.verifiedAt - a.verifiedAt);

    allRuns.slice(0, 10).forEach(run => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = run.id;
        row.insertCell(1).textContent = run.verifiedBy;
        row.insertCell(2).textContent = new Date(run.verifiedAt).toLocaleString();
    });
}

export function loadVerifierInterface() {
    const verifierSection = document.getElementById('verifier-interface');
    verifierSection.classList.add('show');

    fetchUnverifiedRuns("verifier");
}

export function loadModdedVerifierInterface() {
    const moddedVerifierSection = document.getElementById('modded-verifier-interface');
    moddedVerifierSection.classList.add('show');

    fetchUnverifiedRuns("moddedVerifier");
}


onAuthStateChanged(auth, (user) => {
    if (user) {
        loadAdminInterface(user);
    } else {
        console.log("No user authenticated");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    displayRecentlyVerifiedRuns();
});

document.addEventListener('DOMContentLoaded', function() {
    loadNavbar(handleAuthButtons);
    assignRolesButton.addEventListener('click', assignRole);
    removeRoleButton.addEventListener('click', removeRole);
    banUserButton.addEventListener('click', banUser);
    unbanUserButton.addEventListener('click', unbanUser);
});

function debounce(func, delay){
  let timeoutId;
  return function (...args){
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

document.addEventListener('input', debounce(async (e) => {
  if (!e.target.classList.contains('username-input')) return;

  const inputField = e.target;
  const wrapper = inputField.closest('.username-input-group');
  const localDropdown = wrapper.querySelector('.results-dropdown');
  const searchTerm = inputField.value.trim().toLowerCase();

  if (searchTerm.length < 2){
    localDropdown.innerHTML = '';
    localDropdown.style.display = 'none';
    return;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      orderBy('usernameLower'),
      startAt(searchTerm),
      endAt(searchTerm + "\uf8ff"),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    localDropdown.innerHTML = '';

    if (querySnapshot.empty) {
      localDropdown.style.display = 'none';
      return;
    }

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const username = userData.username;

      const li = document.createElement('li');
      li.className = "suggestion-item";
      li.textContent = username;

      li.addEventListener('click', () => {
        inputField.value = username;
        localDropdown.innerHTML = '';
        localDropdown.style.display = 'none';
      });

      localDropdown.appendChild(li);
    });

    localDropdown.style.display = 'block';
    
  } catch (error) {
    console.error("Error matching usernames: ", error);
  }
}, 500));

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')){
    document.querySelectorAll('.results-dropdown').forEach(dropdown => {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    document.querySelectorAll('.results-dropdown').forEach(dropdown => {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    });
    if (document.activeElement.classList.contains('username-input')) {
      document.activeElement.blur();
    }
  }
});