let cards = JSON.parse(localStorage.getItem("cards") || "[]");
let currentIndex = -1;
let currentCard = null;
let selectedManageId = null;

const el = (id) => document.getElementById(id);

// ---------- Tabs ----------
const tabCreateBtn = el("tabCreateBtn");
const tabLearnBtn = el("tabLearnBtn");
const tabManageBtn = el("tabManageBtn");

const tabCreate = el("tabCreate");
const tabLearn = el("tabLearn");
const tabManage = el("tabManage");

function setTab(which) {
  const isCreate = which === "create";
  const isLearn = which === "learn";
  const isManage = which === "manage";

  tabCreateBtn.classList.toggle("active", isCreate);
  tabLearnBtn.classList.toggle("active", isLearn);
  tabManageBtn.classList.toggle("active", isManage);

  tabCreate.classList.toggle("active", isCreate);
  tabLearn.classList.toggle("active", isLearn);
  tabManage.classList.toggle("active", isManage);

  if (isManage) renderManageList();
}

tabCreateBtn.addEventListener("click", () => setTab("create"));
tabLearnBtn.addEventListener("click", () => setTab("learn"));
tabManageBtn.addEventListener("click", () => setTab("manage"));

// ---------- Helpers ----------
function makeId() {
  return (crypto.randomUUID
    ? crypto.randomUUID()
    : ("id-" + Date.now() + "-" + Math.random().toString(16).slice(2))
  );
}

function persist() {
  localStorage.setItem("cards", JSON.stringify(cards));
}

function updateCount() {
  el("countLabel").textContent = `Gespeicherte Karten: ${cards.length}`;
  if (el("manageStatus")) el("manageStatus").textContent = `Karten: ${cards.length}`;
}

function showLatex(node, text) {
  node.innerHTML = text || "";
  if (window.MathJax) MathJax.typesetPromise([node]);
}

function setImg(imgEl, emptyEl, src) {
  if (src) {
    imgEl.src = src;
    imgEl.style.display = "block";
    emptyEl.style.display = "none";
  } else {
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    emptyEl.style.display = "block";
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function shortText(s, n = 60) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

// ---------- Create ----------
const qText = el("qText");
const aText = el("aText");
const qImage = el("qImage");
const aImage = el("aImage");

const qPreview = el("qPreview");
const aPreview = el("aPreview");
const qPreviewEmpty = el("qPreviewEmpty");
const aPreviewEmpty = el("aPreviewEmpty");

const saveBtn = el("saveBtn");
const clearBtn = el("clearBtn");

let pendingQImg = null;
let pendingAImg = null;

async function updatePreview(fileInput, previewImgEl, emptyEl) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    previewImgEl.style.display = "none";
    emptyEl.style.display = "block";
    return null;
  }
  const dataUrl = await fileToDataURL(file);
  previewImgEl.src = dataUrl;
  previewImgEl.style.display = "block";
  emptyEl.style.display = "none";
  return dataUrl;
}

qImage.addEventListener("change", async () => {
  pendingQImg = await updatePreview(qImage, qPreview, qPreviewEmpty);
});

aImage.addEventListener("change", async () => {
  pendingAImg = await updatePreview(aImage, aPreview, aPreviewEmpty);
});

saveBtn.addEventListener("click", async () => {
  const qT = qText.value.trim();
  const aT = aText.value.trim();

  if (qImage.files[0] && !pendingQImg) pendingQImg = await fileToDataURL(qImage.files[0]);
  if (aImage.files[0] && !pendingAImg) pendingAImg = await fileToDataURL(aImage.files[0]);

  if (!qT && !pendingQImg) {
    alert("Die Frage braucht Text/LaTeX oder ein Bild.");
    return;
  }
  if (!aT && !pendingAImg) {
    alert("Die Lösung braucht Text/LaTeX oder ein Bild.");
    return;
  }

  cards.push({
    id: makeId(),
    qText: qT,
    aText: aT,
    qImg: pendingQImg,
    aImg: pendingAImg
  });

  persist();

  // Reset
  qText.value = "";
  aText.value = "";
  qImage.value = "";
  aImage.value = "";
  pendingQImg = null;
  pendingAImg = null;

  qPreview.style.display = "none"; qPreviewEmpty.style.display = "block";
  aPreview.style.display = "none"; aPreviewEmpty.style.display = "block";

  updateCount();
  alert("Karte gespeichert!");

  if (tabManage.classList.contains("active")) renderManageList();
});

