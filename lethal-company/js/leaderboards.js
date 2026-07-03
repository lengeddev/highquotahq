import { loadNavbar, countryFlags } from './utils.js';
import { handleAuthButtons } from './auth.js';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db, auth } from "./firebase.js";


// Get the DOM elements
const collectionBtns = document.querySelectorAll('.collection-btn');
const filterSections = document.querySelectorAll('.filter-section');
const filterBtns = document.querySelectorAll('.filter-btn');
const leaderboard = document.getElementById('leaderboard');
const recentRuns = document.getElementById('recent-runs');

// Set up active collection
let activeCollection = 'leaderboards_hq';
let activeFilters = {
  playerCount: ['1'],
  versions: [],
  moon: [],
  scrapType: [],
};

const collectionMap = {
  'leaderboards_hq': 'Classic High Quota',
  'leaderboards_smhq': 'Single Moon High Quota',
  'leaderboards_sdc': 'Single Day Clear'
};

// Ensure "Player 1" button is visually active on page load
document.querySelector('[data-filter="1"]').classList.add('active');

const CACHE_KEY_PREFIX = 'leaderboard-cache-';
const CACHE_EXPIRY_MS = 10 * 60 * 1000 * 144; // 24 hrs

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Fetch raw runs data from cache or Firestore
const fetchRawRuns = async (collectionName) => {
  const cacheKey = CACHE_KEY_PREFIX + collectionName;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const cachedData = JSON.parse(cached);
    const age = Date.now() - cachedData.timestamp;
    if (age < CACHE_EXPIRY_MS) {
      console.log('Using cached data for', collectionName);
      return cachedData.runs;  // raw data, unfiltered
    }
  }

  // If no cache or cache expired, fetch fresh data
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const runs = querySnapshot.docs.map(doc => doc.data());

    localStorage.setItem(cacheKey, JSON.stringify({
      runs,
      timestamp: Date.now()
    }));

    return runs;
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    throw error;
  }
};


// Apply filters and sorting in-memory
const filterAndSortRuns = (runs) => {
  // Filter
  const filteredRuns = runs.filter(run => {
    const playerCount = run.players?.length || 0;
    const matchesPlayerCount = activeFilters.playerCount.length === 0 || 
                               activeFilters.playerCount.includes(playerCount.toString());

    const version = run.version;
    const matchesVersion = activeFilters.versions.length === 0 || 
                           activeFilters.versions.includes(version);

    const moon = run.moon || '';
    const matchesMoon = activeFilters.moon.length === 0 || 
                        activeFilters.moon.includes(moon);

    const scrapType = run.scrapType || '';
    const matchesScrapType = activeFilters.scrapType.length === 0 ||
                             activeFilters.scrapType.includes(scrapType);

    const isVerified = run.verified === true;


    return matchesPlayerCount && matchesVersion && matchesMoon && matchesScrapType && isVerified;
  });

  // Determine sort key
  let sortKey;
  if (activeCollection === "leaderboards_hq" || activeCollection === "leaderboards_smhq") {
    sortKey = "quotaAmount";
  } else if (activeCollection === "leaderboards_sdc") {
    sortKey = "totalScrap";
  }

  // Sort descending by key
  const sortedRuns = filteredRuns.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  // Add position number
  sortedRuns.forEach((run, index) => {
    run.position = index + 1;
  });

  return sortedRuns;
};

// Main function to fetch data & update leaderboard display
const fetchLeaderboardData = async (displaylatest = false) => {
  leaderboard.innerHTML = '<p>Loading...</p>';
  if (displaylatest === true) recentRuns.innerHTML = '<p>Loading...</p>';

  try {
    const rawRuns = await fetchRawRuns(activeCollection);           // get raw cached or fresh runs
    const filteredSortedRuns = filterAndSortRuns(rawRuns); // filter & sort in-memory
    displayLeaderboard(filteredSortedRuns);         // show leaderboard
    if (displaylatest === true) {
      const filteredLatestRuns = filterAndSortLatestRuns(rawRuns);
      displayLatest(filteredLatestRuns);
    }
  } catch (error) {
    leaderboard.innerHTML = '<p>Error loading leaderboard.</p>';
    recentRuns.innerHTML = '<p>Error loading latest runs.</p>';
    console.error(error);
  }
};

