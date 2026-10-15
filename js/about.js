import { loadNavbar } from './utils.js';
import { handleAuthButtons } from './auth.js';
import { getDocs, collection, query, where } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { db } from './firebase.js';


const teamSection = document.getElementById('team-section');

const backupProfilePic = "/assets/default-avatar.png";

const fetchTeamMembers = async () => {
  try {
    const rolesToFetch = ['admin', 'verifier', 'modded-verifier', 'site-developer'];
    const usersQuery = query(collection(db, 'users'), where('roles', 'array-contains-any', rolesToFetch));
    const usersSnapshot = await getDocs(usersQuery);

    const admins = [];
    const moderators = [];
    const verifiers = [];
    const moddedVerifiers = [];
    const siteDevelopers = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const { username, roles, profilePicture } = userData;

      if (Array.isArray(roles)) {
        if (roles.includes('admin')) admins.push({ username, profilePicture });
        if (roles.includes('moderator')) moderators.push({ username, profilePicture });
        if (roles.includes('verifier')) verifiers.push({ username, profilePicture });
        if (roles.includes('modded-verifier')) moddedVerifiers.push({ username, profilePicture });
        if (roles.includes('site-developer')) siteDevelopers.push({ username, profilePicture });
      }
    });

    displayTeamMembers(admins, moderators, verifiers, moddedVerifiers, siteDevelopers);

  } catch (error) {
    console.error("Error fetching team members:", error);
  }
};

const displayTeamMembers = (admins, moderators, verifiers, moddedVerifiers, siteDevelopers) => {
  const createProfileLink = (username, profilePicURL) => {
    const link = document.createElement('a');
    link.href = `/pages/profile.html?username=${username}`;
    link.target = "_blank";

    const profilePic = document.createElement('img');
    profilePic.src = profilePicURL || backupProfilePic;
    profilePic.alt = `${username}'s Profile Picture`;
    profilePic.classList.add('team-member-profile-pic');

    const memberName = document.createElement('span');
    memberName.textContent = username;

    link.appendChild(profilePic);
    link.appendChild(memberName);

    return link;
  };

  const adminList = document.getElementById('admin-list');
  admins.forEach(admin => {
    const listItem = document.createElement('li');
    const profileLink = createProfileLink(admin.username, admin.profilePicture);
    listItem.appendChild(profileLink);
    adminList.appendChild(listItem);
  });

  const moderatorList = document.getElementById('moderator-list');
  moderators.forEach(moderator => {
    const exists = admins.some(admin => admin.username === moderator.username)
    if (exists){
      return;
    }
    const listItem = document.createElement('li');
    const profileLink = createProfileLink(moderator.username, moderator.profilePicture);
    listItem.appendChild(profileLink);
    moderatorList.appendChild(listItem);
  })

  const verifierList = document.getElementById('verifier-list');
  verifiers.forEach(verifier => {
    const exists = admins.some(admin => admin.username === verifier.username)
    if (exists){
      return;
    }
    const existsMod = moderators.some(moderator => moderator.username === verifier.username)
    if (existsMod){
      return;
    }
    const listItem = document.createElement('li');
    const profileLink = createProfileLink(verifier.username, verifier.profilePicture);
    listItem.appendChild(profileLink);
    verifierList.appendChild(listItem);
  });

  const moddedVerifierList = document.getElementById('modded-verifier-list');
  moddedVerifiers.forEach(moddedVerifier => {
    const exists = admins.some(admin => admin.username === moddedVerifier.username)
    if (exists){
      return;
    }
    const existsMod = moderators.some(moderator => moderator.username === moddedVerifier.username)
    if (existsMod){
      return;
    }
    const listItem = document.createElement('li');
    const profileLink = createProfileLink(moddedVerifier.username, moddedVerifier.profilePicture);
    listItem.appendChild(profileLink);
    moddedVerifierList.appendChild(listItem);
  });

  const siteDeveloperList = document.getElementById('site-developer-list');
  siteDevelopers.forEach(siteDeveloper => {
    const listItem = document.createElement('li');
    const profileLink = createProfileLink(siteDeveloper.username, siteDeveloper.profilePicture);
    listItem.appendChild(profileLink);
    siteDeveloperList.appendChild(listItem);
  });
};

window.onload = fetchTeamMembers;


document.addEventListener('DOMContentLoaded', function() {
    loadNavbar(handleAuthButtons);
});