clearBtn.addEventListener("click", () => {
  qText.value = "";
  aText.value = "";
  qImage.value = "";
  aImage.value = "";
  pendingQImg = null;
  pendingAImg = null;
  qPreview.style.display = "none"; qPreviewEmpty.style.display = "block";
  aPreview.style.display = "none"; aPreviewEmpty.style.display = "block";
});

// ---------- Learn ----------
const nextBtn = el("nextBtn");
const solutionBtn = el("solutionBtn");
const clearAnswerBtn = el("clearAnswerBtn");
const learnStatus = el("learnStatus");

const learnQuestion = el("learnQuestion");
const learnAnswer = el("learnAnswer");
const learnQImg = el("learnQImg");
const learnAImg = el("learnAImg");
const learnQImgEmpty = el("learnQImgEmpty");
const learnAImgEmpty = el("learnAImgEmpty");

const userAnswer = el("userAnswer");
const compareBlock = el("compareBlock");
const compareUserText = el("compareUserText");
const compareUserInk = el("compareUserInk");
const compareUserInkEmpty = el("compareUserInkEmpty");

// Ink
const inkCanvas = el("inkCanvas");
const clearInkBtn = el("clearInkBtn");
const ctx = inkCanvas.getContext("2d");
let drawing = false;
let lastPoint = null;

function resizeInkToCSS() {
  const dpr = window.devicePixelRatio || 1;
  const rect = inkCanvas.getBoundingClientRect();
  inkCanvas.width = Math.floor(rect.width * dpr);
  inkCanvas.height = Math.floor(320 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
}
window.addEventListener("resize", resizeInkToCSS);

inkCanvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  inkCanvas.setPointerCapture(e.pointerId);
  lastPoint = getCanvasPoint(e);
});
inkCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = getCanvasPoint(e);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  lastPoint = p;
});
inkCanvas.addEventListener("pointerup", () => { drawing = false; lastPoint = null; });
inkCanvas.addEventListener("pointercancel", () => { drawing = false; lastPoint = null; });

function getCanvasPoint(e) {
  const rect = inkCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function clearInk() {
  ctx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
}
clearInkBtn.addEventListener("click", clearInk);

function resetLearnUI() {
  currentCard = null;
  showLatex(learnQuestion, "");
  showLatex(learnAnswer, "");
  setImg(learnQImg, learnQImgEmpty, null);
  setImg(learnAImg, learnAImgEmpty, null);
  userAnswer.value = "";
  clearInk();
  compareBlock.classList.add("hidden");
  showLatex(compareUserText, "");
  setImg(compareUserInk, compareUserInkEmpty, null);
  solutionBtn.disabled = true;
  clearAnswerBtn.disabled = true;
  learnStatus.textContent = "";
}

function nextCard() {
  if (cards.length === 0) {
    alert("Keine Karten vorhanden.");
    resetLearnUI();
    return;
  }
  currentIndex = (currentIndex + 1) % cards.length;
  currentCard = cards[currentIndex];

  learnStatus.textContent = `Karte ${currentIndex + 1}/${cards.length}`;

  showLatex(learnQuestion, currentCard.qText);
  setImg(learnQImg, learnQImgEmpty, currentCard.qImg);

  // Lösung erst beim Klick
  showLatex(learnAnswer, "");
  setImg(learnAImg, learnAImgEmpty, null);

  userAnswer.value = "";
  clearInk();

  compareBlock.classList.add("hidden");
  showLatex(compareUserText, "");
  setImg(compareUserInk, compareUserInkEmpty, null);

  solutionBtn.disabled = false;
  clearAnswerBtn.disabled = false;
}

function canvasHasInk() {
  const tmp = document.createElement("canvas");
  tmp.width = inkCanvas.width;
  tmp.height = inkCanvas.height;
  const tctx = tmp.getContext("2d");
  tctx.drawImage(inkCanvas, 0, 0);
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
  for (let i = 0; i < data.length; i += 2000) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a !== 0 && !(r > 245 && g > 245 && b > 245)) return true;
  }
  return false;
}

function showSolution() {
  if (!currentCard) return;

  compareBlock.classList.remove("hidden");

  const ua = userAnswer.value.trim();
  showLatex(compareUserText, ua ? ua : "(keine Text-Antwort)");

  if (canvasHasInk()) {
    setImg(compareUserInk, compareUserInkEmpty, inkCanvas.toDataURL("image/png"));
  } else {
    setImg(compareUserInk, compareUserInkEmpty, null);
  }

  showLatex(learnAnswer, currentCard.aText || "(keine Text-Lösung)");
  setImg(learnAImg, learnAImgEmpty, currentCard.aImg);
}

nextBtn.addEventListener("click", nextCard);
solutionBtn.addEventListener("click", showSolution);
clearAnswerBtn.addEventListener("click", () => { userAnswer.value = ""; clearInk(); });

