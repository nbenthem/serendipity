// recommendations.js — lightweight recommendations renderer + listeners
(function(){
  const WEEK_MS = 7*24*60*60*1000;
  const currentWeek = () => Math.floor(Date.now() / WEEK_MS);

  // simple recommender: pick items above average price as 'premium' recommendations
  // Seed initial recommendations if not already seeded
  function seedRecommendations(){
    if(localStorage.getItem('recommendations-seeded')) return;
    const existing = JSON.parse(localStorage.getItem('recommendations') || '[]');
    if(existing.length > 3){
      localStorage.setItem('recommendations-seeded','1');
      return;
    }
    const now = Date.now();
    const seeds = [
      { title:'Fahrenheit 451', author:'Ray Bradbury', summary:'Dystopian novel exploring censorship, conformity and the power of books in a future where firemen burn literature.', user:'maria' },
      { title:'Rebelión en la granja', author:'George Orwell', summary:'Political allegory where farm animals overthrow humans only to face a new tyranny among themselves.', user:'juan' },
      { title:'El mercader de Venecia', author:'William Shakespeare', summary:'A dramatic exploration of mercy, justice, prejudice and the complexities of human bonds.', user:'sofia' },
      { title:'El alquimista', author:'Paulo Coelho', summary:'Spiritual journey of Santiago pursuing his Personal Legend, a tale about listening to one’s heart.', user:'luis' },
      { title:'Un mundo feliz', author:'Aldous Huxley', summary:'Futuristic society engineered for stability through conditioning, drugs and castes—raises questions about freedom.', user:'ana' },
      { title:'La metamorfosis', author:'Franz Kafka', summary:'Gregor Samsa awakens as an insect; an existential examination of alienation and identity.', user:'carlos' },
      { title:'Historia general de las drogas', author:'Antonio Escohotado', summary:'Comprehensive historical study of psychoactive substances and their social, economic and cultural impact.', user:'elena' },
      { title:'1984', author:'George Orwell', summary:'A surveillance state controls truth itself; a chilling warning about totalitarianism and thought control.', user:'diego' },
      { title:'Cien años de soledad', author:'Gabriel García Márquez', summary:'Magical realism saga of the Buendía family and Macondo—cyclical time, solitude and Latin American identity.', user:'laura' },
      { title:'El nombre de la rosa', author:'Umberto Eco', summary:'Medieval abbey murder mystery blending semiotics, theology and the preservation of knowledge.', user:'martin' },
      { title:'Don Quijote de la Mancha', author:'Miguel de Cervantes', summary:'Satirical and humanistic odyssey of a knight errant confronting reality, imagination and honor.', user:'valeria' },
      { title:'Orgullo y prejuicio', author:'Jane Austen', summary:'Romance and social commentary in Regency England, wit and character depth across class boundaries.', user:'andrea' },
      { title:'El extranjero', author:'Albert Camus', summary:'Absurdist tale of Meursault, detached from society, exploring meaning and existentialism.', user:'raul' },
      { title:'El retrato de Dorian Gray', author:'Oscar Wilde', summary:'Faustian bargain where a portrait ages while its subject remains young, exploring vanity and morality.', user:'isabel' }
    ];
    const enriched = seeds.map((s,i)=>({
      id: now + i,
      title: s.title,
      author: s.author,
      summary: s.summary,
      user: s.user,
      ts: now - (seeds.length - i)*3600000,
      votes: 0,
      voters: []
    }));
    const merged = enriched.concat(existing);
    localStorage.setItem('recommendations', JSON.stringify(merged));
    localStorage.setItem('recommendations-seeded','1');
    // Seed last week's votes for 3 recommendations to create this week's Top 3
    const currentWk = Math.floor(Date.now() / WEEK_MS);
    const lastWk = currentWk - 1;
    const lastWeekVotes = {};
    const pickThree = [enriched[1].id, enriched[4].id, enriched[7].id]; // Rebelión, Un mundo feliz, 1984
    pickThree.forEach((id,i)=>{ lastWeekVotes[String(id)] = (12 - i*3); }); // 12, 9, 6 votes
    localStorage.setItem(`weekly-votes-${lastWk}`, JSON.stringify(lastWeekVotes));
  }
  seedRecommendations();
  function getWeeklyVotes(week){
    try{ return JSON.parse(localStorage.getItem(`weekly-votes-${week}`) || '{}'); }catch(e){ return {}; }
  }
  function setWeeklyVotes(week, map){ localStorage.setItem(`weekly-votes-${week}`, JSON.stringify(map||{})); }

  function getWeeklyPodium(week){
    try{ return JSON.parse(localStorage.getItem(`weekly-podium-${week}`) || '[]'); }catch(e){ return []; }
  }
  function setWeeklyPodium(week, ids){ localStorage.setItem(`weekly-podium-${week}`, JSON.stringify(ids||[])); }

  function ensurePodiumForCurrentWeek(recs){
    const w = currentWeek();
    let podium = getWeeklyPodium(w);
    if(podium && podium.length) return podium;
    // compute from last week's votes
    const lastW = w - 1;
    const votesMap = getWeeklyVotes(lastW);
    const entries = Object.entries(votesMap || {});
    if(!entries.length){ setWeeklyPodium(w, []); return []; }
    entries.sort((a,b)=> b[1]-a[1]);
    const topIds = entries.slice(0,3).map(([id])=> id);
    setWeeklyPodium(w, topIds);
    return topIds;
  }

  function awardCurrentWeekPodiumPoints(recs, data){
    const w = currentWeek();
    const awardedKey = `awarded_podium_${w}`;
    let awarded = [];
    try{ awarded = JSON.parse(localStorage.getItem(awardedKey)||'[]'); }catch(e){ awarded = []; }
    const podiumIds = getWeeklyPodium(w);
    if(!podiumIds.length) return;
    const podiumRecs = recs.filter(r => podiumIds.includes(String(r.id)));
    let changed=false;
    podiumRecs.forEach(rec => {
      if(!rec) return;
      if(awarded.includes(rec.id)) return;
      // If current user is the author, award 20 points
      if(rec.user && data.user && rec.user === data.user.name){
        data.user.points = (data.user.points || 0) + 25;
        localStorage.setItem('profile', JSON.stringify(data.user));
        if(data.user && data.user.name){
          localStorage.setItem(`profile-${data.user.name}`, JSON.stringify(data.user));
          if(window.addPointsHistory) window.addPointsHistory(data.user.name, 25, 'Weekly Top 3 Recommendation');
        }
      }
      awarded.push(rec.id);
      changed=true;
    });
    if(changed) localStorage.setItem(awardedKey, JSON.stringify(awarded));
  }

  window.renderRecommendations = function(data){
    // load stored reading recommendations (user-submitted)
    const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');

    // Ensure this week's fixed podium based on last week's votes
    const podiumIds = ensurePodiumForCurrentWeek(recs);
    const podium = recs.filter(r => podiumIds.includes(String(r.id)) || podiumIds.includes(r.id));
    // Award current-user points once for this week's podium
    awardCurrentWeekPodiumPoints(recs, data);

    // Admin highlights for this week
    const highlights = recs.filter(r => r.highlightWeek === currentWeek()).slice(0,3);

    // render UI: podium, submission form, list
    return `
      <section>
        <h2>Weekly Reading Recommendations</h2>
        <p style="text-align:center; color:#666; margin-bottom:0.5rem;">Share and vote on weekly reading picks — submit your recommendations below.</p>

        <div class="card">
          <h3>SereUsers Weekly Top 3</h3>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;">
            ${podium.length ? podium.map((p, i) => `
              <div class="card" style="min-width:180px; text-align:center;">
                <div style="font-size:1.1rem; font-weight:700;">#${i+1}</div>
                <div style="margin-top:0.4rem; font-weight:600;">${p.title || p.name}</div>
                <div style="font-size:0.9rem; color:#666;">by ${p.author || p.user || 'Unknown'}</div>
                <div style="margin-top:0.5rem; color:#999;">Votes: ${p.votes||0}</div>
              </div>
            `).join('') : `<div style="color:#666;">No top picks yet.</div>`}
          </div>
        </div>

        <div class="card" style="margin-top:1rem;">
          <h3>Weekly SereHighlights</h3>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;">
            ${highlights.length ? highlights.map(h => `
              <div class="card" style="min-width:180px; text-align:center;">
                <div style="font-size:0.85rem; font-weight:800; color:#ff6b6b;">⭐ SereHighlight</div>
                <div style="margin-top:0.4rem; font-weight:600;">${h.title}</div>
                <div style="font-size:0.9rem; color:#666;">by ${h.author}</div>
              </div>
            `).join('') : `<div style="color:#666;">No highlights selected yet.</div>`}
          </div>
        </div>

        <div class="card" style="margin-top:1rem;">
          <h3>Submit a recommendation</h3>
          <form id="rec-submit-form">
            <label style="display:block; margin-bottom:0.4rem; font-weight:600;">Title</label>
            <input name="title" required style="width:100%; padding:0.6rem; margin-bottom:0.5rem;">
            <label style="display:block; margin-bottom:0.4rem; font-weight:600;">Author</label>
            <input name="author" required style="width:100%; padding:0.6rem; margin-bottom:0.5rem;">
            <label style="display:block; margin-bottom:0.4rem; font-weight:600;">Summary</label>
            <textarea name="summary" required style="width:100%; padding:0.6rem; min-height:100px; margin-bottom:0.5rem;"></textarea>
            <div style="text-align:right;"><button class="btn" type="submit">Submit recommendation</button></div>
          </form>
        </div>

        <div style="margin-top:1rem;">
          <h3>All recommendations</h3>
          <div class="market-grid">
            ${recs.length ? recs.map(r => {
              const isAdmin = data.user && data.user.name === 'admin';
              const isHighlight = r.highlightWeek === currentWeek();
              return `
              <div class="card rec-item" data-id="${r.id}">
                ${isHighlight ? `<span style="background:#ffd700; color:#333; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75em; font-weight:700; display:inline-block; margin-bottom:0.4rem;">⭐ SereHighlight</span>` : ''}
                ${r.pointsReward ? `<span style="background:#17a2b8; color:white; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75em; font-weight:700; display:inline-block; margin-bottom:0.4rem; margin-left:${isHighlight ? '0.5rem' : '0'};">💰 +${r.pointsReward} points</span>` : ''}
                <h4>${r.title}</h4>
                <div style="font-size:0.9rem; color:#666;">by ${r.author} — recommended by ${r.user}</div>
                <p style="margin-top:0.5rem; color:#444;">${r.summary}</p>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; flex-wrap:wrap;">
                  <button class="btn vote-btn" data-id="${r.id}">▲ Vote (${r.votes || 0})</button>
                  <button class="btn booklist-btn" data-id="${r.id}" style="background:${(() => {
                    const userName = (data.user && data.user.name) || 'Guest';
                    const booklist = JSON.parse(localStorage.getItem(`booklist-${userName}`) || '[]');
                    const inBooklist = booklist.some(b => b.id == r.id);
                    return inBooklist ? '#6c757d' : '#28a745';
                  })()}">
                    ${(() => {
                      const userName = (data.user && data.user.name) || 'Guest';
                      const booklist = JSON.parse(localStorage.getItem(`booklist-${userName}`) || '[]');
                      const inBooklist = booklist.some(b => b.id == r.id);
                      return inBooklist ? '✓ In Booklist' : '📚 Add to Booklist';
                    })()}
                  </button>
                  ${isAdmin ? `<button class="btn small admin-mark-highlight" data-id="${r.id}" data-is-highlight="${isHighlight}" style="background:#28a745; font-size:0.8em;">${isHighlight ? 'Unmark' : 'Mark SereHighlight'}</button>` : ''}
                  ${isAdmin ? `<button class="btn small admin-mark-points" data-id="${r.id}" data-has-points="${r.pointsReward ? 'true' : 'false'}" style="background:${r.pointsReward ? '#ffc107' : '#17a2b8'}; font-size:0.8em;">${r.pointsReward ? `✓ Points (${r.pointsReward})` : 'Mark for Points'}</button>` : ''}
                  ${(isAdmin || (data.user && data.user.name === r.user)) ? `<button class="btn small delete-rec" data-id="${r.id}" style="background:#d9534f; font-size:0.8em;">Delete</button>` : ''}
                </div>
              </div>
            `}).join('') : `<div class="card">No recommendations yet — be the first to submit one!</div>`}
          </div>
        </div>
      </section>
    `;
  };

  // Recommendations interactions: voting, favoriting, submit form handling
  window.initRecommendationsListeners = function(data){
    // Buy buttons for recommendations - use cart system
    document.querySelectorAll('.rec-item .buy-btn').forEach(b => b.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.rec-item');
      const name = card?.dataset.name;
      if(name && window.appData && window.appData.market){
        const product = window.appData.market.find(p => p.name === name);
        if(product && typeof window.addToCart === 'function'){
          window.addToCart(product);
          e.currentTarget.textContent = '✓ Added';
          setTimeout(() => { e.currentTarget.textContent = `Buy (€${product.price})`; }, 1200);
        }
      }
    }));

    // Booklist (bookmark) buttons for recommendations
    document.querySelectorAll('.rec-item .booklist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.rec-item');
        const id = card?.dataset.id;
        if(!id) return;
        
        const recs = JSON.parse(localStorage.getItem('recommendations')||'[]');
        const book = recs.find(r => r.id == id);
        if(!book) return;
        
        const userName = (data.user && data.user.name) || 'Guest';
        const booklistKey = `booklist-${userName}`;
        let booklist = JSON.parse(localStorage.getItem(booklistKey) || '[]');
        
        const existingIndex = booklist.findIndex(b => b.id == book.id);
        if(existingIndex >= 0) {
          // Remove from booklist
          booklist.splice(existingIndex, 1);
          e.currentTarget.textContent = '📚 Add to Booklist';
          e.currentTarget.style.background = '#28a745';
        } else {
          // Add to booklist
          booklist.push({
            id: book.id,
            title: book.title,
            author: book.author,
            summary: book.summary,
            user: book.user
          });
          e.currentTarget.textContent = '✓ In Booklist';
          e.currentTarget.style.background = '#6c757d';
        }
        
        localStorage.setItem(booklistKey, JSON.stringify(booklist));
      });
    });

    // Voting with points rewards
    document.querySelectorAll('.rec-item .vote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.rec-item');
        const id = card?.dataset.id;
        if(!id) return;
        const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
        const rec = recs.find(r=>String(r.id)===String(id));
        const voter = (data.user && data.user.name) || 'Anonymous';
        if(!rec) return;
        rec.voters = rec.voters || [];
        if(rec.voters.includes(voter)) { alert('You already voted for this recommendation.'); return; }
        rec.voters.push(voter);
        rec.votes = (rec.votes||0)+1;
        
        // Award points if this book is marked for points rewards
        let pointsAwarded = false;
        if(rec.pointsReward && voter !== 'Anonymous' && data.user) {
          const pointsToAward = parseInt(rec.pointsReward) || 0;
          if(pointsToAward > 0) {
            data.user.points = (data.user.points || 0) + pointsToAward;
            localStorage.setItem('profile', JSON.stringify(data.user));
            localStorage.setItem(`profile-${data.user.name}`, JSON.stringify(data.user));
            if(window.addPointsHistory) {
              window.addPointsHistory(data.user.name, pointsToAward, `Voted for "${rec.title}"`);
            }
            pointsAwarded = true;
            // Show points notification
            window.showPointsNotification && window.showPointsNotification(pointsToAward, `Voting for "${rec.title}"`);
          }
        }
        
        // Award 1 point to recommendation author for receiving a vote (capped)
        if(rec.user && rec.user !== 'Anonymous' && rec.user !== voter) {
          const authorProfileKey = `profile-${rec.user}`;
          const authorProfile = JSON.parse(localStorage.getItem(authorProfileKey) || '{}');
          if(authorProfile.name === rec.user) {
            authorProfile.points = (authorProfile.points || 0) + 1;
            localStorage.setItem(authorProfileKey, JSON.stringify(authorProfile));
            // Update current profile if it's the author
            if(data.user && data.user.name === rec.user) {
              data.user.points = authorProfile.points;
              localStorage.setItem('profile', JSON.stringify(data.user));
            }
            if(window.addPointsHistory) {
              window.addPointsHistory(rec.user, 1, `Vote received on "${rec.title}"`);
            }
          }
        }
        
        // track weekly votes
        const w = Math.floor(Date.now() / (7*24*60*60*1000));
        const map = (function(){ try{ return JSON.parse(localStorage.getItem(`weekly-votes-${w}`)||'{}'); }catch(e){ return {}; } })();
        map[String(id)] = (map[String(id)]||0) + 1;
        localStorage.setItem(`weekly-votes-${w}`, JSON.stringify(map));
        localStorage.setItem('recommendations', JSON.stringify(recs));
        
        // Show success message
        if(pointsAwarded) {
          e.currentTarget.textContent = `✓ Voted (+${rec.pointsReward} pts!)`;
          setTimeout(() => {
            // re-render the section by clicking nav
            document.querySelector('[data-section="recommendations"]').click();
          }, 1500);
        } else {
          // re-render the section by clicking nav
          document.querySelector('[data-section="recommendations"]').click();
        }
      });
    });

    // Submit new recommendation
    const form = document.getElementById('rec-submit-form');
    if(form) form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title')||'').trim();
      const author = (fd.get('author')||'').trim();
      const summary = (fd.get('summary')||'').trim();
      if(!title || !author || !summary){ alert('Please fill all fields'); return; }
      const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
      const id = Date.now();
      recs.unshift({ id, title, author, summary, user: (data.user && data.user.name) || 'Anonymous', ts: Date.now(), votes: 0, voters: [] });
      localStorage.setItem('recommendations', JSON.stringify(recs));
      
      // Award 12 points for weekly recommendation submission
      if(data.user && data.user.name && data.user.name !== 'Anonymous') {
        data.user.points = (data.user.points || 0) + 12;
        localStorage.setItem('profile', JSON.stringify(data.user));
        localStorage.setItem(`profile-${data.user.name}`, JSON.stringify(data.user));
        if(window.addPointsHistory) {
          window.addPointsHistory(data.user.name, 12, 'Weekly recommendation submission');
        }
        // Show points notification
        if(window.showPointsNotification) {
          window.showPointsNotification(12, 'Recommendation submitted');
        }
      }
      
      form.reset();
      document.querySelector('[data-section="recommendations"]').click();
    });

    // Delete recommendation (admin or author)
    document.querySelectorAll('.delete-rec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
        const rec = recs.find(r => String(r.id) === String(id));
        if(!rec) return;
        
        const isAdmin = data.user && data.user.name === 'admin';
        const isAuthor = data.user && data.user.name === rec.user;
        
        if(!isAdmin && !isAuthor) {
          alert('You can only delete your own recommendations.');
          return;
        }
        
        if(!confirm('Delete this recommendation?')) return;
        
        const filtered = recs.filter(r => String(r.id) !== String(id));
        localStorage.setItem('recommendations', JSON.stringify(filtered));
        document.querySelector('[data-section="recommendations"]').click();
      });
    });

    // Admin: mark/unmark books for points rewards
    document.querySelectorAll('.admin-mark-points').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const hasPoints = e.currentTarget.dataset.hasPoints === 'true';
        const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
        const rec = recs.find(r => String(r.id) === String(id));
        if(!rec) return;
        
        if(hasPoints) {
          // Remove points reward
          delete rec.pointsReward;
          alert('Points reward removed from this book.');
        } else {
          // Add points reward
          const points = prompt('Enter points to award for voting this book (1-50):', '10');
          if(points === null) return; // user cancelled
          const pointsNum = parseInt(points);
          if(isNaN(pointsNum) || pointsNum < 1 || pointsNum > 50) {
            alert('Please enter a valid number between 1 and 50.');
            return;
          }
          rec.pointsReward = pointsNum;
          alert(`✨ Book marked! Users will get ${pointsNum} SerePoints for voting.`);
        }
        
        localStorage.setItem('recommendations', JSON.stringify(recs));
        document.querySelector('[data-section="recommendations"]').click();
      });
    });

    // Admin: mark/unmark highlight
    document.querySelectorAll('.admin-mark-highlight').forEach(btn => {
      const isHighlight = btn.dataset.isHighlight === 'true';
      const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
      const week = currentWeek();
      const currentHighlights = recs.filter(r => r.highlightWeek === week);
      
      // Disable button if 3 highlights already exist and this isn't one of them
      if(!isHighlight && currentHighlights.length >= 3){
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.title = 'Maximum 3 highlights per week. Remove one to add another.';
      }
      
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const recs = JSON.parse(localStorage.getItem('recommendations') || '[]');
        const rec = recs.find(r => String(r.id) === String(id));
        if(!rec) return;
        
        if(rec.highlightWeek) {
          delete rec.highlightWeek;
          alert('Removed from highlights.');
        } else {
          // Check limit again before marking
          const week = currentWeek();
          const currentHighlights = recs.filter(r => r.highlightWeek === week);
          if(currentHighlights.length >= 3){
            alert('Maximum 3 SereHighlights per week. Remove one first.');
            return;
          }
          
          rec.highlightWeek = currentWeek();
          // Award 30 SerePoints to the recommendation author
          if(rec.user) {
            const profileKey = `profile-${rec.user}`;
            const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
            if(profile.name === rec.user) {
              profile.points = (profile.points || 0) + 30;
              localStorage.setItem('profile', JSON.stringify(profile));
              localStorage.setItem(profileKey, JSON.stringify(profile));
              if(data.user && data.user.name === rec.user) data.user.points = profile.points;
              if(window.addPointsHistory && profile.name) window.addPointsHistory(profile.name, 30, 'SereHighlight Author Reward');
            }
          }
          alert('⭐ Marked as SereHighlight! (+30 SerePoints for author)');
        }
        localStorage.setItem('recommendations', JSON.stringify(recs));
        document.querySelector('[data-section="recommendations"]').click();
      });
    });
  };
})();
