// ---------- Storage ----------
// Wir speichern Bilder als DataURL (Base64), damit sie nach Reload/Offline noch da sind.
let cards = JSON.parse(localStorage.getItem("cards") || "[]");
let currentIndex = -1;
let currentCard = null;

// ---------- DOM ----------
const el = (id) => document.getElementById(id);

// Tabs
const tabCreateBtn = el("tabCreateBtn");
const tabLearnBtn = el("tabLearnBtn");
const tabCreate = el("tabCreate");
const tabLearn = el("tabLearn");

function setTab(which) {
  const isCreate = which === "create";
  tabCreateBtn.classList.toggle("active", isCreate);
  tabLearnBtn.classList.toggle("active", !isCreate);
  tabCreate.classList.toggle("active", isCreate);
  tabLearn.classList.toggle("active", !isCreate);
}
tabCreateBtn.addEventListener("click", () => setTab("create"));
tabLearnBtn.addEventListener("click", () => setTab("learn"));

// Create
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
const countLabel = el("countLabel");

// Learn
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
  // Canvas hat feste Pixel; CSS skaliert. Für schärfere Linien kann man devicePixelRatio nutzen.
  const dpr = window.devicePixelRatio || 1;
  const rect = inkCanvas.getBoundingClientRect();
  inkCanvas.width = Math.floor(rect.width * dpr);
  inkCanvas.height = Math.floor(320 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
}
window.addEventListener("resize", resizeInkToCSS);

// Pointer Events: Apple Pencil / Touch / Maus
inkCanvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  inkCanvas.setPointerCapture(e.pointerId);
  lastPoint = getCanvasPoint(e);
});
inkCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = getCanvasPoint(e);
  drawLine(lastPoint, p);
  lastPoint = p;
});
inkCanvas.addEventListener("pointerup", () => {
  drawing = false;
  lastPoint = null;
});
inkCanvas.addEventListener("pointercancel", () => {
  drawing = false;
  lastPoint = null;
});

function getCanvasPoint(e) {
  const rect = inkCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function drawLine(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function clearInk() {
  ctx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
}
clearInkBtn.addEventListener("click", clearInk);

// ---------- Helpers ----------
function updateCount() {
  countLabel.textContent = `Gespeicherte Karten: ${cards.length}`;
}

function showLatex(node, text) {
  node.innerHTML = text || "";
  if (window.MathJax) {
    MathJax.typesetPromise([node]);
  }
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

// ---------- Create flow ----------
async function updatePreviewFromInput(fileInput, previewImgEl, emptyEl) {
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

let pendingQImg = null;
let pendingAImg = null;

qImage.addEventListener("change", async () => {
  pendingQImg = await updatePreviewFromInput(qImage, qPreview, qPreviewEmpty);
});

aImage.addEventListener("change", async () => {
  pendingAImg = await updatePreviewFromInput(aImage, aPreview, aPreviewEmpty);
});

saveBtn.addEventListener("click", async () => {
  const qT = qText.value.trim();
  const aT = aText.value.trim();

  // falls User Datei gewählt hat, aber pending noch null (z.B. sehr schnell geklickt)
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

  const card = {
    id: crypto.randomUUID(),
    qText: qT,
    aText: aT,
    qImg: pendingQImg, // DataURL oder null
    aImg: pendingAImg
  };

  cards.push(card);
  localStorage.setItem("cards", JSON.stringify(cards));

  // reset
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

// ---------- Learn flow ----------
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

  // Frage anzeigen
  showLatex(learnQuestion, currentCard.qText);
  setImg(learnQImg, learnQImgEmpty, currentCard.qImg);

  // Lösung noch NICHT anzeigen
  showLatex(learnAnswer, "");
  setImg(learnAImg, learnAImgEmpty, null);

  // Antwortfelder aktiv
  userAnswer.value = "";
  clearInk();

  compareBlock.classList.add("hidden");
  showLatex(compareUserText, "");
  setImg(compareUserInk, compareUserInkEmpty, null);

  solutionBtn.disabled = false;
  clearAnswerBtn.disabled = false;
}

function showSolution() {
  if (!currentCard) return;

  // Vergleich sichtbar
  compareBlock.classList.remove("hidden");

  // Deine Antwort (Text)
  const ua = userAnswer.value.trim();
  showLatex(compareUserText, ua ? ua : "(keine Text-Antwort)");

  // Deine Antwort (Handschrift als Bild)
  const inkDataUrl = inkCanvas.toDataURL("image/png");
  // Wenn Canvas leer ist, ist DataURL trotzdem vorhanden. Wir prüfen grob: leeres Canvas -> keine Linien.
  // Einfacher Hack: wir merken uns nicht, ob gemalt wurde. Daher: wenn user nichts gemalt hat, bleibt's leer.
  // => Wir prüfen Pixel: sehr schnell/robust genug.
  if (canvasHasInk()) {
    setImg(compareUserInk, compareUserInkEmpty, inkDataUrl);
  } else {
    setImg(compareUserInk, compareUserInkEmpty, null);
  }

  // Lösung (Text + Bild)
  showLatex(learnAnswer, currentCard.aText || "(keine Text-Lösung)");
  setImg(learnAImg, learnAImgEmpty, currentCard.aImg);
}

function canvasHasInk() {
  // Prüft wenige Pixel: wenn irgendein Pixel nicht transparent/weiß ist -> "Ink vorhanden"
  // (Wir haben weißen Hintergrund, Striche sind default schwarz.)
  const tmp = document.createElement("canvas");
  tmp.width = inkCanvas.width;
  tmp.height = inkCanvas.height;
  const tctx = tmp.getContext("2d");
  tctx.drawImage(inkCanvas, 0, 0);
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data;

  // Stichprobe: jede ~2000. Byte prüfen
  for (let i = 0; i < data.length; i += 2000) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    // wenn Pixel nicht transparent und nicht weiß -> Ink
    if (a !== 0 && !(r > 245 && g > 245 && b > 245)) return true;
  }
  return false;
}

nextBtn.addEventListener("click", nextCard);
solutionBtn.addEventListener("click", showSolution);
clearAnswerBtn.addEventListener("click", () => {
  userAnswer.value = "";
  clearInk();
});

// ---------- Init ----------
updateCount();
resetLearnUI();
setTab("create");
setTimeout(() => {
  resizeInkToCSS();
}, 0);