// Map DOM filter IDs to activeFilters keys
const filterTypeMap = {
  'player-count': 'playerCount',
  'version': 'versions',
  'moon': 'moon',
  'scrap-type': 'scrapType',
};

const filterAndSortLatestRuns = (runs) => {
  const filteredRecentRuns = runs.filter(run => {
    const isVerified = run.verified === true;
    return isVerified;
  });
  return filteredRecentRuns.sort((a, b) => {
    const timeA = a.verifiedAt?.seconds || 0;
    const timeB = b.verifiedAt?.seconds || 0;
    return timeB - timeA;
  });
}

// Event listener for filter buttons
filterBtns.forEach((btn) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();

    // Get the filter type from the parent container's ID
    const filterCategory = btn.closest('.filter-category');
    if (!filterCategory) {
      console.error("Filter button is missing a valid parent with the 'filter-category' class.");
      return;
    }

    const rawFilterType = filterCategory.id.replace('-filters', '');
    const filterType = filterTypeMap[rawFilterType];

    // Ensure the filter type exists in activeFilters
    if (!filterType || !activeFilters.hasOwnProperty(filterType)) {
      console.error(`Filter type '${rawFilterType}' does not exist in activeFilters.`);
      return;
    }

    const filterValue = btn.getAttribute('data-filter');

    if (filterType === 'playerCount') {
      activeFilters.playerCount = filterValue === 'any' ? [] : [filterValue];

      filterCategory.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
      btn.classList.add('active');
    } else if (filterType === 'moon') {
      activeFilters.moon = [filterValue];

      filterCategory.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
      btn.classList.add('active');
    } else {
      const isActive = btn.classList.contains('active');
      if (isActive) {
        btn.classList.remove('active');
        activeFilters[filterType] = activeFilters[filterType].filter((value) => value !== filterValue);
      } else {
        btn.classList.add('active');
        activeFilters[filterType].push(filterValue);
      }
    }

    // Fetch and display leaderboard data based on active filters
    fetchLeaderboardData(false);
  });
});

// Event listener for collection buttons
collectionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Set active collection
    activeCollection = btn.getAttribute('data-collection');

    // Reset active filters when switching collections
    activeFilters = {
      playerCount: ['1'],
      versions: [],
      moon: [],
      scrapType: [],
    };

    if (activeCollection == 'leaderboards_sdc' || activeCollection == 'leaderboards_smhq') {
      activeFilters.moon = ['41-Experimentation']
    }


    // Update UI to reflect selected collection
    collectionBtns.forEach(button => button.classList.remove('active'));
    btn.classList.add('active');

    // Reset filter button states
    document.querySelectorAll('.filter-section .filter-btn').forEach(button => button.classList.remove('active'));
    
    const playerOneButton = document.querySelector(`#${activeCollection}-filters [data-filter="1"]`);
    if (playerOneButton) playerOneButton.classList.add('active');

    const moonButton = document.querySelector(`#${activeCollection}-filters [data-filter="41-Experimentation"]`);
    if (moonButton) moonButton.classList.add('active');

    // Hide/show collection-specific filters
    document.querySelectorAll('.filter-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${activeCollection}-filters`).classList.add('active');

    // Fetch leaderboard data for the new collection
    fetchLeaderboardData(true);
  });
});

