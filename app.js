(function(){
  const VERSION = '20250907214231';
  const GLASS_ICON = {
    "Champagne flute / tulip": "🥂",
    "White wine (tapered)": "🍷",
    "Burgundy (large bowl)": "🍷",
    "Bordeaux (tall)": "🍷",
    "Dessert wine (small tulip)": "🍷",
    "Fortified/Sherry (small, narrow)": "🍷",
    "Standard white (safe default)": "🍷"
  };

  const DISH_MAP = [
    { dish: "Peking Duck", cats: ["Light Red","Red","White","Sparkling"], keywords: ["peking","duck"] },
    { dish: "Dim Sum", cats: ["Sparkling","White","Rosé"], keywords: ["dim sum","dumpling","gyoza"] },
    { dish: "Pork Belly", cats: ["White","Light Red"], keywords: ["pork","belly"] },
    { dish: "Seafood", cats: ["White","Sparkling"], keywords: ["fish","prawn","scallop","crab","lobster","seafood"] },
    { dish: "Beef/Lamb", cats: ["Red"], keywords: ["beef","steak","lamb"] },
    { dish: "Desserts", cats: ["Dessert/Sweet","Fortified"], keywords: ["dessert","sweet"] }
  ];

  const state = { data: [], qWine: "", qDish: "", qCategory: "", qPrice: "" };

  function priceToNumber(p) {
    if (!p) return null;
    const m = String(p).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function matchesDish(item, dishQ) {
    if (!dishQ) return true;
    const q = dishQ.toLowerCase();
    const d = DISH_MAP.find(d => d.keywords.some(k => q.includes(k)) || d.dish.toLowerCase().includes(q));
    if (!d) return true;
    return d.cats.includes(item.Category) || (item["Suggested Pairings"]||"").toLowerCase().includes(q);
  }

  function inPriceBand(item, band) {
    if (!band) return true;
    const [min,max] = band.split("-").map(parseFloat);
    const val = priceToNumber(item.Price);
    if (val == null) return false;
    return val >= min && val <= max;
  }

  function showNotice(msg) {
    const n = document.getElementById('notice');
    n.textContent = msg;
    n.style.display = 'block';
  }

  function render() {
    const grid = document.getElementById("grid");
    const badges = document.getElementById("badges");
    let list = state.data
      .filter(w => state.qWine ? (w.Name + " " + w.Vintage).toLowerCase().includes(state.qWine.toLowerCase()) : true)
      .filter(w => matchesDish(w, state.qDish))
      .filter(w => state.qCategory ? w.Category === state.qCategory : true)
      .filter(w => inPriceBand(w, state.qPrice));

    badges.innerHTML = `<span class="badge">Results: ${list.length}</span>`;
    grid.innerHTML = list.slice(0, 300).map(w => {
      const glass = GLASS_ICON[w.Glass] || "🍷";
      const safe = JSON.stringify(w).replace(/</g,"&lt;").replace(/>/g,"&gt;");
      return `
        <div class="card">
          <div class="title">${w.Name}${w.Vintage ? " " + w.Vintage : ""}</div>
          <div class="meta">
            <span class="badge">${w.Category}</span>
            <span class="badge">${w.Glass} <span class="glass">${glass}</span></span>
          </div>
          <div class="row">
            <div class="price">${w.Price || ""}</div>
            <button class="btn" onclick='copyRec(${safe})'>Copy</button>
          </div>
          <div class="pair">${w["Suggested Pairings"] || ""}</div>
        </div>
      `;
    }).join("");
  }

  function copyRec(w) {
    const line = `${w.Name}${w.Vintage ? " " + w.Vintage : ""} • ${w.Price || ""} • ${w.Category} • ${w.Glass}`;
    navigator.clipboard.writeText(line);
    alert("Copied to clipboard:\n" + line);
  }

  async function loadData() {
    try {
      const res = await fetch(`./wines.json?v=${VERSION}`, { cache: 'reload' });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error("Empty data");
      state.data = data;
      localStorage.setItem('wines_cache', JSON.stringify(data));
      render();
    } catch(err) {
      const cached = localStorage.getItem('wines_cache');
      if (cached) {
        state.data = JSON.parse(cached);
        showNotice("Loaded from local cache (offline).");
        render();
      } else {
        showNotice("Could not load wines.json. Host the files (GitHub Pages/Vercel) or run a local server.");
      }
      console.error("Data load failed:", err);
    }
  }

  function wire() {
    document.getElementById("qWine").addEventListener("input", e => { state.qWine = e.target.value; render(); });
    document.getElementById("qDish").addEventListener("input", e => { state.qDish = e.target.value; render(); });
    document.getElementById("qCategory").addEventListener("change", e => { state.qCategory = e.target.value; render(); });
    document.getElementById("qPrice").addEventListener("change", e => { state.qPrice = e.target.value; render(); });
  }

  window.copyRec = copyRec;
  wire();
  loadData();
})();