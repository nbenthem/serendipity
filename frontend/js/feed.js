function initFeed() {
  const container = document.getElementById("feed");
  if(!container) return;
  container.innerHTML = "";  // clear children
  data.feed.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `<strong>${post.user}:</strong> ${post.text}`;
    container.appendChild(div);
  });
  container.style.maxHeight = "400px";
  container.style.overflowY = "auto";
}