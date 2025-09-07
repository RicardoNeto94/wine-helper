(function(){
  const GLASS_ICON = {
    "Champagne flute / tulip": "🥂",
    "White wine (tapered)": "🍷",
    "Burgundy (large bowl)": "🍷",
    "Bordeaux (tall)": "🍷",
    "Dessert wine (small tulip)": "🍷",
    "Fortified/Sherry (small, narrow)": "🍷",
    "Standard white (safe default)": "🍷"
  };

  const state = { wines: [], menu: [], tab: "wine", qWine: "", qDish: "", qCategory: "", qPrice: "", qDishName: "", dishPrice: "" };

  function priceToNumber(p) {
    if (!p) return null;
    const m = String(p).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function inPriceBand(item, band) {
    if (!band) return true;
    const [min,max] = band.split("-").map(parseFloat);
    const val = priceToNumber(item.Price);
    if (val == null) return false;
    return val >= min && val <= max;
  }

  // Pairing rules: keywords -> categories + rationale
  const RULES = [
    { k: ["peking duck","duck"], cats:["Light Red","Red","White","Sparkling"], why:"Fatty, sweet-savory duck loves Pinot/older Bordeaux; oaked Chardonnay or Champagne cleanses." },
    { k: ["dim sum","dumpling","har gow","siu mai"], cats:["Sparkling","White","Rosé"], why:"Sparkling & crisp whites cut salt/fat and refresh palate." },
    { k: ["beef","wagyu","lamb","steak"], cats:["Red"], why:"Tannic structure of Bordeaux/Syrah matches red meat." },
    { k: ["pork","char siu","belly"], cats:["White","Light Red"], why:"Acidic whites cut fat; delicate reds avoid overpowering." },
    { k: ["chicken"], cats:["White","Light Red"], why:"Versatile; fuller whites or lighter reds depending on sauce." },
    { k: ["scallop","prawn","shrimp","crab","lobster","oyster","clam","mussel"], cats:["White","Sparkling"], why:"Minerality & acidity suit shellfish." },
    { k: ["fish","seabass","cod","salmon"], cats:["White","Sparkling","Light Red"], why:"Delicate whites for white fish; Pinot for salmon." },
    { k: ["spicy","chili","chilli","sichuan","kung pao","mala"], cats:["White","Sparkling","Rosé"], why:"Off-dry/acid whites and bubbles balance heat." },
    { k: ["tofu","vegetable","broccoli","eggplant","aubergine","mushroom"], cats:["White","Rosé","Light Red"], why:"Herbal whites or light reds keep things fresh." },
    { k: ["noodle","rice"], cats:["Sparkling","White"], why:"Bubbles and crisp whites lift carbs/sauces." },
    { k: ["dessert","custard","sweet","peach","chocolate"], cats:["Dessert/Sweet","Fortified"], why:"Match sweetness; fortified as digestif." }
  ];

  function dishToCats(name) {
    const n = String(name).toLowerCase();
    for (const r of RULES) {
      if (r.k.some(k => n.includes(k))) return r;
    }
    // Fallback by broad cues
    if (n.includes("duck")) return RULES[0];
    if (n.includes("beef") || n.includes("lamb") || n.includes("steak")) return RULES[2];
    if (n.includes("pork")) return RULES[3];
    if (n.includes("scallop") || n.includes("prawn") || n.includes("shrimp") || n.includes("crab")) return RULES[5];
    if (n.includes("fish")) return RULES[6];
    if (n.includes("spicy") || n.includes("chili") || n.includes("sichuan")) return RULES[7];
    if (n.includes("dessert")) return RULES[10];
    return { cats: ["Sparkling","White","Light Red","Red"], why: "General pairing options; refine by preparation/sauce." };
  }

  function renderWineGrid(list, whyText) {
    const grid = document.getElementById("grid");
    const badges = document.getElementById("badges");
    badges.innerHTML = whyText ? `<span class="badge">Reason: ${whyText}</span><span class="badge">Results: ${list.length}</span>` : `<span class="badge">Results: ${list.length}</span>`;
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
        </div>`;
    }).join("");
  }

  function byPriceAsc(a,b) {
    const pa = (String(a.Price).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/)||[0])[0];
    const pb = (String(b.Price).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/)||[0])[0];
    return parseFloat(pa||0) - parseFloat(pb||0);
  }

  function showWineTab() {
    document.getElementById("controlsWine").style.display = "";
    document.getElementById("controlsDish").style.display = "none";
    document.getElementById("dishList").style.display = "none";
    document.getElementById("tabWine").classList.add("active");
    document.getElementById("tabDish").classList.remove("active");
    renderWine();
  }

  function showDishTab() {
    document.getElementById("controlsWine").style.display = "none";
    document.getElementById("controlsDish").style.display = "";
    document.getElementById("dishList").style.display = "grid";
    document.getElementById("tabDish").classList.add("active");
    document.getElementById("tabWine").classList.remove("active");
    renderDishList();
  }

  function matchesDishFilter(item, q) {
    if (!q) return true;
    return (item.Name + " " + (item.Vintage||"")).toLowerCase().includes(q.toLowerCase());
  }

  function renderWine() {
    let list = state.wines
      .filter(w => state.qWine ? (w.Name + " " + w.Vintage).toLowerCase().includes(state.qWine.toLowerCase()) : true)
      .filter(w => state.qDish ? (w["Suggested Pairings"]||"").toLowerCase().includes(state.qDish.toLowerCase()) : true)
      .filter(w => state.qCategory ? w.Category === state.qCategory : true)
      .filter(w => inPriceBand(w, state.qPrice));
    renderWineGrid(list, "");
  }

  function renderDishList() {
    const cont = document.getElementById("dishList");
    const q = state.qDishName.toLowerCase();
    const dishes = state.menu.map(d => ({name: d.name || d.title || d.dish || d.Name || "", id: d.id || d.slug || (d.name||"").toLowerCase().replace(/\\s+/g,'_'), cat: d.category || d.section || ""}))
      .filter(d => d.name).filter(d => !q || d.name.toLowerCase().includes(q));
    cont.innerHTML = dishes.map(d => `<div class="item" data-id="${d.id}"><div class="name">${d.name}</div><div class="tags">${d.cat||""}</div></div>`).join("");
    // Wire clicks
    Array.from(cont.querySelectorAll(".item")).forEach(el => {
      el.onclick = () => { selectDish(el.querySelector(".name").textContent); };
    });
    document.getElementById("badges").innerHTML = `<span class="badge">Dishes: ${dishes.length}</span>`;
  }

  function selectDish(dishName) {
    const rule = dishToCats(dishName);
    let list = state.wines
      .filter(w => rule.cats.includes(w.Category))
      .filter(w => inPriceBand(w, state.dishPrice))
      .sort(byPriceAsc);
    renderWineGrid(list, rule.why || "");
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function showNotice(msg) {
    const n = document.getElementById('notice');
    n.textContent = msg;
    n.style.display = 'block';
  }

  async function init() {
    try {
      const [w, m] = await Promise.all([
        fetch('./wines.json').then(r => r.json()),
        fetch('./menu.json').then(r => r.json())
      ]);
      state.wines = w;
      state.menu = Array.isArray(m) ? m : (m.items || m.menu || []);
      // Wire tabs
      document.getElementById("tabWine").onclick = showWineTab;
      document.getElementById("tabDish").onclick = showDishTab;
      // Wire controls
      document.getElementById("qWine").addEventListener("input", e => { state.qWine = e.target.value; renderWine(); });
      document.getElementById("qDish").addEventListener("input", e => { state.qDish = e.target.value; renderWine(); });
      document.getElementById("qCategory").addEventListener("change", e => { state.qCategory = e.target.value; renderWine(); });
      document.getElementById("qPrice").addEventListener("change", e => { state.qPrice = e.target.value; renderWine(); });
      document.getElementById("qDishName").addEventListener("input", e => { state.qDishName = e.target.value; renderDishList(); });
      document.getElementById("dishPrice").addEventListener("change", e => { state.dishPrice = e.target.value; });
      // Initial render
      renderWine();
    } catch (e) {
      console.error(e);
      showNotice("Failed to load wines/menu. Check that wines.json and menu.json are present at the root.");
    }
  }

  window.copyRec = function(w) {
    const line = `${w.Name}${w.Vintage ? " " + w.Vintage : ""} • ${w.Price || ""} • ${w.Category} • ${w.Glass}`;
    navigator.clipboard.writeText(line);
    alert("Copied:\n" + line);
  };

  init();
})();