// js/buscar.js
window.renderSearch = function(data) {
  const withPhoto = (u) => ({
    ...u,
    photo: u.photo || `https://i.pravatar.cc/96?u=${encodeURIComponent(u.name || Math.random().toString(36).slice(2))}`
  });
  const usersWithPhotos = (data.users || []).map(withPhoto);
  return `
    <section class="search-section">
      <h2>Search users</h2>
      <input type="text" id="search-input" placeholder="Search by name or profession...">
      <div class="search-results" id="search-results">
        ${usersWithPhotos.map(u => {
          const levelInfo = window.calculateLevel ? window.calculateLevel(u.name) : {level: 1};
          return `
          <div class="user-card" data-user='${JSON.stringify(u).replace(/'/g, "&apos;")}'>
            <div style="position:relative; display:inline-block;">
              ${u.photo ? `<img class="user-avatar-img" src="${u.photo}" alt="${u.name}">` : `<div class="user-avatar">${u.name.charAt(0).toUpperCase()}</div>`}
              <div class="user-level-badge" style="
                position:absolute; 
                bottom:-4px; 
                right:-4px; 
                background:linear-gradient(135deg, var(--verde), var(--azul-pastel)); 
                color:white; 
                border-radius:50%; 
                width:24px; 
                height:24px; 
                display:flex; 
                align-items:center; 
                justify-content:center; 
                font-size:0.7em; 
                font-weight:700; 
                border:2px solid white;
                box-shadow:0 2px 4px rgba(0,0,0,0.2);
              ">${levelInfo.level}</div>
            </div>
            <div class="user-info">
              <h4>${u.name}</h4>
              <p class="user-profession">${u.bio}</p>
            </div>
          </div>
        `}).join('')}
      </div>
    </section>

    <!-- User Profile Modal -->
    <div id="user-profile-modal" class="modal" style="display:none;">
      <div class="modal-content" style="max-width:480px;">
        <span class="close-modal" id="close-user-modal">&times;</span>
        <div id="user-profile-content"></div>
      </div>
    </div>
  `;
}

window.initSearchListeners = function(data) {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const modal = document.getElementById("user-profile-modal");
  const closeBtn = document.getElementById("close-user-modal");
  const modalContent = document.getElementById("user-profile-content");

  if(!input || !results) return;

  // Search filter
  input.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = (window.appData.users || []).filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.bio.toLowerCase().includes(term)
    ).map(u => ({
      ...u,
      photo: u.photo || `https://i.pravatar.cc/96?u=${encodeURIComponent(u.name)}`
    }));
    
    results.innerHTML = filtered.map(u => {
      const levelInfo = window.calculateLevel ? window.calculateLevel(u.name) : {level: 1};
      return `
      <div class="user-card" data-user='${JSON.stringify(u).replace(/'/g, "&apos;")}'>
        <div style="position:relative; display:inline-block;">
          ${u.photo ? `<img class=\"user-avatar-img\" src=\"${u.photo}\" alt=\"${u.name}\">` : `<div class=\"user-avatar\">${u.name.charAt(0).toUpperCase()}</div>`}
          <div class="user-level-badge" style="
            position:absolute; 
            bottom:-4px; 
            right:-4px; 
            background:linear-gradient(135deg, var(--verde), var(--azul-pastel)); 
            color:white; 
            border-radius:50%; 
            width:24px; 
            height:24px; 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            font-size:0.7em; 
            font-weight:700; 
            border:2px solid white;
            box-shadow:0 2px 4px rgba(0,0,0,0.2);
          ">${levelInfo.level}</div>
        </div>
        <div class="user-info">
          <h4>${u.name}</h4>
          <p class="user-profession">${u.bio}</p>
        </div>
      </div>
    `}).join('');
    
    attachUserCardListeners();
  });

  results.style.maxHeight = "400px";
  results.style.overflowY = "auto";

  // User card click handler
  function attachUserCardListeners() {
    document.querySelectorAll('.user-card').forEach(card => {
      card.addEventListener('click', () => {
        const userData = JSON.parse(card.getAttribute('data-user'));
        showUserProfile(userData);
      });
    });
  }

  // Show user profile modal
  function showUserProfile(user) {
    const description = user.description || "Este usuario no ha añadido una descripción todavía.";
    
    modalContent.innerHTML = `
      <div style="text-align:center; padding:1rem;">
        ${user.photo ? `<img class="user-avatar-large-img" src="${user.photo}" alt="${user.name}">` : `<div class="user-avatar-large">${user.name.charAt(0).toUpperCase()}</div>`}
        <h2 style="margin:0.5rem 0 0.25rem 0;">${user.name}</h2>
        <p style="color:var(--verde, #2a9d8f); font-weight:600; margin:0 0 1rem 0;">${user.bio}</p>
        <p style="color:#666; line-height:1.6; margin:0 0 1.5rem 0; text-align:left;">${description}</p>
        ${(typeof user.points === 'number' && ((data.user && data.user.name === 'admin') || (data.user && data.user.name === user.name))) ? `<p style="margin:0 0 1rem 0; font-weight:600;">SerePoints: ${user.points}</p>` : ''}
        <button class="btn" id="send-message-btn" style="width:100%;">📨 Send Message</button>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    // Send message button: go to Mensajería and open chat
    document.getElementById('send-message-btn')?.addEventListener('click', () => {
      try{ sessionStorage.setItem('openChatWith', user.name); }catch(e){}
      modal.style.display = 'none';
      const btn = document.querySelector('[data-section="mensajeria"]');
      if(btn){ btn.click(); }
    });
  }

  // Close modal
  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal?.addEventListener('click', (e) => {
    if(e.target === modal){
      modal.style.display = 'none';
    }
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.style.display === 'flex'){
      modal.style.display = 'none';
    }
  });

  // Initial attach
  attachUserCardListeners();
}