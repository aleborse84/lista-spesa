// Struttura dati:
// state.products = [{ name, category, prices: { smName: price } }]  <- DATABASE
// state.shoppingList = [{ name, quantity, unit, discount }]  <- LISTA SPESA
// state.takenProducts = [{ name, quantity, unit, discount }]  <- PRESI
let state = {
  products: [],
  shoppingList: [],
  takenProducts: [],
  supermarkets: [],
  currentSupermarket: "",
  peopleCount: 1,
  archive: [],
};

const DEFAULT_CATEGORIES = [
  { name: "Altri Prodotti", emoji: "📦" },
  { name: "Affettati", emoji: "" },
  { name: "Bagno", emoji: "🛁" },
  { name: "Bevande", emoji: "🍺" },
  { name: "Carne", emoji: "🥩" },
  { name: "Casa", emoji: "🏠" },
  { name: "Cereali", emoji: "🥣" },
  { name: "Colazione", emoji: "☕" },
  { name: "Condimenti e Spezie", emoji: "🫒" },
  { name: "Cucina", emoji: "🍳" },
  { name: "Dolci", emoji: "🍬" },
  { name: "Formaggi", emoji: "🧀" },
  { name: "Frutta", emoji: "" },
  { name: "Igiene Personale", emoji: "🧴" },
  { name: "Latticini", emoji: "🥛" },
  { name: "Pane", emoji: "🥖" },
  { name: "Pasta", emoji: "🍝" },
  { name: "Pesce", emoji: "🐟" },
  { name: "Pulizia", emoji: "🧹" },
  { name: "Salse", emoji: "🫙" },
  { name: "Snack", emoji: "🍿" },
  { name: "Surgelati", emoji: "❄️" },
  { name: "Uova", emoji: "🥚" },
  { name: "Verdura", emoji: "🥦" },
];

// Helper per ottenere le categorie ordinate alfabeticamente
function getCategories() {
  if (!state.categories || state.categories.length === 0) {
    state.categories = [...DEFAULT_CATEGORIES];
    saveState();
  }
  state.categories.forEach((c) => {
    c.name = (c.name || "").trim();
  });
  return [...state.categories].sort((a, b) => a.name.localeCompare(b.name));
}

function getCategoryNames() {
  return getCategories().map((c) => c.name);
}

function getCategoryEmoji(catName) {
  const cat = getCategories().find((c) => c.name === catName);
  return cat ? cat.emoji : "";
}

// Calcola il prezzo finale di un prodotto (prezzo × qty - sconto, minimo 0)
function calcFinalPrice(product) {
  const dbProd = state.products.find((x) => x.name === product.name);
  const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
  const subtotal = price * (product.quantity || 1);
  const discount = product.discount || 0;
  return Math.max(0, subtotal - discount);
}

function ensureStateIntegrity() {
  if (!state) state = {};
  if (!Array.isArray(state.products)) state.products = [];
  if (!Array.isArray(state.shoppingList)) state.shoppingList = [];
  if (!Array.isArray(state.takenProducts)) state.takenProducts = [];
  if (!Array.isArray(state.supermarkets)) state.supermarkets = [];
  if (!Array.isArray(state.archive)) state.archive = [];
  if (!Array.isArray(state.categories))
    state.categories = [...DEFAULT_CATEGORIES];
  if (typeof state.peopleCount !== "number" || state.peopleCount < 1) {
    state.peopleCount = 1;
  }
  if (typeof state.currentSupermarket !== "string") {
    state.currentSupermarket = "";
  }
  if (
    state.supermarkets.length > 0 &&
    typeof state.supermarkets[0] === "string"
  ) {
    state.supermarkets = state.supermarkets.map((name) => ({ name, logo: "" }));
  }
  if (state.productPrices && !state.products.length) {
    Object.entries(state.productPrices).forEach(([name, prices]) => {
      state.products.push({
        name,
        category: "Altri Prodotti",
        prices: { ...prices },
      });
    });
    delete state.productPrices;
  }
  state.products.forEach((p) => {
    if (!p.prices) p.prices = {};
    if (!p.category) p.category = "Altri Prodotti";
    if (!p.name) p.name = "Prodotto sconosciuto";
  });
  state.shoppingList.forEach((p) => {
    if (!p.quantity) p.quantity = 1;
    if (!p.unit) p.unit = "pz";
    if (!p.name) p.name = "Prodotto sconosciuto";
    if (typeof p.discount !== "number") p.discount = 0;
  });
  state.takenProducts.forEach((p) => {
    if (!p.quantity) p.quantity = 1;
    if (!p.unit) p.unit = "pz";
    if (!p.name) p.name = "Prodotto sconosciuto";
    if (typeof p.discount !== "number") p.discount = 0;
  });
  state.archive.forEach((item) => {
    if (!item.date) item.date = new Date().toISOString();
    if (!item.supermarket) item.supermarket = "N/A";
    if (!Array.isArray(item.products)) item.products = [];
    if (typeof item.total !== "number") item.total = 0;
    if (typeof item.totalDiscount !== "number") item.totalDiscount = 0;
    item.products.forEach((p) => {
      if (typeof p.discount !== "number") p.discount = 0;
    });
  });
}

