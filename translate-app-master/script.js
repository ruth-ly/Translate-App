const sourceText = document.getElementById("sourceText");
const translatedText = document.getElementById("translatedText");
const charCount = document.getElementById("charCount");
const translateBtn = document.getElementById("translateBtn");
const swapBtn = document.getElementById("swapBtn");
const statusMessage = document.getElementById("statusMessage");
const revealItems = document.querySelectorAll(".reveal");
const translatorShell = document.querySelector(".translator-shell");
const loadingState = document.getElementById("loadingState");
const cards = document.querySelectorAll(".card");

const phrases = {
  en: {
    fr: {
      "Hello, how are you?": "Bonjour, comment allez-vous ?"
    },
    es: {
      "Hello, how are you?": "Hola, como estas?"
    },
    de: {
      "Hello, how are you?": "Hallo, wie geht es dir?"
    },
    it: {
      "Hello, how are you?": "Ciao, come stai?"
    },
    pt: {
      "Hello, how are you?": "Ola, como voce esta?"
    },
    hi: {
      "Hello, how are you?": "Namaste, aap kaise hain?"
    },
    ja: {
      "Hello, how are you?": "Konnichiwa, ogenki desu ka?"
    }
  },
  fr: {
    en: {
      "Bonjour, comment allez-vous ?": "Hello, how are you?"
    },
    es: {
      "Bonjour, comment allez-vous ?": "Hola, como estas?"
    },
    de: {
      "Bonjour, comment allez-vous ?": "Hallo, wie geht es dir?"
    },
    it: {
      "Bonjour, comment allez-vous ?": "Ciao, come stai?"
    }
  },
  es: {
    en: {
      "Hola, como estas?": "Hello, how are you?"
    },
    fr: {
      "Hola, como estas?": "Bonjour, comment allez-vous ?"
    }
  },
  de: {
    en: {
      "Hallo, wie geht es dir?": "Hello, how are you?"
    }
  },
  it: {
    en: {
      "Ciao, come stai?": "Hello, how are you?"
    }
  },
  pt: {
    en: {
      "Ola, como voce esta?": "Hello, how are you?"
    }
  },
  hi: {
    en: {
      "Namaste, aap kaise hain?": "Hello, how are you?"
    }
  },
  ja: {
    en: {
      "Konnichiwa, ogenki desu ka?": "Hello, how are you?"
    }
  }
};

const hinglishToHindiMap = {
  "aap kaise ho": "आप कैसे हो",
  "aap kaise hain": "आप कैसे हैं",
  "tum kaise ho": "तुम कैसे हो",
  "main theek hoon": "मैं ठीक हूँ",
  "mera naam": "मेरा नाम",
  "namaste": "नमस्ते",
  "shukriya": "शुक्रिया",
  "dhanyavaad": "धन्यवाद",
  "mujhe hindi pasand hai": "मुझे हिंदी पसंद है",
  "hello, how are you?": "नमस्ते, आप कैसे हैं?"
};

function getActiveButton(group) {
  return document.querySelector(`[data-group="${group}"] .lang-btn.active`);
}

function getActiveLanguage(group) {
  return getActiveButton(group)?.dataset.lang;
}

function getActiveCode(group) {
  return getActiveButton(group)?.dataset.code;
}

function setActiveLanguage(group, code) {
  document.querySelectorAll(`[data-group="${group}"] .lang-btn`).forEach((button) => {
    button.classList.toggle("active", button.dataset.code === code);
  });
}

function updateCharCount() {
  charCount.textContent = `${sourceText.value.length}/500`;
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";
  if (type) {
    statusMessage.classList.add(type);
  }
}

function fallbackTranslate(text, sourceCode, targetCode) {
  if (sourceCode === targetCode) {
    return text;
  }

  const cleanText = text.trim();
  const mapped = phrases[sourceCode]?.[targetCode]?.[cleanText];
  if (mapped) {
    return mapped;
  }

  const targetName = getActiveLanguage("target");
  return `[${targetName}] ${cleanText || "Type something to translate."}`;
}

function normalizeText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function looksLikeRomanizedHindi(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  const hindiHints = [
    "hai",
    "ho",
    "kaise",
    "mera",
    "meri",
    "mujhe",
    "tum",
    "aap",
    "naam",
    "kya",
    "kyun",
    "nahi",
    "haan",
    "achha",
    "accha",
    "theek",
    "namaste"
  ];

  return hindiHints.some((word) => normalized.includes(word));
}

function preprocessHindiInput(text, sourceCode, targetCode) {
  const normalized = normalizeText(text);

  if (sourceCode === "hi" && hinglishToHindiMap[normalized]) {
    return {
      text: hinglishToHindiMap[normalized],
      notice: "Hinglish detected. Converted to Hindi script first."
    };
  }

  if (targetCode === "hi" && looksLikeRomanizedHindi(text)) {
    return {
      text,
      notice: "Hinglish input detected. Translation may stay partly romanized."
    };
  }

  return {
    text,
    notice: ""
  };
}