// ---------- Manage (Löschen + Export/Import) ----------
const refreshManageBtn = el("refreshManageBtn");
const deleteSelectedBtn = el("deleteSelectedBtn");
const manageStatus = el("manageStatus");
const manageList = el("manageList");

const managePreviewHint = el("managePreviewHint");
const prevQText = el("prevQText");
const prevAText = el("prevAText");
const prevQImg = el("prevQImg");
const prevAImg = el("prevAImg");
const prevQImgEmpty = el("prevQImgEmpty");
const prevAImgEmpty = el("prevAImgEmpty");

// Export/Import DOM
const exportBtn = el("exportBtn");
const importFile = el("importFile");

function renderManageList() {
  manageList.innerHTML = "";
  manageStatus.textContent = `Karten: ${cards.length}`;
  selectedManageId = null;

  managePreviewHint.style.display = "block";
  showLatex(prevQText, "");
  showLatex(prevAText, "");
  setImg(prevQImg, prevQImgEmpty, null);
  setImg(prevAImg, prevAImgEmpty, null);

  if (cards.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Keine Karten vorhanden.";
    manageList.appendChild(empty);
    return;
  }

  cards.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "manageItem";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "selectedCard";
    radio.addEventListener("change", () => {
      selectedManageId = c.id;
      managePreviewHint.style.display = "none";
      showLatex(prevQText, c.qText || "(kein Fragetext)");
      showLatex(prevAText, c.aText || "(kein Lösungstext)");
      setImg(prevQImg, prevQImgEmpty, c.qImg);
      setImg(prevAImg, prevAImgEmpty, c.aImg);
    });

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `${idx + 1}) ${c.qImg ? "🖼️ " : ""}${shortText(c.qText) || "(Frage nur Bild)"}`;
    const sub = document.createElement("small");
    sub.textContent = `Lösung: ${c.aImg ? "🖼️ " : ""}${shortText(c.aText) || "(nur Bild)"}`;
    info.appendChild(title);
    info.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "actions";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "secondary";
    delBtn.textContent = "Löschen";
    delBtn.addEventListener("click", () => deleteCardById(c.id));
    actions.appendChild(delBtn);

    row.appendChild(radio);
    row.appendChild(info);
    row.appendChild(actions);

    manageList.appendChild(row);
  });
}

function deleteCardById(id) {
  const card = cards.find(x => x.id === id);
  if (!card) return;

  const msg = `Karte wirklich löschen?\n\nFrage: ${shortText(card.qText) || "(nur Bild)"}\nLösung: ${shortText(card.aText) || "(nur Bild)"}`;
  if (!confirm(msg)) return;

  cards = cards.filter(c => c.id !== id);
  persist();

  if (currentCard && currentCard.id === id) {
    currentCard = null;
    currentIndex = -1;
    resetLearnUI();
  }

  updateCount();
  renderManageList();
}

refreshManageBtn.addEventListener("click", renderManageList);

deleteSelectedBtn.addEventListener("click", () => {
  if (!selectedManageId) {
    alert("Bitte zuerst links eine Karte auswählen.");
    return;
  }
  deleteCardById(selectedManageId);
});

// ---------- Export ----------
exportBtn.addEventListener("click", () => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: cards
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "lernkarten-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

// ---------- Import ----------
importFile.addEventListener("change", async () => {
  const file = importFile.files && importFile.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const imported = Array.isArray(data) ? data : data.cards; // erlaubt auch: nur Liste
    if (!Array.isArray(imported)) throw new Error("Ungültiges Format.");

    // Merge ohne Duplikate (über id)
    const existingIds = new Set(cards.map(c => c.id));
    let added = 0;

    for (const c of imported) {
      if (!c || typeof c !== "object") continue;

      const normalized = {
        id: c.id || makeId(),
        qText: c.qText || "",
        aText: c.aText || "",
        qImg: c.qImg || null,
        aImg: c.aImg || null
      };

      if (!existingIds.has(normalized.id)) {
        cards.push(normalized);
        existingIds.add(normalized.id);
        added++;
      }
    }

    persist();
    updateCount();
    renderManageList();

    alert(`Import fertig. Hinzugefügt: ${added}`);
  } catch (e) {
    alert("Import fehlgeschlagen: " + e.message);
  } finally {
    // wichtig, damit man die gleiche Datei erneut auswählen kann
    importFile.value = "";
  }
});

// ---------- Init ----------
updateCount();
resetLearnUI();
setTab("create");
setTimeout(resizeInkToCSS, 0);
