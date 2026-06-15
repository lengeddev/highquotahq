import { loadNavbar } from './utils.js';
import { handleAuthButtons } from './auth.js';
import { doc, getDoc, setDoc, collection, addDoc, orderBy, limit, startAt, endAt, query, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { auth, db } from './firebase.js';

const gameData = {
  // moons
  vanilla_moons: [
    "41-Experimentation",
    "220-Assurance",
    "56-Vow",
    "21-Offense",
    "61-March",
    "20-Adamance",
    "85-Rend",
    "7-Dine",
    "8-Titan",
    "68-Artifice",
    "5-Embrion"
  ],
  wesleys_moons: [
    "76-Acidir",
    "240-Alcatras",
    "57-Asteroid-13",
    "44-Atlantica",
    "288-Berunah",
    "235-Calist",
    "842-Core",
    "42-Cosmocos",
    "328-Crowd",
    "537-Cubatres",
    "354-Demetrica",
    "724-Descent",
    "48-Desolation",
    "164-Dreck",
    "135-Duckstroid-14",
    "555-Empra",
    "154-Etern",
    "475-Extort",
    "29-Faith",
    "141-Filitrios",
    "25-Fission-C",
    "36-Gloom",
    "147-Gratar",
    "58-Hyve",
    "42-Hyx",
    "46-Infernis",
    "84-Junic",
    "35-Lecaro",
    "234-Motra",
    "495-Narcotic",
    "134-Oldred",
    "94-Polarus",
    "214-Release",
    "648-Repress",
    "398-Roart",
    "4-Thalasso",
    "132-Trite",
    "67-Utril"
  ],
  classic_moons: [
    "320-Blurance",
    "51-Verdance",
    "184-Derelict",
    "130-Gorgonzola",
    "5-Tandraus",
    "131-Lertz",
    "143-Scallg",
    "86-Synthesis",
    "13-Kast",
    "154-Etern",
    "43-Orion",
    "2742-Jabiua"
  ],
  // versions
  brutal_versions: ["v81", "v73", "v72", "v69", "v64", "v62", "v56", "v50", "v49"],
  eclipsed_versions: ["v81", "v73", "v72", "v69", "v64", "v62", "v56", "v50", "v49", "v45", "v40"],
  wesleys_versions: ["v73", "v72", "v69"],
  classic_versions: ["v81", "v73", "v72", "v69", "v64", "v62", "v56"]
}

const playersContainer = document.getElementById('playerFields');
const addPlayerBtn = document.getElementById('addPlayerBtn');

let totalPlayerBlocks = 0;
let loggedPlayerName = '';
const MAX_PLAYERS = 4;
const MAX_VIDEOS_PER_PLAYER = 9;

function createPlayerBlock(defaultUsername = "", isPrimary = false){
  if (!isPrimary && totalPlayerBlocks >= MAX_PLAYERS){
    alert("Max playercount is 4!");
    return;
  }

  const playerIndex = Date.now();
  const playerBlock = document.createElement('div');
  playerBlock.className = 'player-block';
  playerBlock.setAttribute('data-player-id', playerIndex);

  playerBlock.innerHTML = `
    <div class="player-header">
      
      <div class="search-wrapper">
        <label>Player ${totalPlayerBlocks+1} Name:</label>
        <input type="text" class="player-input" value="${defaultUsername}" autocomplete="off" required>
        
        <ul class="results-dropdown" style="display: none;"></ul>
      </div>
      <div class="player-profile-picture-div pfp-hidden">
        <img class="player-profile-picture" src="/assets/default-avatar.png" />
      </div>
      ${!isPrimary ? `<button type="button" class="remove-player-btn">Remove player</button>` : ''}
    </div>
    
    <div class="videos-section" style="margin-left: 20px; padding: 10px;">
      <label>Player ${totalPlayerBlocks+1} Videos</label>
      <div class="videos-list-container">
        <div class="video-input-wrapper">
          <input type="url" class="video-url-input" placeholder="https://video-link.com" required>
          ${!isPrimary ? `<button type="button" class="remove-first-video-btn">X</button>` : ''}
        </div>
      </div>
      <button type="button" class="add-video-btn">+ Add another video 🎥</button>
    </div>
  `;

  playersContainer.appendChild(playerBlock);
  totalPlayerBlocks++;

  const removePlayerBtn = playerBlock.querySelector('.remove-player-btn');
  const addVideoBtn = playerBlock.querySelector('.add-video-btn');
  const videoListContainer = playerBlock.querySelector('.videos-list-container');
  const removeFirstVideoBtn = playerBlock.querySelector('.remove-first-video-btn');

  if (removePlayerBtn){
    removePlayerBtn.addEventListener('click', () => {
      playerBlock.remove();
      totalPlayerBlocks--;
    });
  }

  if (removeFirstVideoBtn) {
    removeFirstVideoBtn.addEventListener('click', () => {
      removeFirstVideoBtn.closest('.video-input-wrapper').remove();
    })
  }

  addVideoBtn.addEventListener('click', () => {
    const currentVideoCount = videoListContainer.querySelectorAll('.video-url-input').length;

    if (currentVideoCount >= 10) {
      alert("You're limited to 10 videos per player.");
      return;
    }

    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-input-wrapper';
    videoWrapper.innerHTML = `
      <input type="url" class="video-url-input" placeholder="https://video-link.com" required>
      <button type="button" class="remove-video-btn">X</button>
    `;

    videoListContainer.appendChild(videoWrapper);

    videoWrapper.querySelector('.remove-video-btn').addEventListener('click', () => {
      videoWrapper.remove();
    });
  });
}

addPlayerBtn.addEventListener('click', () => {
  createPlayerBlock('', false);
});

document.getElementById("modpack").addEventListener("change", (event) => {
  const leaderboardSelector = document.getElementById('leaderboardType');
  const sdcOption = leaderboardSelector.querySelector('option[value="sdc"]');
  leaderboardSelector.value = 'hq';
  const hqFields = document.getElementById("hqFields");
  const smhqFields = document.getElementById("smhqFields");
  const sdcFields = document.getElementById("sdcFields");
  hqFields.style.display = "block";
  smhqFields.style.display = "none";
  sdcFields.style.display = "none";

  if (event.target.value === "lc_modded_eclipsed_"){
    sdcOption.disabled = true;
  }else{
    sdcOption.disabled = false;
  }

  if (event.target.value === 'lc_modded_brutal_'){
    populateDropdown('moon', 'vanilla_moons');
    populateDropdown('moonSMHQ', 'vanilla_moons');
    populateDropdown('version', 'brutal_versions');
  }else if (event.target.value === 'lc_modded_eclipsed_'){
    populateDropdown('moon', 'vanilla_moons');
    populateDropdown('moonSMHQ', 'vanilla_moons');
    populateDropdown('version', 'eclipsed_versions');
  }else if (event.target.value === 'lc_modded_wesleysmoons_'){
    populateDropdown('moon', 'wesleys_moons');
    populateDropdown('moonSMHQ', 'wesleys_moons');
    populateDropdown('version', 'wesleys_versions');
  }else if (event.target.value === 'lc_modded_classicmoons_'){
    populateDropdown('moon', 'classic_moons');
    populateDropdown('moonSMHQ', 'classic_moons');
    populateDropdown('version', 'classic_versions');
  }
})

document.getElementById("leaderboardType").addEventListener("change", (event) => {
  const hqFields = document.getElementById("hqFields");
  const smhqFields = document.getElementById("smhqFields");
  const sdcFields = document.getElementById("sdcFields");
  const modpack = document.getElementById("modpack").value;

  hqFields.style.display = "none";
  smhqFields.style.display = "none";
  sdcFields.style.display = "none";

  if (event.target.value === "hq") {
    hqFields.style.display = "block";
  } else if (event.target.value === "smhq") {
    smhqFields.style.display = "block";
  } else if (event.target.value === "sdc") {
    sdcFields.style.display = "block";
  }

  const scrapType = document.getElementById('scrapType');
  const scrapLabel = scrapType.labels[0];
  if (modpack === "lc_modded_brutal_"){
    scrapType.style.display = 'none';
    scrapLabel.style.display = 'none';
  } else {
    scrapType.style.display = 'block';
    scrapLabel.style.display = 'block';
  }
});
  
document.getElementById("runSubmissionForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const leaderboardType = document.getElementById("leaderboardType").value;
  const modpack = document.getElementById("modpack").value;
  const date = document.getElementById("date").value;
  const collectionName = modpack + leaderboardType;
  
  let players = []
  document.querySelectorAll('.player-input').forEach(player => {
    if (player){
      players.push(player.value.trim());
    }
  });

  const hasDuplicates = new Set(players).size !== players.length;
  if (hasDuplicates) {
    console.error("Duplicate players in submission form. " + players);
    alert("You cannot use the same player multiple times in the same submission!");
    return;
  }
  
  const version = document.getElementById("version").value.trim();
  
  // Handle video inputs for each player
  const videos = {};
  document.querySelectorAll('.player-block').forEach(playerBlock => {
    if (playerBlock.querySelector('.video-url-input')){
      const playerName = playerBlock.querySelector('.player-input').value;
      if (playerName){
        let videoInputs = [];
        playerBlock.querySelectorAll('.video-url-input').forEach(videoInput => {
          if (videoInput.value){
            videoInputs.push(videoInput.value.trim());
          }
        });
        videos[playerName.trim()] = videoInputs;
      }else{
        alert("Please input player name.");
      }
    }
  });

  const logs = document.getElementById("logs").value;

  const spreadsheet = document.getElementById("spreadsheet").value;

  const comments = document.getElementById("comments").value;

  const publicComments = document.getElementById("publicComments").value;

  const submitter = loggedPlayerName;

  const verificationProgress = Number('0');

  let runData = {
    date: new Date(date),
    submissionDate: new Date(Date.now()),
    submitter,
    players,
    version,
    videos,
    verified: false,
    logs,
    spreadsheet,
    comments,
    publicComments,
    verificationProgress
  };

  // Add leaderboard-specific fields
  if (leaderboardType === "hq") {
    runData = {
      ...runData,
      quotaAmount: parseInt(document.getElementById("quotaAmount").value, 10),
      quotaFulfilled: parseInt(document.getElementById("quotaFulfilled").value, 10),
      quotaReached: parseInt(document.getElementById("quotaReached").value, 10),
      totalScrap: parseInt(document.getElementById("totalScrap").value, 10),
    };
  } else if (leaderboardType === "sdc") {
    if (modpack === 'lc_modded_brutal_'){
      runData = {
        ...runData,
        moon: document.getElementById("moon").value.trim(),
        totalScrap: parseInt(document.getElementById("totalScrapSDC").value, 10),
        equipment: document.getElementById("equipment").value.trim().split(",").map(item => item.trim()), // Split input into an array
      };
    }else {
      runData = {
        ...runData,
        moon: document.getElementById("moon").value.trim(),
        scrapType: document.getElementById("scrapType").value.trim(),
        totalScrap: parseInt(document.getElementById("totalScrapSDC").value, 10),
        equipment: document.getElementById("equipment").value.trim().split(",").map(item => item.trim()), // Split input into an array
      };
    }

  } else if (leaderboardType === "smhq") {
    runData = {
      ...runData,
      moon: document.getElementById("moonSMHQ").value.trim(),
      quotaAmount: parseInt(document.getElementById("quotaAmountSMHQ").value, 10),
      quotaFulfilled: parseInt(document.getElementById("quotaFulfilledSMHQ").value, 10),
      quotaReached: parseInt(document.getElementById("quotaReachedSMHQ").value, 10),
      totalScrap: parseInt(document.getElementById("totalScrapSMHQ").value, 10),
    };
  }

  if ((runData.quotaReached ?? 0) >= 100)
  { 
    console.warn('quotaReached cannot be higher than 99.');
    alert('Number of Quotas Reached cannot be 100 or higher. This field is for how many quotas you reached during your run. It is the same as the number of your last quota (but not the value).');
    return;
  }

  if ((runData.quotaFulfilled ?? 0) < 130){
    console.warn('quotaFulfilled cannot be lower than 130.');
    alert('Quota Fulfilled cannot be lower than 130. This field is for the value of the last quota that was fulfilled.');
  }

  if ((runData.quotaReached ?? 0) < 182){
    console.warn('quotaReached cannot be lower than 182.');
    alert('Quota Reached cannot be lower than 182. This field is for the value of the last quota reached.');
  }

  // Use modular SDK syntax to add the document
  try {
    const leaderboardRef = collection(db, collectionName);
    await addDoc(leaderboardRef, runData);
    alert("Run submitted successfully!");
    document.getElementById("runSubmissionForm").reset();
    const playerFields = document.getElementById('playerFields');
    playerFields.innerHTML = '';
    totalPlayerBlocks = 0;
    createPlayerBlock(loggedPlayerName, true);
    populateDropdown('moon', 'vanilla_moons');
    populateDropdown('moonSMHQ', 'vanilla_moons');
    populateDropdown('version', 'brutal_versions');
  } catch (error) {
    console.error("Error submitting run:", error);
    alert("There was an error submitting your run. Please try again.");
  }
});
  