// ============ GESTIONE CATEGORIE ============
function renderCategoriesSettings() {
  const list = document.getElementById("categoriesList");
  if (!list) return;
  list.innerHTML = "";
  const sortedCats = getCategories();
  sortedCats.forEach((cat) => {
    const realIdx = state.categories.findIndex((c) => c.name === cat.name);
    const li = document.createElement("li");
    li.className = "category-setting-item";
    li.innerHTML = `<span class="category-emoji">${cat.emoji}</span> <span class="category-name">${cat.name}</span> <div class="sm-actions"> <button class="icon-btn" onclick="editCategory(${realIdx})" title="Modifica">✏️</button> <button class="icon-btn delete" onclick="deleteCategory(${realIdx})" title="Elimina">🗑</button> </div>`;
    list.appendChild(li);
  });
}

function addCategory() {
  const name = document.getElementById("newCategoryName").value.trim();
  const emoji = document.getElementById("newCategoryEmoji").value.trim() || "";
  if (!name) return alert("Inserisci il nome della categoria");
  if (
    state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())
  ) {
    return alert("Categoria già esistente");
  }
  state.categories.push({ name, emoji });
  saveState();
  renderCategoriesSettings();
  renderCategoryButtons();
  updateAllCategorySelects();
  document.getElementById("newCategoryName").value = "";
  document.getElementById("newCategoryEmoji").value = "";
}

let editingCategoryIndex = -1;

function editCategory(idx) {
  editingCategoryIndex = idx;
  const cat = state.categories[idx];
  document.getElementById("editCatEmoji").value = cat.emoji;
  document.getElementById("editCatName").value = cat.name;
  openModal("editCategoryModal");
}

function saveEditCategory() {
  if (editingCategoryIndex < 0) return;
  const newName = document.getElementById("editCatName").value.trim();
  const newEmoji = document.getElementById("editCatEmoji").value.trim();
  if (!newName) return alert("Nome non valido");
  if (
    state.categories.some(
      (c, i) =>
        i !== editingCategoryIndex &&
        c.name.toLowerCase() === newName.toLowerCase(),
    )
  ) {
    return alert("Categoria già esistente");
  }
  const oldName = state.categories[editingCategoryIndex].name;
  state.categories[editingCategoryIndex].name = newName;
  state.categories[editingCategoryIndex].emoji = newEmoji;
  state.products.forEach((p) => {
    if (p.category === oldName) p.category = newName;
  });
  saveState();
  renderCategoriesSettings();
  renderCategoryButtons();
  updateAllCategorySelects();
  renderDatabase();
  closeModal("editCategoryModal");
}

function deleteCategory(idx) {
  const cat = state.categories[idx];
  const productsUsing = state.products.filter(
    (p) => p.category === cat.name,
  ).length;
  if (productsUsing > 0) {
    if (
      !confirm(
        `La categoria "${cat.emoji} ${cat.name}" è usata da ${productsUsing} prodotti. Eliminarla comunque? I prodotti verranno spostati in "Altri Prodotti".`,
      )
    ) {
      return;
    }
    state.products.forEach((p) => {
      if (p.category === cat.name) p.category = "Altri Prodotti";
    });
  } else {
    if (!confirm(`Eliminare la categoria "${cat.emoji} ${cat.name}"?`)) return;
  }
  state.categories.splice(idx, 1);
  saveState();
  renderCategoriesSettings();
  renderCategoryButtons();
  updateAllCategorySelects();
}

