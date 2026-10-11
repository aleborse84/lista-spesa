// Struttura dati:
// state.products = [{ name, category, prices: { smName: price } }]  <- DATABASE
// state.shoppingList = [{ name, quantity, unit }]  <- LISTA SPESA
// state.takenProducts = [{ name, quantity, unit }]  <- PRESI

let state = {
  products: [],
  shoppingList: [],
  takenProducts: [],
  supermarkets: [],
  currentSupermarket: "",
  peopleCount: 1,
  archive: [],
};

const CATEGORIES = [
  "Altri Prodotti",
  "Bevande",
  "Carne",
  "Affettati",
  "Casa",
  "Cereali",
  "Colazione",
  "Condimenti e Spezie",
  "Salse",
  "Cucina",
  "Dolci",
  "Formaggi",
  "Frutta",
  "Igiene Personale",
  "Bagno",
  "Latticini",
  "Pane",
  "Pasta",
  "Pesce",
  "Pulizia",
  "Snack",
  "Surgelati",
  "Uova",
  "Verdura",
];

function loadState() {
  // Ascolta i cambiamenti in tempo reale dal database Firebase
  appDataRef.on(
    "value",
    (snapshot) => {
      const saved = snapshot.val();
      if (saved) {
        state = saved;
        migrateState(); // Mantiene la compatibilità con i vecchi backup
        renderAll();
      } else {
        // Se il database è vuoto (prima volta assoluta), salva lo stato iniziale
        saveState();
      }
    },
    (error) => {
      console.error("Errore nel caricamento da Firebase:", error);
      alert(
        "Errore di connessione al database. Controlla la tua connessione internet.",
      );
    },
  );
}

function migrateState() {
  // Migra supermarkets da array stringhe a oggetti
  if (
    state.supermarkets.length > 0 &&
    typeof state.supermarkets[0] === "string"
  ) {
    state.supermarkets = state.supermarkets.map((name) => ({ name, logo: "" }));
  }
  // Migra vecchio productPrices { prod: { sm: price } } -> products array
  if (state.productPrices && !state.products) {
    state.products = [];
    Object.entries(state.productPrices).forEach(([name, prices]) => {
      state.products.push({
        name,
        category: "Altri Prodotti",
        prices: { ...prices },
      });
    });
    delete state.productPrices;
  }
  // Assicura che products esista
  if (!state.products) state.products = [];
  // Assicura che ogni prodotto abbia prices
  state.products.forEach((p) => {
    if (!p.prices) p.prices = {};
  });
}