document.addEventListener('DOMContentLoaded', () => {
  createPlayerBlock('', true);

  loadNavbar(handleAuthButtons);
});

function debounce(func, delay){
  let timeoutId;
  return function (...args){
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

document.addEventListener('input', debounce(async (e) => {
  if (!e.target.classList.contains('player-input')) return;

  const inputField = e.target;
  const wrapper = inputField.closest('.search-wrapper');
  const playerContainer = wrapper.closest('.player-header');
  const localDropdown = wrapper.querySelector('.results-dropdown');
  const searchTerm = inputField.value.trim().toLowerCase();
  const playerProfileIconDiv = playerContainer.querySelector('.player-profile-picture-div');
  const playerProfileIcon = playerContainer.querySelector('.player-profile-picture');
  if (!playerProfileIconDiv.classList.contains('pfp-hidden')){
    playerProfileIconDiv.classList.add('pfp-hidden');
  }

  if (searchTerm.length < 3){
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
        playerProfileIcon.src = userData.profilePicture || "/assets/default-avatar.png";
        playerProfileIconDiv.classList.remove('pfp-hidden');
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
    if (document.activeElement.classList.contains('player-input')) {
      document.activeElement.blur();
    }
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    getDoc(userDocRef).then((docSnapshot) => {
      if (docSnapshot.exists()){
        const userData = docSnapshot.data();
        document.querySelector('.player-input').value = userData.username;
        loggedPlayerName = userData.username;
        document.querySelector('.player-profile-picture-div').classList.remove('pfp-hidden');
        document.querySelector('.player-profile-picture').src = userData.profilePicture || "/assets/default-avatar.png";
      }
    });
  } else {
    console.log("No user authenticated");
  }
});

function populateDropdown(selectId, category) {
  const selectMenu = document.getElementById(selectId);
  const dataArray = gameData[category];

  const firstOption = selectMenu.options[0];
  selectMenu.innerHTML = '';
  selectMenu.appendChild(firstOption);

  const fragment = document.createDocumentFragment();

  dataArray.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    fragment.appendChild(opt);
  });

  selectMenu.appendChild(fragment);
}

// Since BC is the default option, load BC values
populateDropdown('moon', 'vanilla_moons');
populateDropdown('moonSMHQ', 'vanilla_moons');
populateDropdown('version', 'brutal_versions');
