class VoiceTranslator {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isRecording = false;
    this.recordingTimeout = null;
    this.permissionGranted = false;
    this.lastInterimTranscript = "";
    this.cachedVoices = new Map();
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    this.initializeElements();
    this.checkPermissions();
    this.initializeSpeechRecognition();
    this.bindEvents();
    this.preloadVoices();

    // Mobile-specific initial message
    if (this.isMobile) {
      this.updateStatus("Tap the microphone to start translating", "info");
    } else {
      this.updateStatus("Ready to translate", "info");
    }
  }

  initializeElements() {
    this.sourceLanguage = document.getElementById("sourceLanguage");
    this.targetLanguage = document.getElementById("targetLanguage");
    this.sourceText = document.getElementById("sourceText");
    this.targetText = document.getElementById("targetText");
    this.voiceInputBtn = document.getElementById("voiceInputBtn");
    this.recordingIndicator = document.getElementById("recordingIndicator");
    this.speakOutput = document.getElementById("speakOutput");
    this.clearSource = document.getElementById("clearSource");
    this.swapLanguages = document.getElementById("swapLanguages");
    this.statusMessage = document.getElementById("statusMessage");
  }

  async checkPermissions() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({
          name: "microphone",
        });
        this.permissionGranted = permission.state === "granted";

        permission.onchange = () => {
          this.permissionGranted = permission.state === "granted";
          this.updateStatus(
            this.permissionGranted
              ? "Microphone permission granted"
              : "Microphone permission required",
            this.permissionGranted ? "success" : "error"
          );
        };
      }
    } catch (error) {
      // Permission API not supported, will request on use
    }
  }

  initializeSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Mobile-optimized configuration
      if (this.isMobile) {
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        // Shorter timeout for mobile to make it more responsive
        this.recognition.maxAlternatives = 1;
      } else {
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
      }

      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.voiceInputBtn.classList.add("recording");
        this.recordingIndicator.classList.add("active");
        this.updateStatus("Listening... Speak now!", "info");
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results on mobile for better feedback
        if (interimTranscript && this.isMobile) {
          this.sourceText.value = interimTranscript;
          this.lastInterimTranscript = interimTranscript;
        }

        if (finalTranscript) {
          this.sourceText.value = finalTranscript;
          this.lastInterimTranscript = finalTranscript;
          this.updateStatus("Speech captured successfully", "success");

          // Auto-translate and speak on mobile
          if (this.isMobile) {
            setTimeout(() => {
              this.updateStatus("Translating...", "info");
              this.translateAndSpeak();
            }, 200); // Reduced delay for mobile
          } else {
            setTimeout(() => {
              this.updateStatus("Translating...", "info");
              this.translateAndSpeak();
            }, 300);
          }
        }
      };

      this.recognition.onerror = (event) => {
        this.stopRecording();

        let errorMessage = "Speech recognition error";

        switch (event.error) {
          case "not-allowed":
            errorMessage =
              "Microphone access denied. Please allow microphone permissions in your browser settings.";
            break;
          case "no-speech":
            errorMessage =
              "No speech detected. Please try speaking louder or closer to the microphone.";
            break;
          case "audio-capture":
            errorMessage =
              "Audio capture failed. Please check your microphone settings.";
            break;
          case "network":
            errorMessage =
              "Network error. Please check your internet connection.";
            break;
          case "service-not-allowed":
            if (this.isMobile) {
              this.tryAlternativeSpeechRecognition();
              return;
            } else {
              errorMessage =
                "Speech recognition service not allowed. Please try a different browser.";
            }
            break;
          case "aborted":
            errorMessage = "Speech recognition was aborted. Please try again.";
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        this.updateStatus(errorMessage, "error");
      };

      this.recognition.onend = () => {
        // If we have interim results but no final results, treat them as final
        if (this.lastInterimTranscript && this.lastInterimTranscript.trim()) {
          this.sourceText.value = this.lastInterimTranscript;
          this.updateStatus("Speech captured successfully", "success");

          // Auto-translate and speak on mobile
          if (this.isMobile) {
            setTimeout(() => {
              this.updateStatus("Translating...", "info");
              this.translateAndSpeak();
            }, 200); // Reduced delay for mobile
          } else {
            setTimeout(() => {
              this.updateStatus("Translating...", "info");
              this.translateAndSpeak();
            }, 300);
          }
        } else if (this.isMobile) {
          // No speech detected on mobile
          this.updateStatus("No speech detected. Tap again to try.", "info");
        }

        this.stopRecording();
      };

      this.updateStatus("Speech recognition initialized", "success");
    } else {
      this.updateStatus(
        "Speech recognition not supported in this browser. Please use Chrome, Firefox, or Edge.",
        "error"
      );
      this.voiceInputBtn.disabled = true;
      this.voiceInputBtn.style.opacity = "0.5";
      this.voiceInputBtn.title = "Voice input not available";
    }
  }

  tryAlternativeSpeechRecognition() {
    this.updateStatus(
      "Trying alternative speech recognition method...",
      "info"
    );

    if (this.recognition) {
      try {
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.start();
      } catch (error) {
        this.updateStatus(
          "Speech recognition not available on this device. Please use text input.",
          "error"
        );
      }
    }
  }

  bindEvents() {
    // Voice input button events with improved touch handling
    this.voiceInputBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (!this.isMobile) {
        this.startRecording();
      }
    });
    this.voiceInputBtn.addEventListener("mouseup", (e) => {
      e.preventDefault();
      if (!this.isMobile) {
        this.stopRecording();
      }
    });
    this.voiceInputBtn.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      if (!this.isMobile) {
        this.stopRecording();
      }
    });

    // Enhanced touch events for mobile - single tap to start/stop
    this.voiceInputBtn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.isMobile) {
          if (!this.isRecording) {
            this.startRecording();
          } else {
            this.stopRecording();
          }
        }
      },
      { passive: false }
    );

    // Remove touchend and touchcancel handlers for mobile to use single tap
    if (!this.isMobile) {
      this.voiceInputBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopRecording();
        },
        { passive: false }
      );

      this.voiceInputBtn.addEventListener(
        "touchcancel",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopRecording();
        },
        { passive: false }
      );
    }

    // Other button events
    this.speakOutput.addEventListener("click", () => this.speakTranslation());
    this.clearSource.addEventListener("click", () => this.clearSourceText());
    this.swapLanguages.addEventListener("click", () => this.swapLanguages());

    // Auto-translate on text change
    this.sourceText.addEventListener("input", () => {
      if (this.sourceText.value.trim()) {
        this.debounce(() => this.translate(), 1000);
      }
    });

    // Language change events
    this.sourceLanguage.addEventListener("change", () => this.translate());
    this.targetLanguage.addEventListener("change", () => this.translate());
  }

  async startRecording() {
    if (!this.recognition) {
      this.updateStatus("Speech recognition not available", "error");
      return;
    }

    if (this.isRecording) {
      return;
    }

    this.lastInterimTranscript = "";

    if (!this.permissionGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        this.permissionGranted = true;
        this.updateStatus("Microphone permission granted", "success");
      } catch (error) {
        this.updateStatus(
          "Microphone permission required. Please allow microphone access and try again.",
          "error"
        );
        return;
      }
    }

    const sourceLang = this.getLanguageCode(this.sourceLanguage.value);
    this.recognition.lang = sourceLang;

    try {
      this.recognition.start();

      // Auto-stop recording after 10 seconds on mobile to prevent long holds
      if (this.isMobile) {
        this.recordingTimeout = setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
            this.updateStatus("Recording stopped automatically", "info");
          }
        }, 10000);
      }
    } catch (error) {
      if (this.isMobile) {
        this.tryAlternativeSpeechRecognition();
      } else {
        this.updateStatus(
          "Error starting speech recognition. Please try again.",
          "error"
        );
      }
    }
  }

  stopRecording() {
    if (!this.recognition || !this.isRecording) {
      return;
    }

    // Clear the mobile timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      // Ignore stop errors
    }

    this.isRecording = false;
    this.voiceInputBtn.classList.remove("recording");
    this.recordingIndicator.classList.remove("active");
  }

  async translate() {
    const sourceText = this.sourceText.value.trim();
    if (!sourceText) {
      this.targetText.value = "";
      return;
    }

    const sourceLang = this.sourceLanguage.value;
    const targetLang = this.targetLanguage.value;

    this.updateStatus("Translating...", "info");

    try {
      // Using Google Translate API (free tier with limitations)
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
          sourceText
        )}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const translation = data[0][0][0];

      this.targetText.value = translation;
      this.updateStatus("Translation completed", "success");
    } catch (error) {
      this.updateStatus("Translation failed. Please try again.", "error");

      // Fallback: try alternative translation service
      await this.fallbackTranslate(sourceText, sourceLang, targetLang);
    }
  }

  async fallbackTranslate(text, sourceLang, targetLang) {
    try {
      // Using LibreTranslate API (free alternative)
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.targetText.value = data.translatedText;
        this.updateStatus("Translation completed (fallback)", "success");
      } else {
        throw new Error("Fallback translation failed");
      }
    } catch (error) {
      this.updateStatus("Translation services unavailable", "error");
    }
  }

  speakTranslation() {
    const text = this.targetText.value.trim();
    if (!text) {
      this.updateStatus("No translation to speak", "error");
      return;
    }

    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = this.targetLanguage.value;

    utterance.lang = this.getLanguageCode(targetLang);

    const voices = this.synthesis.getVoices();
    let targetVoice = this.cachedVoices.get(targetLang);

    if (!targetVoice) {
      const languageCode = this.getLanguageCode(targetLang);

      const voicePriorities = [
        (voice) => voice.lang === languageCode,
        (voice) => voice.lang.startsWith(targetLang),
        (voice) => voice.lang.startsWith(languageCode),
        (voice) => voice.lang.includes(targetLang),
      ];

      for (const priority of voicePriorities) {
        targetVoice = voices.find(priority);
        if (targetVoice) break;
      }
    }

    if (!targetVoice) {
      targetVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("premium") ||
          voice.name.toLowerCase().includes("enhanced") ||
          voice.name.toLowerCase().includes("natural") ||
          voice.name.toLowerCase().includes("neural")
      );
    }

    if (!targetVoice && voices.length > 0) {
      targetVoice = voices[0];
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    // Optimized speech settings for mobile
    utterance.rate = this.isMobile ? 0.85 : 0.85; // Slightly slower on mobile for clarity
    utterance.pitch = this.isMobile ? 1.1 : 1.0; // Slightly higher pitch on mobile for better clarity
    utterance.volume = 1.0;

    // Simplified text enhancement for mobile
    let enhancedText = text;
    enhancedText = enhancedText.replace(/[.!?]/g, "$& ");
    enhancedText = enhancedText.replace(/\s+([.!?,])/g, "$1");
    utterance.text = enhancedText;

    utterance.onstart = () => {
      this.updateStatus("Speaking translation...", "info");
    };

    utterance.onend = () => {
      this.updateStatus("Translation spoken", "success");

      // On mobile, show a clear message that user can record again
      if (this.isMobile) {
        setTimeout(() => {
          this.updateStatus("Tap the microphone to translate again", "info");
        }, 2000);
      }
    };

    utterance.onerror = (event) => {
      this.updateStatus("Speech synthesis failed", "error");
    };

    this.synthesis.speak(utterance);
  }

  clearSourceText() {
    this.sourceText.value = "";
    this.targetText.value = "";
    this.updateStatus("Text cleared", "info");
  }

  swapLanguages() {
    const tempLang = this.sourceLanguage.value;
    const tempText = this.sourceText.value;

    this.sourceLanguage.value = this.targetLanguage.value;
    this.targetLanguage.value = tempLang;

    this.sourceText.value = this.targetText.value;
    this.targetText.value = tempText;

    this.updateStatus("Languages swapped", "info");
  }

  getLanguageCode(lang) {
    const languageMap = {
      en: "en-US",
      pl: "pl-PL",
      hu: "hu-HU",
    };
    return languageMap[lang] || lang;
  }

  updateStatus(message, type = "info") {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    // Clear status after 5 seconds for success/info messages
    if (type !== "error") {
      setTimeout(() => {
        if (this.statusMessage.textContent === message) {
          this.statusMessage.textContent = "";
          this.statusMessage.className = "status-message";
        }
      }, 5000);
    }
  }

  debounce(func, wait) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(func, wait);
  }

  translateAndSpeak() {
    this.translate()
      .then(() => {
        this.updateStatus("Translation completed, speaking now...", "info");
        // Faster speech on mobile for better user experience
        const delay = this.isMobile ? 300 : 500;
        setTimeout(() => {
          this.speakTranslation();
          this.lastInterimTranscript = "";
        }, delay);
      })
      .catch(() => {
        this.updateStatus("Translation failed, cannot speak result", "error");
        this.lastInterimTranscript = "";
      });
  }

  preloadVoices() {
    if (this.synthesis.getVoices().length === 0) {
      this.synthesis.onvoiceschanged = () => {
        this.cacheBestVoices();
      };
    } else {
      this.cacheBestVoices();
    }
  }

  cacheBestVoices() {
    const voices = this.synthesis.getVoices();
    const languages = ["en", "pl", "hu"];

    languages.forEach((lang) => {
      const languageCode = this.getLanguageCode(lang);
      let bestVoice = null;

      const voicePriorities = [
        (voice) =>
          voice.lang === languageCode &&
          (voice.name.toLowerCase().includes("premium") ||
            voice.name.toLowerCase().includes("enhanced") ||
            voice.name.toLowerCase().includes("natural") ||
            voice.name.toLowerCase().includes("neural")),
        (voice) => voice.lang === languageCode,
        (voice) => voice.lang.startsWith(lang),
        (voice) => voice.lang.startsWith(languageCode),
        (voice) => voice.lang.includes(lang),
      ];

      for (const priority of voicePriorities) {
        bestVoice = voices.find(priority);
        if (bestVoice) break;
      }

      if (bestVoice) {
        this.cachedVoices.set(lang, bestVoice);
      }
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new VoiceTranslator();
});

// Handle speech synthesis voices loading
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Voices are now available
  };
}

// Service Worker for PWA capabilities
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Service worker registered successfully
      })
      .catch((registrationError) => {
        // Service worker registration failed
      });
  });
}