function saveState() {
  // Salva lo stato su Firebase in tempo reale
  appDataRef
    .set(state)
    .then(() => {
      // Salvataggio riuscito (silenzioso, non serve alert)
    })
    .catch((error) => {
      console.error("Errore nel salvataggio su Firebase:", error);
      alert("Errore di salvataggio. Controlla la connessione internet.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initUI();
  renderAll();
});

function initUI() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab + "Tab").classList.add("active");
      if (btn.dataset.tab === "database") renderDatabase();
    });
  });

  // Supermercato
  document
    .getElementById("currentSupermarket")
    .addEventListener("change", (e) => {
      state.currentSupermarket = e.target.value;
      saveState();
      updateSupermarketLogo();
      renderAll();
    });

  // Persone
  document.getElementById("peopleCount").addEventListener("input", (e) => {
    state.peopleCount = parseInt(e.target.value) || 1;
    saveState();
    updateTotals();
  });

  // Quick add (autocomplete) nella lista
  const quickInput = document.getElementById("quickAddInput");
  const quickList = document.getElementById("autocompleteList");

  quickInput.addEventListener("input", () => {
    const query = quickInput.value.trim().toLowerCase();
    if (query.length === 0) {
      quickList.classList.remove("show");
      return;
    }
    const matches = state.products
      .filter((p) => p.name.toLowerCase().includes(query))
      .slice(0, 10);

    if (matches.length === 0) {
      quickList.innerHTML =
        '<div class="autocomplete-item" style="color:var(--text-light);cursor:default;">Nessun prodotto trovato. Usa "+ Nuovo"</div>';
    } else {
      quickList.innerHTML = matches
        .map((p) => {
          const price = p.prices[state.currentSupermarket] || 0;
          return `<div class="autocomplete-item" data-name="${escapeHtml(p.name)}">
                    <div>
                        <div class="autocomplete-item-name">${escapeHtml(p.name)}</div>
                        <div class="autocomplete-item-cat">${p.category}</div>
                    </div>
                    <div class="autocomplete-item-price">€${price.toFixed(2)}</div>
                </div>`;
        })
        .join("");
    }
    quickList.classList.add("show");
  });

  quickInput.addEventListener("blur", () => {
    setTimeout(() => quickList.classList.remove("show"), 200);
  });

  quickList.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (!item || !item.dataset.name) return;
    addToShoppingList(item.dataset.name);
    quickInput.value = "";
    quickList.classList.remove("show");
  });

  // Bottone "+ Nuovo" nella lista
  document.getElementById("quickAddCreateBtn").addEventListener("click", () => {
    const name = quickInput.value.trim();
    if (!name) return alert("Scrivi prima il nome del prodotto");
    openCreateNewProductModal(name);
  });

  // Enter nell'input
  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = quickList.querySelector(".autocomplete-item[data-name]");
      if (first) {
        addToShoppingList(first.dataset.name);
        quickInput.value = "";
        quickList.classList.remove("show");
      } else {
        document.getElementById("quickAddCreateBtn").click();
      }
    }
  });

  // Azioni lista
  document
    .getElementById("clearCheckedBtn")
    .addEventListener("click", clearChecked);
  document.getElementById("clearListBtn").addEventListener("click", clearList);
  document
    .getElementById("printBtn")
    .addEventListener("click", () => window.print());

  // Presi
  document
    .getElementById("restoreAllBtn")
    .addEventListener("click", restoreAll);
  document
    .getElementById("clearTakenBtn")
    .addEventListener("click", clearTaken);
  document
    .getElementById("saveShoppingBtn")
    .addEventListener("click", saveShopping);

  // Database
  document
    .getElementById("addDbProductBtn")
    .addEventListener("click", () => openDbProductModal());
  document.getElementById("dbSearch").addEventListener("input", renderDatabase);
  document
    .getElementById("saveDbProductBtn")
    .addEventListener("click", saveDbProduct);

  // Impostazioni
  document
    .getElementById("addSupermarketBtn")
    .addEventListener("click", addSupermarket);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document
    .getElementById("importBtn")
    .addEventListener("click", () =>
      document.getElementById("importFile").click(),
    );
  document.getElementById("importFile").addEventListener("change", importData);

  // Archivio
  document
    .getElementById("filterMonth")
    .addEventListener("change", renderArchive);
  document
    .getElementById("filterYear")
    .addEventListener("change", renderArchive);
  document
    .getElementById("confirmArchiveEditBtn")
    .addEventListener("click", saveArchiveEdit);

  // Supermercati - Logo method toggle
  document.getElementById("logoMethodFileBtn").addEventListener("click", () => {
    document.getElementById("logoMethodFileBtn").classList.add("active");
    document.getElementById("logoMethodUrlBtn").classList.remove("active");
    document.getElementById("logoFileInput").style.display = "block";
    document.getElementById("logoUrlInput").style.display = "none";
  });
  document.getElementById("logoMethodUrlBtn").addEventListener("click", () => {
    document.getElementById("logoMethodUrlBtn").classList.add("active");
    document.getElementById("logoMethodFileBtn").classList.remove("active");
    document.getElementById("logoUrlInput").style.display = "block";
    document.getElementById("logoFileInput").style.display = "none";
  });
  document.getElementById("applyLogoUrlBtn").addEventListener("click", () => {
    const url = document.getElementById("editSmLogoUrl").value.trim();
    if (!url) return alert("Inserisci un URL");
    const preview = document.getElementById("editSmLogoPreview");
    preview.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='❌';this.parentElement.classList.add('empty');">`;
    preview.classList.remove("empty");
    preview.dataset.logo = url;
  });

  // Supermercati
  document
    .getElementById("confirmEditSmBtn")
    .addEventListener("click", saveEditedSupermarket);
  document.getElementById("editSmRemoveLogo").addEventListener("click", () => {
    const p = document.getElementById("editSmLogoPreview");
    p.innerHTML = "";
    p.classList.add("empty");
    p.dataset.logo = "";
    document.getElementById("editSmLogoFile").value = "";
    document.getElementById("editSmLogoUrl").value = "";
  });
  document
    .getElementById("editSmLogoFile")
    .addEventListener("change", handleLogoUpload);

  // Crea nuovo prodotto (da lista)
  document
    .getElementById("confirmCreateProdBtn")
    .addEventListener("click", confirmCreateNewProduct);

  // Chiudi modal
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// ============ LISTA SPESA ============