async function translateWithApi(text, sourceCode, targetCode) {
  const encodedText = encodeURIComponent(text.trim());
  const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceCode}|${targetCode}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not OK.");
  }

  const data = await response.json();
  const translated = data?.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error("Translation not found.");
  }

  return translated;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runTranslate() {
  const text = sourceText.value.trim();
  const sourceCode = getActiveCode("source");
  const targetCode = getActiveCode("target");

  if (!text) {
    translatedText.textContent = "";
    setStatus("Type something first so we have text to translate.", "is-warning");
    return;
  }

  if (sourceCode === targetCode) {
    translatedText.textContent = text;
    setStatus("Source and target languages are the same.", "is-warning");
    return;
  }

  const prepared = preprocessHindiInput(text, sourceCode, targetCode);

  translateBtn.disabled = true;
  loadingState.classList.add("is-visible");
  translatedText.style.opacity = "0.08";
  setStatus(prepared.notice || "Translating with API...");

  try {
    const [translated] = await Promise.all([
      translateWithApi(prepared.text, sourceCode, targetCode),
      delay(1200)
    ]);
    translatedText.textContent = translated;
    setStatus(prepared.notice || "Translation loaded from the API.", "is-success");
  } catch (error) {
    await delay(1200);
    translatedText.textContent = fallbackTranslate(prepared.text, sourceCode, targetCode);
    setStatus(
      prepared.notice || "API was unavailable, so the app used the built-in fallback.",
      "is-warning"
    );
  } finally {
    loadingState.classList.remove("is-visible");
    translatedText.style.opacity = "1";
    translateBtn.disabled = false;
  }
}

document.querySelectorAll(".toolbar").forEach((toolbar) => {
  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest(".lang-btn");
    if (!button) {
      return;
    }

    toolbar.querySelectorAll(".lang-btn").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");
    runTranslate();
  });
});

sourceText.addEventListener("input", () => {
  updateCharCount();
  setStatus("Ready to translate.");
});

translateBtn.addEventListener("click", runTranslate);

swapBtn.addEventListener("click", () => {
  const currentSourceCode = getActiveCode("source");
  const currentTargetCode = getActiveCode("target");
  const previousSourceText = sourceText.value;

  setActiveLanguage("source", currentTargetCode);
  setActiveLanguage("target", currentSourceCode);
  sourceText.value = translatedText.textContent.trim();
  translatedText.textContent = previousSourceText;
  updateCharCount();
  setStatus("Languages swapped.");
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard.", "is-success");
  } catch (error) {
    setStatus("Clipboard access was blocked in this browser.", "is-warning");
  }
}

document.getElementById("copySource").addEventListener("click", () => {
  copyText(sourceText.value);
});

document.getElementById("copyTarget").addEventListener("click", () => {
  copyText(translatedText.textContent.trim());
});

function speak(text, langCode) {
  if (!("speechSynthesis" in window)) {
    setStatus("Text-to-speech is not supported in this browser.", "is-warning");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voiceMap = {
    en: "en-US",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    hi: "hi-IN",
    ja: "ja-JP"
  };
  utterance.lang = voiceMap[langCode] || "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setStatus("Playing audio.");
}

document.getElementById("listenSource").addEventListener("click", () => {
  speak(sourceText.value, getActiveCode("source"));
});

document.getElementById("listenTarget").addEventListener("click", () => {
  speak(translatedText.textContent.trim(), getActiveCode("target"));
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.2
  }
);

revealItems.forEach((item) => {
  revealObserver.observe(item);
});

function updateSceneOnScroll() {
  document.body.dataset.scene = "translator";
}

function updateAmbientMotion() {
  const scrollOffset = window.scrollY * 0.08;
  document.body.style.backgroundPosition = `center ${-scrollOffset}px, center ${-scrollOffset}px, center top`;
}

window.addEventListener("scroll", updateAmbientMotion, { passive: true });

window.addEventListener("mousemove", (event) => {
  if (!translatorShell) {
    return;
  }

  const x = (event.clientX / window.innerWidth - 0.5) * 10;
  const y = (event.clientY / window.innerHeight - 0.5) * 10;
  translatorShell.style.transform = `translate3d(${x * 0.22}px, ${y * 0.22}px, 0) rotateX(${y * -0.12}deg)`;
  cards.forEach((card, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    card.style.transform = `translate3d(${x * 0.18 * direction}px, ${y * 0.12}px, ${8 + index * 4}px) rotateY(${x * 0.2 * direction}deg) rotateX(${y * -0.15}deg)`;
  });
});

updateCharCount();
setStatus("Ready to translate.");
updateSceneOnScroll();
updateAmbientMotion();
runTranslate();
