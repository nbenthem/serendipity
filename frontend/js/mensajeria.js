// mensajeria.js — chat section (simple localStorage-based messaging)
(function(){
  function getMessages(){
    try{ return JSON.parse(localStorage.getItem('user-messages')||'[]'); }catch(e){ return []; }
  }
  function saveMessage(msg){
    const arr = getMessages();
    arr.push(msg);
    localStorage.setItem('user-messages', JSON.stringify(arr));
  }
  function getReadState(user){
    try{ return JSON.parse(localStorage.getItem(`messaging-read-${user}`)||'{}'); }catch(e){ return {}; }
  }
  function setReadState(user, state){
    localStorage.setItem(`messaging-read-${user}`, JSON.stringify(state||{}));
  }
  function getUnreadCountFor(user, contact){
    const msgs = getMessages();
    const lastRead = getReadState(user)[contact] || 0;
    return msgs.filter(m => m.to === user && m.from === contact && m.timestamp > lastRead).length;
  }
  function totalUnread(user){
    const contacts = uniqueContacts(user);
    return contacts.reduce((acc, c)=> acc + getUnreadCountFor(user,c), 0);
  }
  function uniqueContacts(currentUser){
    const msgs = getMessages();
    const set = new Set();
    msgs.forEach(m => {
      if(m.from === currentUser && m.to) set.add(m.to);
      if(m.to === currentUser && m.from) set.add(m.from);
    });
    return Array.from(set);
  }

  window.renderMensajeria = function(data){
    const me = (data.user && data.user.name) || 'Anonymous';
    const pendingChat = sessionStorage.getItem('openChatWith');
    const contacts = uniqueContacts(me);
    const openWith = pendingChat || '';

    // If a pending chat exists and the user isn't in contacts yet, include it
    if(openWith && !contacts.includes(openWith)) contacts.unshift(openWith);

    function renderChatList(){
      function lastMessageWith(u){
        const msgs = getMessages().filter(m => (m.from===me&&m.to===u) || (m.from===u&&m.to===me)).sort((a,b)=>b.timestamp-a.timestamp);
        return msgs[0] || null;
      }
      return `
        <div id="chat-list" class="card">
          <h3 style="margin-bottom:0.5rem;">Chats</h3>
          ${contacts.length ? contacts.map(u=>`
            <div class="chat-list-item" data-user="${u}" style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0; border-bottom:1px solid #eee; cursor:pointer;">
              <div style="position:relative; display:inline-block;">
                <img src="https://i.pravatar.cc/40?u=${encodeURIComponent(u)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                ${(() => {
                  const levelInfo = window.calculateLevel ? window.calculateLevel(u) : {level: 1};
                  return `<div class="user-level-badge" style="
                    position:absolute; 
                    bottom:-2px; 
                    right:-2px; 
                    background:linear-gradient(135deg, var(--verde), var(--azul-pastel)); 
                    color:white; 
                    border-radius:50%; 
                    width:18px; 
                    height:18px; 
                    display:flex; 
                    align-items:center; 
                    justify-content:center; 
                    font-size:0.6em; 
                    font-weight:700; 
                    border:2px solid white;
                    box-shadow:0 1px 3px rgba(0,0,0,0.2);
                  ">${levelInfo.level}</div>`;
                })()}
              </div>
              <div style="flex:1;">
                <strong>${u}</strong>
                ${(() => {
                  const unread = getUnreadCountFor(me, u);
                  const last = lastMessageWith(u);
                  const preview = last ? (last.message.length>40? last.message.slice(0,40)+'…' : last.message) : 'No messages yet';
                  const bold = unread>0 && last && last.from===u;
                  return `<div style="display:flex; align-items:center; gap:0.4rem;">
                    <span class="${bold?'':'secondary-text'}" style="font-size:0.85em; ${bold?'font-weight:700;':''}">${preview}</span>
                    ${unread>0 ? '<span class="blue-dot"></span>' : ''}
                  </div>`;
                })()}
              </div>
            </div>
          `).join('') : `<div class="secondary-text">No chats yet. Search a user and click \"Send Message\" to start.</div>`}
        </div>`;
    }

    function renderConversation(withUser){
      const msgs = getMessages().filter(m =>
        (m.from === me && m.to === withUser) || (m.from === withUser && m.to === me)
      ).sort((a,b)=>a.timestamp-b.timestamp);
      return `
        <div id="chat-view" class="card">
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.75rem;">
            <button id="back-to-chats" class="btn btn-secondary" style="padding:0.35rem 0.7rem;">◀ Back</button>
            <div style="position:relative; display:inline-block;">
              <img src="https://i.pravatar.cc/40?u=${encodeURIComponent(withUser)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
              ${(() => {
                const levelInfo = window.calculateLevel ? window.calculateLevel(withUser) : {level: 1};
                return `<div class="user-level-badge" style="
                  position:absolute; 
                  bottom:-2px; 
                  right:-2px; 
                  background:linear-gradient(135deg, var(--verde), var(--azul-pastel)); 
                  color:white; 
                  border-radius:50%; 
                  width:18px; 
                  height:18px; 
                  display:flex; 
                  align-items:center; 
                  justify-content:center; 
                  font-size:0.6em; 
                  font-weight:700; 
                  border:2px solid white;
                  box-shadow:0 1px 3px rgba(0,0,0,0.2);
                ">${levelInfo.level}</div>`;
              })()}
            </div>
            <h3 style="margin:0;">${withUser}</h3>
          </div>
          <div id="chat-messages" style="min-height:220px; max-height:50vh; overflow-y:auto; padding:0.25rem; background:var(--bg-secondary); border-radius:8px;">
            ${msgs.map((m, idx) => `
              <div style="display:flex; ${m.from===me?'justify-content:flex-end':'justify-content:flex-start'}; margin:0.35rem 0;">
                <div style="max-width:70%; padding:0.5rem 0.7rem; border-radius:12px; position:relative; ${m.from===me? 'background:var(--rojo-coral); color:#fff; border-top-right-radius:4px;' : 'background:#eee; color:#333; border-top-left-radius:4px;'}">
                  ${(m.from === me || (data.user && data.user.name === 'admin')) ? `
                    <button class="delete-message" data-timestamp="${m.timestamp}" style="position:absolute; top:-8px; right:-8px; width:20px; height:20px; border-radius:50%; background:#d9534f; color:white; border:none; font-size:12px; cursor:pointer; display:none;">×</button>
                  ` : ''}
                  <div style="white-space:pre-wrap; word-wrap:break-word;">${m.message}</div>
                  <div class="secondary-text" style="font-size:0.7em; text-align:right; margin-top:0.25rem; opacity:0.8;">${new Date(m.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <form id="chat-send-form" style="margin-top:0.6rem; display:flex; gap:0.5rem;">
            <input id="chat-input" type="text" placeholder="Write a message..." required style="flex:1; padding:0.6rem; border:2px solid #ddd; border-radius:8px; background:var(--bg); color:var(--texto);">
            <button class="btn" type="submit">Send</button>
          </form>
        </div>`;
    }

    // If openChatWith, show conversation; else show list
    if(openWith){
      return `
        <section>
          <h2>Messaging</h2>
          ${renderConversation(openWith)}
        </section>`;
    }
    return `
      <section>
        <h2>Messaging</h2>
        ${renderChatList()}
      </section>`;
  };

  window.initMensajeriaListeners = function(data){
    const me = (data.user && data.user.name) || 'Anonymous';
    const pending = sessionStorage.getItem('openChatWith');

    // open chat from list
    document.querySelectorAll('.chat-list-item').forEach(el => {
      el.addEventListener('click', ()=>{
        sessionStorage.setItem('openChatWith', el.dataset.user);
        document.querySelector('[data-section="mensajeria"]').click();
      });
    });

    // chat view behaviors
    const backBtn = document.getElementById('back-to-chats');
    if(backBtn){
      backBtn.addEventListener('click', ()=>{
        sessionStorage.removeItem('openChatWith');
        document.querySelector('[data-section="mensajeria"]').click();
      });
    }

    const sendForm = document.getElementById('chat-send-form');
    if(sendForm){
      const input = document.getElementById('chat-input');
      const withUser = sessionStorage.getItem('openChatWith');
      // mark conversation as read on open
      const rs = getReadState(me); rs[withUser] = Date.now(); setReadState(me, rs);
      if(window.updateMessagingBadge) window.updateMessagingBadge(data);
      sendForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const text = (input.value||'').trim();
        if(!text) return;
        saveMessage({ to: withUser, from: me, message: text, timestamp: Date.now() });
        // re-render chat
        document.querySelector('[data-section="mensajeria"]').click();
        // restore scroll to bottom after render
        setTimeout(()=>{
          const box = document.getElementById('chat-messages');
          if(box) box.scrollTop = box.scrollHeight;
        }, 0);
      });
      // auto scroll to bottom initially
      const box = document.getElementById('chat-messages');
      if(box) box.scrollTop = box.scrollHeight;
      
      // Show/hide delete buttons on hover
      document.querySelectorAll('#chat-messages > div').forEach(msgDiv => {
        msgDiv.addEventListener('mouseenter', () => {
          const delBtn = msgDiv.querySelector('.delete-message');
          if(delBtn) delBtn.style.display = 'block';
        });
        msgDiv.addEventListener('mouseleave', () => {
          const delBtn = msgDiv.querySelector('.delete-message');
          if(delBtn) delBtn.style.display = 'none';
        });
      });
      
      // Delete message functionality
      document.querySelectorAll('.delete-message').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const timestamp = Number(e.currentTarget.dataset.timestamp);
          if(!confirm('Delete this message?')) return;
          
          // Remove message from localStorage
          const messages = getMessages();
          const filtered = messages.filter(m => m.timestamp !== timestamp);
          localStorage.setItem('user-messages', JSON.stringify(filtered));
          
          // Re-render the conversation
          document.querySelector('[data-section="mensajeria"]').click();
        });
      });
    }

    // Update badge also when just viewing the list
    if(window.updateMessagingBadge) window.updateMessagingBadge(data);
  };

  // Expose a nav badge updater
  window.updateMessagingBadge = function(data){
    const me = (data.user && data.user.name) || 'Anonymous';
    const total = totalUnread(me);
    const btn = document.querySelector('[data-section="mensajeria"]');
    if(!btn) return;
    let badge = btn.querySelector('.nav-badge');
    if(!badge){
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      btn.appendChild(badge);
    }
    if(total>0){
      badge.textContent = String(total);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
})();
