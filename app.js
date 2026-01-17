let cards = JSON.parse(localStorage.getItem("cards") || "[]");
let index = -1;

function saveCard() {
  const qText = qTextEl().value.trim();
  const aText = aTextEl().value.trim();
  const qImg = qImageEl().files[0];
  const aImg = aImageEl().files[0];

  if (!qText && !qImg) {
    alert("Die Frage braucht Text oder ein Bild.");
    return;
  }
  if (!aText && !aImg) {
    alert("Die Lösung braucht Text oder ein Bild.");
    return;
  }

  const card = {
    qText,
    aText,
    qImg: qImg ? URL.createObjectURL(qImg) : null,
    aImg: aImg ? URL.createObjectURL(aImg) : null
  };

  cards.push(card);
  localStorage.setItem("cards", JSON.stringify(cards));
  alert("Karte gespeichert!");
}

function nextCard() {
  if (cards.length === 0) {
    alert("Keine Karten vorhanden.");
    return;
  }

  index = (index + 1) % cards.length;
  const c = cards[index];

  showLatex("learnQuestion", c.qText);
  showLatex("learnAnswer", c.aText);

  setImg("learnQImg", c.qImg);
  setImg("learnAImg", c.aImg);
}

function showLatex(id, text) {
  const el = document.getElementById(id);
  el.innerHTML = text || "";
  MathJax.typesetPromise([el]);
}

function setImg(id, src) {
  const img = document.getElementById(id);
  if (src) {
    img.src = src;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
}

const qTextEl = () => document.getElementById("qText");
const aTextEl = () => document.getElementById("aText");
const qImageEl = () => document.getElementById("qImage");
const aImageEl = () => document.getElementById("aImage");