function updateAllCategorySelects() {
  const selects = [
    document.getElementById("dbProdCategory"),
    document.getElementById("newProdCategory"),
  ];
  const cats = getCategories();
  selects.forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = cats
      .map((c) => `<option value="${c.name}">${c.emoji} ${c.name}</option>`)
      .join("");
    if (cats.some((c) => c.name === current)) sel.value = current;
  });
}

function renderCategoryButtons() {
  const bar = document.getElementById("categoriesBar");
  if (!bar) return;
  bar.innerHTML = "";
  getCategories().forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.category = cat.name;
    btn.textContent = `${cat.emoji} ${cat.name}`;
    btn.addEventListener("click", () => {
      document.getElementById("quickAddInput").value = "";
      document.getElementById("quickAddInput").placeholder =
        `Aggiungi prodotto in "${cat.name}"...`;
      document.getElementById("quickAddInput").dataset.pendingCategory =
        cat.name;
      document.getElementById("quickAddInput").focus();
    });
    bar.appendChild(btn);
  });
}

function loadState() {
  const saved = localStorage.getItem("shoppingAppState");
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.error("Errore parsing localStorage", e);
      state = {};
    }
  }
  ensureStateIntegrity();
  if (typeof appDataRef !== "undefined") {
    appDataRef.on(
      "value",
      (snapshot) => {
        const savedDb = snapshot.val();
        if (savedDb && typeof savedDb === "object") {
          state = savedDb;
          ensureStateIntegrity();
          localStorage.setItem("shoppingAppState", JSON.stringify(state));
          renderAll();
        }
      },
      (error) => {
        console.error("Errore Firebase:", error);
      },
    );
  } else {
    renderAll();
  }
}

function saveState() {
  if (typeof appDataRef !== "undefined") {
    appDataRef
      .set(state)
      .catch((err) => console.error("Errore salvataggio Firebase:", err));
  } else {
    localStorage.setItem("shoppingAppState", JSON.stringify(state));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initUI();
});

function initUI() {
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

  document
    .getElementById("saveShoppingItemBtn")
    .addEventListener("click", saveShoppingItemEdit);
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", addCategory);
  document
    .getElementById("saveEditCategoryBtn")
    .addEventListener("click", saveEditCategory);

  document
    .getElementById("currentSupermarket")
    .addEventListener("change", (e) => {
      state.currentSupermarket = e.target.value;
      saveState();
      updateSupermarketLogo();
      renderAll();
    });

  document.getElementById("peopleCount").addEventListener("input", (e) => {
    state.peopleCount = parseInt(e.target.value) || 1;
    saveState();
    updateTotals();
  });

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
                    <div><div class="autocomplete-item-name">${escapeHtml(p.name)}</div><div class="autocomplete-item-cat">${p.category}</div></div>
                    <div class="autocomplete-item-price">€${price.toFixed(2)}</div>
                </div>`;
        })
        .join("");
    }
    quickList.classList.add("show");
  });
  quickInput.addEventListener("blur", () =>
    setTimeout(() => quickList.classList.remove("show"), 200),
  );
  quickList.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (!item || !item.dataset.name) return;
    addToShoppingList(item.dataset.name);
    quickInput.value = "";
    quickInput.placeholder = "🔍 Cerca prodotto nel database...";
    delete quickInput.dataset.pendingCategory;
    quickList.classList.remove("show");
  });
  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = quickList.querySelector(".autocomplete-item[data-name]");
      if (first) {
        addToShoppingList(first.dataset.name);
        quickInput.value = "";
        quickInput.placeholder = "🔍 Cerca prodotto nel database...";
        delete quickInput.dataset.pendingCategory;
        quickList.classList.remove("show");
      } else {
        document.getElementById("quickAddCreateBtn").click();
      }
    }
  });
  document.getElementById("quickAddCreateBtn").addEventListener("click", () => {
    const name = quickInput.value.trim();
    if (!name) return alert("Scrivi prima il nome del prodotto");
    openCreateNewProductModal(name);
  });

  document
    .getElementById("clearCheckedBtn")
    .addEventListener("click", clearChecked);
  document.getElementById("clearListBtn").addEventListener("click", clearList);
  document
    .getElementById("printBtn")
    .addEventListener("click", () => window.print());

  document
    .getElementById("restoreAllBtn")
    .addEventListener("click", restoreAll);
  document
    .getElementById("clearTakenBtn")
    .addEventListener("click", clearTaken);
  document
    .getElementById("saveShoppingBtn")
    .addEventListener("click", saveShopping);

  document
    .getElementById("addDbProductBtn")
    .addEventListener("click", () => openDbProductModal());
  document.getElementById("dbSearch").addEventListener("input", renderDatabase);
  document
    .getElementById("saveDbProductBtn")
    .addEventListener("click", saveDbProduct);

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

  document
    .getElementById("filterMonth")
    .addEventListener("change", renderArchive);
  document
    .getElementById("filterYear")
    .addEventListener("change", renderArchive);
  document
    .getElementById("confirmArchiveEditBtn")
    .addEventListener("click", saveArchiveEdit);

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

  document
    .getElementById("confirmCreateProdBtn")
    .addEventListener("click", confirmCreateNewProduct);

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
  const existing = state.shoppingList.find((p) => p.name === productName);
  if (existing) existing.quantity += qty;
  else
    state.shoppingList.push({
      name: productName,
      quantity: qty,
      unit,
      discount: 0,
    });
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
    const discount = p.discount || 0;
    const subtotal = price * p.quantity;
    const finalPrice = Math.max(0, subtotal - discount);

    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
            <input type="checkbox" class="product-checkbox" data-index="${i}">
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-details">
                    <span>${p.quantity} ${p.unit}</span>
                    <span class="product-price">€${subtotal.toFixed(2)}</span>
                    ${discount > 0 ? `<span class="product-discount">-€${discount.toFixed(2)}</span>` : ""}
                    ${discount > 0 ? `<span class="product-final-price">= €${finalPrice.toFixed(2)}</span>` : ""}
                </div>
                ${cat ? `<span class="product-category-tag">${getCategoryEmoji(cat)} ${cat}</span>` : ""}
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="editShoppingItem(${i})">✏️</button>
                <button class="icon-btn delete" onclick="deleteShoppingItem(${i})">🗑</button>
            </div>
        `;
    li.querySelector(".product-checkbox").addEventListener("change", () =>
      toggleProduct(i),
    );
    list.appendChild(li);
  });
}

