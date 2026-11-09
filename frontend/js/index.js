const sections = ["feed", "docs", "perfil", "buscar", "market"];

sections.forEach(sec => {
  const btn = document.getElementById(`btn-${sec}`);
  if(btn) btn.addEventListener("click", () => showSection(sec));
});

function showSection(sec) {
  sections.forEach(s => {
    const el = document.getElementById(s);
    if(el) el.style.display = (s === sec) ? "block" : "none";
  });

  // Llamada modular
  switch(sec) {
    case "feed": initFeed(); break;
    case "docs": initDocs(); break;
    case "perfil": initPerfil(); break;
    case "buscar": initBuscar(); break;
    case "market": initMarket(); break;
  }
}

// Mostrar feed por defecto
showSection("feed");