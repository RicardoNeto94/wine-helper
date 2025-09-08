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

  const state = {
    wines: [], menu: [], tab: "wine",
    qWine: "", qDish: "", qCategory: "", qPrice: "",
    qDishName: "", dishPrice: "", currentDish: ""
  };

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

  function dishRule(name) {
    const n = String(name).toLowerCase();
    for (const r of RULES) if (r.k.some(k => n.includes(k))) return r;
    if (n.includes("duck")) return RULES[0];
    if (n.includes("beef") || n.includes("lamb") || n.includes("steak")) return RULES[2];
    if (n.includes("pork")) return RULES[3];
    if (n.includes("scallop") || n.includes("prawn") || n.includes("shrimp") || n.includes("crab")) return RULES[5];
    if (n.includes("fish")) return RULES[6];
    if (n.includes("spicy") || n.includes("sichuan") || n.includes("chili")) return RULES[7];
    if (n.includes("dessert")) return RULES[10];
    return { cats:["Sparkling","White","Light Red","Red"], why:"General pairing options; refine by preparation/sauce." };
  }

  // Heuristics
  function guessBody(w) {
    const n = (w.Name||"").toLowerCase();
    if (w.Category === "Light Red") return "Light";
    if (w.Category === "Red") {
      if (/(barolo|barbaresco|bordeaux|cabernet|syrah|shiraz|malbec|priorat)/.test(n)) return "Full"; 
      return "Medium";
    }
    if (w.Category === "White") {
      if (/(meursault|montrachet|corton|batard|chardonnay|viognier)/.test(n)) return "Full";
      if (/(sauvignon|riesling|albarino|albariñ|grüner|gruner|muscadet|picpoul|vermentino)/.test(n)) return "Light";
      return "Medium";
    }
    if (w.Category === "Sparkling") return "Light";
    if (w.Category === "Dessert/Sweet" || w.Category === "Fortified") return "Full";
    return "Medium";
  }
  function guessSweet(w) {
    const n = (w.Name||"").toLowerCase();
    if (w.Category === "Dessert/Sweet" || /(sauternes|tokaji|ice|eiswein|vendange|trockenbeerenauslese|beerenauslese|tba)/.test(n)) return "Sweet";
    if (/(kabinett|spätlese|spaetlese|off[-\s]?dry|moelleux|demi[-\s]?sec)/.test(n)) return "Off-dry";
    if (w.Category === "Sparkling" && /(brut|extra brut|pas dosé|dosage zero|zero dos)/.test(n)) return "Dry";
    return "Dry";
  }
  function guessOak(w) {
    const n = (w.Name||"").toLowerCase();
    if (/(meursault|montrachet|corton|batard|puligny|chassagne|oak|barrel|toasted)/.test(n)) return "Toasty/oaky";
    if (/(chardonnay)/.test(n)) return "Some oak";
    if (/(sauvignon|riesling|grüner|gruner|albarino|muscadet|pinot grigio)/.test(n)) return "Unoaked";
    return "";
  }
  function guessBubbles(w) { return w.Category === "Sparkling" ? "Sparkling" : "Still"; }

  function scoreWine(w, ruleCats, prefs) {
    let score = 0, reasons = [];
    if (ruleCats.includes(w.Category)) { score += 30; reasons.push("Matches dish style"); } else { score -= 10; }
    if (prefs.style && w.Category === prefs.style) { score += 25; reasons.push("Guest preferred style"); }
    if (prefs.budget && inPriceBand(w, prefs.budget)) { score += 15; reasons.push("Within budget"); }
    const b = guessBody(w); if (prefs.body && b === prefs.body) { score += 10; reasons.push(`${b} body`); }
    const s = guessSweet(w); if (prefs.sweet && s === prefs.sweet) { score += 10; reasons.push(`${s.toLowerCase()}`); } if (!prefs.sweet && s === "Dry") { score += 5; }
    const o = guessOak(w); if (prefs.oak && o && o === prefs.oak) { score += 6; reasons.push(o); }
    const bub = guessBubbles(w); if (prefs.bubbles && (prefs.bubbles === bub || prefs.bubbles === "Either")) { score += 8; reasons.push(bub); }
    return { score, reasons: reasons.slice(0,3) };
  }
  function byScoreDesc(a,b){ return b._score - a._score; }
  function byPriceAsc(a,b){
    const pa = (String(a.Price).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/)||[0])[0];
    const pb = (String(b.Price).replace(/[€$,]/g,"").match(/[0-9]+(\.[0-9]+)?/)||[0])[0];
    return parseFloat(pa||0) - parseFloat(pb||0);
  }

  function renderWineGrid(list, whyText) {
    const grid = document.getElementById("grid");
    const badges = document.getElementById("badges");
    badges.innerHTML = whyText ? `<span class="badge">Reason: ${whyText}</span><span class="badge">Results: ${list.length}</span>` : `<span class="badge">Results: ${list.length}</span>`;
    grid.innerHTML = list.slice(0, 300).map(w => {
      const glass = GLASS_ICON[w.Glass] || "🍷";
      const safe = JSON.stringify(w).replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const why = (w._why || []).join(" • ");
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
          <div class="pair">${why ? why : (w["Suggested Pairings"] || "")}</div>
        </div>`;
    }).join("");
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
    const q = (state.qDishName||"").toLowerCase();
    const dishes = state.menu.map(d => ({name: d.name || d.title || d.dish || d.Name || "", id: d.id || d.slug || (d.name||"").toLowerCase().replace(/\s+/g,'_'), cat: d.category || d.section || ""}))
      .filter(d => d.name).filter(d => !q || d.name.toLowerCase().includes(q));
    cont.innerHTML = dishes.map(d => `<div class="item" data-id="${d.id}"><div class="name">${d.name}</div><div class="tags">${d.cat||""}</div></div>`).join("");
    Array.from(cont.querySelectorAll(".item")).forEach(el => {
      el.onclick = () => openModal(el.querySelector(".name").textContent);
    });
    document.getElementById("badges").innerHTML = `<span class="badge">Dishes: ${dishes.length}</span>`;
  }

  // Modal control
  function openModal(dishName) {
    state.currentDish = dishName;
    document.getElementById("modalTitle").textContent = `Preferences for: ${dishName}`;
    document.getElementById("modal").style.display = "flex";
  }
  function closeModal(){ document.getElementById("modal").style.display = "none"; }

  function applyQuiz() {
    const prefs = {
      style: val("#mStyle"),
      budget: val("#mBudget"),
      body: val("#mBody"),
      sweet: val("#mSweet") || "Dry",
      oak: val("#mOak"),
      bubbles: val("#mBubbles")
    };
    const rule = dishRule(state.currentDish);
    let list = state.wines.slice().map(w => {
      const {score, reasons} = scoreWine(w, rule.cats, prefs);
      return Object.assign({}, w, {_score: score, _why: reasons});
    }).filter(w => w._score > 10);

    list.sort(byScoreDesc);
    const top = list.slice(0, 30);
    top.sort(byPriceAsc);
    renderWineGrid(top, rule.why);
    closeModal();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function val(sel){ const el = document.querySelector(sel); return el ? el.value : ""; }

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
      document.getElementById("tabWine").onclick = showWineTab;
      document.getElementById("tabDish").onclick = showDishTab;
      document.getElementById("qWine").addEventListener("input", e => { state.qWine = e.target.value; renderWine(); });
      document.getElementById("qDish").addEventListener("input", e => { state.qDish = e.target.value; renderWine(); });
      document.getElementById("qCategory").addEventListener("change", e => { state.qCategory = e.target.value; renderWine(); });
      document.getElementById("qPrice").addEventListener("change", e => { state.qPrice = e.target.value; renderWine(); });
      document.getElementById("qDishName").addEventListener("input", e => { state.qDishName = e.target.value; renderDishList(); });
      document.getElementById("dishPrice").addEventListener("change", e => { state.dishPrice = e.target.value; });

      document.getElementById("mCancel").onclick = closeModal;
      document.getElementById("mApply").onclick = applyQuiz;

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