function addToShoppingList(productName) {
  const qty = parseFloat(document.getElementById("quickAddQty").value) || 1;
  const unit = document.getElementById("quickAddUnit").value;

  // Controlla se già in lista
  const existing = state.shoppingList.find((p) => p.name === productName);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.shoppingList.push({ name: productName, quantity: qty, unit });
  }
  saveState();
  renderShoppingList();
  updateTotals();
}

function renderShoppingList() {
  const list = document.getElementById("shoppingList");
  const empty = document.getElementById("emptyStateShopping");
  if (state.shoppingList.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = "";

  state.shoppingList.forEach((p, i) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    const cat = dbProd ? dbProd.category : "";

    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
            <input type="checkbox" class="product-checkbox" data-index="${i}">
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-details">
                    <span>${p.quantity} ${p.unit}</span>
                    <span class="product-price">€${(price * p.quantity).toFixed(2)}</span>
                </div>
                ${cat ? `<span class="product-category-tag">${cat}</span>` : ""}
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="editShoppingItem(${i})">✏️</button>
                <button class="icon-btn delete" onclick="deleteShoppingItem(${i})">🗑</button>
            </div>`;
    li.querySelector(".product-checkbox").addEventListener("change", () =>
      toggleProduct(i),
    );
    list.appendChild(li);
  });
}

function editShoppingItem(i) {
  const p = state.shoppingList[i];
  const newQty = prompt("Quantità:", p.quantity);
  if (newQty === null) return;
  const q = parseFloat(newQty);
  if (isNaN(q) || q <= 0) return;
  p.quantity = q;
  saveState();
  renderShoppingList();
  updateTotals();
}

function deleteShoppingItem(i) {
  state.shoppingList.splice(i, 1);
  saveState();
  renderShoppingList();
  updateTotals();
}

function toggleProduct(i) {
  const p = state.shoppingList.splice(i, 1)[0];
  const ex = state.takenProducts.findIndex((x) => x.name === p.name);
  if (ex >= 0) state.takenProducts[ex] = p;
  else state.takenProducts.push(p);
  saveState();
  renderShoppingList();
  renderTakenList();
  updateTotals();
}

function clearChecked() {
  const checks = document.querySelectorAll("#shoppingList .product-checkbox");
  state.shoppingList = state.shoppingList.filter((_, i) => !checks[i].checked);
  saveState();
  renderShoppingList();
  updateTotals();
}

function clearList() {
  if (confirm("Svuotare la lista?")) {
    state.shoppingList = [];
    saveState();
    renderShoppingList();
    updateTotals();
  }
}

// ============ PRESI ============

function renderTakenList() {
  const list = document.getElementById("takenList");
  const empty = document.getElementById("emptyStateTaken");
  if (state.takenProducts.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = "";

  state.takenProducts.forEach((p, i) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;

    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
            <input type="checkbox" class="product-checkbox" checked data-index="${i}">
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-details">
                    <span>${p.quantity} ${p.unit}</span>
                    <span class="product-price">€${(price * p.quantity).toFixed(2)}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="editTakenItem(${i})">✏️</button>
                <button class="icon-btn delete" onclick="deleteTakenItem(${i})">🗑</button>
            </div>`;
    li.querySelector(".product-checkbox").addEventListener("change", () =>
      restoreProduct(i),
    );
    list.appendChild(li);
  });
}

function editTakenItem(i) {
  const p = state.takenProducts[i];
  const newQty = prompt("Quantità:", p.quantity);
  if (newQty === null) return;
  const q = parseFloat(newQty);
  if (isNaN(q) || q <= 0) return;
  p.quantity = q;
  saveState();
  renderTakenList();
  updateTotals();
}

function deleteTakenItem(i) {
  state.takenProducts.splice(i, 1);
  saveState();
  renderTakenList();
  updateTotals();
}

function restoreProduct(i) {
  const p = state.takenProducts.splice(i, 1)[0];
  const ex = state.shoppingList.findIndex((x) => x.name === p.name);
  if (ex >= 0) state.shoppingList[ex] = p;
  else state.shoppingList.push(p);
  saveState();
  renderShoppingList();
  renderTakenList();
  updateTotals();
}

