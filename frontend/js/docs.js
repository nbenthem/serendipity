function initDocs() {
  const container = document.getElementById("docs");
  if(!container) return;
  container.innerHTML = "";
  data.docs.forEach((doc,i) => {
    const div = document.createElement("div");
    div.className = "doc-card";
    div.innerHTML = `
      <h3>${doc.title}</h3>
      <p>${doc.desc}</p>
      <button class="download-btn" data-file="${doc.file}">Download</button>
      <button class="hilo-btn" data-index="${i}">Create thread</button>
    `;
    container.appendChild(div);
  });

  container.style.maxHeight = "400px";
  container.style.overflowY = "auto";

  container.querySelectorAll(".download-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const file = e.target.dataset.file;
      alert(`Downloading ${file}`);
    });
  });

  container.querySelectorAll(".hilo-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = e.target.dataset.index;
      const doc = data.docs[idx];
      data.feed.unshift({ user: data.user.name, text: `New thread about ${doc.title}` });
      showSection("feed");
    });
  });
}