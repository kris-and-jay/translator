class VoiceTranslator {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isRecording = false;
    this.recordingTimeout = null;
    this.permissionGranted = false;
    this.lastInterimTranscript = "";
    this.cachedVoices = new Map();

    this.initializeElements();
    this.checkPermissions();
    this.initializeSpeechRecognition();
    this.bindEvents();
    this.preloadVoices();
    this.updateStatus("Ready to translate", "info");
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
      console.log("Permission API not supported, will request on use");
    }
  }

  initializeSpeechRecognition() {
    // Check for mobile devices
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Mobile-optimized configuration
      if (isMobile) {
        // Use more conservative settings for mobile
        this.recognition.continuous = false;
        this.recognition.interimResults = false; // Disable interim results on mobile for better stability
        this.recognition.maxAlternatives = 1;
        this.recognition.grammars = null; // Disable grammars on mobile
      } else {
        // Desktop settings
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
      }

      // Set default language
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.voiceInputBtn.classList.add("recording");
        this.recordingIndicator.classList.add("active");
        this.updateStatus("Listening... Speak now!", "info");
        console.log("Speech recognition started");
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          console.log(
            `Transcript: ${transcript}, Confidence: ${confidence}, Final: ${event.results[i].isFinal}`
          );

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else if (!isMobile) {
            // Only show interim results on desktop
            this.lastInterimTranscript = transcript;
            this.sourceText.value = transcript;
          }
        }

        if (finalTranscript) {
          this.sourceText.value = finalTranscript;
          this.lastInterimTranscript = finalTranscript;
          this.updateStatus("Speech captured successfully", "success");
          // Automatically translate and speak when speech is captured
          setTimeout(() => {
            this.updateStatus(
              "Translating and will speak automatically...",
              "info"
            );
            this.translateAndSpeak();
          }, 500);
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
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
            // Try alternative approach for mobile
            if (isMobile) {
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
        console.log("Speech recognition ended");

        // If we have interim results but no final results, treat them as final
        if (this.lastInterimTranscript && this.lastInterimTranscript.trim()) {
          this.sourceText.value = this.lastInterimTranscript;
          this.updateStatus("Speech captured successfully", "success");
          // Automatically translate and speak when recording ends with speech
          setTimeout(() => {
            this.updateStatus(
              "Translating and will speak automatically...",
              "info"
            );
            this.translateAndSpeak();
          }, 500);
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

  // Alternative speech recognition method for mobile
  tryAlternativeSpeechRecognition() {
    this.updateStatus(
      "Trying alternative speech recognition method...",
      "info"
    );

    // Try with different configuration
    if (this.recognition) {
      try {
        // Reset and try with minimal configuration
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        // Try starting again
        this.recognition.start();
      } catch (error) {
        console.error("Alternative speech recognition failed:", error);
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
      this.startRecording();
    });
    this.voiceInputBtn.addEventListener("mouseup", (e) => {
      e.preventDefault();
      this.stopRecording();
    });
    this.voiceInputBtn.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      this.stopRecording();
    });

    // Enhanced touch events for mobile
    this.voiceInputBtn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startRecording();
      },
      { passive: false }
    );

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
      console.log("Already recording, ignoring start request");
      return;
    }

    // Reset interim transcript for new recording
    this.lastInterimTranscript = "";

    // Check if we need to request microphone permission
    if (!this.permissionGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop()); // Stop the stream immediately
        this.permissionGranted = true;
        this.updateStatus("Microphone permission granted", "success");
      } catch (error) {
        console.error("Microphone permission denied:", error);
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
      console.log(`Starting speech recognition with language: ${sourceLang}`);
    } catch (error) {
      console.error("Error starting speech recognition:", error);

      // Try alternative approach for mobile
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      if (isMobile) {
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
      console.log("Not recording, ignoring stop request");
      return;
    }

    try {
      this.recognition.stop();
      console.log("Stopping speech recognition");
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
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
      console.error("Translation error:", error);
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
      console.error("Fallback translation error:", error);
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

    // Set language for speech synthesis
    utterance.lang = this.getLanguageCode(targetLang);

    // Enhanced voice selection for more natural speech
    const voices = this.synthesis.getVoices();
    let targetVoice = null;

    // First try to use cached voice for the target language
    targetVoice = this.cachedVoices.get(targetLang);

    // If no cached voice, find the best available voice
    if (!targetVoice) {
      const languageCode = this.getLanguageCode(targetLang);

      // Priority order for voice selection
      const voicePriorities = [
        // First try to find voices that exactly match the language
        (voice) => voice.lang === languageCode,
        // Then try voices that start with the language code
        (voice) => voice.lang.startsWith(targetLang),
        // Then try voices that start with the language code (with region)
        (voice) => voice.lang.startsWith(languageCode),
        // Finally, try any voice that contains the language
        (voice) => voice.lang.includes(targetLang),
      ];

      for (const priority of voicePriorities) {
        targetVoice = voices.find(priority);
        if (targetVoice) break;
      }
    }

    // If no specific voice found, try to find a high-quality default voice
    if (!targetVoice) {
      // Look for premium or enhanced voices
      targetVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("premium") ||
          voice.name.toLowerCase().includes("enhanced") ||
          voice.name.toLowerCase().includes("natural") ||
          voice.name.toLowerCase().includes("neural")
      );
    }

    // If still no voice found, use the first available voice
    if (!targetVoice && voices.length > 0) {
      targetVoice = voices[0];
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
      console.log(`Using voice: ${targetVoice.name} (${targetVoice.lang})`);
    }

    // Enhanced speech settings for more natural sound
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.pitch = 1.0; // Natural pitch
    utterance.volume = 1.0; // Full volume
    utterance.prefetch = true; // Prefetch for smoother playback

    // Add slight pauses for better naturalness and improve pronunciation
    let enhancedText = text;

    // Add pauses after punctuation for more natural speech
    enhancedText = enhancedText.replace(/[.!?]/g, "$& ");

    // Add slight pauses for better word separation in longer sentences
    if (enhancedText.length > 50) {
      enhancedText = enhancedText.replace(/,/g, ", ");
    }

    // Ensure proper spacing around punctuation
    enhancedText = enhancedText.replace(/\s+([.!?,])/g, "$1");

    utterance.text = enhancedText;

    utterance.onstart = () => {
      this.updateStatus("Speaking translation...", "info");
    };

    utterance.onend = () => {
      this.updateStatus("Translation spoken", "success");
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
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

    // Log to console for debugging
    console.log(`Status: ${type.toUpperCase()} - ${message}`);

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
        setTimeout(() => {
          this.speakTranslation();
          // Reset interim transcript after successful translation and speech
          this.lastInterimTranscript = "";
        }, 500);
      })
      .catch(() => {
        this.updateStatus("Translation failed, cannot speak result", "error");
        // Reset interim transcript on error too
        this.lastInterimTranscript = "";
      });
  }

  preloadVoices() {
    // Wait for voices to be loaded
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

      // Priority order for voice selection
      const voicePriorities = [
        // Premium/Enhanced voices first
        (voice) =>
          voice.lang === languageCode &&
          (voice.name.toLowerCase().includes("premium") ||
            voice.name.toLowerCase().includes("enhanced") ||
            voice.name.toLowerCase().includes("natural") ||
            voice.name.toLowerCase().includes("neural")),
        // Exact language match
        (voice) => voice.lang === languageCode,
        // Language code start
        (voice) => voice.lang.startsWith(lang),
        // Language code with region
        (voice) => voice.lang.startsWith(languageCode),
        // Contains language
        (voice) => voice.lang.includes(lang),
      ];

      for (const priority of voicePriorities) {
        bestVoice = voices.find(priority);
        if (bestVoice) break;
      }

      if (bestVoice) {
        this.cachedVoices.set(lang, bestVoice);
        console.log(
          `Cached voice for ${lang}: ${bestVoice.name} (${bestVoice.lang})`
        );
      }
    });

    // Log all available voices for debugging
    console.log(
      "Available voices:",
      voices.map((v) => `${v.name} (${v.lang})`)
    );
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new VoiceTranslator();

  // Add some helpful console messages
  console.log("Voice Translator App initialized");
  console.log("Browser info:", navigator.userAgent);
  console.log(
    "Speech recognition supported:",
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  console.log("Speech synthesis supported:", !!window.speechSynthesis);
});

// Handle speech synthesis voices loading
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Voices are now available
    console.log("Speech synthesis voices loaded");
    const voices = window.speechSynthesis.getVoices();
    console.log(
      "Available voices:",
      voices.map((v) => `${v.name} (${v.lang})`)
    );
  };
}

// Service Worker for PWA capabilities
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}
