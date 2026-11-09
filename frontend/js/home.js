// home.js — renders the Home / landing section and exposes initHomeListeners
(function(){
  window.renderHome = function(data){
    const userName = data.user?.name || 'there';
    const stats = {
      members: (data.users||[]).length,
      guides: (data.docs||[]).length,
      posts: (data.feed||[]).length,
      products: (data.market||[]).length
    };
    // HERO BACKGROUND ASSET: default points to assets/hero.png (replace file if needed)
    const heroBg = data.heroBg || 'assets/hero.png';
    return `
      <section>
        <!-- Hero background uses the local assets/hero.png image by default. -->
        <div class="hero" style="margin-bottom:1rem; border-radius:8px; overflow:hidden;">
          <div style="background-image:url('${heroBg}'); background-size:cover; background-position:center; padding:2.4rem 2rem; display:flex; align-items:center; justify-content:center; position:relative;">
            <div style="backdrop-filter:blur(2px); background:rgba(255,255,255,0.6); border-radius:12px; padding:1.2rem 1.4rem; max-width:1100px; width:100%; display:flex; gap:1.25rem; align-items:center; justify-content:space-between;">
              <div style="color:#08124a;">
                <h1 style="margin:0 0 0.35rem 0; font-size:1.85rem;">Welcome, ${userName}</h1>
                <p style="margin:0 0 0.4rem 0; line-height:1.4;">Serendipity is a living corner of the internet where makers, readers and the quietly curious show up to share what they know, build small helpful things and cheer each other on.</p>
                <p style="margin:0; font-size:0.95rem; opacity:0.85;">Dive in: explore new guides, react to a post, or discover a product crafted with care.</p>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.5rem; min-width:180px;">
                <button class="btn" id="home-open-feed">Your Feed</button>
                <button class="btn" id="home-open-market">Open Market</button>
                <button class="btn" id="home-open-profile">Your Profile</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="display:grid; grid-template-columns:1fr 360px; gap:1.25rem; align-items:start;">
          <div style="padding-right:0.5rem;">
            <h3 style="margin:0 0 0.6rem 0;">About Serendipity</h3>
            <p style="line-height:1.6;">We started Serendipity with a simple belief: <em>small, generous contributions compound</em>. A clear explanation, a useful recommendation, a humble product—it all adds up to a warmer, smarter community. Nothing noisy. No growth hacks. Just people exchanging the things they genuinely find helpful.</p>
            <details class="card" style="margin:0.6rem 0 0.6rem 0; padding:0.9rem;">
              <summary style="cursor:pointer; font-weight:700; font-size:1.02rem;">What You'll Find</summary>
              <ul style="margin:0.7rem 0 0 0; padding-left:1.1rem; line-height:1.5;">
                <li><strong>Guides:</strong> Practical walk‑throughs written after real experience.</li>
                <li><strong>Recommendations:</strong> Books, tools and articles that sparked insight.</li>
                <li><strong>Marketplace:</strong> Thoughtful, lightweight products made by members.</li>
                <li><strong>Feed:</strong> Daily reflections, micro‑notes and progress snapshots.</li>
              </ul>
            </details>
            <details class="card" style="margin:0 0 0.8rem 0; padding:0.9rem;">
              <summary style="cursor:pointer; font-weight:700; font-size:1.02rem;">Core Values</summary>
              <ul style="margin:0.7rem 0 0 0; padding-left:1.1rem; line-height:1.5; font-size:0.95rem;">
                <li><strong>Clarity:</strong> Favor plain language over jargon.</li>
                <li><strong>Generosity:</strong> Share what helped you—even if it seems small.</li>
                <li><strong>Curiosity:</strong> Ask good questions; follow interesting threads.</li>
                <li><strong>Respect:</strong> Assume good intent. Credit sources. Be kind.</li>
              </ul>
            </details>
            <p style="margin:0.4rem 0 0; font-size:0.85rem; color:#666;"> Start earning <strong>SerePoints</strong> by sharing recommendations and documents. Learn more below:</p>
            <details class="card" style="margin-top:0.9rem; padding:1rem;">
              <summary style="cursor:pointer; font-weight:700; font-size:1.05rem;">How do our SerePoints work?</summary>
              <div style="margin-top:0.75rem; line-height:1.55; font-size:0.92rem;">
                <p><strong>SerePoints</strong> recognize your meaningful contributions. You can later redeem them for shop discounts.</p>
                <h5 style="margin:0.8rem 0 0.4rem 0; font-size:1rem;">Earning SerePoints</h5>
                <ul style="margin:0 0 0.6rem 0; padding-left:1.1rem;">
                  <li>Upload a valid document: <strong>+8</strong></li>
                  <li>Substantial document update: <strong>+3</strong></li>
                  <li>Weekly recommendation submission: <strong>+12</strong></li>
                  <li>Recommendation reaches weekly podium: <strong>+25</strong></li>
                  <li>Admin highlighted recommendation: <strong>+30</strong></li>
                  <li>Useful comment (&gt;100 chars): <strong>+2</strong> (daily cap)</li>
                  <li>Deep thread start (&gt;150 chars): <strong>+4</strong></li>
                  <li>Vote received on your recommendation: <strong>+1</strong> (capped)</li>
                </ul>
                <h5 style="margin:0.8rem 0 0.4rem 0; font-size:1rem;">Levels</h5>
                <p>Your level rises with total earned SerePoints. A progressive formula ramps required SerePoints each level. Progress is shown as a bar.</p>
                <h5 style="margin:0.8rem 0 0.4rem 0; font-size:1rem;">Badges</h5>
                <ul style="margin:0 0 0.6rem 0; padding-left:1.1rem;">
                  <li><strong>Documentor:</strong> Multiple document milestones.</li>
                  <li><strong>Curator:</strong> Recommendations reaching podium.</li>
                  <li><strong>Highlight Master:</strong> Several admin highlights.</li>
                  <li><strong>Engaged Commenter:</strong> Many qualified comments.</li>
                  <li><strong>Popular Pick:</strong> High‑vote recommendation.</li>
                  <li><strong>Streaker:</strong> Consecutive active weeks.</li>
                </ul>
                <h5 style="margin:0.8rem 0 0.4rem 0; font-size:1rem;">Redeeming SerePoints</h5>
                <p>Every 100 SerePoints = €1 discount. Limit: up to 30% of cart per purchase. History tracked for transparency.</p>
                <h5 style="margin:0.8rem 0 0.4rem 0; font-size:1rem;">Good Practices</h5>
                <ul style="margin:0 0 0.6rem 0; padding-left:1.1rem;">
                  <li>Quality over quantity.</li>
                  <li>No spam: empty text gives nothing.</li>
                  <li>Be respectful and credit sources.</li>
                </ul>
                <p style="margin:0.9rem 0 0; font-size:0.85rem; color:#666;">Initial calibration. Values may adjust as the community evolves.</p>
              </div>
            </details>
            <h4 style="margin:1rem 0 0.4rem 0;">Living Stats</h4>
            <p style="display:flex; flex-wrap:wrap; gap:0.75rem;">
              <span class="living-stat">Members: ${stats.members}</span>
              <span class="living-stat">Guides: ${stats.guides}</span>
              <span class="living-stat">Posts: ${stats.posts}</span>
              <span class="living-stat">Products: ${stats.products}</span>
            </p>
            <h4 style="margin:1rem 0 0.4rem 0;">Contact</h4>
            <p style="margin:0 0 0.4rem 0;">Email: <a href="mailto:hello@serendipity.local">hello@serendipity.local</a> · Phone: +1 (555) 123-4567</p>
            <p style="margin:0; color:#666; font-size:0.85rem;">Address: 123 Community Lane, Example City — Mon–Fri 9:00–17:00</p>
          </div>

          <!-- Contact form card -->
          <aside>
            <div class="card" style="padding:1rem;">
              <h3 style="margin:0 0 0.6rem 0;">Contact Us</h3>
              <form id="contact-form">
                <div style="display:flex; flex-direction:column; gap:0.6rem;">
                  <input name="name" placeholder="Your name" required style="padding:0.6rem;">
                  <input name="email" type="email" placeholder="Your email" required style="padding:0.6rem;">
                  <input name="subject" placeholder="Subject" style="padding:0.6rem;">
                  <textarea name="message" placeholder="Your message" required style="padding:0.6rem; min-height:96px;"></textarea>
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button class="btn" type="submit">Send Message</button>
                    <button class="btn" type="button" id="contact-clear">Clear</button>
                  </div>
                  <div id="contact-success" style="display:none; color:var(--verde, #2a9d8f);">Thanks — your message has been sent.</div>
                </div>
              </form>
            </div>
          </aside>
        </div>

        <section style="margin-top:1.25rem;">
          <h3 style="text-align:center; margin:0 0 0.75rem 0;">Featured</h3>
          <div class="market-grid">
            ${ (data.market||[]).slice(0,4).map(m => `
              <div class="card market-item featured-item" data-name="${m.name}">
                ${m.image? `<img src="${m.image}" alt="${m.name}" class="market-image">` : ''}
                <h4 style="margin:0.5rem 0 0.4rem 0;">${m.name}</h4>
                <p style="margin:0 0 0.5rem 0; line-height:1.4;">${m.desc}</p>
                <div style="display:flex; gap:0.5rem;"><button class="btn buy-btn">Buy (€${m.price})</button></div>
              </div>
            `).join('') }
          </div>
        </section>
      </section>
    `;
  };

  window.initHomeListeners = function(data){
    // Attach interactions after app.js renders the section
    document.getElementById('home-open-feed')?.addEventListener('click', () => document.querySelector('[data-section="feed"]').click());
    document.getElementById('home-open-market')?.addEventListener('click', () => document.querySelector('[data-section="market"]').click());
    document.getElementById('home-open-profile')?.addEventListener('click', () => document.querySelector('[data-section="perfil"]').click());

    // Preload hero image and provide graceful fallback if missing
    (function(){
      const heroContainer = document.querySelector('.hero > div');
      if(!heroContainer) return;
      const styleVal = heroContainer.style.backgroundImage || '';
      const match = styleVal.match(/url\(['"]?(.*hero.*\.(png|jpg|jpeg|webp))['"]?\)/i);
      const imgUrl = match ? match[1] : null;
      if(!imgUrl) return; // nothing to preload
      const img = new Image();
      img.onload = () => { heroContainer.classList.add('hero-loaded'); };
      img.onerror = () => {
        // fallback gradient similar to previous SVG look
        heroContainer.style.backgroundImage = 'linear-gradient(135deg,#a8e6cf,#9fe2f7)';
        heroContainer.classList.add('hero-fallback');
      };
      img.src = imgUrl;
    })();

    // buy buttons inside featured items - use cart system
    document.querySelectorAll('.featured-item .buy-btn').forEach(b => b.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.featured-item');
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

    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    const contactSuccess = document.getElementById('contact-success');
    const contactClear = document.getElementById('contact-clear');
    if(contactForm){
      contactForm.removeEventListener('submit', contactSubmitHandler);
      contactForm.addEventListener('submit', contactSubmitHandler);
    }
    if(contactClear){
      contactClear.removeEventListener('click', () => {});
      contactClear.addEventListener('click', () => { contactForm.reset(); contactSuccess.style.display = 'none'; });
    }

    function contactSubmitHandler(e){
      e.preventDefault();
      const fd = new FormData(contactForm);
      const entry = {
        name: (fd.get('name')||'').trim(),
        email: (fd.get('email')||'').trim(),
        subject: (fd.get('subject')||'').trim(),
        message: (fd.get('message')||'').trim(),
        ts: Date.now()
      };
      if(!entry.name || !entry.email || !entry.message){
        alert('Please complete required fields (name, email, message).');
        return;
      }
      const key = 'contact-submissions';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(entry);
      localStorage.setItem(key, JSON.stringify(arr));
      contactForm.reset();
      if(contactSuccess) contactSuccess.style.display = 'block';
      setTimeout(()=>{ if(contactSuccess) contactSuccess.style.display = 'none'; }, 4000);
    }
  };
})();

// Inject modals for "What You'll Find" and "Core Values" after initial render (lazy pattern)
// Removed modal injection (now using <details> collapsibles for simplicity per user request)
