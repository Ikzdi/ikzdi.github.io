const TOTAL_QUESTIONS = 10;
const MAX_ATTEMPTS = 2;
const DEFAULT_ZOOM_LEVELS = [2.05, 1.35];

const state = {
  questions: [],
  currentIndex: 0,
  attempts: 0,
  score: 0,
  locked: false
};

const elements = {
  startScreen: document.querySelector("#start-screen"),
  gameScreen: document.querySelector("#game-screen"),
  resultScreen: document.querySelector("#result-screen"),
  startButton: document.querySelector("#start-button"),
  progressText: document.querySelector("#progress-text"),
  scoreText: document.querySelector("#score-text"),
  portraitImage: document.querySelector("#portrait-image"),
  revealBadge: document.querySelector("#reveal-badge"),
  attemptText: document.querySelector("#attempt-text"),
  categoryText: document.querySelector("#category-text"),
  choicesGrid: document.querySelector("#choices-grid"),
  feedbackText: document.querySelector("#feedback-text"),
  nextButton: document.querySelector("#next-button"),
  finalScore: document.querySelector("#final-score"),
  resultLabel: document.querySelector("#result-label"),
  shareText: document.querySelector("#share-text"),
  nativeShareButton: document.querySelector("#native-share-button"),
  facebookShareButton: document.querySelector("#facebook-share-button"),
  whatsappShareButton: document.querySelector("#whatsapp-share-button"),
  instagramCopyButton: document.querySelector("#instagram-copy-button"),
  copyFeedback: document.querySelector("#copy-feedback"),
  restartButton: document.querySelector("#restart-button")
};

elements.startButton.addEventListener("click", startGame);
elements.nextButton.addEventListener("click", goToNextQuestion);
elements.restartButton.addEventListener("click", startGame);
elements.nativeShareButton.addEventListener("click", shareNative);
elements.facebookShareButton.addEventListener("click", shareFacebook);
elements.whatsappShareButton.addEventListener("click", shareWhatsApp);
elements.instagramCopyButton.addEventListener("click", copyInstagramText);
window.addEventListener("resize", handleResize);

function startGame() {
  state.questions = selectQuestions(window.PERSONAS || [], TOTAL_QUESTIONS);
  state.currentIndex = 0;
  state.attempts = 0;
  state.score = 0;
  state.locked = false;

  showScreen("game");
  renderQuestion();
}

function renderQuestion() {
  const persona = getCurrentPersona();
  state.attempts = 0;
  state.locked = false;

  elements.progressText.textContent = `Jautājums ${state.currentIndex + 1}/${state.questions.length}`;
  elements.scoreText.textContent = `${state.score}/${state.questions.length}`;
  elements.categoryText.textContent = persona.category;
  elements.portraitImage.src = persona.image;
  elements.portraitImage.alt = `Paslēpts portrets kategorijā: ${persona.category}`;
  elements.portraitImage.classList.remove("revealed");
  elements.portraitImage.style.setProperty("--zoom", DEFAULT_ZOOM_LEVELS[0]);
  elements.portraitImage.style.setProperty("--focus-x", persona.focus?.x || "50%");
  elements.portraitImage.style.setProperty("--focus-y", persona.focus?.y || "40%");
  elements.revealBadge.classList.add("hidden");
  elements.nextButton.classList.add("hidden");

  renderChoices(persona);
  applyAutoZoomWhenReady();
  setFeedback("Portrets ir nedaudz pietuvināts. Izvēlies vienu no variantiem.");
  updateAttemptText();
}

function renderChoices(persona) {
  const distractors = shuffle((window.PERSONAS || []).filter((item) => item.id !== persona.id)).slice(0, 2);
  const choices = shuffle([persona, ...distractors]);

  elements.choicesGrid.innerHTML = "";
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = choice.displayName;
    button.dataset.choiceId = choice.id;
    button.addEventListener("click", () => handleChoice(choice, button));
    elements.choicesGrid.appendChild(button);
  });
}