function restoreAll() {
  state.takenProducts.forEach((p) => {
    const ex = state.shoppingList.findIndex((x) => x.name === p.name);
    if (ex >= 0) state.shoppingList[ex] = p;
    else state.shoppingList.push(p);
  });
  state.takenProducts = [];
  saveState();
  renderShoppingList();
  renderTakenList();
  updateTotals();
}

function clearTaken() {
  if (confirm("Svuotare i presi?")) {
    state.takenProducts = [];
    saveState();
    renderTakenList();
    updateTotals();
  }
}

function saveShopping() {
  if (state.takenProducts.length === 0)
    return alert("Nessun prodotto da salvare");
  const total = state.takenProducts.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    return sum + price * p.quantity;
  }, 0);
  state.archive.push({
    date: new Date().toISOString(),
    supermarket: state.currentSupermarket || "N/A",
    products: state.takenProducts.map((p) => {
      const dbProd = state.products.find((x) => x.name === p.name);
      const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
      return { ...p, price };
    }),
    total,
  });
  state.takenProducts = [];
  state.shoppingList = [];
  saveState();
  renderAll();
  alert("Spesa salvata in archivio!");
}

// ============ DATABASE PRODOTTI ============

let dbFilterCategory = "";
let dbEditingIndex = -1;

function renderDatabase() {
  const search = document.getElementById("dbSearch").value.toLowerCase();
  const list = document.getElementById("databaseList");
  const empty = document.getElementById("emptyStateDb");
  const filterContainer = document.getElementById("dbCategoriesFilter");
  const stats = document.getElementById("dbStats");

  // Categorie usate
  const usedCats = [...new Set(state.products.map((p) => p.category))].sort();
  filterContainer.innerHTML =
    `<button class="db-cat-btn ${dbFilterCategory === "" ? "active" : ""}" data-cat="">Tutti</button>` +
    usedCats
      .map(
        (c) =>
          `<button class="db-cat-btn ${dbFilterCategory === c ? "active" : ""}" data-cat="${c}">${c}</button>`,
      )
      .join("");

  filterContainer.querySelectorAll(".db-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      dbFilterCategory = btn.dataset.cat;
      renderDatabase();
    });
  });

  // Filtra
  let filtered = state.products;
  if (dbFilterCategory)
    filtered = filtered.filter((p) => p.category === dbFilterCategory);
  if (search)
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

  // Stats
  stats.innerHTML = `<span>${state.products.length} prodotti totali</span><span>${filtered.length} mostrati</span>`;

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = "";

  filtered.forEach((p) => {
    const realIdx = state.products.indexOf(p);
    const price = p.prices[state.currentSupermarket] || 0;

    // Mini chips prezzi per ogni supermercato
    const priceChips = state.supermarkets
      .map((sm) => {
        const pr = p.prices[sm.name] || 0;
        if (pr <= 0) return "";
        const logo = sm.logo ? `<img src="${sm.logo}">` : "";
        return `<span class="db-price-chip">${logo}<span class="price-val">€${pr.toFixed(2)}</span></span>`;
      })
      .join("");

    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
            <div class="product-info" onclick="openDbProductModal(${realIdx})">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-details">
                    <span class="product-category-tag">${p.category}</span>
                    <span class="product-price">€${price.toFixed(2)}</span>
                </div>
                ${priceChips ? `<div class="db-prices-mini">${priceChips}</div>` : ""}
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="event.stopPropagation(); openDbProductModal(${realIdx})">✏️</button>
                <button class="icon-btn delete" onclick="event.stopPropagation(); deleteDbProduct(${realIdx})">🗑</button>
            </div>`;
    list.appendChild(li);
  });
}

function openDbProductModal(index = -1) {
  dbEditingIndex = index;
  const title = document.getElementById("dbProductModalTitle");
  const nameInput = document.getElementById("dbProdName");
  const catSelect = document.getElementById("dbProdCategory");

  // Popola categorie
  catSelect.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`,
  ).join("");

  if (index >= 0) {
    const p = state.products[index];
    title.textContent = "Modifica Prodotto";
    nameInput.value = p.name;
    catSelect.value = p.category;
    renderPricesInputs("dbPricesContainer", p.prices);
  } else {
    title.textContent = "Nuovo Prodotto";
    nameInput.value = "";
    catSelect.value = "Altri Prodotti";
    renderPricesInputs("dbPricesContainer", {});
  }
  openModal("dbProductModal");
  nameInput.focus();
}