const displayLatest = (runs) => {
  recentRuns.innerHTML = '';
  const recentTitle = document.getElementById('recent-title');
  recentTitle.textContent = collectionMap[activeCollection];  
  if (runs.length === 0){
    recentRuns.innerHTML = '<p>No recent runs.</p>';
    return;
  }
  runs.slice(0, 10).forEach((run, index) => {
    const runValue = run.quotaAmount || run.totalScrap || 0;

    const runDiv = document.createElement('div');
    runDiv.classList.add('recent-entry');
    const playersDiv = document.createElement('div');
    playersDiv.classList.add('recent-players');
    playersDiv.textContent = `Players: `;

    run.players.forEach((player, i) => {
      const playerLink = document.createElement('a');
      playerLink.href = `/pages/profile.html?username=${encodeURIComponent(player)}`;
      playerLink.textContent = player;
      playerLink.classList.add('player-link');

      playersDiv.appendChild(playerLink);

      if (i < run.players.length - 1) {
        playersDiv.appendChild(document.createTextNode(', '));
      }
    });
    runDiv.appendChild(playersDiv);
    const versionDiv = document.createElement('div');
    versionDiv.classList.add('recent-version');
    if (activeCollection.endsWith('_sdc') || activeCollection.endsWith('_smhq')){
      versionDiv.textContent = `Version: ${run.version} - Moon: ${run.moon}`;
    } else {
      versionDiv.textContent = `Version: ${run.version}`;
    }
    runDiv.appendChild(versionDiv);

    const dateDiv = document.createElement('div');
    dateDiv.classList.add('recent-version');
    if (run.date){
      const runMs = run.date.seconds * 1000;
      const daysAgo = Math.round((runMs - Date.now()) / MS_PER_DAY);
      const absoluteDays = Math.abs(daysAgo);
      const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
      let dateDisplay = '';
      if (absoluteDays >= 365) {
        const yearsAgo = Math.round(daysAgo / 365);
        dateDisplay = rtf.format(yearsAgo, 'year');
      } else if (absoluteDays >= 30) {
        const monthsAgo = Math.round(daysAgo / 30);
        dateDisplay = rtf.format(monthsAgo, 'month');
      } else {
        dateDisplay = rtf.format(daysAgo, 'day');
      }
      dateDiv.textContent = `${dateDisplay}`;
    } else {
      dateDiv.textContent = 'Unknown Date';
    }
    runDiv.appendChild(dateDiv);

    const valueDiv = document.createElement('div');
    valueDiv.classList.add('recent-value');
    if (activeCollection.endsWith('hq')){
      valueDiv.textContent = `Quota ${run.quotaReached}: ${runValue}`;
    }else{
      valueDiv.textContent = `Collected: ${runValue}`;
    }
    runDiv.appendChild(valueDiv);

    const aDiv = document.createElement('a');
    aDiv.classList.add('element-link');
    aDiv.onclick = () => showRunDetails(run, index);
    aDiv.appendChild(runDiv);
    
    recentRuns.append(aDiv);
  });
};

