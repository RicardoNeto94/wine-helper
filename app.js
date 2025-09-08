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
  // Image helpers
  function slugifyName(name){
    return String(name||"").toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')      // strip accents
      .replace(/[^a-z0-9\s-]/g,'')                          // keep alnum/space/hyphen
      .trim().replace(/\s+/g,'-').replace(/-+/g,'-');
  }
  function bottleImageFor(w){
    if (w.Image) return w.Image; // explicit path in wines.json
    const slug = slugifyName(w.Name || "");
    const year = (w.Vintage && String(w.Vintage).match(/\\d{4}/)) ? "-" + String(w.Vintage).match(/\\d{4}/)[0] : "";
    // Try with vintage first, then without
    return `${slug}${year}.png`;
  }


  const state = { wines: [], menu: [], dishPrice: "", qDishName: "", currentDish: "", lastPrefs: null };

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

  function guessBody(w) {
    const n = (w.Name||"").toLowerCase();
    if (w.Category === "Light Red") return "Light";
    if (w.Category === "Red") { if (/(barolo|barbaresco|bordeaux|cabernet|syrah|shiraz|malbec|priorat)/.test(n)) return "Full"; return "Medium"; }
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

  function renderDishList() {
    const cont = document.getElementById("dishList");
    const q = (state.qDishName||"").toLowerCase();
    const dishesRaw = (state.menu||[]).map(d => ({name: d.name || d.title || d.dish || d.Name || "", id: d.id || d.slug || (d.name||"").toLowerCase().replace(/\s+/g,'_'), cat: d.category || d.section || ""}))
      .filter(d => d.name).filter(d => !q || d.name.toLowerCase().includes(q));

    // Assign bento sizes (hero for signatures, otherwise pattern)
    const dishes = dishesRaw.map((d, i) => {
      const n = d.name.toLowerCase();
      let cls = "item--sm";
      if (/duck|peking|wagyu|signature|chef/.test(n)) cls = "item--xl";
      else if (/dim sum|lobster|crab|truffle|king|oyster|scallop/.test(n)) cls = "item--lg";
      else if (i % 7 === 0) cls = "item--md";
      return {...d, size: cls};
    });

    cont.innerHTML = dishes.map(d => `<div class="item squircle ${d.size}" data-id="${d.id}"><div class="name">${d.name}</div><div class="tags">${d.cat||""}</div></div>`).join("");
    Array.from(cont.querySelectorAll(".item")).forEach(el => {
      el.onclick = () => openModal(el.querySelector(".name").textContent);
    });
    document.getElementById("badges").innerHTML = `<span class="badge">Dishes: ${dishes.length}</span>`;
  }

  // Modal helpers
  function openModal(dishName) {
    state.currentDish = dishName;
    document.getElementById("modalTitle").textContent = `Preferences for: ${dishName}`;
    document.getElementById("modalSubtitle").style.display = "";
    document.getElementById("stepPrefs").style.display = "";
    document.getElementById("stepResults").style.display = "none";
    document.getElementById("mBack").style.display = "none";
    document.getElementById("mApply").style.display = "";
    document.body.classList.add("blur-bg");
    document.getElementById("modal").style.display = "flex";
  }
  function closeModal(){
    document.getElementById("modal").style.display = "none";
    document.body.classList.remove("blur-bg");
  }

  function renderResults(list, whyText) {
    const resWhy = document.getElementById("resWhy");
    const resList = document.getElementById("resList");
    resWhy.textContent = whyText || "";
    resList.innerHTML = list.slice(0, 24).map(w => {
      const glass = GLASS_ICON[w.Glass] || "🍷";
      const why = (w._why || []).join(" • ");
      const safe = JSON.stringify(w).replace(/</g,"&lt;").replace(/>/g,"&gt;");
      return `
        <div class="card">
          <div class="thumb"><img loading="lazy" decoding="async" src="${bottleImageFor(w)}" onerror="this.onerror=null;this.src='placeholder-bottle.png';" alt="Bottle"/></div>
          <div>
            <div class="name" style="font-weight:700">${w.Name}${w.Vintage ? " " + w.Vintage : ""}</div>
            <div class="meta">
              <span>${w.Category}</span>
              <span>${w.Glass} ${glass}</span>
              <span>${w.Price || ""}</span>
            </div>
            <div class="meta">${why}</div>
            <div class="row">
              <button class="copy" onclick='copyRec(${safe})'>Copy</button>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  function applyQuiz() {
    const prefs = {
      style: val("#mStyle"),
      budget: val("#mBudget"),
      body: val("#mBody"),
      sweet: val("#mSweet") || "Dry",
      oak: val("#mOak"),
      bubbles: val("#mBubbles")
    };
    state.lastPrefs = prefs;
    const rule = dishRule(state.currentDish);
    let list = state.wines.slice().map(w => {
      const {score, reasons} = scoreWine(w, rule.cats, prefs);
      return Object.assign({}, w, {_score: score, _why: reasons});
    }).filter(w => (!state.dishPrice || inPriceBand(w, state.dishPrice)) && w._score > 10);
    list.sort(byScoreDesc);
    const top = list.slice(0, 40);
    top.sort(byPriceAsc);
    // Switch modal to results step
    document.getElementById("modalSubtitle").style.display = "none";
    document.getElementById("stepPrefs").style.display = "none";
    document.getElementById("stepResults").style.display = "";
    document.getElementById("mBack").style.display = "";
    document.getElementById("mApply").style.display = "none";
    renderResults(top, rule.why);
  }

  function val(sel){ const el = document.querySelector(sel); return el ? el.value : ""; }

  async function init() {
    try {
      const [w, m, imgMap] = await Promise.all([
        fetch('./wines.json').then(r => r.json()),
        fetch('./menu.json').then(r => r.json()),
        fetch('./images-map.json').then(r => r.json()).catch(() => ({}))
      ]);
      state.wines = w.map(o => ({...o}));
      // Merge image map into wine objects (only if no explicit Image provided)
      (state.wines||[]).forEach(wi => { if (!wi.Image && imgMap[wi.Name]) wi.Image = imgMap[wi.Name]; });
      state.menu = Array.isArray(m) ? m : (m.items || m.menu || []);
      document.getElementById("qDishName").addEventListener("input", e => { state.qDishName = e.target.value; renderDishList(); });
      document.getElementById("dishPrice").addEventListener("change", e => { state.dishPrice = e.target.value; });
      document.getElementById("mCancel").onclick = closeModal;
      document.getElementById("mApply").onclick = applyQuiz;
      document.getElementById("mBack").onclick = () => {
        // back to preferences
        document.getElementById("modalSubtitle").style.display = "";
        document.getElementById("stepPrefs").style.display = "";
        document.getElementById("stepResults").style.display = "none";
        document.getElementById("mBack").style.display = "none";
        document.getElementById("mApply").style.display = "";
      };
      renderDishList();
    } catch (e) {
      console.error(e);
      const n = document.getElementById('notice');
      n.textContent = "Failed to load data. Ensure wines.json and menu.json are in the root.";
      n.style.display = 'block';
    }
  }

  window.copyRec = function(w) {
    const line = `${w.Name}${w.Vintage ? " " + w.Vintage : ""} • ${w.Price || ""} • ${w.Category} • ${w.Glass}`;
    navigator.clipboard.writeText(line);
    alert("Copied:\\n" + line);
  };

  init();
})();