function renderPricesInputs(containerId, pricesObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (state.supermarkets.length === 0) {
    container.innerHTML =
      '<p class="no-sm-warning">Nessun supermercato creato. Vai su ⚙️ per aggiungerne uno.</p>';
    return;
  }

  const title = document.createElement("h4");
  title.textContent = "💰 Prezzi per supermercato:";
  container.appendChild(title);

  state.supermarkets.forEach((sm) => {
    const row = document.createElement("div");
    row.className = "price-row";
    const price = pricesObj[sm.name] || "";
    const logo = sm.logo
      ? `<img src="${sm.logo}" style="width:18px;height:18px;border-radius:3px;">`
      : "";
    row.innerHTML = `
            <label>${logo} ${escapeHtml(sm.name)}</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" data-sm="${escapeHtml(sm.name)}" value="${price}">
        `;
    container.appendChild(row);
  });
}

function getPricesFromInputs(containerId) {
  const prices = {};
  document
    .querySelectorAll(`#${containerId} .price-row input`)
    .forEach((inp) => {
      const val = parseFloat(inp.value);
      if (!isNaN(val) && val >= 0) prices[inp.dataset.sm] = val;
    });
  return prices;
}

function saveDbProduct() {
  const name = document.getElementById("dbProdName").value.trim();
  const category = document.getElementById("dbProdCategory").value;
  if (!name) return alert("Inserisci il nome");

  const prices = getPricesFromInputs("dbPricesContainer");

  if (dbEditingIndex >= 0) {
    const old = state.products[dbEditingIndex];
    const oldName = old.name;
    // Se il nome è cambiato, aggiorna riferimenti
    if (oldName !== name) {
      if (
        state.products.some((p, i) => i !== dbEditingIndex && p.name === name)
      ) {
        return alert("Esiste già un prodotto con questo nome");
      }
      state.shoppingList.forEach((p) => {
        if (p.name === oldName) p.name = name;
      });
      state.takenProducts.forEach((p) => {
        if (p.name === oldName) p.name = name;
      });
    }
    state.products[dbEditingIndex] = { name, category, prices };
  } else {
    if (state.products.some((p) => p.name === name)) {
      return alert("Esiste già un prodotto con questo nome");
    }
    state.products.push({ name, category, prices });
  }
  saveState();
  renderAll();
  closeModal("dbProductModal");
}

function deleteDbProduct(index) {
  const p = state.products[index];
  if (
    !confirm(
      `Eliminare "${p.name}" dal database?\nI prodotti nelle liste/archivio NON verranno eliminati.`,
    )
  )
    return;
  state.products.splice(index, 1);
  saveState();
  renderDatabase();
}

// ============ CREA NUOVO PRODOTTO (da lista) ============

let pendingNewProductName = "";