let editingShoppingIndex = -1;
function editShoppingItem(i) {
  editingShoppingIndex = i;
  const p = state.shoppingList[i];
  const dbProd = state.products.find((x) => x.name === p.name);
  const currentPrice = dbProd
    ? dbProd.prices[state.currentSupermarket] || 0
    : 0;
  document.getElementById("editItemName").value = p.name;
  document.getElementById("editItemQty").value = p.quantity;
  document.getElementById("editItemUnit").value = p.unit;
  document.getElementById("editItemPrice").value = currentPrice;
  document.getElementById("editItemDiscount").value = p.discount || 0;
  document.getElementById("editItemSmName").textContent =
    state.currentSupermarket || "supermercato";
  openModal("editShoppingItemModal");
}

function saveShoppingItemEdit() {
  if (editingShoppingIndex < 0) return;
  const newName = document.getElementById("editItemName").value.trim();
  const newQty = parseFloat(document.getElementById("editItemQty").value);
  const newUnit = document.getElementById("editItemUnit").value;
  const newPrice =
    parseFloat(document.getElementById("editItemPrice").value) || 0;
  const newDiscount =
    parseFloat(document.getElementById("editItemDiscount").value) || 0;
  if (!newName) return alert("Inserisci il nome del prodotto");
  if (isNaN(newQty) || newQty <= 0) return alert("Quantità non valida");
  const oldName = state.shoppingList[editingShoppingIndex].name;
  state.shoppingList[editingShoppingIndex] = {
    ...state.shoppingList[editingShoppingIndex],
    name: newName,
    quantity: newQty,
    unit: newUnit,
    discount: newDiscount,
  };
  if (oldName !== newName) {
    state.takenProducts.forEach((p) => {
      if (p.name === oldName) p.name = newName;
    });
    let dbProd = state.products.find((p) => p.name === newName);
    if (!dbProd) {
      const oldDbProd = state.products.find((p) => p.name === oldName);
      if (oldDbProd) {
        oldDbProd.name = newName;
        dbProd = oldDbProd;
      } else {
        dbProd = { name: newName, category: "Altri Prodotti", prices: {} };
        state.products.push(dbProd);
      }
    }
    if (state.currentSupermarket)
      dbProd.prices[state.currentSupermarket] = newPrice;
  } else {
    let dbProd = state.products.find((p) => p.name === newName);
    if (!dbProd) {
      dbProd = { name: newName, category: "Altri Prodotti", prices: {} };
      state.products.push(dbProd);
    }
    if (state.currentSupermarket)
      dbProd.prices[state.currentSupermarket] = newPrice;
  }
  saveState();
  renderAll();
  closeModal("editShoppingItemModal");
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
  if (!state.takenProducts || state.takenProducts.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = "";
  state.takenProducts.forEach((p, i) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    const discount = p.discount || 0;
    const subtotal = price * p.quantity;
    const finalPrice = Math.max(0, subtotal - discount);
    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
            <input type="checkbox" class="product-checkbox" checked data-index="${i}">
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-details">
                    <span>${p.quantity} ${p.unit}</span>
                    <span class="product-price">€${subtotal.toFixed(2)}</span>
                    ${discount > 0 ? `<span class="product-discount">-€${discount.toFixed(2)}</span>` : ""}
                    ${discount > 0 ? `<span class="product-final-price">= €${finalPrice.toFixed(2)}</span>` : ""}
                </div>
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="editTakenItem(${i})">✏️</button>
                <button class="icon-btn delete" onclick="deleteTakenItem(${i})">🗑</button>
            </div>
        `;
    li.querySelector(".product-checkbox").addEventListener("change", () =>
      restoreProduct(i),
    );
    list.appendChild(li);
  });
}

function editTakenItem(i) {
  const p = state.takenProducts[i];
  const dbProd = state.products.find((x) => x.name === p.name);
  const currentPrice = dbProd
    ? dbProd.prices[state.currentSupermarket] || 0
    : 0;

  // Usa un modal dedicato per i presi (riuso lo stesso modal)
  editingShoppingIndex = i;
  document.getElementById("editItemName").value = p.name;
  document.getElementById("editItemQty").value = p.quantity;
  document.getElementById("editItemUnit").value = p.unit;
  document.getElementById("editItemPrice").value = currentPrice;
  document.getElementById("editItemDiscount").value = p.discount || 0;
  document.getElementById("editItemSmName").textContent =
    state.currentSupermarket || "supermercato";
  document.getElementById("dbProductModalTitle").textContent =
    "Modifica Prodotto Preso";
  openModal("editShoppingItemModal");
}

// Override per gestire sia lista che presi
let editingListType = "shopping";

function saveShoppingItemEdit() {
  if (editingShoppingIndex < 0) return;
  const newName = document.getElementById("editItemName").value.trim();
  const newQty = parseFloat(document.getElementById("editItemQty").value);
  const newUnit = document.getElementById("editItemUnit").value;
  const newPrice =
    parseFloat(document.getElementById("editItemPrice").value) || 0;
  const newDiscount =
    parseFloat(document.getElementById("editItemDiscount").value) || 0;
  if (!newName) return alert("Inserisci il nome del prodotto");
  if (isNaN(newQty) || newQty <= 0) return alert("Quantità non valida");

  const list =
    editingListType === "shopping" ? state.shoppingList : state.takenProducts;
  const otherList =
    editingListType === "shopping" ? state.takenProducts : state.shoppingList;
  const oldName = list[editingShoppingIndex].name;

  list[editingShoppingIndex] = {
    ...list[editingShoppingIndex],
    name: newName,
    quantity: newQty,
    unit: newUnit,
    discount: newDiscount,
  };

  if (oldName !== newName) {
    otherList.forEach((p) => {
      if (p.name === oldName) p.name = newName;
    });
    let dbProd = state.products.find((p) => p.name === newName);
    if (!dbProd) {
      const oldDbProd = state.products.find((p) => p.name === oldName);
      if (oldDbProd) {
        oldDbProd.name = newName;
        dbProd = oldDbProd;
      } else {
        dbProd = { name: newName, category: "Altri Prodotti", prices: {} };
        state.products.push(dbProd);
      }
    }
    if (state.currentSupermarket)
      dbProd.prices[state.currentSupermarket] = newPrice;
  } else {
    let dbProd = state.products.find((p) => p.name === newName);
    if (!dbProd) {
      dbProd = { name: newName, category: "Altri Prodotti", prices: {} };
      state.products.push(dbProd);
    }
    if (state.currentSupermarket)
      dbProd.prices[state.currentSupermarket] = newPrice;
  }
  saveState();
  renderAll();
  closeModal("editShoppingItemModal");
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
  if (!state.takenProducts || state.takenProducts.length === 0)
    return alert("Nessun prodotto da salvare");
  const total = state.takenProducts.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    const discount = p.discount || 0;
    return sum + Math.max(0, price * p.quantity - discount);
  }, 0);
  const totalDiscount = state.takenProducts.reduce(
    (sum, p) => sum + (p.discount || 0),
    0,
  );
  state.archive.push({
    date: new Date().toISOString(),
    supermarket: state.currentSupermarket || "N/A",
    products: state.takenProducts.map((p) => {
      const dbProd = state.products.find((x) => x.name === p.name);
      return {
        ...p,
        price: dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0,
        discount: p.discount || 0,
      };
    }),
    total,
    totalDiscount,
  });
  state.takenProducts = [];
  saveState();
  renderAll();
  alert(
    "Spesa salvata in archivio! I prodotti non presi rimangono nella lista.",
  );
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
  const usedCats = [...new Set(state.products.map((p) => p.category))].sort();

  filterContainer.innerHTML =
    `<button class="db-cat-btn ${dbFilterCategory === "" ? "active" : ""}" data-cat="">Tutti</button>` +
    usedCats
      .map((c) => {
        const emoji = getCategoryEmoji(c);
        return `<button class="db-cat-btn ${dbFilterCategory === c ? "active" : ""}" data-cat="${c}">${emoji} ${c}</button>`;
      })
      .join("");

  filterContainer.querySelectorAll(".db-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      dbFilterCategory = btn.dataset.cat;
      renderDatabase();
    });
  });

  let filtered = state.products;
  if (dbFilterCategory)
    filtered = filtered.filter((p) => p.category === dbFilterCategory);
  if (search)
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

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
                    <span class="product-category-tag">${getCategoryEmoji(p.category)} ${p.category}</span>
                </div>
                ${priceChips ? `<div class="db-prices-mini">${priceChips}</div>` : ""}
            </div>
            <div class="product-actions">
                <button class="icon-btn" onclick="event.stopPropagation(); openDbProductModal(${realIdx})">✏️</button>
                <button class="icon-btn delete" onclick="event.stopPropagation(); deleteDbProduct(${realIdx})">🗑</button>
            </div>
        `;
    list.appendChild(li);
  });
}