const displayLeaderboard = (runs) => {
  leaderboard.innerHTML = '';

  if (runs.length === 0) {
    leaderboard.innerHTML = '<p>No runs found with the selected filters.</p>';
    return;
  }

  runs.sort((a, b) => {
    const valueA = a.quotaAmount || a.totalScrap || 0;
    const valueB = b.quotaAmount || b.totalScrap || 0;
    return valueB - valueA;
  });

  let currentRank = 1;
  let previousValue = null;
  let positionTracker = 1;


  runs.forEach((run, index) => {
    const runValue = run.quotaAmount || run.totalScrap || 0;
    
    if (runValue !== previousValue) {
      currentRank = positionTracker;
    }
    previousValue = runValue;
    positionTracker++; 


    const runDiv = document.createElement('div');
    runDiv.classList.add('run-entry');

    if (run.verifiedAt){
      const runVerifiedMs = run.verifiedAt.seconds * 1000;
      const daysAgoVerified = Math.round((runVerifiedMs - Date.now()) / MS_PER_DAY);
      const absoluteVerifiedDays = Math.abs(daysAgoVerified);
      if (absoluteVerifiedDays <= 30){
        const newRunDiv = document.createElement('div');
        newRunDiv.classList.add('new-run-indicator');
        newRunDiv.textContent = 'NEW';
        const newRunTooltip = document.createElement('div');
        newRunTooltip.classList.add('new-run-tooltip');
        newRunTooltip.textContent = 'Verified within the last 30 days.';
        newRunDiv.appendChild(newRunTooltip);
        runDiv.appendChild(newRunDiv);
      } 
    }

    const placementDiv = document.createElement('div');
    placementDiv.classList.add('run-placement');

    const positionDiv = document.createElement('div');
    positionDiv.classList.add('run-position');
    positionDiv.textContent = `#${currentRank}`;

    if (currentRank === 1) {
      positionDiv.classList.add('gold');
      runDiv.classList.add('gold-border');
    }
    else if (currentRank === 2) {
      positionDiv.classList.add('silver');
      runDiv.classList.add('silver-border');
    }
    else if (currentRank === 3) {
      positionDiv.classList.add('bronze');
      runDiv.classList.add('bronze-border');
    }

    placementDiv.appendChild(positionDiv);

    const playersDiv = document.createElement('div');
    playersDiv.classList.add('run-players');

    run.players.forEach((player, i) => {
      const playerLink = document.createElement('a');
      playerLink.href = `/pages/profile.html?username=${encodeURIComponent(player)}`;
      playerLink.textContent = player;
      playerLink.classList.add('player-link');

      playersDiv.appendChild(playerLink);

      if (i < run.players.length - 1) {
        playersDiv.appendChild(document.createTextNode(', '));
      }
    });

    placementDiv.appendChild(playersDiv);

    runDiv.appendChild(placementDiv);

    const metadataDiv = document.createElement('div');
    metadataDiv.classList.add('run-metadata');
    const versionDiv = document.createElement('div');
    versionDiv.classList.add('run-version');
    versionDiv.textContent = `Version: ${run.version}`;

    metadataDiv.appendChild(versionDiv);

    const dateDiv = document.createElement('div');
    dateDiv.classList.add('run-date');
    if (run.date){
      const runMs = run.date.seconds * 1000;
      const daysAgo = Math.round((runMs - Date.now()) / MS_PER_DAY);
      const absoluteDays = Math.abs(daysAgo);
      const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
      let dateDisplay = '';
      if (absoluteDays >= 365) {
        const yearsAgo = Math.round(daysAgo / 365);
        dateDisplay = rtf.format(yearsAgo, 'year');
      } else if (absoluteDays >= 30) {
        const monthsAgo = Math.round(daysAgo / 30);
        dateDisplay = rtf.format(monthsAgo, 'month');
      } else {
        dateDisplay = rtf.format(daysAgo, 'day');
      }
      dateDiv.textContent = `${dateDisplay}`;
    } else {
      dateDiv.textContent = 'Unknown Date';
    }
    metadataDiv.appendChild(dateDiv);

    runDiv.appendChild(metadataDiv);
    
    const valueDiv = document.createElement('div');
    valueDiv.classList.add('run-value');

    if (activeCollection === "leaderboards_hq" || activeCollection === "leaderboards_smhq") {
      valueDiv.textContent = `Quota ${run.quotaReached || 0}: ${run.quotaAmount || 0}`;
    } else if (activeCollection === "leaderboards_sdc") {
      valueDiv.textContent = `Collected: ${run.totalScrap || 0}`;
    }
    runDiv.appendChild(valueDiv);

    const aDiv = document.createElement('a');
    aDiv.classList.add('element-link');
    aDiv.onclick = () => showRunDetails(run, index);
    aDiv.appendChild(runDiv);

    leaderboard.appendChild(aDiv);
  });
};


