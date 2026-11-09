document.addEventListener("DOMContentLoaded", async () => {
  const content = document.getElementById("content");
  const navItems = document.querySelectorAll(".nav-item");
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");
  const header = document.querySelector("header");
  const main = document.querySelector("main");

  // Toggle sidebar collapse
  if(hamburger) {
    hamburger.addEventListener("click", () => {
      const isCollapsed = sidebar.getAttribute("data-collapsed") === "true";
      sidebar.setAttribute("data-collapsed", !isCollapsed);
      header.classList.toggle("sidebar-collapsed");
      main.classList.toggle("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", !isCollapsed);
    });
  }

  // Restore sidebar state from localStorage
  try {
    const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if(sidebarCollapsed) {
      sidebar.setAttribute("data-collapsed", "true");
      header.classList.add("sidebar-collapsed");
      main.classList.add("sidebar-collapsed");
    }
  }catch(e){}

  // Usar datos incrustados (window.appData) en lugar de fetch
  let data = window.appData || {};

  // Ensure users array exists and sync with stored profiles for Search
  if(!Array.isArray(window.appData.users)) window.appData.users = [];
  if(!Array.isArray(data.users)) data.users = window.appData.users;

  // Merge any stored profiles into Search users on load
  try{
    Object.keys(localStorage).filter(k => k.startsWith('profile-')).forEach(k => {
      const profile = JSON.parse(localStorage.getItem(k) || 'null');
      if(profile && profile.name){
        const exists = window.appData.users.some(u => u.name === profile.name);
        if(!exists){
          window.appData.users.push({
            name: profile.name,
            bio: profile.bio || 'Member',
            description: profile.location || '',
            photo: profile.photo || `https://i.pravatar.cc/96?u=${encodeURIComponent(profile.name)}`,
            points: profile.points || 0
          });
        }
      }
    });
    data.users = window.appData.users;
  }catch(e){}

  // Helper to add/update a profile into Search users
  function ensureSearchUser(profile, prevName){
    if(!profile || !profile.name) return;
    // Remove previous entry if name changed
    if(prevName && prevName !== profile.name){
      window.appData.users = window.appData.users.filter(u => u.name !== prevName);
    }
    const idx = window.appData.users.findIndex(u => u.name === profile.name);
    const entry = {
      name: profile.name,
      bio: profile.bio || 'Member',
      description: profile.location || profile.description || '',
      photo: profile.photo || `https://i.pravatar.cc/96?u=${encodeURIComponent(profile.name)}`,
      points: profile.points || 0
    };
    if(idx >= 0){ window.appData.users[idx] = entry; } else { window.appData.users.push(entry); }
    data.users = window.appData.users;
  }

  // Helper to track points changes in user history and total earned
  window.addPointsHistory = function(userName, delta, reason){
    if(!userName || userName === 'Guest') return;
    const key = `points-history-${userName}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.push({ ts: Date.now(), delta, reason });
    localStorage.setItem(key, JSON.stringify(history));
    
    // Track total earned points for levels/badges (never decreases)
    if(delta > 0) {
      const totalEarnedKey = `total-earned-${userName}`;
      const currentTotal = parseInt(localStorage.getItem(totalEarnedKey) || '0');
      localStorage.setItem(totalEarnedKey, String(currentTotal + delta));
    }
  };

  // Get total earned points (for levels/badges)
  window.getTotalEarnedPoints = function(userName){
    if(!userName) return 0;
    const totalEarnedKey = `total-earned-${userName}`;
    let totalEarned = parseInt(localStorage.getItem(totalEarnedKey) || '0');
    
    // If no total earned points recorded yet, calculate from history
    if(totalEarned === 0) {
      const historyKey = `points-history-${userName}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      totalEarned = history.reduce((sum, entry) => sum + (entry.delta > 0 ? entry.delta : 0), 0);
      if(totalEarned > 0) {
        localStorage.setItem(totalEarnedKey, String(totalEarned));
      }
    }
    
    return totalEarned;
  };

  // Levels and Badges System
  window.calculateLevel = function(userName){
    // Use total earned points (not current spendable points)
    const totalEarned = window.getTotalEarnedPoints(userName);
    // Progressive formula: level = floor(sqrt(points/50))
    // Level 1: 50pts, Level 2: 200pts, Level 3: 450pts, Level 4: 800pts, etc.
    const level = Math.floor(Math.sqrt(totalEarned / 50)) + 1;
    const currentLevelStart = Math.pow(level - 1, 2) * 50;
    const nextLevelStart = Math.pow(level, 2) * 50;
    const progress = totalEarned - currentLevelStart;
    const levelRange = nextLevelStart - currentLevelStart;
    return {
      level: level,
      progress: progress,
      levelRange: levelRange,
      progressPercent: Math.min(100, (progress / levelRange) * 100),
      nextLevelPoints: nextLevelStart,
      totalEarned: totalEarned
    };
  };

  window.getUserStats = function(username){
    if(!username) return {};
    const profile = JSON.parse(localStorage.getItem(`profile-${username}`) || '{}');
    const pointsHistory = JSON.parse(localStorage.getItem(`points-history-${username}`) || '[]');
    const recommendations = JSON.parse(localStorage.getItem('recommendations') || '[]');
    const userRecs = recommendations.filter(r => r.user === username);
    
    // Calculate stats
    const stats = {
      totalPoints: profile.points || 0,
      documentsUploaded: 0, // Will be calculated from docs
      recommendationsSubmitted: userRecs.length,
      podiumRecommendations: 0, // Calculate from weekly podiums
      adminHighlights: userRecs.filter(r => r.highlightWeek).length,
      totalVotesReceived: userRecs.reduce((sum, r) => sum + (r.votes || 0), 0),
      commentsPosted: 0, // Will be calculated from comments
      streakWeeks: 0 // Will be calculated from activity
    };
    
    // Calculate podium recommendations
    const currentWeek = Math.floor(Date.now() / (7*24*60*60*1000));
    for(let week = currentWeek - 52; week <= currentWeek; week++) {
      const podium = JSON.parse(localStorage.getItem(`weekly-podium-${week}`) || '[]');
      const userRecsInPodium = userRecs.filter(r => podium.includes(String(r.id))).length;
      stats.podiumRecommendations += userRecsInPodium;
    }
    
    return stats;
  };

  window.calculateBadges = function(stats){
    const badges = [];
    
    // First Recommendation Badge - NEW!
    if(stats.recommendationsSubmitted >= 1) badges.push({name: 'First Reviewer', desc: 'Submitted your first recommendation', level: 1, priority: 1});
    
    // First Document Badge - NEW!
    if(stats.documentsUploaded >= 1) badges.push({name: 'First Contributor', desc: 'Uploaded your first document', level: 1, priority: 2});
    
    // Documentor: Multiple document milestones
    if(stats.documentsUploaded >= 5) badges.push({name: 'Documentor I', desc: '5+ documents shared', level: 1});
    if(stats.documentsUploaded >= 15) badges.push({name: 'Documentor II', desc: '15+ documents contributed', level: 2});
    if(stats.documentsUploaded >= 30) badges.push({name: 'Documentor III', desc: '30+ documents contributed', level: 3});
    
    // Curator: Recommendations reaching podium
    if(stats.podiumRecommendations >= 1) badges.push({name: 'Curator I', desc: 'First podium recommendation', level: 1});
    if(stats.podiumRecommendations >= 3) badges.push({name: 'Curator II', desc: '3+ podium recommendations', level: 2});
    if(stats.podiumRecommendations >= 10) badges.push({name: 'Curator III', desc: '10+ podium recommendations', level: 3});
    
    // Highlight Master: Several admin highlights
    if(stats.adminHighlights >= 1) badges.push({name: 'Highlight Master I', desc: 'First admin highlight', level: 1});
    if(stats.adminHighlights >= 3) badges.push({name: 'Highlight Master II', desc: '3+ admin highlights', level: 2});
    if(stats.adminHighlights >= 8) badges.push({name: 'Highlight Master III', desc: '8+ admin highlights', level: 3});
    
    // Engaged Commenter: Many qualified comments
    if(stats.commentsPosted >= 10) badges.push({name: 'Engaged Commenter I', desc: '10+ comments posted', level: 1});
    if(stats.commentsPosted >= 50) badges.push({name: 'Engaged Commenter II', desc: '50+ comments posted', level: 2});
    if(stats.commentsPosted >= 200) badges.push({name: 'Engaged Commenter III', desc: '200+ comments posted', level: 3});
    
    // Popular Pick: High-vote recommendation
    const highestVotes = Math.max(...(JSON.parse(localStorage.getItem('recommendations') || '[]').filter(r => r.user === stats.username).map(r => r.votes || 0)), 0);
    if(highestVotes >= 5) badges.push({name: 'Popular Pick I', desc: 'Recommendation with 5+ votes', level: 1});
    if(highestVotes >= 15) badges.push({name: 'Popular Pick II', desc: 'Recommendation with 15+ votes', level: 2});
    if(highestVotes >= 30) badges.push({name: 'Popular Pick III', desc: 'Recommendation with 30+ votes', level: 3});
    
    // Streaker: Consecutive active weeks
    if(stats.streakWeeks >= 2) badges.push({name: 'Streaker I', desc: '2+ consecutive active weeks', level: 1});
    if(stats.streakWeeks >= 5) badges.push({name: 'Streaker II', desc: '5+ consecutive active weeks', level: 2});
    if(stats.streakWeeks >= 12) badges.push({name: 'Streaker III', desc: '12+ consecutive active weeks', level: 3});
    
    // Sort badges by priority (higher first), then by level
    badges.sort((a, b) => {
      if(a.priority && b.priority) return b.priority - a.priority;
      if(a.priority) return -1;
      if(b.priority) return 1;
      return b.level - a.level;
    });
    
    return badges;
  };

  // Function to show points notification
  window.showPointsNotification = function(points, reason){
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 600;
      min-width: 250px;
      transform: translateX(300px);
      transition: transform 0.3s ease-in-out;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    notification.innerHTML = `
      <div style="font-size: 20px;">🎉</div>
      <div>
        <div style="font-size: 14px; font-weight: 700;">+${points} SerePoints!</div>
        <div style="font-size: 12px; opacity: 0.9;">${reason}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(300px)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  // Estado de autenticación (inicialmente deslogueado para demo)
  let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || false;

  // aplicar perfil guardado si existe
  try{
    const storedProfile = localStorage.getItem('profile');
    if(storedProfile && isLoggedIn) data.user = Object.assign({}, data.user, JSON.parse(storedProfile));
  }catch(e){}

  // Helper: check if current user is admin
  function isAdmin() {
    return data.user && data.user.name === 'admin';
  }

  // Exponer `data` globalmente
  window.data = data;

  function sanitizeId(str){ return String(str).replace(/[^a-zA-Z0-9]/g,'-'); }

  function getStoredComments(file){
    try{ const raw = localStorage.getItem(`doc-comments-${file}`); return raw? JSON.parse(raw): []; }catch(e){ return []; }
  }

  function saveStoredComment(file, comment){
    try{
      const key = `doc-comments-${file}`;
      const arr = getStoredComments(file);
      arr.push(comment);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(e){ console.error(e); }
  }

  // Render threaded comments for a document with reply support
  function renderCommentsForDoc(file){
    const el = document.getElementById(`comments-${sanitizeId(file)}`);
    if(!el) return;
    const d = data.docs.find(x => x.file === file) || { comments: [] };
    const stored = getStoredComments(file);
    const all = (d.comments||[]).concat(stored);
    if(!all.length){
      el.innerHTML = '<p class="card">No comments yet.</p>';
      return;
    }

    // Build threaded structure: comments with parentTs=null are top-level
    const topLevel = all.filter(c => !c.parentTs);
    const byParent = {};
    all.forEach(c => {
      if(c.parentTs){
        if(!byParent[c.parentTs]) byParent[c.parentTs] = [];
        byParent[c.parentTs].push(c);
      }
    });

    function renderComment(c, depth=0){
      const replies = byParent[c.ts] || [];
      const indent = depth > 0 ? `margin-left:${Math.min(depth*1.5, 6)}rem;` : '';
      return `
        <div class="comment-thread" style="${indent}">
          <div class="card comment-item" data-ts="${c.ts}" data-file="${file}">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
              <strong>@${c.user}</strong>
              <span style="flex:1"></span>
              <button class="btn small reply-comment" data-file="${file}" data-parent-ts="${c.ts}" style="font-size:0.85em; padding:0.3rem 0.6rem;">Reply</button>
              ${(c.user === (data.user.name||'') || isAdmin()) ? `<button class="btn small delete-comment" data-file="${file}" data-ts="${c.ts}" style="background:#d9534f;">Delete</button>` : ''}
            </div>
            <p style="margin:0;">${c.text}</p>
            <form class="reply-form" data-file="${file}" data-parent-ts="${c.ts}" style="display:none; margin-top:0.5rem; padding:0.5rem; background:#f9f9f9; border-radius:6px;">
              <textarea name="reply" placeholder="Write a reply..." required style="width:100%; min-height:50px; padding:0.5rem; border:1px solid #ddd; border-radius:4px;"></textarea>
              <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                <button class="btn" type="submit" style="font-size:0.9em; padding:0.5rem 1rem;">Post reply</button>
                <button class="btn" type="button" class="cancel-reply" style="background:#999; font-size:0.9em; padding:0.5rem 1rem;">Cancel</button>
              </div>
            </form>
          </div>
          ${replies.map(r => renderComment(r, depth+1)).join('')}
        </div>
      `;
    }

    el.innerHTML = topLevel.map(c => renderComment(c)).join('');

    // Attach handlers
    el.querySelectorAll('.delete-comment').forEach(btn => {
      btn.removeEventListener('click', deleteCommentHandler);
      btn.addEventListener('click', deleteCommentHandler);
    });
    el.querySelectorAll('.reply-comment').forEach(btn => {
      btn.removeEventListener('click', replyCommentHandler);
      btn.addEventListener('click', replyCommentHandler);
    });
    el.querySelectorAll('.reply-form').forEach(form => {
      form.removeEventListener('submit', replyFormHandler);
      form.addEventListener('submit', replyFormHandler);
      const cancelBtn = form.querySelector('[type="button"]');
      if(cancelBtn){
        cancelBtn.removeEventListener('click', () => {});
        cancelBtn.addEventListener('click', () => { form.style.display = 'none'; });
      }
    });
  }

  function replyCommentHandler(e){
    const parentTs = e.currentTarget.dataset.parentTs;
    const file = e.currentTarget.dataset.file;
    const form = document.querySelector(`.reply-form[data-file="${file}"][data-parent-ts="${parentTs}"]`);
    if(form){
      const isVisible = form.style.display !== 'none';
      // Hide all reply forms first
      document.querySelectorAll('.reply-form').forEach(f => f.style.display = 'none');
      form.style.display = isVisible ? 'none' : 'block';
      if(!isVisible) form.querySelector('textarea').focus();
    }
  }

  function replyFormHandler(e){
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.dataset.file;
    const parentTs = Number(form.dataset.parentTs);
    const text = form.querySelector('textarea[name="reply"]').value.trim();
    if(!text) return;
    const reply = { user: data.user.name || 'Anonymous', text, ts: Date.now(), parentTs };
    saveStoredComment(file, reply);
    renderCommentsForDoc(file);
    form.reset();
    form.style.display = 'none';
  }

  function deleteCommentHandler(e){
    const file = e.currentTarget.dataset.file;
    const ts = Number(e.currentTarget.dataset.ts);
    if(!confirm('Delete this comment? This action cannot be undone.')) return;
    try{
      const key = `doc-comments-${file}`;
      const arr = getStoredComments(file).filter(c => c.ts !== ts);
      localStorage.setItem(key, JSON.stringify(arr));
      // re-render comments for the doc
      renderCommentsForDoc(file);
   
      // If no comments remain, show the "Start thread" button again
      if(arr.length === 0){
        const startBtn = document.querySelector(`.start-thread[data-file="${file}"]`);
        if(startBtn) startBtn.style.display = 'inline-block';
        // Ocultar el formulario de publicar comentario para "recoger" la ventana
        const commentForm = document.querySelector(`.comment-form[data-file="${file}"]`);
        if(commentForm) commentForm.style.display = 'none';
        // Mostrar el mensaje "No hay comentarios aún" dentro del contenedor de comentarios
        const commentsEl = document.getElementById(`comments-${sanitizeId(file)}`);
        if(commentsEl){
          commentsEl.style.display = 'block';
          commentsEl.innerHTML = '<p class="card">No comments yet.</p>';
        }
      }
    }catch(err){ console.error(err); alert('Could not delete the comment.'); }
  }

  const sections = {
    home: () => {
      // if there's a dedicated renderer from home.js, use it; otherwise show a compact welcome
      if(window.renderHome) return window.renderHome(data);
      return `
      <section>
        <h2>Welcome</h2>
        <div class="card">
          <h3>Welcome to Serendipity</h3>
          <p>Discover community posts, docs and the mini market. Use the navigation to explore.</p>
          <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <button class="btn" onclick="document.querySelector('[data-section=feed]').click()">Go to Feed</button>
            <button class="btn" onclick="document.querySelector('[data-section=recommendations]').click()">Recommendations</button>
          </div>
        </div>
        <section style="margin-top:1rem;">
          <h3 style="text-align:center">Featured products</h3>
          <div class="market-grid">
            ${ (data.market||[]).slice(0,4).map(m => `
              <div class="card market-item">
                ${m.image? `<img src="${m.image}" alt="${m.name}" class="market-image">` : ''}
                <h4>${m.name}</h4>
                <p>${m.desc}</p>
                <div style="display:flex; gap:0.5rem;"><button class="btn buy-btn">Buy (€${m.price})</button></div>
              </div>
            `).join('') }
          </div>
        </section>
      </section>
      `;
    },
    recommendations: () => {
      if(window.renderRecommendations) return window.renderRecommendations(data);
      const items = data.market || [];
      return `
      <section>
        <h2>Recommendations</h2>
        <div class="card">
          <p>No recommendations available.</p>
        </div>
      </section>`;
    },
    feed: () => `
      <section>
        <h2>Community Feed</h2>
        <button class="fab" id="fab-new-post" title="Create post">+</button>
        ${data.feed.map((p, idx) => {
          const liked = JSON.parse(localStorage.getItem(`liked-${idx}`) || 'false');
          const comments = JSON.parse(localStorage.getItem(`feed-comments-${idx}`) || '[]');
          const date = new Date(p.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return `
          <div class="card post" data-post-idx="${idx}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h3 style="margin:0;">@${p.user}</h3>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.85em; color:#999;">${date}</span>
                ${(p.user === (data.user.name||'') || isAdmin()) ? `<button class="btn small delete-post" data-post-idx="${idx}" style="background:#d9534f; padding:0.25rem 0.5rem;">Delete</button>` : ''}
              </div>
            </div>
            <p>${p.text}</p>
            ${p.image && p.image.trim() !== '' ? `<img src="${p.image}" alt="Post image" class="post-image" loading="lazy" onerror="this.dataset.err='1'; this.style.opacity='0.6'; this.style.background='linear-gradient(135deg,#ececec,#d8d8d8)'; this.src=''; this.alt='Image not available';">` : ''}
            <div style="margin-top:1rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
              <button class="like-btn" data-post-idx="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.2em; ${liked ? 'color:var(--rojo-coral);' : 'color:#ccc;'} transition:color 0.2s;">
                ❤️ <span class="like-count">${(p.likes || 0) + (liked ? 1 : 0)}</span>
              </button>
              <button class="comment-btn" data-post-idx="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.2em; color:#999; transition:color 0.2s;">
                💬 <span class="comment-count">${comments.length}</span>
              </button>
            </div>
            <div class="post-comments" id="comments-feed-${idx}" style="margin-top:1rem; display:none; border-top:1px solid #eee; padding-top:1rem;"></div>
            <form class="feed-comment-form" data-post-idx="${idx}" style="margin-top:0.5rem; display:none;">
              <textarea name="comment" placeholder="Write a comment..." required style="width:100%; min-height:50px; padding:0.5rem; border:1px solid #ddd; border-radius:6px; font-family:inherit;"></textarea>
              <div style="margin-top:0.5rem;"><button class="btn" type="submit">Comment</button></div>
            </form>
          </div>
          `;
        }).join('')}
      </section>
    `,

    docs: () => `
      <section>
        <h2>Documents</h2>
        <button class="fab" id="fab-upload-doc" title="Upload document">+</button>
        ${data.docs.map((d, docIdx) => `
          <div class="card doc-item" data-file="${d.file}" data-doc-idx="${docIdx}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h3 style="margin:0;">${d.title}</h3>
              ${(d.uploadedBy === (data.user.name||'') || isAdmin()) ? `<button class="btn small delete-doc" data-doc-idx="${docIdx}" style="background:#d9534f; padding:0.25rem 0.5rem;">Delete</button>` : ''}
            </div>
            <p>${d.desc}</p>
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
              ${d.hasRealFile ? 
                `<button class="btn download-real-file" data-doc-id="${d.file}">Download</button>` : 
                `<a class="btn" href="${d.file}" download>Download</a>`
              }
              <button class="btn start-thread" data-file="${d.file}">Start thread</button>
            </div>
            <div class="doc-comments" id="comments-${sanitizeId(d.file)}"></div>
            <form class="comment-form" data-file="${d.file}" style="margin-top:0.5rem; display:none;">
              <textarea name="comment" placeholder="Write a public comment about this document..." required style="width:100%; min-height:60px; padding:0.5rem;"></textarea>
              <div style="margin-top:0.5rem;"><button class="btn" type="submit">Post comment</button></div>
            </form>
          </div>
        `).join('')}
      </section>
    `,

    perfil: () => {
      // Si no está logueado, mostrar formulario de login
      if(!isLoggedIn) {
        return `
          <section>
            <h2>Welcome to Serendipity</h2>
            <div class="card" style="max-width:500px; margin:2rem auto; padding:2rem;">
              <div style="text-align:center; margin-bottom:1.5rem;">
                <div style="font-size:3em; margin-bottom:0.5rem;">👋</div>
                <h3 style="margin:0 0 0.5rem 0; color:var(--rojo-coral);">Join Our Community</h3>
                <p style="color:#666; font-size:0.9em;">Sign in or create a new account to get started</p>
              </div>
              
              <form id="login-form" style="margin-bottom:1rem;">
                <div class="form-group">
                  <label>Username</label>
                  <input type="text" name="username" placeholder="Choose your username" required autofocus>
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input type="password" name="password" placeholder="Enter password" required>
                  <small style="color:#999; display:block; margin-top:0.25rem;">✨ For demo: use password <strong>123</strong></small>
                </div>
                <button type="submit" class="btn" style="width:100%; margin-top:1rem;">🚀 Sign In</button>
              </form>
              
              <div style="text-align:center; padding-top:1rem; border-top:1px solid #eee;">
                <p style="color:#666; font-size:0.85em; margin:0;">
                  New here? Just enter any username and password <strong>123</strong> to create your account!
                </p>
              </div>
            </div>
          </section>
        `;
      }
      
      // Si está logueado, mostrar perfil normal
      return `
      <section>
        <h2>Your Profile ${isAdmin() ? '<span style="background:#ff6b6b; color:#fff; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.7em; margin-left:0.5rem;">👑 ADMIN</span>' : ''}</h2>
        
        ${isAdmin() ? `
        <details class="card" style="margin-bottom:1.5rem; padding:1rem;">
          <summary style="cursor:pointer; font-weight:700; font-size:1.05rem; color:#ff6b6b; list-style:none; display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.9em;">▶</span> 🛡️ Admin Panel: User Management
          </summary>
          <div style="margin-top:0.8rem;">
            <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.6rem;">
              <button class="btn small" id="admin-reset-all-bonus" style="background:#6c63ff; font-size:0.85em;">Reset All Bonuses</button>
            </div>
            <input type="text" id="admin-user-search" placeholder="🔍 Search users..." style="width:100%; padding:0.6rem; margin-bottom:0.8rem; border:2px solid #ffd0d0; border-radius:6px; font-size:0.95em;">
            <div id="admin-users-list" style="max-height:300px; overflow-y:auto;">
              <!-- Users will be rendered here -->
            </div>
          </div>
        </details>
        ` : ''}
        
        <div class="card profile-card">
          <img src="${data.user.photo || 'https://i.pravatar.cc/100'}" alt="foto" class="profile-photo" id="profile-photo-display">
          <p><strong id="profile-name">${data.user.name}</strong></p>
          <p id="profile-points">SerePoints: ${data.user.points || 0}</p>
          ${(() => {
            const levelInfo = window.calculateLevel(data.user.name);
            return `
            <div style="margin:0.5rem 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                <span style="font-weight:600; color:var(--verde);">Level ${levelInfo.level}</span>
                <span style="font-size:0.8em; color:#666;">${levelInfo.progress}/${levelInfo.levelRange}</span>
              </div>
              <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:linear-gradient(90deg, var(--verde), var(--azul-pastel)); height:100%; width:${levelInfo.progressPercent}%; transition:width 0.3s ease;"></div>
              </div>
              <div style="font-size:0.75em; color:#666; margin-top:0.25rem;">Next level: ${levelInfo.nextLevelPoints} SerePoints (Total earned: ${levelInfo.totalEarned})</div>
            </div>`;
          })()}
          <p id="profile-bio">${data.user.bio || ''}</p>
          <p id="profile-location">${data.user.location || ''}</p>
          ${data.user.email ? `<p id="profile-email">📧 <a href="mailto:${data.user.email}" style="color:var(--rojo-coral); text-decoration:none;">${data.user.email}</a></p>` : ''}
          ${data.user.website ? `<p id="profile-website">🌐 <a href="${data.user.website}" target="_blank" rel="noopener" style="color:var(--rojo-coral); text-decoration:none;">Visit site</a></p>` : ''}
          
          <!-- Redes Sociales -->
          ${(data.user.social && Object.values(data.user.social).some(v => v)) ? `
            <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${data.user.social.twitter ? `<a href="${data.user.social.twitter}" target="_blank" rel="noopener" title="Twitter" style="font-size:1.5em; text-decoration:none;">𝕏</a>` : ''}
              ${data.user.social.instagram ? `<a href="${data.user.social.instagram}" target="_blank" rel="noopener" title="Instagram" style="font-size:1.5em; text-decoration:none;">📷</a>` : ''}
              ${data.user.social.github ? `<a href="${data.user.social.github}" target="_blank" rel="noopener" title="GitHub" style="font-size:1.5em; text-decoration:none;">🐙</a>` : ''}
              ${data.user.social.linkedin ? `<a href="${data.user.social.linkedin}" target="_blank" rel="noopener" title="LinkedIn" style="font-size:1.5em; text-decoration:none;">💼</a>` : ''}
            </div>
          ` : ''}
          
          <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <button class="btn" id="edit-profile-btn">✏️ Edit</button>
            <button class="btn" id="settings-btn">⚙️ Settings</button>
          </div>
        </div>
        
        <div id="profile-badges" class="card" style="margin-top:1rem;">
          <h4 style="margin:0 0 0.75rem 0; color:var(--rojo-coral);">🏆 Badges</h4>
          <div id="profile-badges-items">Loading...</div>
        </div>
        
        <div id="profile-wishlist" class="card" style="margin-top:1rem; display:block;">
          <h4>Wishlist</h4>
          <div id="profile-wishlist-items">Loading...</div>
        </div>

        <div id="profile-booklist" class="card" style="margin-top:1rem; display:block;">
          <h4>📚 Booklist</h4>
          <div id="profile-booklist-items">Loading...</div>
        </div>

        <!-- Modal de edición -->
        <div id="edit-modal" class="modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Edit Profile</h3>
              <button class="modal-close" id="close-edit-modal">✕</button>
            </div>
            <form id="edit-profile-form" class="modal-form">
              <div class="form-group">
                <label>Profile photo</label>
                <div style="display:flex; gap:1rem; align-items:center;">
                  <img id="photo-preview" src="${data.user.photo || 'https://i.pravatar.cc/100'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover;">
                  <input type="file" id="photo-file" accept="image/*" style="flex:1;">
                </div>
              </div>
              <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" value="${data.user.name||''}" required>
              </div>
              <div class="form-group">
                <label>Bio</label>
                <textarea name="bio" placeholder="Tell us about yourself...">${data.user.bio||''}</textarea>
              </div>
              <div class="form-group">
                <label>Location</label>
                <div style="display:flex; gap:0.5rem;">
                  <input type="text" id="location-input" name="location" value="${data.user.location||''}" placeholder="Tu ubicación..." style="flex:1;">
                  <button type="button" id="geolocate-btn" class="btn" style="white-space:nowrap; padding:0.8rem 1.2rem;">📍 Detect</button>
                </div>
                <div id="location-suggestions" style="margin-top:0.5rem;"></div>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${data.user.email||''}" placeholder="you@email.com">
              </div>
              <div class="form-group">
                <label>Website</label>
                <input type="url" name="website" value="${data.user.website||''}">
              </div>
              <div class="form-group">
                <label>Social profiles</label>
                <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                  <span style="font-weight:600; min-width:fit-content;">𝕏</span>
                  <input type="text" name="twitter" placeholder="@usuario" value="${data.user.social?.twitter?.replace(/^@/, '') || ''}" style="flex:1;">
                </div>
                <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                  <span style="font-weight:600; min-width:fit-content;">@</span>
                  <input type="text" name="instagram" placeholder="usuario" value="${data.user.social?.instagram?.replace(/^@/, '') || ''}" style="flex:1;">
                </div>
                <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                  <span style="font-weight:600; min-width:fit-content;">🐙</span>
                  <input type="text" name="github" placeholder="usuario" value="${data.user.social?.github?.replace(/^@/, '') || ''}" style="flex:1;">
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <span style="font-weight:600; min-width:fit-content;">💼</span>
                  <input type="text" name="linkedin" placeholder="usuario" value="${data.user.social?.linkedin?.replace(/^@/, '') || ''}" style="flex:1;">
                </div>
              </div>
              <div style="margin-top:1rem; display:flex; gap:0.5rem; justify-content:flex-end;">
                <button type="button" class="btn" style="background:#ccc; color:#333;" id="cancel-edit">Cancel</button>
                <button type="submit" class="btn">Save changes</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Panel de configuración -->
        <div id="settings-panel" class="modal" style="display:none;">
          <div class="modal-content" style="max-width:400px;">
            <div class="modal-header">
              <h3>Settings</h3>
              <button class="modal-close" id="close-settings">✕</button>
            </div>
            <div class="settings-tabs">
              <button class="tab-btn active" data-tab="privacy">🔒 Privacy</button>
              <button class="tab-btn" data-tab="notifications">🔔 Notifications</button>
              <button class="tab-btn" data-tab="appearance">🎨 Appearance</button>
            </div>
            <div class="tab-content">
              <!-- Privacidad -->
              <div class="tab-pane active" data-tab="privacy">
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" id="toggle-private" ${data.user.privateProfile ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Private profile</span>
                  </label>
                </div>
                <p style="font-size:0.85em; color:#666; margin-bottom:1rem;">Only approved users can view your profile.</p>
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" id="toggle-show-email" ${data.user.showEmail ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Show email on profile</span>
                  </label>
                </div>
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" id="toggle-allow-comments" checked>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Allow comments on my posts</span>
                  </label>
                </div>
              </div>
              <!-- Notificaciones -->
              <div class="tab-pane" data-tab="notifications">
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" checked>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Comment notifications</span>
                  </label>
                </div>
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" checked>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Message notifications</span>
                  </label>
                </div>
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" checked>
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Weekly digest</span>
                  </label>
                </div>
              </div>
              <!-- Apariencia -->
              <div class="tab-pane" data-tab="appearance">
                <div class="toggle-group">
                  <label class="toggle-label">
                    <input type="checkbox" class="toggle-input" id="toggle-dark-mode">
                    <span class="toggle-slider"></span>
                    <span style="margin-left:0.5rem;">Dark mode</span>
                  </label>
                </div>
                <label style="display:block; margin-top:1.5rem;">
                  <span style="font-weight:600; display:block; margin-bottom:0.5rem;">Font size</span>
                  <div class="font-size-selector">
                    <button type="button" class="font-size-btn" data-size="normal" style="font-size:0.9em;">Normal</button>
                    <button type="button" class="font-size-btn" data-size="large" style="font-size:1.05em;">Large</button>
                    <button type="button" class="font-size-btn" data-size="xlarge" style="font-size:1.2em;">Extra large</button>
                  </div>
                </label>
              </div>
            </div>
            <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #eee;">
              <button class="btn" style="background:#ff6b6b; width:100%;" id="logout-btn">🚪 Log out</button>
            </div>
          </div>
        </div>
      </section>
      `;
    },

    buscar: () => window.renderSearch ? window.renderSearch(data) : '<section><h2>Search Users</h2><p>Loading...</p></section>',

    mensajeria: () => window.renderMensajeria ? window.renderMensajeria(data) : '<section><h2>Mensajería</h2><p>Loading...</p></section>',

    dailybonus: () => window.renderDailyBonus ? window.renderDailyBonus(data) : '<section><h2>Daily Bonus</h2><p>Loading...</p></section>',

    market: () => window.renderMarket ? window.renderMarket(data) : `
      <section>
        <h2>Mini Market</h2>
        <div class="market-grid">
          ${data.market.map(m => `
            <div class="card market-item market-card" data-name="${m.name}">
              ${m.image? `<img src="${m.image}" alt="${m.name}" class="market-image">` : ''}
              <h3>${m.name}</h3>
              <p>${m.desc}</p>
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <button class="btn buy-btn">Buy (€${m.price})</button>
                <button class="btn wishlist-btn" data-name="${m.name}">Wishlist</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `
  };

  const renderSection = name => {
    content.innerHTML = sections[name]();
    navItems.forEach(i => i.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-section="${name}"]`);
    if(activeBtn) activeBtn.classList.add("active");
    postRender(name);
    // Keep messaging unread badge in sync on every render
    if(window.updateMessagingBadge) try{ window.updateMessagingBadge(data); }catch(e){}
  };

  function postRender(name){
    if(name === 'docs'){
      // render comments for each doc and attach delete handlers
      data.docs.forEach(d => {
        const el = document.getElementById(`comments-${sanitizeId(d.file)}`);
        if(!el) return;
        renderCommentsForDoc(d.file);
      });

      document.querySelectorAll('.start-thread').forEach(btn => {
        btn.removeEventListener('click', startThreadHandler);
        btn.addEventListener('click', startThreadHandler);
      });

      document.querySelectorAll('.comment-form').forEach(form => {
        form.removeEventListener('submit', commentFormHandler);
        form.addEventListener('submit', commentFormHandler);
      });
      
      // Delete document handlers
      document.querySelectorAll('.delete-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docIdx = Number(e.currentTarget.dataset.docIdx);
          if(!confirm('Delete this document?')) return;
          const doc = data.docs[docIdx];
          // Eliminar archivo de localStorage si existe
          if(doc.hasRealFile && doc.file) {
            localStorage.removeItem(doc.file);
          }
          data.docs.splice(docIdx, 1);
          renderSection('docs');
        });
      });
    }

    if(name === 'feed'){
      // Likes en publicaciones
      document.querySelectorAll('.like-btn').forEach(btn => {
        btn.removeEventListener('click', likePostHandler);
        btn.addEventListener('click', likePostHandler);
      });

      // Expandir comentarios
      document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.removeEventListener('click', expandCommentsHandler);
        btn.addEventListener('click', expandCommentsHandler);
      });

      // Formularios de comentarios en feed
      document.querySelectorAll('.feed-comment-form').forEach(form => {
        form.removeEventListener('submit', feedCommentHandler);
        form.addEventListener('submit', feedCommentHandler);
      });

      // Renderizar comentarios existentes
      data.feed.forEach((p, idx) => {
        renderFeedComments(idx);
      });

      // Image click-to-expand modal for feed images
      document.querySelectorAll('.post-image').forEach(img => {
        img.addEventListener('click', () => {
          if(img.dataset.err === '1') return; // skip broken images
          let modal = document.getElementById('image-modal');
          if(!modal){
            modal = document.createElement('div');
            modal.id = 'image-modal';
            modal.className = 'image-modal';
            modal.innerHTML = '<img src="" alt="Full view">';
            document.body.appendChild(modal);
            modal.addEventListener('click', () => { modal.classList.remove('active'); });
          }
          const modalImg = modal.querySelector('img');
          modalImg.src = img.src;
          modalImg.alt = img.alt;
          modal.classList.add('active');
        });
      });

      // FAB for new post
      const fabNewPost = document.getElementById('fab-new-post');
      if(fabNewPost){
        fabNewPost.removeEventListener('click', openNewPostModal);
        fabNewPost.addEventListener('click', openNewPostModal);
      }
      
      // Delete post handlers
      document.querySelectorAll('.delete-post').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const postIdx = Number(e.currentTarget.dataset.postIdx);
          if(!confirm('Delete this post?')) return;
          // Eliminar comentarios del post
          localStorage.removeItem(`feed-comments-${postIdx}`);
          localStorage.removeItem(`liked-${postIdx}`);
          data.feed.splice(postIdx, 1);
          renderSection('feed');
        });
      });
    }

    if(name === 'docs'){
      // FAB for upload document
      const fabUploadDoc = document.getElementById('fab-upload-doc');
      if(fabUploadDoc){
        fabUploadDoc.removeEventListener('click', openUploadDocModal);
        fabUploadDoc.addEventListener('click', openUploadDocModal);
      }

      // Manejador para descargar archivos reales
      document.querySelectorAll('.download-real-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docId = e.currentTarget.dataset.docId;
          try {
            const storedFile = localStorage.getItem(docId);
            if(!storedFile){
              alert('File not found in storage.');
              return;
            }
            const fileData = JSON.parse(storedFile);
            
            // Crear un enlace temporal para descargar
            const link = document.createElement('a');
            link.href = fileData.data;
            link.download = fileData.name || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Feedback visual
            e.currentTarget.textContent = '✓ Downloaded';
            setTimeout(() => {
              e.currentTarget.textContent = 'Download';
            }, 2000);
          } catch(err) {
            console.error('Error downloading file:', err);
            alert('Error downloading file');
          }
        });
      });
    }

    if(name === 'perfil'){
      // Handler para login form
      const loginForm = document.getElementById('login-form');
      if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = e.target.username.value.trim();
          const password = e.target.password.value;
          
          // Validar password: "123" para usuarios normales, "admin" para admin
          const validPassword = (username.toLowerCase() === 'admin' && password === 'admin') || password === '123';
          if(validPassword) {
            // Login exitoso
            isLoggedIn = true;
            localStorage.setItem('isLoggedIn', 'true');
            
            // Crear perfil de usuario (preservar "admin" en minúsculas para isAdmin())
            const finalUsername = username.toLowerCase() === 'admin' ? 'admin' : username;
            
            // Check if admin has already created/modified this user's profile
            let existingProfile = null;
            try {
              existingProfile = JSON.parse(localStorage.getItem(`profile-${finalUsername}`) || 'null');
            } catch(e) {}
            
            if(existingProfile && existingProfile.name === finalUsername) {
              // Use existing profile (admin may have modified points, etc.)
              data.user = existingProfile;
            } else {
              // Create new default profile
              data.user = {
                name: finalUsername,
                photo: `https://i.pravatar.cc/100?u=${username}`,
                points: 0,
                bio: '',
                location: '',
                email: '',
                website: '',
                social: {}
              };
              localStorage.setItem(`profile-${finalUsername}`, JSON.stringify(data.user));
            }
            
            // Always update the generic profile to match current user
            localStorage.setItem('profile', JSON.stringify(data.user));

            // Add to Search users list
            ensureSearchUser(data.user);
            
            // Mostrar mensaje de éxito y recargar perfil
            alert(`✨ Welcome, ${username}! Your account is ready.`);
            renderSection('perfil');
          } else {
            alert('❌ Incorrect password. Try "123"');
          }
        });
        return; // Si mostramos login, no ejecutar el resto
      }
      
      // If we've navigated here to view another user's profile, load it from sessionStorage
      const viewingRaw = sessionStorage.getItem('viewingUser');
      let viewingUser = null;
      try{ viewingUser = viewingRaw ? JSON.parse(viewingRaw) : null; }catch(e){ viewingUser = null; }
      if(viewingUser){
        // populate profile display fields with viewingUser data (falling back to current data.user where appropriate)
        const photoEl = document.getElementById('profile-photo-display');
        const nameEl = document.getElementById('profile-name');
        const pointsEl = document.getElementById('profile-points');
        const bioEl = document.getElementById('profile-bio');
        const locEl = document.getElementById('profile-location');
        const emailEl = document.getElementById('profile-email');
        const websiteEl = document.getElementById('profile-website');
        if(photoEl) photoEl.src = viewingUser.photo || viewingUser.avatar || (data.user.photo || 'https://i.pravatar.cc/100');
        if(nameEl) nameEl.textContent = viewingUser.name || viewingUser.username || data.user.name;
        if(pointsEl) {
          const canViewPoints = (data.user && data.user.name === 'admin') || (data.user && data.user.name === viewingUser.name);
          if(canViewPoints) {
            const levelInfo = window.calculateLevel(viewingUser.name);
            pointsEl.innerHTML = `
              SerePoints: ${viewingUser.points || 0}
              <div style="margin:0.5rem 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                  <span style="font-weight:600; color:var(--verde);">Level ${levelInfo.level}</span>
                  <span style="font-size:0.8em; color:#666;">${levelInfo.progress}/${levelInfo.levelRange}</span>
                </div>
                <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                  <div style="background:linear-gradient(90deg, var(--verde), var(--azul-pastel)); height:100%; width:${levelInfo.progressPercent}%; transition:width 0.3s ease;"></div>
                </div>
                <div style="font-size:0.75em; color:#666; margin-top:0.25rem;">Next level: ${levelInfo.nextLevelPoints} SerePoints (Total earned: ${levelInfo.totalEarned})</div>
              </div>
            `;
            pointsEl.style.display = 'block';
          } else {
            pointsEl.textContent = '';
            pointsEl.style.display = 'none';
          }
        }
        
        // Update badges for viewed user
        const badgesContainer = document.getElementById('profile-badges-items');
        if(badgesContainer && viewingUser.name) {
          const stats = window.getUserStats(viewingUser.name);
          stats.username = viewingUser.name;
          
          // Count documents uploaded by this user
          stats.documentsUploaded = data.docs.filter(d => d.uploadedBy === viewingUser.name).length;
          
          // Count comments from stored comments
          let totalComments = 0;
          try {
            data.docs.forEach(doc => {
              const comments = JSON.parse(localStorage.getItem(`doc-comments-${doc.file}`) || '[]');
              totalComments += comments.filter(c => c.user === viewingUser.name).length;
            });
            // Add feed comments
            for(let i = 0; i < (data.feed || []).length; i++) {
              const feedComments = JSON.parse(localStorage.getItem(`feed-comments-${i}`) || '[]');
              totalComments += feedComments.filter(c => c.user === viewingUser.name).length;
            }
          } catch(e) {}
          stats.commentsPosted = totalComments;
          
          const badges = window.calculateBadges(stats);
          
          if(badges.length === 0) {
            badgesContainer.innerHTML = '<div style="color:#666; text-align:center; padding:1rem;">No badges earned yet.</div>';
          } else {
            badgesContainer.innerHTML = badges.map(badge => `
              <div class="badge badge-level-${badge.level}" title="${badge.desc}" style="
                display:inline-block;
                padding:0.4rem 0.8rem; 
                margin:0.25rem;
                border-radius:16px; 
                font-size:0.8em; 
                font-weight:600;
                background:${badge.level === 1 ? 'linear-gradient(135deg, #ffd93d, #ffcd02)' : badge.level === 2 ? 'linear-gradient(135deg, #ff6b6b, #ff5252)' : 'linear-gradient(135deg, #6bcf7f, #4caf50)'};
                color:${badge.level === 1 ? '#333' : '#fff'};
                border:2px solid ${badge.level === 1 ? '#ffcd02' : badge.level === 2 ? '#ff5252' : '#4caf50'};
                box-shadow:0 2px 4px rgba(0,0,0,0.1);
                cursor:default;
              ">
                ${badge.name}
              </div>
            `).join('');
          }
        }
        
        if(bioEl) bioEl.textContent = viewingUser.bio || '';
        if(locEl) locEl.textContent = viewingUser.location || '';
        // update email/website fields, replace nodes if necessary
        if(emailEl){ if(viewingUser.email) emailEl.innerHTML = `📧 <a href="mailto:${viewingUser.email}" style="color:var(--rojo-coral); text-decoration:none;">${viewingUser.email}</a>`; else emailEl.innerHTML = ''; }
        if(websiteEl){ if(viewingUser.website) websiteEl.innerHTML = `🌐 <a href="${viewingUser.website}" target="_blank" rel="noopener" style="color:var(--rojo-coral); text-decoration:none;">Visit site</a>`; else websiteEl.innerHTML = ''; }
        // social links: replace the social block by inserting anchors (we keep markup simple)
        const socialContainer = Array.from(document.querySelectorAll('.profile-card')).find(n=>n)?.querySelector('div');
        // hide edit/settings buttons to prevent editing someone else's profile
        const editBtn = document.getElementById('edit-profile-btn');
        const settingsBtn = document.getElementById('settings-btn');
        if(editBtn) editBtn.style.display = 'none';
        if(settingsBtn) settingsBtn.style.display = 'none';
        // provide a small close 'x' on the profile card to exit viewing mode
        if(!document.getElementById('viewing-close')){
          const closeX = document.createElement('button');
          closeX.id = 'viewing-close';
          closeX.className = 'modal-close';
          closeX.style.position = 'absolute';
          closeX.style.top = '12px';
          closeX.style.right = '12px';
          closeX.style.zIndex = '5';
          closeX.textContent = '✕';
          closeX.addEventListener('click', () => { try{ sessionStorage.removeItem('viewingUser'); }catch(e){}; const el = document.getElementById('viewing-close'); if(el) el.remove(); renderSection('perfil'); });
          const card = document.querySelector('.profile-card');
          if(card) { card.style.position = 'relative'; card.appendChild(closeX); }
        }
      } else {
        // ensure edit/settings visible when not viewing another user
        const editBtn = document.getElementById('edit-profile-btn');
        const settingsBtn = document.getElementById('settings-btn');
        if(editBtn) editBtn.style.display = '';
        if(settingsBtn) settingsBtn.style.display = '';
        const back = document.getElementById('back-to-me'); if(back) back.remove();
      }
      const editBtn = document.getElementById('edit-profile-btn');
      const settingsBtn = document.getElementById('settings-btn');
      const editModal = document.getElementById('edit-modal');
      const settingsPanel = document.getElementById('settings-panel');
      const closeEditModal = document.getElementById('close-edit-modal');
      const closeSettings = document.getElementById('close-settings');
      const editForm = document.getElementById('edit-profile-form');
      const photoFile = document.getElementById('photo-file');
      const photoPreview = document.getElementById('photo-preview');
      const logoutBtn = document.getElementById('logout-btn');
      const geolocateBtn = document.getElementById('geolocate-btn');
      const locationInput = document.getElementById('location-input');
      const toggleDarkMode = document.getElementById('toggle-dark-mode');
      const fontSizeBtns = document.querySelectorAll('.font-size-btn');

      // Cargar preferencias almacenadas
      const prefs = JSON.parse(localStorage.getItem('preferences')) || {};
      if(prefs.darkMode) {
        document.body.classList.add('dark-mode');
        toggleDarkMode.checked = true;
      }
      if(prefs.fontSize) {
        document.body.classList.add(`font-${prefs.fontSize}`);
      }
      fontSizeBtns.forEach(btn => {
        if(btn.dataset.size === prefs.fontSize) btn.classList.add('active');
      });

      // Abrir modal de edición
      editBtn.addEventListener('click', () => { editModal.style.display = 'flex'; });
      closeEditModal.addEventListener('click', () => { editModal.style.display = 'none'; });
      document.getElementById('cancel-edit').addEventListener('click', () => { editModal.style.display = 'none'; });

      // Cerrar modales al hacer clic fuera
      editModal.addEventListener('click', (e) => { if(e.target === editModal) editModal.style.display = 'none'; });
      settingsPanel.addEventListener('click', (e) => { if(e.target === settingsPanel) settingsPanel.style.display = 'none'; });

      // Preview de foto
      photoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file){
          const reader = new FileReader();
          reader.onload = (ev) => {
            photoPreview.src = ev.target.result;
            data.user.photo = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      });

      // Geolocation for location
      geolocateBtn.addEventListener('click', () => {
        if('geolocation' in navigator){
          geolocateBtn.textContent = '⏳ Localizando...';
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              // Usar OpenStreetMap Nominatim (requiere internet)
              fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                .then(r => r.json())
                .then(d => {
                  const addr = d.address;
                  const city = addr.city || addr.town || addr.county || addr.state || 'Ubicación desconocida';
                  const country = addr.country || '';
                  locationInput.value = `${city}${country ? ', ' + country : ''}`;
                  geolocateBtn.textContent = '📍 Detect';
                })
                .catch(() => {
                  alert('Could not get location. Try again.');
                  geolocateBtn.textContent = '📍 Detect';
                });
            },
            (err) => {
              alert('Location permission denied or unavailable.');
              geolocateBtn.textContent = '📍 Detect';
            }
          );
        } else {
          alert('Geolocation not available in your browser.');
        }
      });

      // Guardar perfil
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const prevName = data.user.name;
        const fd = new FormData(editForm);
        const twitterHandle = fd.get('twitter').trim();
        const instagramHandle = fd.get('instagram').trim();
        const githubHandle = fd.get('github').trim();
        const linkedinHandle = fd.get('linkedin').trim();
        
        const updated = {
          name: fd.get('name'),
          photo: data.user.photo || fd.get('photo'),
          bio: fd.get('bio'),
          email: fd.get('email'),
          location: fd.get('location'),
          website: fd.get('website'),
          social: {
            twitter: twitterHandle ? `https://twitter.com/${twitterHandle}` : '',
            instagram: instagramHandle ? `https://instagram.com/${instagramHandle}` : '',
            github: githubHandle ? `https://github.com/${githubHandle}` : '',
            linkedin: linkedinHandle ? `https://linkedin.com/in/${linkedinHandle}` : ''
          },
          points: data.user.points || 0
        };
        data.user = Object.assign({}, data.user, updated);
        localStorage.setItem('profile', JSON.stringify(data.user));
        if(data.user.name) localStorage.setItem(`profile-${data.user.name}`, JSON.stringify(data.user));
        // Update Search users list (handles name change)
        ensureSearchUser(data.user, prevName);
        editModal.style.display = 'none';
        renderSection('perfil');
      });

      // Panel de configuración
      settingsBtn.addEventListener('click', () => { settingsPanel.style.display = 'flex'; });
      closeSettings.addEventListener('click', () => { settingsPanel.style.display = 'none'; });

      // Admin: render users list
      if(isAdmin()){
        const usersList = document.getElementById('admin-users-list');
        if(usersList){
          // Collect users from multiple sources (include Search users to match the Search window)
          const userSet = new Map();

          // Add current user
          if(data.user && data.user.name) userSet.set(data.user.name, data.user);

          // Get users from localStorage with prefix
          Object.keys(localStorage).filter(k => k.startsWith('profile-')).forEach(k => {
            try{
              const profile = JSON.parse(localStorage.getItem(k));
              if(profile && profile.name) userSet.set(profile.name, profile);
            }catch(e){}
          });

          // Include users defined in Search (window.appData.users)
          (window.appData?.users || []).forEach(u => {
            if(u && u.name){
              const existing = userSet.get(u.name) || {};
              const merged = Object.assign({}, u, existing);
              if(!merged.photo) merged.photo = `https://i.pravatar.cc/50?u=${encodeURIComponent(u.name)}`;
              userSet.set(u.name, merged);
            }
          });

          // Get users from feed posts
          (data.feed || []).forEach(p => {
            if(p.user && !userSet.has(p.user)) {
              userSet.set(p.user, { name: p.user, photo: `https://i.pravatar.cc/50?u=${p.user}`, points: 0 });
            }
          });

          // Get users from documents
          (data.docs || []).forEach(d => {
            if(d.uploadedBy && !userSet.has(d.uploadedBy)) {
              userSet.set(d.uploadedBy, { name: d.uploadedBy, photo: `https://i.pravatar.cc/50?u=${d.uploadedBy}`, points: 0 });
            }
          });

          // Get users from recommendations
          const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
          recs.forEach(r => {
            if(r.user && !userSet.has(r.user)) {
              userSet.set(r.user, { name: r.user, photo: `https://i.pravatar.cc/50?u=${r.user}`, points: 0 });
            }
          });

          const uniqueUsers = Array.from(userSet.values());

          function renderUsers(users) {
            if(!users || users.length === 0){
              usersList.innerHTML = '<div style="padding:0.8rem; color:#666;">No users found.</div>';
              return;
            }
            usersList.innerHTML = users.map(u => `
              <div class="admin-user-row" data-username="${u.name}" style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem; border-bottom:1px solid #eee; cursor:pointer;">
                <img src="${u.photo || 'https://i.pravatar.cc/50'}" alt="${u.name || ''}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                  <strong>${u.name || '(no name)'}</strong> ${u.name === 'admin' ? '<span style="font-size:0.7em; color:#ff6b6b;">👑</span>' : ''}
                  <div style="font-size:0.8em; color:#666;">SerePoints: ${u.points || 0}${u.contributions ? ` • ${u.contributions} contributions` : ''}</div>
                </div>
                ${u.name !== 'admin' ? `
                  <button class=\"btn small admin-edit-points\" data-username=\"${u.name}\" style=\"background:#28a745; font-size:0.8em;\">Edit SerePoints</button>
                  <button class=\"btn small admin-reset-dailybonus\" data-username=\"${u.name}\" style=\"background:#6c63ff; font-size:0.8em;\">Reset Bonus</button>
                ` : '<span style="font-size:0.75em; color:#999;">Protected</span>'}
              </div>
            `).join('');

            // Attach handlers after rendering
            // Admin: edit user SerePoints only
            usersList.querySelectorAll('.admin-edit-points').forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = e.currentTarget.dataset.username;
                const storedKey = `profile-${username}`;
                let userProfile = null;
                try{
                  userProfile = JSON.parse(localStorage.getItem(storedKey) || '{}');
                }catch(e){}
                if(!userProfile || !userProfile.name) {
                  alert('User profile not found.');
                  return;
                }
                const newPoints = prompt(`Edit SerePoints for @${username}:`, userProfile.points || 0);
                if(newPoints === null) return;
                const points = parseInt(newPoints);
                if(isNaN(points)){
                  alert('Invalid number.');
                  return;
                }
                const oldPoints = userProfile.points || 0;
                const pointsDiff = points - oldPoints;
                userProfile.points = points;
                localStorage.setItem(storedKey, JSON.stringify(userProfile));
                
                // Also update main profile if it's the current user
                if(data.user && data.user.name === username){
                  data.user.points = points;
                  localStorage.setItem('profile', JSON.stringify(data.user));
                }
                
                // Log the admin change to points history
                if(window.addPointsHistory && pointsDiff !== 0) {
                  window.addPointsHistory(username, pointsDiff, `Admin adjustment (${oldPoints} → ${points})`);
                }
                
                alert(`✓ SerePoints updated to ${points} for @${username}`);
                renderSection('perfil');
              });
            });
            
            // Open modal on row click (except when clicking buttons)
            usersList.querySelectorAll('.admin-user-row').forEach(row => {
              row.addEventListener('click', (e) => {
                if((e.target.closest && e.target.closest('.admin-edit-points')) || (e.target.closest && e.target.closest('.admin-reset-dailybonus'))) return;
                const username = row.dataset.username;
                const user = (Array.from(userSet.values()).find(x => x.name === username)) || { name: username };
                showAdminUserModal(user);
              });
            });
            // Admin: reset weekly Daily Bonus for a user
            usersList.querySelectorAll('.admin-reset-dailybonus').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const username = e.currentTarget.dataset.username;
                if(!username) return;
                if(!confirm(`Reset Daily Bonus for @${username}?`)) return;
                try{
                  const key = `daily-bonus-${username}`;
                  localStorage.removeItem(key);
                  // Also remove legacy global key to avoid re-migration overriding the reset
                  localStorage.removeItem('daily-bonus');
                  alert(`✓ Daily Bonus reset for @${username}.`);
                }catch(err){ alert('Could not reset Daily Bonus.'); }
                e.stopPropagation();
              });
            });
          }

          // Helper: show user detail modal (name, profession, description, points)
          function showAdminUserModal(user){
            let modal = document.getElementById('user-profile-modal');
            if(!modal){
              modal = document.createElement('div');
              modal.id = 'user-profile-modal';
              modal.className = 'modal';
              modal.innerHTML = `
                <div class="modal-content" style="max-width:480px;">
                  <button class="modal-close" aria-label="Close">×</button>
                  <div id="user-profile-content"></div>
                </div>`;
              document.body.appendChild(modal);
              modal.addEventListener('click', (ev)=>{ if(ev.target === modal) modal.classList.remove('active'); });
              modal.querySelector('.modal-close').addEventListener('click', ()=> modal.classList.remove('active'));
            }
            const content = modal.querySelector('#user-profile-content');
            const description = user.description || 'Este usuario no ha añadido una descripción todavía.';
            content.innerHTML = `
              <div style="text-align:center; padding:1rem;">
                ${user.photo ? `<img class="user-avatar-large-img" src="${user.photo}" alt="${user.name}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1rem;">` : `<div class="user-avatar-large">${(user.name||'?').charAt(0).toUpperCase()}</div>`}
                <h2 style="margin:0.5rem 0 0.25rem 0;">${user.name||''}</h2>
                <p style="color:var(--verde, #2a9d8f); font-weight:600; margin:0 0 1rem 0;">${user.bio||''}</p>
                <p style="color:#666; line-height:1.6; margin:0 0 1rem 0; text-align:left;">${description}</p>
                ${((data.user && data.user.name === 'admin') || (data.user && data.user.name === user.name)) ? (() => {
                  const levelInfo = window.calculateLevel(user.name);
                  return `
                  <p style="margin:0 0 1rem 0; font-weight:600;">SerePoints: ${user.points||0}${user.contributions? ` • ${user.contributions} contributions` : ''}</p>
                  <div style="margin:0.5rem 0 1rem 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                      <span style="font-weight:600; color:var(--verde);">Level ${levelInfo.level}</span>
                      <span style="font-size:0.8em; color:#666;">${levelInfo.progress}/${levelInfo.levelRange}</span>
                    </div>
                    <div style="background:#eee; height:6px; border-radius:3px; overflow:hidden;">
                      <div style="background:linear-gradient(90deg, var(--verde), var(--azul-pastel)); height:100%; width:${levelInfo.progressPercent}%; transition:width 0.3s ease;"></div>
                    </div>
                    <div style="font-size:0.7em; color:#666;">Total earned: ${levelInfo.totalEarned} SerePoints</div>
                  </div>`;
                })() : (user.contributions ? `<p style="margin:0 0 1rem 0; font-weight:600;">${user.contributions} contributions</p>` : '')}
                ${(() => {
                  const stats = window.getUserStats(user.name);
                  stats.username = user.name;
                  stats.documentsUploaded = data.docs.filter(d => d.uploadedBy === user.name).length;
                  
                  let totalComments = 0;
                  try {
                    data.docs.forEach(doc => {
                      const comments = JSON.parse(localStorage.getItem(`doc-comments-${doc.file}`) || '[]');
                      totalComments += comments.filter(c => c.user === user.name).length;
                    });
                    for(let i = 0; i < (data.feed || []).length; i++) {
                      const feedComments = JSON.parse(localStorage.getItem(`feed-comments-${i}`) || '[]');
                      totalComments += feedComments.filter(c => c.user === user.name).length;
                    }
                  } catch(e) {}
                  stats.commentsPosted = totalComments;
                  
                  const badges = window.calculateBadges(stats);
                  
                  if(badges.length === 0) return '';
                  return `
                  <div style="margin:0 0 1rem 0;">
                    <h4 style="margin:0 0 0.5rem 0; color:var(--rojo-coral);">🏆 Badges</h4>
                    <div style="display:flex; flex-wrap:wrap; gap:0.25rem; justify-content:center;">
                      ${badges.map(badge => `
                        <div class="badge" title="${badge.desc}" style="
                          padding:0.25rem 0.5rem; 
                          border-radius:12px; 
                          font-size:0.7em; 
                          font-weight:600;
                          background:${badge.level === 1 ? 'linear-gradient(135deg, #ffd93d, #ffcd02)' : badge.level === 2 ? 'linear-gradient(135deg, #ff6b6b, #ff5252)' : 'linear-gradient(135deg, #6bcf7f, #4caf50)'};
                          color:${badge.level === 1 ? '#333' : '#fff'};
                          border:2px solid ${badge.level === 1 ? '#ffcd02' : badge.level === 2 ? '#ff5252' : '#4caf50'};
                        ">
                          ${badge.name}
                        </div>
                      `).join('')}
                    </div>
                  </div>`;
                })()}
                ${user.name !== 'admin' ? `
                  <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
                    <button class="btn" id="admin-modal-edit-user" data-username="${user.name}" style="background:#17a2b8;">Edit</button>
                    <button class="btn" id="admin-modal-delete-user" data-username="${user.name}" style="background:#d9534f;">Delete</button>
                    <button class="btn btn-secondary" id="admin-close-modal">Close</button>
                  </div>
                ` : `
                  <div style="display:flex; gap:0.5rem; justify-content:center;">
                    <button class="btn btn-secondary" id="admin-close-modal">Close</button>
                  </div>
                `}
              </div>`;
            modal.classList.add('active');
            document.getElementById('admin-close-modal').addEventListener('click', ()=> modal.classList.remove('active'));
            
            // Modal Edit button handler (edit user info, not points)
            const modalEditBtn = document.getElementById('admin-modal-edit-user');
            if(modalEditBtn){
              modalEditBtn.addEventListener('click', () => {
                const username = modalEditBtn.dataset.username;
                const storedKey = `profile-${username}`;
                let userProfile = null;
                try{
                  userProfile = JSON.parse(localStorage.getItem(storedKey) || localStorage.getItem('profile'));
                }catch(e){}
                if(!userProfile || userProfile.name !== username) {
                  alert('User profile not found.');
                  return;
                }
                const newName = prompt('New username:', userProfile.name);
                if(!newName) return;
                const newBio = prompt('Bio:', userProfile.bio || '');
                const newLocation = prompt('Location:', userProfile.location || '');
                
                // Update profile info
                const oldName = userProfile.name;
                userProfile.name = newName;
                if(newBio !== null) userProfile.bio = newBio;
                if(newLocation !== null) userProfile.location = newLocation;
                
                // If name changed, update storage keys and content attribution
                if(newName !== oldName){
                  localStorage.removeItem(storedKey);
                  localStorage.setItem(`profile-${newName}`, JSON.stringify(userProfile));
                  // Update attribution in content
                  (data.feed || []).forEach(p => { if(p.user === oldName) p.user = newName; });
                  (data.docs || []).forEach(d => { if(d.uploadedBy === oldName) d.uploadedBy = newName; });
                  alert(`User updated to "${newName}"`);
                } else {
                  localStorage.setItem(storedKey, JSON.stringify(userProfile));
                  alert(`User info updated.`);
                }
                
                modal.classList.remove('active');
                renderSection('perfil');
              });
            }
            
            // Modal Delete button handler
            const modalDeleteBtn = document.getElementById('admin-modal-delete-user');
            if(modalDeleteBtn){
              modalDeleteBtn.addEventListener('click', () => {
                const username = modalDeleteBtn.dataset.username;
                if(!confirm(`Delete user "${username}"? This will remove their profile and content attribution.`)) return;
                // Remove from localStorage
                localStorage.removeItem(`profile-${username}`);
                // Remove their posts/docs/comments (mark as deleted or reassign to Anonymous)
                data.feed = (data.feed || []).filter(p => p.user !== username);
                data.docs = (data.docs || []).filter(d => d.uploadedBy !== username);
                alert(`User "${username}" deleted.`);
                modal.classList.remove('active');
                renderSection('perfil');
              });
            }
          }

          // Initial render inside scope
          renderUsers(uniqueUsers);

          // Search functionality inside scope
          const searchInput = document.getElementById('admin-user-search');
          if(searchInput) {
            searchInput.addEventListener('input', (e) => {
              const query = e.target.value.toLowerCase().trim();
              if(!query) {
                renderUsers(uniqueUsers);
              } else {
                const filtered = uniqueUsers.filter(u => (u.name || '').toLowerCase().includes(query));
                renderUsers(filtered);
              }
            });
          }

          // Global reset: clear all users' weekly Daily Bonus
          const resetAllBtn = document.getElementById('admin-reset-all-bonus');
          if(resetAllBtn){
            resetAllBtn.addEventListener('click', () => {
              // Show modal with two options
              const modal = document.createElement('div');
              modal.className = 'modal active';
              modal.innerHTML = `
                <div class="modal-content">
                  <h3>Reset All Daily Bonuses</h3>
                  <p style="margin:1rem 0;">Do you want to keep or reset SerePoints for all users?</p>
                  <div style="display:flex; gap:0.5rem; justify-content:center;">
                    <button class="btn" id="reset-keep-points" style="background:#2a9d8f;">Keep SerePoints</button>
                    <button class="btn" id="reset-clear-points" style="background:#ff6b6b;">Reset SerePoints to 0</button>
                    <button class="btn btn-secondary" id="reset-cancel">Cancel</button>
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
              
              document.getElementById('reset-keep-points').addEventListener('click', () => {
                try{
                  Object.keys(localStorage).forEach(k => { if(k.startsWith('daily-bonus-')) localStorage.removeItem(k); });
                  localStorage.removeItem('daily-bonus');
                  alert('✓ Daily Bonus reset for all users. SerePoints kept.');
                }catch(err){ alert('Could not reset bonuses.'); }
                document.body.removeChild(modal);
              });
              
              document.getElementById('reset-clear-points').addEventListener('click', () => {
                if(!confirm('This will reset ALL SerePoints to 0 for ALL users. Continue?')) {
                  document.body.removeChild(modal);
                  return;
                }
                try{
                  Object.keys(localStorage).forEach(k => { 
                    if(k.startsWith('daily-bonus-')) localStorage.removeItem(k);
                    if(k.startsWith('profile-')){
                      const profile = JSON.parse(localStorage.getItem(k) || '{}');
                      profile.points = 0;
                      localStorage.setItem(k, JSON.stringify(profile));
                    }
                  });
                  localStorage.removeItem('daily-bonus');
                  // Reset current user's points in memory
                  if(data.user) data.user.points = 0;
                  localStorage.setItem('profile', JSON.stringify(data.user));
                  alert('✓ Daily Bonus and SerePoints reset for all users.');
                }catch(err){ alert('Could not reset bonuses and points.'); }
                document.body.removeChild(modal);
              });
              
              document.getElementById('reset-cancel').addEventListener('click', () => {
                document.body.removeChild(modal);
              });
              
              modal.addEventListener('click', (e) => {
                if(e.target === modal) document.body.removeChild(modal);
              });
            });
          }
        }
      }

      // Tabs de configuración
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          document.querySelector(`.tab-pane[data-tab="${tab}"]`).classList.add('active');
        });
      });

      // Guardar cambios de privacidad
      const togglePrivate = document.getElementById('toggle-private');
      const toggleShowEmail = document.getElementById('toggle-show-email');
      if(togglePrivate) togglePrivate.addEventListener('change', () => {
        data.user.privateProfile = togglePrivate.checked;
        localStorage.setItem('profile', JSON.stringify(data.user));
      });
      if(toggleShowEmail) toggleShowEmail.addEventListener('change', () => {
        data.user.showEmail = toggleShowEmail.checked;
        localStorage.setItem('profile', JSON.stringify(data.user));
      });

      // Modo oscuro
      toggleDarkMode.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        const prefs = JSON.parse(localStorage.getItem('preferences')) || {};
        prefs.darkMode = toggleDarkMode.checked;
        localStorage.setItem('preferences', JSON.stringify(prefs));
      });

      // Tamaño de fuente
      fontSizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const size = btn.dataset.size;
          fontSizeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.body.classList.remove('font-normal', 'font-large', 'font-xlarge');
          if(size !== 'normal') document.body.classList.add(`font-${size}`);
          const prefs = JSON.parse(localStorage.getItem('preferences')) || {};
          prefs.fontSize = size;
          localStorage.setItem('preferences', JSON.stringify(prefs));
        });
      });

      // Logout
      logoutBtn.addEventListener('click', () => {
        if(confirm('Log out?')) {
          localStorage.removeItem('profile');
          localStorage.setItem('isLoggedIn', 'false');
          isLoggedIn = false;
          data.user = { name: 'Guest', photo: 'https://via.placeholder.com/80', points: 0 };
          settingsPanel.style.display = 'none';
          renderSection('perfil');
        }
      });

      // Render wishlist in profile
      (function renderProfileWishlist(){
        const container = document.getElementById('profile-wishlist-items');
        if(!container) return;
        const userName = (data.user && data.user.name) || 'Guest';
        const key = `wishlist-${userName}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if(!list.length){ container.innerHTML = '<p style="color:#666;">No items in your wishlist.</p>'; return; }
        // Build a card-style display using data.market to show thumbnails and price
        container.innerHTML = list.map(name => {
          const prod = (data.market || []).find(m => m.name === name) || {};
          const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'360\' height=\'240\' viewBox=\'0 0 360 240\'><rect width=\'100%\' height=\'100%\' fill=\'%23f3f3f3\'/><g transform=\'translate(36,36) scale(0.7)\' fill=\'%23999\'><path d=\'M16 128 L56 48 L112 152 L168 80 L240 176 L304 32 L336 176 L16 128 Z\'/></g></svg>';
          const img = prod.image ? `<img src="${prod.image}" alt="${prod.name || name}" class="market-image" style="width:64px; height:48px; object-fit:cover; border-radius:6px;" onerror="this.onerror=null;this.src='${placeholder}';">` : `<div style=\"width:64px;height:48px;border-radius:6px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;color:#999;\">No image</div>`;
          return `
            <div class="profile-wish-card" data-name="${name}" style="display:flex; gap:0.5rem; align-items:center; padding:0.5rem; border-bottom:1px solid #eee;">
              <div style="flex:0 0 auto">${img}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                <div style="font-size:0.85em; color:#666;">${prod.desc || ''}</div>
              </div>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn small view-wish">View</button>
                <button class="btn small remove-wish">Remove</button>
              </div>
            </div>
          `;
        }).join('');

        // attach handlers
        container.querySelectorAll('.remove-wish').forEach(btn => btn.addEventListener('click', (e)=>{
          const wrapper = e.currentTarget.closest('.profile-wish-card');
          const item = wrapper?.dataset.name;
          if(!item) return;
          const userName = (data.user && data.user.name) || 'Guest';
          const key = `wishlist-${userName}`;
          const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(x=>x!==item);
          localStorage.setItem(key, JSON.stringify(arr));
          // re-render profile wishlist
          renderProfileWishlist();
        }));

        container.querySelectorAll('.view-wish').forEach(btn => btn.addEventListener('click', (e)=>{
          const wrapper = e.currentTarget.closest('.profile-wish-card');
          const item = wrapper?.dataset.name;
          if(!item) return;
          // navigate to market and attempt to scroll to the item
          document.querySelector('[data-section="market"]').click();
          setTimeout(()=>{
            const card = Array.from(document.querySelectorAll('.market-card')).find(c=>c.dataset.name === item);
            if(card){
              card.scrollIntoView({behavior:'smooth', block:'center'});
              // briefly highlight
              card.style.transition = 'box-shadow 0.3s';
              card.style.boxShadow = '0 6px 18px rgba(33,150,243,0.15)';
              setTimeout(()=>{ card.style.boxShadow = ''; }, 1600);
            }
          },250);
        }));
      })();

      // Render booklist in profile
      (function renderProfileBooklist(){
        const container = document.getElementById('profile-booklist-items');
        if(!container) return;
        const userName = (data.user && data.user.name) || 'Guest';
        const key = `booklist-${userName}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if(!list.length){ 
          container.innerHTML = '<p style="color:#666; text-align:center; padding:1rem;">No books saved yet. Vote and bookmark books in Recommendations!</p>'; 
          return; 
        }
        
        container.innerHTML = list.map(book => `
          <div class="profile-book-card" data-book-id="${book.id}" style="display:flex; gap:0.75rem; padding:0.75rem; border:1px solid #eee; border-radius:8px; margin-bottom:0.5rem; transition: all 0.2s;">
            <div style="flex:1;">
              <strong style="display:block; margin-bottom:0.25rem; color:var(--texto);">${book.title}</strong>
              <div style="color:#666; font-size:0.9em; margin-bottom:0.25rem;">by ${book.author}</div>
              <div style="font-size:0.85em; line-height:1.4; color:#777;">${book.summary.slice(0,120)}${book.summary.length > 120 ? '...' : ''}</div>
              <div style="font-size:0.8em; color:#999; margin-top:0.25rem;">Recommended by @${book.user}</div>
            </div>
            <button class="btn small remove-book-btn" data-book-id="${book.id}" style="background:#ff6b6b; align-self:flex-start;">Remove</button>
          </div>
        `).join('');
        
        // attach handlers for removing books
        container.querySelectorAll('.remove-book-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const bookId = e.currentTarget.dataset.bookId;
            const userName = (data.user && data.user.name) || 'Guest';
            const booklistKey = `booklist-${userName}`;
            let booklist = JSON.parse(localStorage.getItem(booklistKey) || '[]');
            booklist = booklist.filter(book => book.id != bookId);
            localStorage.setItem(booklistKey, JSON.stringify(booklist));
            renderProfileBooklist(); // Re-render booklist
          });
        });
      })();
      
      // Render badges
      (function renderProfileBadges(){
        const container = document.getElementById('profile-badges-items');
        if(!container) return;
        
        const userName = (data.user && data.user.name) || 'Guest';
        const stats = window.getUserStats(userName);
        stats.username = userName;
        
        // Count documents uploaded by this user
        stats.documentsUploaded = data.docs.filter(d => d.uploadedBy === userName).length;
        
        // Count comments from stored comments
        let totalComments = 0;
        try {
          data.docs.forEach(doc => {
            const comments = JSON.parse(localStorage.getItem(`doc-comments-${doc.file}`) || '[]');
            totalComments += comments.filter(c => c.user === userName).length;
          });
          // Add feed comments
          for(let i = 0; i < (data.feed || []).length; i++) {
            const feedComments = JSON.parse(localStorage.getItem(`feed-comments-${i}`) || '[]');
            totalComments += feedComments.filter(c => c.user === userName).length;
          }
        } catch(e) {}
        stats.commentsPosted = totalComments;
        
        const badges = window.calculateBadges(stats);
        
        if(badges.length === 0) {
          container.innerHTML = '<div style="color:#666; text-align:center; padding:1rem;">No badges earned yet. Keep contributing to earn your first badge!</div>';
          return;
        }
        
        container.innerHTML = badges.map(badge => `
          <div class="badge badge-level-${badge.level}" title="${badge.desc}" style="
            display:inline-block;
            padding:0.4rem 0.8rem; 
            margin:0.25rem;
            border-radius:16px; 
            font-size:0.8em; 
            font-weight:600;
            background:${badge.level === 1 ? 'linear-gradient(135deg, #ffd93d, #ffcd02)' : badge.level === 2 ? 'linear-gradient(135deg, #ff6b6b, #ff5252)' : 'linear-gradient(135deg, #6bcf7f, #4caf50)'};
            color:${badge.level === 1 ? '#333' : '#fff'};
            border:2px solid ${badge.level === 1 ? '#ffcd02' : badge.level === 2 ? '#ff5252' : '#4caf50'};
            box-shadow:0 2px 4px rgba(0,0,0,0.1);
            cursor:default;
          ">
            ${badge.name}
          </div>
        `).join('');
      })();

    }

    if(name === 'market'){
      // Remove old buy button alert - now handled by market.js addToCart
      // Ensure wishlist buttons work — prefer external init if available
      if(window.initMarketListeners){
        try{ 
          // Small delay to ensure DOM is fully rendered
          setTimeout(() => {
            window.initMarketListeners();
          }, 50);
        }catch(e){ console.error('initMarketListeners failed', e); }
      } else {
        // Fallback: attach simple wishlist toggle handlers here
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
          btn.removeEventListener('click', wishlistToggleHandler);
          btn.addEventListener('click', wishlistToggleHandler);
        });
      }
    }
    // initialize optional section-specific listeners from external files
    if(name === 'home' && window.initHomeListeners) try{ window.initHomeListeners(data); }catch(e){}
    if(name === 'recommendations' && window.initRecommendationsListeners) try{ window.initRecommendationsListeners(data); }catch(e){}
    if(name === 'buscar' && window.initSearchListeners) try{ window.initSearchListeners(); }catch(e){}
    if(name === 'mensajeria' && window.initMensajeriaListeners) try{ window.initMensajeriaListeners(data); }catch(e){}
    if(name === 'dailybonus'){
      if(window.initDailyBonusListeners) try{ window.initDailyBonusListeners(data); }catch(e){}
      // Render points history in daily bonus section
      (function renderPointsHistory(){
        const container = document.getElementById('daily-points-history-items');
        if(!container) return;
        const userName = (data.user && data.user.name) || 'Guest';
        const key = `points-history-${userName}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        if(!history.length){
          container.innerHTML = '<p style="color:#666;">No points activity yet.</p>';
          return;
        }
        // Show last 10 entries, newest first
        const recent = history.slice(-10).reverse();
        container.innerHTML = recent.map(entry => {
          const date = new Date(entry.ts).toLocaleString();
          const sign = entry.delta > 0 ? '+' : '';
          const color = entry.delta > 0 ? '#2a9d8f' : '#ff6b6b';
          return `
            <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #eee;">
              <div style="flex:1;">
                <div style="font-weight:600;">${entry.reason}</div>
                <div style="font-size:0.8em; color:#999;">${date}</div>
              </div>
              <div style="font-weight:700; color:${color};">${sign}${entry.delta}</div>
            </div>`;
        }).join('');
      })();
    }
  }

  function startThreadHandler(e){
    const file = e.currentTarget.dataset.file;
    const form = document.querySelector(`.comment-form[data-file="${file}"]`);
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    
    // Ocultar botón "Comenzar hilo" si hay comentarios
    const comments = getStoredComments(file);
    if(comments.length > 0){
      e.currentTarget.style.display = 'none';
    }
    
    const commentsEl = document.getElementById(`comments-${sanitizeId(file)}`);
    if(commentsEl) commentsEl.scrollIntoView({behavior:'smooth'});
  }

  function commentFormHandler(e){
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.dataset.file;
    const text = form.querySelector('textarea[name="comment"]').value.trim();
    if(!text) return;
    const comment = { user: data.user.name || 'Anonymous', text, ts: Date.now(), parentTs: null };
    saveStoredComment(file, comment);
    const el = document.getElementById(`comments-${sanitizeId(file)}`);
    renderCommentsForDoc(file);
    form.reset();
    const docItem = document.querySelector(`.doc-item[data-file="${file}"]`);
    if(docItem){
      const startBtn = docItem.querySelector('.start-thread');
      if(startBtn) startBtn.style.display = getStoredComments(file).length > 0 ? 'none' : 'inline-block';
    }
  }

  function likePostHandler(e){
    e.preventDefault();
    const idx = e.currentTarget.dataset.postIdx;
    const liked = JSON.parse(localStorage.getItem(`liked-${idx}`) || 'false');
    const newLiked = !liked;
    localStorage.setItem(`liked-${idx}`, JSON.stringify(newLiked));
    const countEl = e.currentTarget.querySelector('.like-count');
    const base = (data.feed[idx].likes || 0);
    countEl.textContent = base + (newLiked ? 1 : 0);
    e.currentTarget.style.color = newLiked ? 'var(--rojo-coral)' : '#ccc';
  }

  function expandCommentsHandler(e){
    e.preventDefault();
    const idx = e.currentTarget.dataset.postIdx;
    const commentsEl = document.getElementById(`comments-feed-${idx}`);
    const formEl = document.querySelector(`.feed-comment-form[data-post-idx="${idx}"]`);
    if(commentsEl) commentsEl.style.display = commentsEl.style.display === 'none' ? 'block' : 'none';
    if(formEl) formEl.style.display = formEl.style.display === 'none' ? 'block' : 'none';
    if(commentsEl && commentsEl.style.display === 'block') {
      renderFeedComments(idx);
      commentsEl.scrollIntoView({behavior:'smooth'});
    }
  }

  function feedCommentHandler(e){
    e.preventDefault();
    const form = e.currentTarget;
    const idx = form.dataset.postIdx;
    const text = form.querySelector('textarea[name="comment"]').value.trim();
    if(!text) return;
    const comments = JSON.parse(localStorage.getItem(`feed-comments-${idx}`) || '[]');
    comments.push({ user: data.user.name || 'Anónimo', text, ts: Date.now(), parentIdx: null });
    localStorage.setItem(`feed-comments-${idx}`, JSON.stringify(comments));
    
    // Actualizar contador
    const countEl = document.querySelector(`.comment-btn[data-post-idx="${idx}"] .comment-count`);
    if(countEl) countEl.textContent = comments.length;
    
    renderFeedComments(idx);
    form.reset();
  }

  function renderFeedComments(idx){
    const comments = JSON.parse(localStorage.getItem(`feed-comments-${idx}`) || '[]');
    const container = document.getElementById(`comments-feed-${idx}`);
    if(!container) return;
    if(comments.length === 0){
      container.innerHTML = '<p class="card">No comments yet.</p>';
      return;
    }

    // Build threaded structure
    const topLevel = comments.filter((c,i) => { c._idx = i; return !c.parentIdx; });
    const byParent = {};
    comments.forEach((c, i) => {
      c._idx = i;
      if(c.parentIdx !== undefined && c.parentIdx !== null){
        if(!byParent[c.parentIdx]) byParent[c.parentIdx] = [];
        byParent[c.parentIdx].push(c);
      }
    });

    function renderComment(c, depth=0){
      const replies = byParent[c._idx] || [];
      const indent = depth > 0 ? `margin-left:${Math.min(depth*1.2, 3.6)}rem;` : '';
      return `
        <div class="feed-comment-thread" style="${indent} position:relative; margin-bottom:0.5rem;">
          <div class="feed-comment-item" style="padding:0.5rem; border-left:2px solid var(--azul-pastel); background:#fafafa; border-radius:4px; margin-bottom:0.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
              <strong style="font-size:0.85em;">@${c.user}</strong>
              <span style="flex:1"></span>
              <button class="btn small reply-feed-comment" data-post-idx="${idx}" data-parent-idx="${c._idx}" style="font-size:0.75em; padding:0.25rem 0.5rem;">Reply</button>
              ${(c.user === (data.user.name||'') || isAdmin()) ? `<button class="btn small delete-feed-comment" data-post-idx="${idx}" data-cidx="${c._idx}" style="font-size:0.75em; padding:0.25rem 0.5rem; background:#d9534f;">Delete</button>` : ''}
            </div>
            <p style="margin:0; font-size:0.85em; line-height:1.4;">${c.text}</p>
            <form class="reply-feed-form" data-post-idx="${idx}" data-parent-idx="${c._idx}" style="display:none; margin-top:0.5rem; padding:0.5rem; background:#fff; border-radius:4px; border:1px solid #ddd;">
              <textarea name="reply" placeholder="Write a reply..." required style="width:100%; min-height:40px; padding:0.4rem; border:1px solid #ddd; border-radius:4px; font-size:0.85em;"></textarea>
              <div style="margin-top:0.4rem; display:flex; gap:0.4rem;">
                <button class="btn" type="submit" style="font-size:0.8em; padding:0.4rem 0.8rem;">Post</button>
                <button class="btn cancel-reply-feed" type="button" style="background:#999; font-size:0.8em; padding:0.4rem 0.8rem;">Cancel</button>
              </div>
            </form>
          </div>
          ${replies.map(r => renderComment(r, depth+1)).join('')}
        </div>
      `;
    }

    container.innerHTML = topLevel.map(c => renderComment(c)).join('');
   
    // Attach delete handlers
    document.querySelectorAll(`.delete-feed-comment[data-post-idx="${idx}"]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cidx = Number(e.currentTarget.dataset.cidx);
        if(!confirm('Delete this comment?')) return;
        const comments = JSON.parse(localStorage.getItem(`feed-comments-${idx}`) || '[]');
        comments.splice(cidx, 1);
        localStorage.setItem(`feed-comments-${idx}`, JSON.stringify(comments));
        const countEl = document.querySelector(`.comment-btn[data-post-idx="${idx}"] .comment-count`);
        if(countEl) countEl.textContent = comments.length;
        renderFeedComments(idx);
        if(comments.length === 0){
          const commentsEl = document.getElementById(`comments-feed-${idx}`);
          const formEl = document.querySelector(`.feed-comment-form[data-post-idx="${idx}"]`);
          if(commentsEl){
            commentsEl.style.display = 'block';
            commentsEl.innerHTML = '<p class="card">No comments yet.</p>';
          }
          if(formEl) formEl.style.display = 'none';
        }
      });
    });

    // Attach reply handlers
    document.querySelectorAll('.reply-feed-comment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postIdx = e.currentTarget.dataset.postIdx;
        const parentIdx = e.currentTarget.dataset.parentIdx;
        const form = document.querySelector(`.reply-feed-form[data-post-idx="${postIdx}"][data-parent-idx="${parentIdx}"]`);
        if(form){
          const isVisible = form.style.display !== 'none';
          document.querySelectorAll('.reply-feed-form').forEach(f => f.style.display = 'none');
          form.style.display = isVisible ? 'none' : 'block';
          if(!isVisible) form.querySelector('textarea').focus();
        }
      });
    });

    // Attach reply form submit handlers
    document.querySelectorAll('.reply-feed-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const postIdx = form.dataset.postIdx;
        const parentIdx = Number(form.dataset.parentIdx);
        const text = form.querySelector('textarea[name="reply"]').value.trim();
        if(!text) return;
        const reply = { user: data.user.name || 'Anonymous', text, ts: Date.now(), parentIdx };
        const key = `feed-comments-${postIdx}`;
        const comments = JSON.parse(localStorage.getItem(key) || '[]');
        comments.push(reply);
        localStorage.setItem(key, JSON.stringify(comments));
        const countEl = document.querySelector(`.comment-btn[data-post-idx="${postIdx}"] .comment-count`);
        if(countEl) countEl.textContent = comments.length;
        renderFeedComments(postIdx);
        form.reset();
        form.style.display = 'none';
      });

      const cancelBtn = form.querySelector('.cancel-reply-feed');
      if(cancelBtn){
        cancelBtn.addEventListener('click', () => { form.style.display = 'none'; });
      }
    });
  }

  // navegación
  navItems.forEach(i => i.addEventListener("click", () => {
    // clicking the main Profile nav should return to your own profile (clear any viewingUser)
    if(i.dataset.section === 'perfil'){
      try{ sessionStorage.removeItem('viewingUser'); }catch(e){}
    }
    renderSection(i.dataset.section);
  }));

  // default to Home on first load
  renderSection("home");

  // Search functionality now handled by search.js
  // Legacy functions commented out to avoid conflicts
  /*
  function runSearch(){
    // Old search implementation - replaced by search.js
  }

  function showUserModal(name){
    // Old modal implementation - replaced by search.js
  */
  
  // Keeping minimal stub for backward compatibility
  function runSearch(){
    if(window.initSearchListeners) return; // defer to new system
  }
  
  function showUserModal(name){
    if(window.initSearchListeners) return; // defer to new system
    const user = (data.users || []).find(u => u.name === name) || { name, bio: '' };
    let modal = document.getElementById('user-detail-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'user-detail-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close">×</button>
          <h3 id="user-modal-name">${user.name}</h3>
          <p id="user-modal-bio">${user.bio || ''}</p>
          <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <button class="btn" id="user-modal-message">Message</button>
            <button class="btn btn-secondary" id="user-modal-view-profile">View Profile</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.modal-close').addEventListener('click', () => { modal.classList.remove('active'); });
      modal.addEventListener('click', (ev) => { if(ev.target === modal) modal.classList.remove('active'); });
      const modalViewProfileBtn = modal.querySelector('#user-modal-view-profile');
      // Load actual user profile from localStorage
      const userProfile = localStorage.getItem(`profile-${user.name}`);
      if(!userProfile){
        modalViewProfileBtn.style.display = 'none';
      } else {
        modalViewProfileBtn.addEventListener('click', () => {
          try{ 
            const profile = JSON.parse(userProfile);
            sessionStorage.setItem('viewingUser', JSON.stringify(profile)); 
          }catch(e){}
          modal.classList.remove('active');
          document.querySelector('[data-section="perfil"]').click();
        });
      }
      modal.querySelector('#user-modal-message').addEventListener('click', () => {
        alert('Messaging is not implemented in this demo.');
      });
    }
    // populate and show
    modal.querySelector('#user-modal-name').textContent = user.name;
    modal.querySelector('#user-modal-bio').textContent = user.bio || '';
    modal.classList.add('active');
  }

  // Search event listeners removed - now handled by search.js initSearchListeners

  // Modal handlers for new post and upload doc
  function openNewPostModal(){
    const modal = document.getElementById('new-post-modal');
    if(modal) modal.style.display = 'flex';
  }

  function openUploadDocModal(){
    const modal = document.getElementById('upload-doc-modal');
    if(modal) modal.style.display = 'flex';
  }

  // Close modals
  document.getElementById('close-new-post')?.addEventListener('click', () => {
    document.getElementById('new-post-modal').style.display = 'none';
  });
  document.getElementById('cancel-new-post')?.addEventListener('click', () => {
    document.getElementById('new-post-modal').style.display = 'none';
  });
  document.getElementById('close-upload-doc')?.addEventListener('click', () => {
    document.getElementById('upload-doc-modal').style.display = 'none';
  });
  document.getElementById('cancel-upload-doc')?.addEventListener('click', () => {
    document.getElementById('upload-doc-modal').style.display = 'none';
  });

  // New post form submission
  document.getElementById('new-post-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const text = form.querySelector('[name="text"]').value.trim();
    const imageFile = form.querySelector('[name="postImage"]').files[0];
    
    if(!text) return;

    const newPost = {
      user: data.user.name || 'Anonymous',
      text,
      image: '',
      likes: 0,
      timestamp: Date.now(),
      comments: []
    };

    // If image selected, create local URL (in real app would upload to server)
    if(imageFile){
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPost.image = ev.target.result; // base64 data URL for demo
        data.feed.unshift(newPost);
        document.getElementById('new-post-modal').style.display = 'none';
        form.reset();
        renderSection('feed');
      };
      reader.readAsDataURL(imageFile);
    } else {
      data.feed.unshift(newPost);
      document.getElementById('new-post-modal').style.display = 'none';
      form.reset();
      renderSection('feed');
    }
  });

  // Upload doc form submission
  document.getElementById('upload-doc-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const title = form.querySelector('[name="title"]').value.trim();
    const desc = form.querySelector('[name="desc"]').value.trim();
    const urlInput = form.querySelector('[name="file"]').value.trim();
    const fileInput = form.querySelector('[name="docFile"]');
    const actualFile = fileInput?.files[0];
    
    if(!title || !desc) return;

    const newDoc = {
      title,
      desc,
      file: urlInput || '#',
      comments: [],
      hasRealFile: false,
      realFileData: null,
      realFileName: null,
      uploadedBy: data.user.name || 'Anonymous'
    };

    // Si hay archivo real, convertirlo a base64 y almacenarlo
    if(actualFile){
      const reader = new FileReader();
      reader.onload = (ev) => {
        newDoc.hasRealFile = true;
        newDoc.realFileData = ev.target.result; // base64 data URL
        newDoc.realFileName = actualFile.name;
        newDoc.file = `#doc-${Date.now()}`; // identificador único
        
        // Guardar en localStorage
        const docId = newDoc.file;
        try {
          localStorage.setItem(docId, JSON.stringify({
            data: newDoc.realFileData,
            name: newDoc.realFileName,
            type: actualFile.type
          }));
        } catch(err) {
          console.error('Error saving file:', err);
          alert('⚠️ File too large for storage. Maximum ~5MB recommended.');
        }

        data.docs.unshift(newDoc);
        document.getElementById('upload-doc-modal').style.display = 'none';
        form.reset();
        renderSection('docs');
        alert('✓ Document uploaded successfully with real file!');
      };
      reader.readAsDataURL(actualFile);
    } else if(urlInput) {
      // Solo URL sin archivo real
      data.docs.unshift(newDoc);
      document.getElementById('upload-doc-modal').style.display = 'none';
      form.reset();
      renderSection('docs');
      alert('✓ Document uploaded successfully!');
    } else {
      alert('Please provide either a file or a URL');
    }
  });

  // local wishlist toggle fallback handler used if market.js isn't available
  function wishlistToggleHandler(e){
    const btn = e.currentTarget;
    const name = btn.dataset.name || btn.closest('.market-card')?.dataset.name;
    if(!name) return;
    const userName = (data.user && data.user.name) || 'Guest';
    const key = `wishlist-${userName}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.indexOf(name);
    if(idx >= 0){
      list.splice(idx,1);
      btn.textContent = 'Wishlist';
    } else {
      list.push(name);
      btn.textContent = 'Saved';
    }
    localStorage.setItem(key, JSON.stringify(list));
    // update profile view if open
    const profileBtn = document.querySelector('[data-section="perfil"]');
    if(profileBtn && profileBtn.classList.contains('active')) document.querySelector('[data-section="perfil"]').click();
  }
});