function openDbProductModal(index = -1) {
  dbEditingIndex = index;
  const title = document.getElementById("dbProductModalTitle");
  const nameInput = document.getElementById("dbProdName");
  const catSelect = document.getElementById("dbProdCategory");
  catSelect.innerHTML = getCategories()
    .map((c) => `<option value="${c.name}">${c.emoji} ${c.name}</option>`)
    .join("");
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
    row.innerHTML = `<label>${logo} ${escapeHtml(sm.name)}</label><input type="number" step="0.01" min="0" placeholder="0.00" data-sm="${escapeHtml(sm.name)}" value="${price}">`;
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
    if (old.name !== name) {
      if (
        state.products.some((p, i) => i !== dbEditingIndex && p.name === name)
      )
        return alert("Esiste già un prodotto con questo nome");
      state.shoppingList.forEach((p) => {
        if (p.name === old.name) p.name = name;
      });
      state.takenProducts.forEach((p) => {
        if (p.name === old.name) p.name = name;
      });
    }
    state.products[dbEditingIndex] = { name, category, prices };
  } else {
    if (state.products.some((p) => p.name === name))
      return alert("Esiste già un prodotto con questo nome");
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

// ============ CREA NUOVO PRODOTTO ============
let pendingNewProductName = "";
function openCreateNewProductModal(name) {
  pendingNewProductName = name;
  document.getElementById("newProdPreviewName").textContent = name;
  const catSelect = document.getElementById("newProdCategory");
  catSelect.innerHTML = getCategories()
    .map((c) => `<option value="${c.name}">${c.emoji} ${c.name}</option>`)
    .join("");
  const quickInput = document.getElementById("quickAddInput");
  if (quickInput.dataset.pendingCategory) {
    catSelect.value = quickInput.dataset.pendingCategory;
  } else {
    catSelect.value = "Altri Prodotti";
  }
  renderPricesInputs("newProdPricesContainer", {});
  openModal("createNewProductModal");
}

function confirmCreateNewProduct() {
  const category = document.getElementById("newProdCategory").value;
  const prices = getPricesFromInputs("newProdPricesContainer");
  state.products.push({ name: pendingNewProductName, category, prices });
  const qty = parseFloat(document.getElementById("quickAddQty").value) || 1;
  const unit = document.getElementById("quickAddUnit").value;
  state.shoppingList.push({
    name: pendingNewProductName,
    quantity: qty,
    unit,
    discount: 0,
  });
  saveState();
  renderAll();
  closeModal("createNewProductModal");
  document.getElementById("quickAddInput").value = "";
  document.getElementById("quickAddInput").placeholder =
    " Cerca prodotto nel database...";
  delete document.getElementById("quickAddInput").dataset.pendingCategory;
}

// ============ TOTALI ============
function updateTotals() {
  const listTotal = state.shoppingList.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    const discount = p.discount || 0;
    return sum + Math.max(0, price * p.quantity - discount);
  }, 0);
  const takenTotal = state.takenProducts.reduce((sum, p) => {
    const dbProd = state.products.find((x) => x.name === p.name);
    const price = dbProd ? dbProd.prices[state.currentSupermarket] || 0 : 0;
    const discount = p.discount || 0;
    return sum + Math.max(0, price * p.quantity - discount);
  }, 0);
  document.getElementById("totalAmount").textContent =
    `€${listTotal.toFixed(2)}`;
  document.getElementById("takenTotalAmount").textContent =
    `€${takenTotal.toFixed(2)}`;
  const per = state.peopleCount > 0 ? listTotal / state.peopleCount : 0;
  document.getElementById("perPersonAmount").textContent =
    `€${per.toFixed(2)}/persona`;
}

