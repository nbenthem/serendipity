// js/perfil.js
function renderProfile(data) {
  return `
    <section class="profile-section">
      <h2>Profile</h2>
      <img src="${data.user.photo}" alt="Profile photo" class="profile-photo">
      <p>Name: ${data.user.name}</p>
      <p>SerePoints: ${data.user.points}</p>
    </section>
  `;
}

function initProfileListeners() {
  // place to add photo or profile change listeners
}