function openCreateNewProductModal(name) {
  pendingNewProductName = name;
  document.getElementById("newProdPreviewName").textContent = name;
  const catSelect = document.getElementById("newProdCategory");
  catSelect.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`,
  ).join("");
  renderPricesInputs("newProdPricesContainer", {});
  openModal("createNewProductModal");
}

function confirmCreateNewProduct() {
  const category = document.getElementById("newProdCategory").value;
  const prices = getPricesFromInputs("newProdPricesContainer");

  // Crea prodotto nel database
  state.products.push({ name: pendingNewProductName, category, prices });

  // Aggiungi alla lista
  const qty = parseFloat(document.getElementById("quickAddQty").value) || 1;
  const unit = document.getElementById("quickAddUnit").value;
  state.shoppingList.push({ name: pendingNewProductName, quantity: qty, unit });

  saveState();
  renderAll();
  closeModal("createNewProductModal");
  document.getElementById("quickAddInput").value = "";
}

// ============ TOTALI ============

function updateTotals() {
  // Totale lista spesa
  const listTotal = state.shoppingList.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    return sum + price * p.quantity;
  }, 0);

  // Totale presi
  const takenTotal = state.takenProducts.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    return sum + price * p.quantity;
  }, 0);

  // Mostra totale lista nel header
  document.getElementById("totalAmount").textContent =
    `€${listTotal.toFixed(2)}`;

  // Mostra totale presi nella tab presi
  document.getElementById("takenTotalAmount").textContent =
    `€${takenTotal.toFixed(2)}`;

  // Divisione per persone (basata sul totale lista)
  const per = state.peopleCount > 0 ? listTotal / state.peopleCount : 0;
  document.getElementById("perPersonAmount").textContent =
    `€${per.toFixed(2)}/persona`;
}

// ============ SUPERMERCATI ============

function renderSupermarkets() {
  const sel = document.getElementById("currentSupermarket");
  const curr = state.currentSupermarket;
  sel.innerHTML = '<option value="">Nessun supermercato</option>';
  state.supermarkets.forEach((sm) => {
    const o = document.createElement("option");
    o.value = sm.name;
    o.textContent = sm.name;
    sel.appendChild(o);
  });
  sel.value = curr;

  // Aggiorna logo del supermercato selezionato
  updateSupermarketLogo();

  const list = document.getElementById("supermarketsList");
  list.innerHTML = "";
  state.supermarkets.forEach((sm, idx) => {
    const li = document.createElement("li");
    li.className = "supermarket-item";
    const logoHtml = sm.logo
      ? `<div class="sm-logo"><img src="${sm.logo}" alt="${sm.name}"></div>`
      : `<div class="sm-logo">🏪</div>`;
    li.innerHTML = `
            ${logoHtml}
            <span class="sm-name">${sm.name}</span>
            <div class="sm-actions">
                <button class="icon-btn" onclick="editSupermarket(${idx})">✏️</button>
                <button class="icon-btn delete" onclick="deleteSupermarket(${idx})">🗑</button>
            </div>
        `;
    list.appendChild(li);
  });
}

function updateSupermarketLogo() {
  const logoBox = document.getElementById("supermarketLogoBox");
  const selectedSm = state.supermarkets.find(
    (sm) => sm.name === state.currentSupermarket,
  );

  if (selectedSm && selectedSm.logo) {
    logoBox.innerHTML = `<img src="${selectedSm.logo}" alt="${selectedSm.name}">`;
  } else {
    logoBox.innerHTML = '<span class="supermarket-logo-placeholder">🏪</span>';
  }
}

function addSupermarket() {
  const name = document.getElementById("newSupermarketName").value.trim();
  if (!name) return alert("Inserisci nome");
  if (state.supermarkets.some((s) => s.name === name))
    return alert("Già esistente");
  state.supermarkets.push({ name, logo: "" });
  saveState();
  renderSupermarkets();
  document.getElementById("newSupermarketName").value = "";
}

function editSupermarket(idx) {
  const sm = state.supermarkets[idx];
  document.getElementById("editSmName").value = sm.name;
  const preview = document.getElementById("editSmLogoPreview");
  if (sm.logo) {
    preview.innerHTML = `<img src="${sm.logo}">`;
    preview.classList.remove("empty");
  } else {
    preview.innerHTML = "";
    preview.classList.add("empty");
  }
  preview.dataset.logo = sm.logo || "";
  preview.dataset.idx = idx;
  document.getElementById("editSmLogoFile").value = "";
  document.getElementById("editSmLogoUrl").value = "";

  // Reset to file method
  document.getElementById("logoMethodFileBtn").classList.add("active");
  document.getElementById("logoMethodUrlBtn").classList.remove("active");
  document.getElementById("logoFileInput").style.display = "block";
  document.getElementById("logoUrlInput").style.display = "none";

  openModal("editSupermarketModal");
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById("editSmLogoPreview");
    preview.innerHTML = `<img src="${ev.target.result}">`;
    preview.classList.remove("empty");
    preview.dataset.logo = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function saveEditedSupermarket() {
  const idx = parseInt(
    document.getElementById("editSmLogoPreview").dataset.idx,
  );
  const newName = document.getElementById("editSmName").value.trim();
  const newLogo = document.getElementById("editSmLogoPreview").dataset.logo;

  if (!newName) return alert("Inserisci nome");
  const oldName = state.supermarkets[idx].name;

  if (oldName !== newName) {
    if (state.supermarkets.some((s, i) => i !== idx && s.name === newName)) {
      return alert("Esiste già un supermercato con questo nome");
    }
    // Aggiorna prezzi in tutti i prodotti
    state.products.forEach((p) => {
      if (p.prices[oldName] !== undefined) {
        p.prices[newName] = p.prices[oldName];
        delete p.prices[oldName];
      }
    });
    state.archive.forEach((a) => {
      if (a.supermarket === oldName) a.supermarket = newName;
    });
    if (state.currentSupermarket === oldName)
      state.currentSupermarket = newName;
  }

  state.supermarkets[idx] = { name: newName, logo: newLogo };
  saveState();
  renderAll();
  closeModal("editSupermarketModal");
}

function deleteSupermarket(idx) {
  const sm = state.supermarkets[idx];
  if (confirm(`Eliminare "${sm.name}"? I prezzi associati verranno persi.`)) {
    state.products.forEach((p) => {
      delete p.prices[sm.name];
    });
    state.supermarkets.splice(idx, 1);
    if (state.currentSupermarket === sm.name) state.currentSupermarket = "";
    saveState();
    renderAll();
  }
}

// ============ ARCHIVIO ============

function renderArchive() {
  const list = document.getElementById("archiveList");
  const fMonth = document.getElementById("filterMonth").value;
  const fYear = document.getElementById("filterYear").value;

  const years = [
    ...new Set(state.archive.map((a) => new Date(a.date).getFullYear())),
  ].sort((a, b) => b - a);
  const ySel = document.getElementById("filterYear");
  const currY = ySel.value;
  ySel.innerHTML = '<option value="">Tutti</option>';
  years.forEach((y) => {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y;
    ySel.appendChild(o);
  });
  ySel.value = currY;

  let filtered = state.archive;
  if (fMonth !== "")
    filtered = filtered.filter(
      (a) => new Date(a.date).getMonth() === parseInt(fMonth),
    );
  if (fYear !== "")
    filtered = filtered.filter(
      (a) => new Date(a.date).getFullYear() === parseInt(fYear),
    );

  const total = filtered.reduce((sum, a) => sum + a.total, 0);
  const avg = filtered.length > 0 ? total / filtered.length : 0;
  document.getElementById("averageSpending").textContent = `€${avg.toFixed(2)}`;
  document.getElementById("totalShoppingCount").textContent = filtered.length;

  list.innerHTML = "";
  filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((item) => {
      const realIdx = state.archive.indexOf(item);
      const li = document.createElement("li");
      li.className = "archive-item";
      const d = new Date(item.date).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const prods = item.products
        .map((p) => `${p.name} (${p.quantity}${p.unit})`)
        .join(", ");

      const smObj = state.supermarkets.find((s) => s.name === item.supermarket);
      const logoHtml =
        smObj && smObj.logo
          ? `<img src="${smObj.logo}" class="archive-sm-logo">`
          : "";

      li.innerHTML = `
            <div class="archive-header">
                <span class="archive-supermarket">${logoHtml}${item.supermarket || "N/A"}</span>
                <span class="archive-date">${d}</span>
            </div>
            <div class="archive-total">Totale: €${item.total.toFixed(2)}</div>
            <div class="archive-products">${prods}</div>
            <div class="archive-actions">
                <button class="btn btn-secondary" onclick="editArchiveItem(${realIdx})">✏️ Modifica</button>
                <button class="btn btn-danger" onclick="deleteArchiveItem(${realIdx})">🗑 Elimina</button>
            </div>`;
      list.appendChild(li);
    });
}

function editArchiveItem(idx) {
  const item = state.archive[idx];
  const sel = document.getElementById("archiveSupermarket");
  sel.innerHTML = '<option value="N/A">N/A</option>';
  state.supermarkets.forEach((sm) => {
    const o = document.createElement("option");
    o.value = sm.name;
    o.textContent = sm.name;
    if (sm.name === item.supermarket) o.selected = true;
    sel.appendChild(o);
  });
  const list = document.getElementById("archiveProductsList");
  list.innerHTML = "";
  item.products.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "archive-product-item";
    div.innerHTML = `
            <input type="text" name="name" value="${escapeHtml(p.name)}" data-i="${i}" style="flex:2">
            <input type="number" name="qty" value="${p.quantity}" step="0.1" data-i="${i}" style="flex:1;max-width:60px">
            <input type="number" name="price" value="${p.price}" step="0.01" data-i="${i}" style="flex:1;max-width:70px">
            <button class="icon-btn delete" onclick="removeArchiveProd(${idx}, ${i})">🗑</button>`;
    list.appendChild(div);
  });
  document.getElementById("editArchiveModal").dataset.idx = idx;
  openModal("editArchiveModal");
}

function removeArchiveProd(aIdx, pIdx) {
  state.archive[aIdx].products.splice(pIdx, 1);
  editArchiveItem(aIdx);
}

function saveArchiveEdit() {
  const idx = parseInt(document.getElementById("editArchiveModal").dataset.idx);
  const item = state.archive[idx];
  item.supermarket = document.getElementById("archiveSupermarket").value;
  document
    .querySelectorAll("#archiveProductsList .archive-product-item")
    .forEach((div) => {
      const i = parseInt(div.querySelector("input").dataset.i);
      item.products[i].name = div.querySelector('input[name="name"]').value;
      item.products[i].quantity =
        parseFloat(div.querySelector('input[name="qty"]').value) || 0;
      item.products[i].price =
        parseFloat(div.querySelector('input[name="price"]').value) || 0;
    });
  item.total = item.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  saveState();
  renderArchive();
  closeModal("editArchiveModal");
}

function deleteArchiveItem(idx) {
  if (confirm("Eliminare questa spesa?")) {
    state.archive.splice(idx, 1);
    saveState();
    renderArchive();
  }
}

// ============ RENDER ALL ============

function renderAll() {
  renderSupermarkets();
  renderShoppingList();
  renderTakenList();
  renderDatabase();
  renderArchive();
  updateTotals();
}

// ============ BACKUP ============

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `spesa-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const raw = JSON.parse(ev.target.result);

      // Rileva vecchio formato (version + lists + supermarkets oggetto)
      if (
        raw.version !== undefined &&
        raw.lists &&
        raw.supermarkets &&
        !Array.isArray(raw.supermarkets)
      ) {
        if (!confirm("Rilevato vecchio formato. Convertire e importare?"))
          return;
        const smMap = {};
        const newData = {
          products: [],
          shoppingList: [],
          takenProducts: [],
          supermarkets: [],
          currentSupermarket: "",
          peopleCount: 1,
          archive: [],
        };

        // Supermercati
        Object.values(raw.supermarkets).forEach((s) => {
          newData.supermarkets.push({ name: s.name, logo: s.logo || "" });
          smMap[s.id] = s.name;
        });

        // Prodotti (database)
        if (raw.products) {
          Object.values(raw.products).forEach((p) => {
            const prices = {};
            if (p.prices) {
              Object.entries(p.prices).forEach(([sid, po]) => {
                const sn = smMap[sid];
                if (sn && po.price > 0) prices[sn] = po.price;
              });
            }
            newData.products.push({
              name: p.name,
              category:
                (p.cat || "").replace(/^[^\s]+\s/, "") || "Altri Prodotti",
              prices,
            });
          });
        }

        // Supermercato corrente
        if (raw.currentSupermarketId && smMap[raw.currentSupermarketId]) {
          newData.currentSupermarket = smMap[raw.currentSupermarketId];
        } else if (newData.supermarkets.length) {
          newData.currentSupermarket = newData.supermarkets[0].name;
        }

        // Lista corrente
        const cl = raw.currentListId ? raw.lists[raw.currentListId] : null;
        if (cl) {
          if (cl.items)
            cl.items.forEach((it) => {
              newData.shoppingList.push({
                name: it.name,
                quantity: parseFloat(it.qty) || 1,
                unit: "pz",
              });
              // Salva prezzo nel database se mancante
              if (it.price && newData.currentSupermarket) {
                let prod = newData.products.find((p) => p.name === it.name);
                if (!prod) {
                  prod = {
                    name: it.name,
                    category:
                      (it.cat || "").replace(/^[^\s]+\s/, "") ||
                      "Altri Prodotti",
                    prices: {},
                  };
                  newData.products.push(prod);
                }
                if (!prod.prices[newData.currentSupermarket]) {
                  prod.prices[newData.currentSupermarket] = it.price;
                }
              }
            });
          if (cl.taken)
            cl.taken.forEach((it) => {
              newData.takenProducts.push({
                name: it.name,
                quantity: parseFloat(it.qty) || 1,
                unit: "pz",
              });
            });
        }
        state = newData;
      } else if (
        Array.isArray(raw.products) &&
        raw.supermarkets !== undefined
      ) {
        // Nuovo formato
        if (!confirm("Sovrascrivere i dati attuali?")) return;
        state = raw;
      } else {
        alert("Formato non riconosciuto");
        return;
      }

      migrateState();
      saveState();
      renderAll();
      alert("Importato con successo!");
    } catch (err) {
      alert("File non valido: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}