// ============ SUPERMERCATI ============
function updateSupermarketLogo() {
  const logoBox = document.getElementById("supermarketLogoBox");
  if (!logoBox) return;
  const selectedSm = state.supermarkets.find(
    (sm) => sm.name === state.currentSupermarket,
  );
  if (selectedSm && selectedSm.logo) {
    logoBox.innerHTML = `<img src="${selectedSm.logo}" alt="${selectedSm.name}">`;
  } else {
    logoBox.innerHTML = '<span class="supermarket-logo-placeholder">🏪</span>';
  }
}

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
  updateSupermarketLogo();
  const list = document.getElementById("supermarketsList");
  list.innerHTML = "";
  state.supermarkets.forEach((sm, idx) => {
    const li = document.createElement("li");
    li.className = "supermarket-item";
    const logoHtml = sm.logo
      ? `<div class="sm-logo"><img src="${sm.logo}" alt="${sm.name}"></div>`
      : `<div class="sm-logo">🏪</div>`;
    li.innerHTML = `${logoHtml}<span class="sm-name">${sm.name}</span><div class="sm-actions"><button class="icon-btn" onclick="editSupermarket(${idx})">✏️</button><button class="icon-btn delete" onclick="deleteSupermarket(${idx})">🗑</button></div>`;
    list.appendChild(li);
  });
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
    if (state.supermarkets.some((s, i) => i !== idx && s.name === newName))
      return alert("Esiste già un supermercato con questo nome");
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
      const discountHtml =
        item.totalDiscount > 0
          ? `<div class="archive-discount"> Sconto totale: -€${item.totalDiscount.toFixed(2)}</div>`
          : "";
      li.innerHTML = `
            <div class="archive-header">
                <span class="archive-supermarket">${logoHtml}${item.supermarket || "N/A"}</span>
                <span class="archive-date">${d}</span>
            </div>
            ${discountHtml}
            <div class="archive-total">Totale: €${item.total.toFixed(2)}</div>
            <div class="archive-products">${prods}</div>
            <div class="archive-actions">
                <button class="btn btn-secondary" onclick="editArchiveItem(${realIdx})">✏️ Modifica</button>
                <button class="btn btn-danger" onclick="deleteArchiveItem(${realIdx})">🗑 Elimina</button>
            </div>
        `;
      list.appendChild(li);
    });
}