function handleChoice(choice, button) {
  if (state.locked) {
    return;
  }

  const persona = getCurrentPersona();
  state.attempts += 1;

  if (choice.id === persona.id) {
    state.score += 1;
    elements.scoreText.textContent = `${state.score}/${state.questions.length}`;
    revealAnswer(`Pareizi! Tas ir ${persona.displayName}.`, "good");
    return;
  }

  button.disabled = true;
  button.classList.add("wrong");

  if (state.attempts >= MAX_ATTEMPTS) {
    revealAnswer(`Šoreiz nē. Pareizā atbilde: ${persona.displayName}.`, "bad");
    return;
  }

  const remaining = MAX_ATTEMPTS - state.attempts;
  const zoomLevels = getCurrentZoomLevels();
  elements.portraitImage.style.setProperty("--zoom", zoomLevels[state.attempts] || 1.15);
  setFeedback(`Vēl nav. Portrets kļuva skaidrāks. Atlikuši varianti: ${remaining}.`, "bad");
  updateAttemptText();
}

function revealAnswer(message, tone) {
  state.locked = true;
  elements.portraitImage.classList.add("revealed");
  elements.portraitImage.style.setProperty("--zoom", 1);
  elements.revealBadge.classList.remove("hidden");
  markChoiceButtons();
  elements.nextButton.classList.remove("hidden");
  elements.nextButton.textContent = state.currentIndex === state.questions.length - 1 ? "Skatīt rezultātu" : "Nākamais";
  setFeedback(message, tone);
  updateAttemptText();
}

function markChoiceButtons() {
  const persona = getCurrentPersona();
  elements.choicesGrid.querySelectorAll(".choice-button").forEach((button) => {
    button.disabled = true;
    if (button.dataset.choiceId === persona.id) {
      button.classList.add("correct");
    }
  });
}

function goToNextQuestion() {
  state.currentIndex += 1;

  if (state.currentIndex >= state.questions.length) {
    renderResults();
    return;
  }

  renderQuestion();
}

function renderResults() {
  const shareMessage = getShareMessage();

  elements.finalScore.textContent = `${state.score}/${state.questions.length}`;
  elements.resultLabel.textContent = getResultLabel(state.score, state.questions.length);
  elements.shareText.textContent = shareMessage;
  elements.copyFeedback.textContent = "";
  elements.nativeShareButton.hidden = !navigator.share;

  showScreen("result");
}

function getResultLabel(score, total) {
  const ratio = score / total;

  if (ratio >= 0.9) return "Tu esi Latvijas eksperts";
  if (ratio >= 0.7) return "Tu tiešām seko līdzi";
  if (ratio >= 0.4) return "Nav slikti, bet draugi var izaicināt";
  return "Tu dzīvo zem akmens";
}

function getShareMessage() {
  return `Es uzminēju ${state.score}/${state.questions.length} Latvijas slavenības. Vari labāk?`;
}

function getShareUrl() {
  return window.location.href || "index.html";
}

async function shareNative() {
  const text = getShareMessage();
  const url = getShareUrl();

  if (!navigator.share) {
    await copyText(`${text} ${url}`);
    setCopyFeedback("Share nav pieejams šajā pārlūkā, tāpēc teksts ir nokopēts.");
    return;
  }

  try {
    await navigator.share({
      title: "Atmini populārākos cilvēkus Latvijā",
      text,
      url
    });
  } catch (error) {
    setCopyFeedback("Dalīšanās tika atcelta.");
  }
}

function shareFacebook() {
  const shareUrl = encodeURIComponent(getShareUrl());
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "_blank", "noopener,noreferrer");
}