export function showRunDetails(run, index) {
  const detailsPanel = document.getElementById('details-panel');
  
  // Helper function to format timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    let date;

    if (typeof timestamp.toDate === 'function'){
      date = timestamp.toDate();
    }else if (timestamp.seconds){
      date = new Date(timestamp.seconds);
    }else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'N/A';
    }

    const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0;
    return hasTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  // Helper function to format and display videos
  const formatVideos = (videosMap) => {
    if (videosMap && typeof videosMap === 'object') {
      return Object.keys(videosMap).map(playerName => {
        const videos = videosMap[playerName];
        if (Array.isArray(videos)) {
          return `
            <div class="video-card">
              <h4>Videos for ${playerName}</h4>
              <div class="video-links">
                ${videos.map(video => `<div class=video-thumbnail-cropper><a href="${video}" target="_blank"><img src="${getThumbnail(video)}" alt="${video}" class="video-thumbnail"></a></div>`).join('')}
              </div>
            </div>
          `;
        }
        return '';
      }).join('');
    }
    return 'No videos available.';
  };

  const getThumbnail = (url) => {
    const videoId = getVideoId(url);
    if (videoId === ''){
      return `/assets/link_thumbnail.png`;
    }else{
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  const getVideoId = (url) => {
    const regex = /(?:https?:\/\/(?:www\.)?youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|watch(?:\/|\?\S*v=))([a-zA-Z0-9_-]+))|youtu\.be\/([a-zA-Z0-9_-]+))/;
    const match = url.match(regex);
    return match ? match[1] || match[2] : '';
  };

  // details panel HTML content
  let runDetailsHtml = `
    <button id="close-btn" class="close-btn">←</button>
    <h2>Run Details</h2>
    <div class="run-details">
      <div class="video-section">${formatVideos(run.videos)}</div>
      <div class="stats-section">
        <h3>Run Information</h3>
        <p><strong>Players:</strong> 
          ${run.players.map(player => 
            `<a href="/pages/profile.html?username=${encodeURIComponent(player)}" class="player-link">${player}</a>`
          ).join(', ')}
        </p>
        <p><strong>Date:</strong> ${formatTimestamp(run.date)}</p>
  `;

  if (activeCollection === 'leaderboards_hq') {
    runDetailsHtml += `
      <p><strong>Quota Amount:</strong> ${run.quotaAmount}</p>
      <p><strong>Quota Fulfilled:</strong> ${run.quotaFulfilled}</p>
      <p><strong>Number of Quotas Reached:</strong> ${run.quotaReached}</p>
      <p><strong>Total Scrap:</strong> ${run.totalScrap}</p>
    `;
  }
  else if (activeCollection === 'leaderboards_sdc') {
    runDetailsHtml += `
      <p><strong>Total Scrap:</strong> ${run.totalScrap}</p>
      <p><strong>Scrap Type:</strong> ${run.scrapType}</p>
      <p><strong>Equipment:</strong> ${run.equipment}</p>
      <p><strong>Moon:</strong> ${run.moon}</p>
    `;
  }
  else if (activeCollection === 'leaderboards_smhq') {
    runDetailsHtml += `
      <p><strong>Quota Amount:</strong> ${run.quotaAmount}</p>
      <p><strong>Quota Fulfilled:</strong> ${run.quotaFulfilled}</p>
      <p><strong>Number of Quotas Reached:</strong> ${run.quotaReached}</p>
      <p><strong>Total Scrap:</strong> ${run.totalScrap}</p>
      <p><strong>Moon:</strong> ${run.moon}</p>
    `;
  }
  else {
    runDetailsHtml += `
      <p><strong>Additional Info:</strong> ${run.someOtherDetail || 'No additional info available.'}</p>
    `;
  }

  runDetailsHtml += `
    <p class="run-stat"><strong>Version:</strong> ${run.version}</p>
    <p class="run-stat"><strong>Verified At:</strong> ${formatTimestamp(run.verifiedAt)}</p>
    <p class="run-stat"><strong>Verified By:</strong> ${run.verifiedBy}</p>
    <p class="run-stat"><strong>Submitted By:</strong> ${run.submitter}</p>
    <p class="run-stat"><strong>Submitted At:</strong> ${formatTimestamp(run.submissionDate)}</p>
  `;
  
  detailsPanel.innerHTML = runDetailsHtml;

  if (run.publicComments){
    const commentsDiv = document.createElement('div');
    commentsDiv.classList.add('comments-div');
    const commentsLabel = document.createElement('h3');
    commentsLabel.classList.add('comments-title');
    commentsLabel.textContent = "Comments:";
    const commentsContent = document.createElement('p');
    commentsContent.classList.add('public-comment');
    commentsContent.textContent = run.publicComments;
    commentsDiv.appendChild(commentsLabel);
    commentsDiv.appendChild(commentsContent);
    detailsPanel.appendChild(commentsDiv);
  }

  setTimeout(() => {
    detailsPanel.classList.add('active');
  }, 50);

  setTimeout(() => {
    const leaderboard = document.getElementById('leaderboard');
    const filters = document.getElementById('filters');
    const recentruns = document.getElementById('recent-runs-container');
    leaderboard.classList.add('hidden');
    filters.classList.add('hidden');
    recentruns.classList.add('hidden');
  }, 50);

  const closeBtn = document.getElementById('close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeRunDetails);
  }
}

function closeRunDetails() {
  const detailsPanel = document.getElementById('details-panel');
  detailsPanel.classList.remove('active');
  
  const leaderboard = document.getElementById('leaderboard');
  const filters = document.getElementById('filters');
  const recentruns = document.getElementById('recent-runs-container');
  leaderboard.classList.remove('hidden');
  filters.classList.remove('hidden');
  recentruns.classList.remove('hidden');
}



fetchLeaderboardData(true);



document.addEventListener('DOMContentLoaded', function() {
    loadNavbar(handleAuthButtons);
});
