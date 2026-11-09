// js/market.js
function renderMarket(data) {
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const wishlist = JSON.parse(localStorage.getItem(`wishlist-${userName}`) || '[]');
  const isAdmin = window.data && window.data.user && window.data.user.name === 'admin';
  const userPoints = (data.user && data.user.points) || 0;
  const redeemDiscount = getRedeemedDiscount();
  
  return `
    <section>
      <h2>Market</h2>
      
      <div class="card" style="margin-bottom:1rem; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;">
        <h3 style="margin:0 0 0.5rem 0; color:white;">💎 SerePoints Rewards</h3>
        <p style="margin:0 0 0.5rem 0; font-size:0.95rem;">Use your SerePoints for discounts: <strong>100 SerePoints = €1</strong></p>
        <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <div style="font-size:1.5rem; font-weight:700;">${userPoints} SerePoints</div>
            <div style="font-size:0.85rem; opacity:0.9;">= €${(userPoints/100).toFixed(2)} discount available</div>
            ${redeemDiscount > 0 ? `<div style="margin-top:0.5rem; padding:0.5rem; background:rgba(255,255,255,0.2); border-radius:4px;">✓ Active discount: €${redeemDiscount.toFixed(2)}</div>` : ''}
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn" id="redeem-all-points" style="background:white; color:#667eea; font-weight:600;" ${userPoints < 100 ? 'disabled' : ''}>Redeem All</button>
            <button class="btn" id="redeem-custom-points" style="background:rgba(255,255,255,0.2); color:white; font-weight:600;" ${userPoints < 100 ? 'disabled' : ''}>Redeem Custom</button>
            ${redeemDiscount > 0 ? `<button class="btn" id="cancel-redeem" style="background:rgba(255,107,107,0.9); color:white; font-weight:600;">Cancel Discount</button>` : ''}
          </div>
        </div>
      </div>
      
      <div class="market-grid">
        ${data.market.map((item, idx) => `
          <div class="card market-item market-card" data-name="${item.name}" data-idx="${idx}">
            ${item.image? `<img src="${item.image}" alt="${item.name}" class="market-image">` : ''}
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <p>Price: €${item.price}</p>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <button class="btn buy-btn">Buy (€${item.price})</button>
              <button class="btn wishlist-btn">${wishlist.includes(item.name) ? 'Saved' : 'Wishlist'}</button>
              ${isAdmin ? `<button class="btn small admin-edit-product" data-idx="${idx}" style="background:#17a2b8;">Edit</button>` : ''}
              ${isAdmin ? `<button class="btn small admin-delete-product" data-idx="${idx}" style="background:#d9534f;">Delete</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function initMarketListeners() {
  // Buy buttons now add items to cart
  document.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener('click', e => {
      const card = e.currentTarget.closest('.market-card');
      const name = card?.dataset.name;
      if(!name) return;
      
      // Find the product in data
      const product = (window.data && window.data.market) ? window.data.market.find(m => m.name === name) : null;
      if(!product) return;
      
      // Add to cart
      addToCart(product);
      
      // Visual feedback
      e.currentTarget.textContent = '✓ Added';
      setTimeout(() => { e.currentTarget.textContent = `Buy (€${product.price})`; }, 1000);
    });
  });

  // Wishlist toggle stored per user
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.market-card');
      const name = card?.dataset.name;
      if(!name) return;
      const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
      const key = `wishlist-${userName}`;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.indexOf(name);
      if(idx >= 0){
        list.splice(idx,1);
        e.currentTarget.textContent = 'Wishlist';
      } else {
        list.push(name);
        e.currentTarget.textContent = 'Saved';
      }
      localStorage.setItem(key, JSON.stringify(list));
      // if profile is open, update wishlist display
      const profileBtn = document.querySelector('[data-section="perfil"]');
      if(profileBtn && profileBtn.classList.contains('active')) document.querySelector('[data-section="perfil"]').click();
    });
  });



  // Create a simple image modal (lightbox) for previewing product images
  let imgModal = document.getElementById('image-modal');
  if(!imgModal){
    imgModal = document.createElement('div');
    imgModal.id = 'image-modal';
    imgModal.style.position = 'fixed';
    imgModal.style.top = '0';
    imgModal.style.left = '0';
    imgModal.style.width = '100%';
    imgModal.style.height = '100%';
    imgModal.style.display = 'none';
    imgModal.style.alignItems = 'center';
    imgModal.style.justifyContent = 'center';
    imgModal.style.background = 'rgba(0,0,0,0.7)';
    imgModal.style.zIndex = '9999';
    imgModal.innerHTML = `
      <div style="position:relative; max-width:90%; max-height:90%;">
        <img id="image-modal-img" src="" alt="preview" style="max-width:100%; max-height:100%; border-radius:6px; display:block;" />
        <button id="image-modal-close" class="btn small" style="position:absolute; top:-10px; right:-10px;">Close</button>
      </div>
    `;
    imgModal.addEventListener('click', (ev) => {
      if(ev.target === imgModal) imgModal.style.display = 'none';
    });
    document.body.appendChild(imgModal);
  }

  // Open image in modal when clicking product thumbnails
  document.querySelectorAll('.market-image').forEach(img => {
    img.style.cursor = 'pointer';
    img.removeEventListener('click', imageClickHandler);
    img.addEventListener('click', imageClickHandler);
    // Attach onerror handler to log what URL the browser tried to load
    img.onerror = function(){
      console.error('Image failed to load from:', this.src);
      this.onerror = null;
      // Show fallback SVG placeholder
      this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="100%" height="100%" fill="%23f3f3f3"/><g transform="translate(36,36) scale(0.7)" fill="%23999"><path d="M16 128 L56 48 L112 152 L168 80 L240 176 L304 32 L336 176 L16 128 Z"/></g></svg>';
    };
  });

  function imageClickHandler(e){
    const src = e.currentTarget && (e.currentTarget.dataset?.full || e.currentTarget.src);
    const modalImg = document.getElementById('image-modal-img');
    if(modalImg){ modalImg.src = src; }
    const mod = document.getElementById('image-modal');
    if(mod) mod.style.display = 'flex';
  }

  const closeBtn = document.getElementById('image-modal-close');
  if(closeBtn){
    closeBtn.removeEventListener('click', () => {});
    closeBtn.addEventListener('click', () => { const mod = document.getElementById('image-modal'); if(mod) mod.style.display = 'none'; });
  }

  // Close modal with Escape
  document.removeEventListener('keydown', escKeyHandler);
  document.addEventListener('keydown', escKeyHandler);
  function escKeyHandler(e){ if(e.key === 'Escape'){ const mod = document.getElementById('image-modal'); if(mod) mod.style.display = 'none'; } }

  // Admin: delete product
  document.querySelectorAll('.admin-delete-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      if(!window.data || !window.data.market) return;
      if(!confirm(`Delete product "${window.data.market[idx].name}"?`)) return;
      window.data.market.splice(idx, 1);
      document.querySelector('[data-section="market"]').click();
    });
  });

  // Admin: edit product (simple prompt-based for now)
  document.querySelectorAll('.admin-edit-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      if(!window.data || !window.data.market) return;
      const prod = window.data.market[idx];
      const newName = prompt('Product name:', prod.name);
      if(!newName) return;
      const newDesc = prompt('Description:', prod.desc);
      const newPrice = parseFloat(prompt('Price:', prod.price));
      const newImage = prompt('Image URL:', prod.image);
      window.data.market[idx] = { name: newName, desc: newDesc || prod.desc, price: isNaN(newPrice) ? prod.price : newPrice, image: newImage || prod.image };
      document.querySelector('[data-section="market"]').click();
    });
  });

  // SerePoints: Redeem All
  const redeemAllBtn = document.getElementById('redeem-all-points');
  if(redeemAllBtn){
    redeemAllBtn.addEventListener('click', () => {
      const userPoints = (window.data && window.data.user && window.data.user.points) || 0;
      if(userPoints < 100){
        alert('You need at least 100 SerePoints to redeem.');
        return;
      }
      const discount = userPoints / 100;
      setRedeemedDiscount(discount);
      alert(`✓ Redeemed ${userPoints} SerePoints for €${discount.toFixed(2)} discount!`);
      document.querySelector('[data-section="market"]').click();
    });
  }

  // SerePoints: Redeem Custom
  const redeemCustomBtn = document.getElementById('redeem-custom-points');
  if(redeemCustomBtn){
    redeemCustomBtn.addEventListener('click', () => {
      const userPoints = (window.data && window.data.user && window.data.user.points) || 0;
      if(userPoints < 100){
        alert('You need at least 100 SerePoints to redeem.');
        return;
      }
      const input = prompt(`Enter SerePoints to redeem (100 points = €1)\nAvailable: ${userPoints} SerePoints`);
      if(!input) return;
      const points = parseInt(input);
      if(isNaN(points) || points < 100){
        alert('Minimum 100 SerePoints required.');
        return;
      }
      if(points > userPoints){
        alert(`You only have ${userPoints} SerePoints available.`);
        return;
      }
      const discount = points / 100;
      setRedeemedDiscount(discount);
      alert(`✓ Redeemed ${points} SerePoints for €${discount.toFixed(2)} discount!`);
      document.querySelector('[data-section="market"]').click();
    });
  }

  // SerePoints: Cancel Discount
  const cancelRedeemBtn = document.getElementById('cancel-redeem');
  if(cancelRedeemBtn){
    cancelRedeemBtn.addEventListener('click', () => {
      if(confirm('Cancel your active SerePoints discount?')){
        clearRedeemedDiscount();
        alert('Discount cancelled. Your SerePoints remain unchanged.');
        document.querySelector('[data-section="market"]').click();
      }
    });
  }
}

// SerePoints Discount functions
function getRedeemedDiscount(){
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const key = `redeemed-discount-${userName}`;
  try{
    return parseFloat(localStorage.getItem(key) || '0');
  }catch(e){ return 0; }
}

function setRedeemedDiscount(amount){
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const key = `redeemed-discount-${userName}`;
  localStorage.setItem(key, amount.toString());
}

function clearRedeemedDiscount(){
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const key = `redeemed-discount-${userName}`;
  localStorage.removeItem(key);
}

// Shopping Cart functions (per user)
function getCart(){
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const key = `shopping-cart-${userName}`;
  try{
    return JSON.parse(localStorage.getItem(key) || '[]');
  }catch(e){ return []; }
}

function saveCart(cart){
  const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
  const key = `shopping-cart-${userName}`;
  try{
    localStorage.setItem(key, JSON.stringify(cart));
    updateCartCount();
  }catch(e){}
}

// Expose globally so home.js can use it for featured products
window.addToCart = function(product){
  const cart = getCart();
  const existing = cart.find(item => item.name === product.name);
  
  if(existing){
    existing.quantity += 1;
  } else {
    cart.push({
      name: product.name,
      desc: product.desc,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }
  
  saveCart(cart);
  updateCartCount();
};

function removeFromCart(productName){
  let cart = getCart();
  cart = cart.filter(item => item.name !== productName);
  saveCart(cart);
  renderCartItems();
}

function updateCartItemQuantity(productName, delta){
  const cart = getCart();
  const item = cart.find(i => i.name === productName);
  if(!item) return;
  
  item.quantity += delta;
  if(item.quantity <= 0){
    removeFromCart(productName);
  } else {
    saveCart(cart);
    renderCartItems();
  }
}

function clearCart(){
  if(confirm('Clear all items from cart?')){
    const userName = (window.data && window.data.user && window.data.user.name) || 'Guest';
    const key = `shopping-cart-${userName}`;
    localStorage.removeItem(key);
    updateCartCount();
    renderCartItems();
  }
}

function updateCartCount(){
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cart-count');
  if(countEl) countEl.textContent = total;
}

function renderCartItems(){
  const cart = getCart();
  const container = document.getElementById('cart-items-container');
  if(!container) return;
  
  if(cart.length === 0){
    container.innerHTML = '<p style="text-align:center; padding:2rem; color:#666;">Your cart is empty.</p>';
    document.getElementById('cart-total').textContent = '€0.00';
    return;
  }
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = getRedeemedDiscount();
  const total = Math.max(0, subtotal - discount);
  
  const totalEl = document.getElementById('cart-total');
  if(discount > 0){
    totalEl.innerHTML = `
      <div style="font-size:0.9rem; color:#666; text-decoration:line-through;">€${subtotal.toFixed(2)}</div>
      <div style="color:#2a9d8f; font-weight:600; margin:0.25rem 0;">-€${discount.toFixed(2)} SerePoints discount</div>
      <div style="font-size:1.2rem; font-weight:700;">€${total.toFixed(2)}</div>
    `;
  } else {
    totalEl.textContent = `€${total.toFixed(2)}`;
  }
  
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.style.display='none';">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">€${item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-quantity">
        <button class="qty-decrease" data-name="${item.name}">−</button>
        <span style="min-width:30px; text-align:center; font-weight:600;">${item.quantity}</span>
        <button class="qty-increase" data-name="${item.name}">+</button>
      </div>
      <button class="cart-item-remove" data-name="${item.name}">Remove</button>
    </div>
  `).join('');
  
  // Attach event listeners
  container.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.name;
      updateCartItemQuantity(name, -1);
    });
  });
  
  container.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.name;
      updateCartItemQuantity(name, 1);
    });
  });
  
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.name;
      removeFromCart(name);
    });
  });
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  
  // Cart button opens modal
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const closeCartModal = document.getElementById('close-cart-modal');
  
  if(cartBtn){
    cartBtn.addEventListener('click', () => {
      renderCartItems();
      cartModal.style.display = 'flex';
    });
  }
  
  if(closeCartModal){
    closeCartModal.addEventListener('click', () => {
      cartModal.style.display = 'none';
    });
  }
  
  if(cartModal){
    cartModal.addEventListener('click', (e) => {
      if(e.target === cartModal) cartModal.style.display = 'none';
    });
  }
  
  // Clear cart button
  const clearCartBtn = document.getElementById('clear-cart-btn');
  if(clearCartBtn){
    clearCartBtn.addEventListener('click', clearCart);
  }
  
  // Checkout button
  const checkoutBtn = document.getElementById('checkout-btn');
  if(checkoutBtn){
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      if(cart.length === 0){
        alert('Your cart is empty.');
        return;
      }
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = getRedeemedDiscount();
      const total = Math.max(0, subtotal - discount);
      
      // Deduct redeemed points from user
      if(discount > 0){
        const pointsUsed = Math.round(discount * 100);
        if(window.data && window.data.user){
          window.data.user.points = Math.max(0, (window.data.user.points || 0) - pointsUsed);
          localStorage.setItem('profile', JSON.stringify(window.data.user));
          if(window.data.user.name){
            localStorage.setItem(`profile-${window.data.user.name}`, JSON.stringify(window.data.user));
            if(window.addPointsHistory) window.addPointsHistory(window.data.user.name, -pointsUsed, 'Market Purchase Discount');
          }
        }
        clearRedeemedDiscount();
      }
      
      alert(`Purchase function is not implemented in this demo.\n\nSubtotal: €${subtotal.toFixed(2)}${discount > 0 ? `\nSerePoints Discount: -€${discount.toFixed(2)}` : ''}\nTotal: €${total.toFixed(2)}\nItems: ${cart.length}`);
      clearCart();
      if(document.querySelector('[data-section="market"]')) document.querySelector('[data-section="market"]').click();
      // Here you would integrate with payment gateway
    });
  }
});

// Expose functions globally
window.renderMarket = renderMarket;
window.initMarketListeners = initMarketListeners;