function shareWhatsApp() {
  const text = encodeURIComponent(`${getShareMessage()} ${getShareUrl()}`);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

async function copyInstagramText() {
  await copyText(`${getShareMessage()} ${getShareUrl()}`);
  setCopyFeedback("Teksts nokopēts. Ielīmē to Instagram Story vai DM un pievieno saiti.");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = text;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand("copy");
  document.body.removeChild(temporaryInput);
}

function setCopyFeedback(message) {
  elements.copyFeedback.textContent = message;
}

function updateAttemptText() {
  const currentAttempt = Math.min(state.attempts + 1, MAX_ATTEMPTS);
  elements.attemptText.textContent = state.locked
    ? `Mēģinājumi izmantoti: ${state.attempts} no ${MAX_ATTEMPTS}`
    : `Mēģinājums ${currentAttempt} no ${MAX_ATTEMPTS}`;
}

function setFeedback(message, tone = "") {
  elements.feedbackText.textContent = message;
  elements.feedbackText.className = tone ? `feedback ${tone}` : "feedback";
}

function getCurrentPersona() {
  return state.questions[state.currentIndex];
}

function applyAutoZoomWhenReady() {
  if (elements.portraitImage.complete && elements.portraitImage.naturalWidth) {
    applyAutoZoom();
    return;
  }

  elements.portraitImage.addEventListener("load", applyAutoZoom, { once: true });
}

function applyAutoZoom() {
  const zoomLevels = calculateZoomLevels();
  elements.portraitImage.dataset.zoomStart = String(zoomLevels[0]);
  elements.portraitImage.dataset.zoomSecond = String(zoomLevels[1]);

  if (!state.locked && state.attempts === 0) {
    elements.portraitImage.style.setProperty("--zoom", zoomLevels[0]);
  }
}

function getCurrentZoomLevels() {
  return [
    Number(elements.portraitImage.dataset.zoomStart) || DEFAULT_ZOOM_LEVELS[0],
    Number(elements.portraitImage.dataset.zoomSecond) || DEFAULT_ZOOM_LEVELS[1]
  ];
}

function calculateZoomLevels() {
  const imageWidth = elements.portraitImage.naturalWidth;
  const imageHeight = elements.portraitImage.naturalHeight;
  const frame = elements.portraitImage.parentElement.getBoundingClientRect();

  if (!imageWidth || !imageHeight || !frame.width || !frame.height) {
    return DEFAULT_ZOOM_LEVELS;
  }

  const coverScale = Math.max(frame.width / imageWidth, frame.height / imageHeight);
  const visibleWidthAtFullFrame = frame.width / (coverScale * imageWidth);
  const visibleHeightAtFullFrame = frame.height / (coverScale * imageHeight);
  const smallestVisibleSide = Math.min(visibleWidthAtFullFrame, visibleHeightAtFullFrame);

  const minimumVisibleSide = 0.36;
  const maxUsefulZoom = clamp(smallestVisibleSide / minimumVisibleSide, 1.25, 2.25);
  const firstZoom = Math.min(DEFAULT_ZOOM_LEVELS[0], maxUsefulZoom);
  const secondZoom = clamp((firstZoom + 1) / 2, 1.12, Math.max(1.12, firstZoom - 0.2));

  return [roundZoom(firstZoom), roundZoom(secondZoom)];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundZoom(value) {
  return Math.round(value * 100) / 100;
}

function handleResize() {
  if (elements.gameScreen.classList.contains("hidden") || state.locked) {
    return;
  }

  const zoomLevels = calculateZoomLevels();
  elements.portraitImage.dataset.zoomStart = String(zoomLevels[0]);
  elements.portraitImage.dataset.zoomSecond = String(zoomLevels[1]);
  elements.portraitImage.style.setProperty("--zoom", zoomLevels[Math.min(state.attempts, 1)]);
}

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }

  return copy;
}

function selectQuestions(personas, total) {
  const categoryTargets = [
    { category: "Sports", count: 4 },
    { category: "Mūzika", count: 2 },
    { category: "Politika", count: 2 },
    { category: "Kino un TV", count: 1 }
  ];
  const selected = [];
  const used = new Set();

  categoryTargets.forEach(({ category, count }) => {
    const categoryPool = shuffle(personas.filter((persona) => persona.category === category));
    categoryPool.slice(0, count).forEach((persona) => {
      selected.push(persona);
      used.add(persona.id);
    });
  });

  const remainingPool = shuffle(personas.filter((persona) => !used.has(persona.id)));
  const remainingCount = total - selected.length;

  return shuffle([...selected, ...remainingPool.slice(0, remainingCount)]).slice(0, total);
}

function showScreen(screen) {
  elements.startScreen.classList.toggle("hidden", screen !== "start");
  elements.gameScreen.classList.toggle("hidden", screen !== "game");
  elements.resultScreen.classList.toggle("hidden", screen !== "result");
}
