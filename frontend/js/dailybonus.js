// dailybonus.js — Daily Bonus weekly streak
(function(){
  const DAY_MS = 24*60*60*1000;
  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const REWARDS = [5,10,15,20,25,30,50];

  function mondayOfWeek(d){
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1 - day); // move to Monday
    date.setDate(date.getDate() + diff);
    date.setHours(0,0,0,0);
    return date;
  }
  function weekKey(d){
    const m = mondayOfWeek(d);
    return m.toISOString().slice(0,10); // YYYY-MM-DD of Monday
  }
  function keyForUser(userName){
    return `daily-bonus-${userName || 'Guest'}`;
  }

  function getState(userName){
    let st = {};
    const userKey = keyForUser(userName);
    const rawUser = localStorage.getItem(userKey);
    if(rawUser){
      try{ st = JSON.parse(rawUser||'{}'); }catch(e){ st = {}; }
    } else {
      // migrate legacy global key if present
      const legacy = localStorage.getItem('daily-bonus');
      if(legacy){
        try{ st = JSON.parse(legacy||'{}'); }catch(e){ st = {}; }
        // remove legacy so it doesn't keep overriding new per-user states
        try{ localStorage.removeItem('daily-bonus'); }catch(e){}
      }
    }
    const nowKey = weekKey(new Date());
    if(!st.weekKey || st.weekKey !== nowKey){
      st = { weekKey: nowKey, claimed: [false,false,false,false,false,false,false], lastClaimAt: null, streak: 0 };
    } else {
      // ensure shape
      st.claimed = Array.isArray(st.claimed) && st.claimed.length===7 ? st.claimed : [false,false,false,false,false,false,false];
      if(typeof st.streak !== 'number') st.streak = st.claimed.filter(Boolean).length;
    }
    // persist under user-scoped key (handles first-run migration)
    try{ localStorage.setItem(userKey, JSON.stringify(st)); }catch(e){}
    return st;
  }
  function saveState(userName, st){ localStorage.setItem(keyForUser(userName), JSON.stringify(st)); }

  function firstUnclaimed(claimed){
    const idx = claimed.indexOf(false);
    return idx === -1 ? null : idx;
  }

  function formatHMS(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    const hh = String(Math.floor(s/3600)).padStart(2,'0');
    const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }

  window.renderDailyBonus = function(data){
    const userName = (data.user && data.user.name) || 'Guest';
    const st = getState(userName);
    const nextIdx = firstUnclaimed(st.claimed);
    const canTime = st.lastClaimAt==null ? 0 : (st.lastClaimAt + DAY_MS);
    const canClaimNow = nextIdx!==null && Date.now() >= canTime;

    const grid = DAY_NAMES.map((name, i) => {
      const claimed = !!st.claimed[i];
      const isNext = nextIdx === i;
      const isEnabled = isNext && canClaimNow;
      const countdown = isNext && !canClaimNow ? Math.max(0, (canTime - Date.now())) : 0;
      const rewardPts = REWARDS[i] || 5;
      return `
        <div class="card" style="position:relative; text-align:center; padding:1rem;">
          <div style="font-weight:700; margin-bottom:0.35rem;">${name}</div>
          ${claimed ? `
            <button class="btn" disabled style="background:#999;">Reclaimed</button>
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <span style="transform:rotate(-12deg); border:2px dashed var(--rojo-coral); color:var(--rojo-coral); padding:0.2rem 0.5rem; border-radius:6px; background:rgba(255,107,107,0.12); font-weight:900; letter-spacing:1.2px; text-shadow:0 1px 0 rgba(0,0,0,0.1);">RECLAIMED</span>
            </div>
            <div class="secondary-text" style="margin-top:0.5rem; font-weight:600;">Reward: +${rewardPts} SerePoints</div>
          ` : isNext ? `
            <button class="btn claim-btn" data-day-index="${i}" ${isEnabled?'':'disabled'}>
              ${isEnabled ? 'Claim' : 'Claim in'}
            </button>
            ${!isEnabled ? `<div id="daily-countdown-${i}" class="secondary-text" style="margin-top:0.35rem; font-weight:600;">${formatHMS(countdown)}</div>` : ''}
            <div class="secondary-text" style="margin-top:0.35rem; font-weight:600;">Reward: +${rewardPts} SerePoints</div>
          ` : `
            <button class="btn" disabled style="background:#bbb;">Locked</button>
            <div class="secondary-text" style="margin-top:0.5rem; font-weight:600;">Reward: +${rewardPts} SerePoints</div>
          `}
        </div>`;
    }).join('');

    return `
      <section>
        <h2>Daily Bonus</h2>
        <div class="card" style="margin-bottom:1rem;">
          <p style="margin:0;">Claim a daily reward for 7 consecutive days. After claiming, wait 24h to unlock the next one.</p>
        </div>
        <div class="market-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
          ${grid}
        </div>
        <div id="daily-points-history" class="card" style="margin-top:1rem; display:block;">
          <h4>Points History</h4>
          <div id="daily-points-history-items">Loading...</div>
        </div>
      </section>`;
  };

  window.initDailyBonusListeners = function(data){
    const userName = (data.user && data.user.name) || 'Guest';
    const st = getState(userName);
    const nextIdx = firstUnclaimed(st.claimed);
    const canTime = st.lastClaimAt==null ? 0 : (st.lastClaimAt + DAY_MS);

    // claim
    document.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.dayIndex);
        // only allow the next tile
        if(idx !== nextIdx) return;
        if(st.lastClaimAt && Date.now() < canTime) return;
        // award points
        const reward = (REWARDS[idx]||5);
        try{
          data.user.points = (data.user.points||0) + reward;
          localStorage.setItem('profile', JSON.stringify(data.user));
          if(data.user && data.user.name){
            localStorage.setItem(`profile-${data.user.name}`, JSON.stringify(data.user));
            if(window.addPointsHistory) window.addPointsHistory(data.user.name, reward, `Daily Bonus Day ${idx+1}`);
          }
        }catch(e){}

        // update state
        st.claimed[idx] = true;
        st.streak = (st.streak||0) + 1;
        st.lastClaimAt = Date.now();

        // if last day, reset all and start countdown for first day
        if(idx === 6){
          st.claimed = [false,false,false,false,false,false,false];
          st.streak = 0;
          // keep lastClaimAt to enforce 24h for the new first day
          // No bonus points for completing streak - just reset
        }
        saveState(userName, st);
        // confetti effect
        try{ 
          if(typeof launchConfetti === 'function') {
            launchConfetti(); 
          } else {
            // Inline confetti for fallback
            const colors = ['#ff6b6b','#ffd93d','#6bcB77','#4d96ff','#ff7a7a','#f78da7'];
            const count = 60;
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:0;pointer-events:none;z-index:9999';
            for(let i=0;i<count;i++){
              const el = document.createElement('div');
              const size = Math.random()*8+4;
              el.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}vw;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};opacity:0.9;border-radius:${Math.random()>0.5?'50%':'2px'};transition:transform 1.5s ease-out,opacity 1.4s`;
              requestAnimationFrame(()=>{ el.style.transform = `translate3d(${(Math.random()*2-1)*20}vw,${60+Math.random()*40}vh,0) rotate(${720*Math.random()}deg)`; el.style.opacity = '0.2'; });
              container.appendChild(el);
            }
            document.body.appendChild(container);
            setTimeout(()=>container.remove(), 2000);
          }
        }catch(e){}
        // re-render
        document.querySelector('[data-section="dailybonus"]').click();
      });
    });

    // countdown updater for the next tile
    if(nextIdx !== null && st.lastClaimAt){
      const el = document.getElementById(`daily-countdown-${nextIdx}`);
      if(el){
        const int = setInterval(()=>{
          const remaining = Math.max(0, (st.lastClaimAt + DAY_MS) - Date.now());
          el.textContent = formatHMS(remaining);
          if(remaining <= 0){
            clearInterval(int);
            // enable button visually without full rerender
            const btn = document.querySelector(`.claim-btn[data-day-index="${nextIdx}"]`);
            if(btn){ btn.removeAttribute('disabled'); btn.textContent = 'Claim'; }
          }
        }, 1000);
      }
    }
  };

  function launchConfetti(){
    const colors = ['#ff6b6b','#ffd93d','#6bcB77','#4d96ff','#ff7a7a','#f78da7'];
    const count = 80;
    const frag = document.createDocumentFragment();
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      const size = Math.random()*8+4;
      el.style.position = 'fixed';
      el.style.top = '-10px';
      el.style.left = Math.random()*100 + 'vw';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.opacity = '0.9';
      el.style.transform = `translate3d(0,0,0) rotate(${Math.random()*360}deg)`;
      el.style.borderRadius = Math.random()>0.5 ? '50%' : '2px';
      const fall = 60 + Math.random()*40; // vh
      const drift = (Math.random()*2-1)*20; // vw drift
      el.style.transition = `transform ${0.9+Math.random()*0.9}s ease-out, opacity 1.4s`;
      // trigger async so transitions apply
      requestAnimationFrame(()=>{
        el.style.transform = `translate3d(${drift}vw, ${fall}vh, 0) rotate(${720*Math.random()}deg)`;
        el.style.opacity = '0.2';
      });
      frag.appendChild(el);
    }
    container.appendChild(frag);
    document.body.appendChild(container);
    setTimeout(()=>{ if(container && container.parentNode) container.parentNode.removeChild(container); }, 1800);
  }
})();