function editArchiveItem(idx) {
  const item = state.archive[idx];
  const dateInput = document.getElementById("archiveDate");
  const dateObj = new Date(item.date);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
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
            <input type="number" name="discount" value="${p.discount || 0}" step="0.01" data-i="${i}" style="flex:1;max-width:70px" placeholder="Sconto">
            <button class="icon-btn delete" onclick="removeArchiveProd(${idx}, ${i})">🗑</button>
        `;
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
  const newDateStr = document.getElementById("archiveDate").value;
  if (newDateStr) {
    const oldDate = new Date(item.date);
    const [yyyy, mm, dd] = newDateStr.split("-").map(Number);
    const newDate = new Date(
      yyyy,
      mm - 1,
      dd,
      oldDate.getHours(),
      oldDate.getMinutes(),
      oldDate.getSeconds(),
    );
    item.date = newDate.toISOString();
  }
  item.supermarket = document.getElementById("archiveSupermarket").value;
  let totalDiscount = 0;
  document
    .querySelectorAll("#archiveProductsList .archive-product-item")
    .forEach((div) => {
      const i = parseInt(div.querySelector("input").dataset.i);
      item.products[i].name = div.querySelector('input[name="name"]').value;
      item.products[i].quantity =
        parseFloat(div.querySelector('input[name="qty"]').value) || 0;
      item.products[i].price =
        parseFloat(div.querySelector('input[name="price"]').value) || 0;
      item.products[i].discount =
        parseFloat(div.querySelector('input[name="discount"]').value) || 0;
      totalDiscount += item.products[i].discount;
    });
  item.totalDiscount = totalDiscount;
  item.total = item.products.reduce(
    (sum, p) => sum + Math.max(0, p.price * p.quantity - (p.discount || 0)),
    0,
  );
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
  renderCategoriesSettings();
  renderCategoryButtons();
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
      const getKey = (obj, key) =>
        obj[key] !== undefined ? obj[key] : obj[key + " "];
      const version = getKey(raw, "version");
      const lists = getKey(raw, "lists");
      const supermarkets = getKey(raw, "supermarkets");
      const products = getKey(raw, "products");
      const currentListId = getKey(raw, "currentListId");
      const currentSupermarketId = getKey(raw, "currentSupermarketId");
      if (
        version !== undefined &&
        lists &&
        supermarkets &&
        typeof supermarkets === "object" &&
        !Array.isArray(supermarkets)
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
        Object.values(supermarkets).forEach((s) => {
          newData.supermarkets.push({ name: s.name, logo: s.logo || "" });
          smMap[s.id] = s.name;
        });
        if (products) {
          Object.values(products).forEach((p) => {
            const prices = {};
            if (p.prices) {
              Object.entries(p.prices).forEach(([sid, po]) => {
                const sn = smMap[sid];
                if (sn && po.price > 0) prices[sn] = po.price;
              });
            }
            newData.products.push({
              name: p.name,
              category: (
                (p.cat || "").replace(/^[^\s]+\s/, "") || "Altri Prodotti"
              ).trim(),
              prices,
            });
          });
        }
        if (currentSupermarketId && smMap[currentSupermarketId]) {
          newData.currentSupermarket = smMap[currentSupermarketId];
        } else if (newData.supermarkets.length) {
          newData.currentSupermarket = newData.supermarkets[0].name;
        }
        const cl = currentListId ? lists[currentListId] : null;
        if (cl) {
          if (cl.items)
            cl.items.forEach((it) => {
              newData.shoppingList.push({
                name: it.name,
                quantity: parseFloat(it.qty) || 1,
                unit: "pz",
                discount: 0,
              });
              if (it.price && newData.currentSupermarket) {
                let prod = newData.products.find((p) => p.name === it.name);
                if (!prod) {
                  prod = {
                    name: it.name,
                    category: (
                      (it.cat || "").replace(/^[^\s]+\s/, "") ||
                      "Altri Prodotti"
                    ).trim(),
                    prices: {},
                  };
                  newData.products.push(prod);
                }
                if (!prod.prices[newData.currentSupermarket])
                  prod.prices[newData.currentSupermarket] = it.price;
              }
            });
          if (cl.taken)
            cl.taken.forEach((it) => {
              newData.takenProducts.push({
                name: it.name,
                quantity: parseFloat(it.qty) || 1,
                unit: "pz",
                discount: 0,
              });
            });
        }
        state = newData;
      } else if (Array.isArray(raw.products)) {
        if (!confirm("Sovrascrivere i dati attuali?")) return;
        state = raw;
      } else {
        alert(
          "Formato non riconosciuto. Assicurati di selezionare il file JSON corretto.",
        );
        return;
      }
      ensureStateIntegrity();
      saveState();
      renderAll();
      alert("Importato con successo!");
    } catch (err) {
      console.error(err);
      alert("File non valido: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}
