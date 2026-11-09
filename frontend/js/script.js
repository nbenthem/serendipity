document.addEventListener("DOMContentLoaded", async () => {
  const content = document.getElementById("content");
  const navItems = document.querySelectorAll(".nav-item");

  const res = await fetch("data/data.json");
  const data = await res.json();

  const sections = {
    feed: () => `
      <section>
        <h2>Community Feed</h2>
        ${data.feed.map(p => `
          <div class="card post">
            <h3>@${p.user}</h3>
            <p>${p.text}</p>
            ${p.image ? `<img src="${p.image}" alt="post image" class="post-image">` : ""}
          </div>`).join("")}
      </section>
    `,
    docs: () => `
      <section>
        <h2>Documents</h2>
        ${data.docs.map(d => `
          <div class="card doc-item" data-file="${d.file}">
            <h3>${d.title}</h3>
            <p>${d.desc}</p>
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
              <a class="btn" href="${d.file}" download>Download</a>
              <button class="btn start-thread" data-file="${d.file}">Start thread</button>
            </div>
            <div class="doc-comments" id="comments-${d.file.replace(/[^a-zA-Z0-9]/g,'-')}">
              <!-- comentarios se renderizan aquí -->
            </div>
            <form class="comment-form" data-file="${d.file}" style="margin-top:0.5rem; display:none;">
              <textarea name="comment" placeholder="Write a public comment about this document..." required style="width:100%; min-height:60px; padding:0.5rem;"></textarea>
              <div style="margin-top:0.5rem;"><button class="btn" type="submit">Post comment</button></div>
            </form>
          </div>`).join("")}
      </section>
    `,
    perfil: () => `
      <section>
        <h2>Your Profile</h2>
        <div class="card profile-card">
          <img src="${data.user.photo || 'https://i.pravatar.cc/100'}" alt="foto" class="profile-photo">
          <p><strong id="profile-name">${data.user.name}</strong></p>
          <p id="profile-points">SerePoints: ${data.user.points || 0}</p>
          <p id="profile-bio">${data.user.bio || ''}</p>
          <div style="margin-top:1rem;">
            <button class="btn" id="edit-profile-btn">Edit profile</button>
          </div>
          <form id="edit-profile-form" style="margin-top:1rem; display:none;">
            <label>Name<br><input type="text" name="name" value="${data.user.name}" required></label>
            <label>Photo (URL)<br><input type="url" name="photo" value="${data.user.photo || ''}"></label>
            <label>Bio<br><textarea name="bio">${data.user.bio || ''}</textarea></label>
            <label>Location<br><input type="text" name="location" value="${data.user.location || ''}"></label>
            <label>Website<br><input type="url" name="website" value="${data.user.website || ''}"></label>
            <div style="margin-top:0.5rem;"><button class="btn" type="submit">Save</button></div>
          </form>
        </div>
      </section>
    `,
    buscar: () => `
      <section>
        <h2>Mini Market</h2>
        <div class="market-grid">
        ${data.market.map(m => `
          <div class="card market-item">
            ${m.image ? `<img src="${m.image}" alt="${m.name}" class="market-image">` : ''}
            <h3>${m.name}</h3>
            <p>${m.desc}</p>
            <button class="btn buy-btn">Comprar (€${m.price})</button>
          </div>`).join("")}
        </div>
      </section>
    `
  };

  const renderSection = name => {
    content.innerHTML = sections[name]();
    navItems.forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-section="${name}"]`).classList.add("active");
    // after render attach behaviors
    postRender(name);
  };

  function sanitizeId(str){
    return str.replace(/[^a-zA-Z0-9]/g,'-');
  }

  function getStoredComments(file){
    try{
      const key = `doc-comments-${file}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }

  function saveStoredComment(file, comment){
    const key = `doc-comments-${file}`;
    const arr = getStoredComments(file);
    arr.push(comment);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function postRender(name){
    if(name === 'docs'){
      // render existing comments into each doc
      data.docs.forEach(d => {
        const el = document.getElementById(`comments-${sanitizeId(d.file)}`);
        if(!el) return;
        const stored = getStoredComments(d.file);
        const all = (d.comments||[]).concat(stored);
        el.innerHTML = all.length ? all.map(c => `<div class=\"card\"><strong>@${c.user}</strong><p>${c.text}</p></div>`).join('') : '<p class="card">No comments yet.</p>';
      });

      // attach start-thread buttons
      document.querySelectorAll('.start-thread').forEach(btn => {
        btn.removeEventListener('click', startThreadHandler);
        btn.addEventListener('click', startThreadHandler);
      });

      // attach comment forms
      document.querySelectorAll('.comment-form').forEach(form => {
        form.removeEventListener('submit', commentFormHandler);
        form.addEventListener('submit', commentFormHandler);
      });
    }

    if(name === 'perfil'){
      const editBtn = document.getElementById('edit-profile-btn');
      const form = document.getElementById('edit-profile-form');
      if(editBtn && form){
        editBtn.addEventListener('click', () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; });
        form.addEventListener('submit', e => {
          e.preventDefault();
          const fd = new FormData(form);
          const updated = {
            name: fd.get('name'),
            photo: fd.get('photo'),
            bio: fd.get('bio'),
            location: fd.get('location'),
            website: fd.get('website'),
            points: data.user.points || 0
          };
          // update runtime data and persist
          data.user = Object.assign({}, data.user, updated);
          localStorage.setItem('profile', JSON.stringify(data.user));
          renderSection('perfil');
        });
      }
    }

    if(name === 'market'){
      // Buy buttons handled by initMarketListeners in market.js
    }
  }

  function startThreadHandler(e){
    const file = e.currentTarget.dataset.file;
    const form = document.querySelector(`.comment-form[data-file="${file}"]`);
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    const commentsEl = document.getElementById(`comments-${sanitizeId(file)}`);
    if(commentsEl) commentsEl.scrollIntoView({behavior:'smooth'});
  }

  function commentFormHandler(e){
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.dataset.file;
    const text = form.querySelector('textarea[name="comment"]').value.trim();
    if(!text) return;
    const comment = { user: data.user.name || 'Anonymous', text, ts: Date.now() };
    saveStoredComment(file, comment);
    // re-render comments for this doc
    const el = document.getElementById(`comments-${sanitizeId(file)}`);
    const stored = getStoredComments(file);
    el.innerHTML = stored.map(c => `<div class=\"card\"><strong>@${c.user}</strong><p>${c.text}</p></div>`).join('');
    form.reset();
  }

  // navegación
  navItems.forEach(i =>
    i.addEventListener("click", () => renderSection(i.dataset.section))
  );

  renderSection("feed");

  // small search helper (button-driven if search UI provided)
  function runSearchLocal(){
    const input = document.getElementById('search-input');
    const term = (input && input.value || '').trim().toLowerCase();
    const el = document.getElementById('search-results');
    if(!el) return;
    if(!term){ el.innerHTML = '<p class="card">Please enter a search term.</p>'; return; }
    const results = (data.users || [])
      .filter(u => (u.name||'').toLowerCase().includes(term) || (u.bio||'').toLowerCase().includes(term))
      .map(u => `<div class="card">@${u.name} — ${u.bio}</div>`)
      .join('');
    el.innerHTML = results || '<p class="card">No users found</p>';
  }

  document.addEventListener('click', (e) => {
    if(e.target && e.target.id === 'search-btn') runSearchLocal();
  });
});