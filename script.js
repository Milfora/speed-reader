const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const speedSelect = document.getElementById("speedSelect");
const themeSelect = document.getElementById("themeSelect");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const displayWord = document.getElementById("displayWord");
const displayMeta = document.getElementById("displayMeta");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

window.pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let words = [];
let currentIndex = 0;
let timerId = null;
let isPaused = true;

const updateControls = () => {
  startBtn.disabled = words.length === 0;
  pauseBtn.disabled = words.length === 0 || isPaused;
  resetBtn.disabled = words.length === 0;
};

const updateProgress = () => {
  const total = words.length;
  const completed = Math.min(currentIndex, total);
  const progress = total === 0 ? 0 : (completed / total) * 100;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${completed} / ${total} words`;
};

const updateDisplay = () => {
  if (words.length === 0) {
    displayWord.textContent = "Ready";
    displayMeta.textContent = "Upload a file or paste text below.";
    updateProgress();
    return;
  }

  if (currentIndex >= words.length) {
    displayWord.textContent = "Done";
    displayMeta.textContent = "You reached the end of the text.";
    stopReading();
    updateProgress();
    return;
  }

  displayWord.textContent = words[currentIndex];
  displayMeta.textContent = `Word ${currentIndex + 1} of ${words.length}`;
  updateProgress();
};

const sanitizeText = (text) =>
  text
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim();

const loadWords = (text) => {
  const sanitized = sanitizeText(text);
  words = sanitized.length ? sanitized.split(" ") : [];
  currentIndex = 0;
  isPaused = true;
  clearInterval(timerId);
  timerId = null;
  updateControls();
  updateDisplay();
};

const setStatusMessage = (message) => {
  displayMeta.textContent = message;
};

const startReading = () => {
  if (words.length === 0) {
    return;
  }

  const wpm = Number(speedSelect.value);
  const interval = 60000 / wpm;

  if (timerId) {
    clearInterval(timerId);
  }

  isPaused = false;
  updateControls();

  timerId = setInterval(() => {
    if (currentIndex >= words.length) {
      updateDisplay();
      return;
    }

    updateDisplay();
    currentIndex += 1;
  }, interval);
};

const stopReading = () => {
  isPaused = true;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  updateControls();
};

const resetReading = () => {
  stopReading();
  currentIndex = 0;
  updateDisplay();
};

const handleFile = async (file) => {
  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  setStatusMessage("Loading file...");

  try {
    if (extension === "txt") {
      const text = await file.text();
      loadWords(text);
    } else if (extension === "pdf") {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await window.pdfjsLib.getDocument({ data }).promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        fullText += `${pageText} `;
      }
      loadWords(fullText);
    } else if (extension === "docx") {
      const result = await window.mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      loadWords(result.value);
    } else {
      loadWords("");
      setStatusMessage("Unsupported file type. Use .txt, .docx, or .pdf.");
    }
  } catch (error) {
    loadWords("");
    setStatusMessage("Unable to read that file. Try another one.");
  }
};

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

textInput.addEventListener("input", (event) => {
  loadWords(event.target.value);
});

speedSelect.addEventListener("change", () => {
  if (!isPaused) {
    startReading();
  }
});

themeSelect.addEventListener("change", (event) => {
  document.body.classList.remove("theme-midnight", "theme-sunset");
  const theme = event.target.value;
  if (theme === "midnight") {
    document.body.classList.add("theme-midnight");
  } else if (theme === "sunset") {
    document.body.classList.add("theme-sunset");
  }
});

startBtn.addEventListener("click", () => {
  if (words.length === 0) {
    loadWords(textInput.value);
  }
  startReading();
});

pauseBtn.addEventListener("click", () => {
  stopReading();
  displayMeta.textContent = "Paused";
});

resetBtn.addEventListener("click", () => {
  resetReading();
});

updateControls();
updateDisplay();
