# Voice Translator App

A mobile-first web application for real-time voice translation between Polish, Hungarian, and English. The app features speech recognition, text-to-speech, and a modern, responsive design.

## Features

- **Voice Input**: Hold the microphone button to speak and automatically translate
- **Text Input**: Type text manually for translation
- **Voice Output**: Listen to translations using device speakers
- **Language Support**:
  - Polish ↔ Hungarian
  - English ↔ Hungarian
  - English ↔ Polish
- **Mobile-First Design**: Optimized for mobile devices with touch-friendly interface
- **PWA Support**: Installable as a web app on mobile devices
- **Offline Capability**: Basic functionality works offline
- **Auto-Translation**: Real-time translation as you type
- **Language Swapping**: Quick swap between source and target languages

## How to Use

### Voice Translation

1. Select your source and target languages
2. Hold the "Hold to Speak" button while speaking
3. Release the button when finished
4. The app will automatically translate and display the result
5. Tap the speaker button to hear the translation

### Text Translation

1. Type or paste text in the input field
2. Translation happens automatically as you type
3. Use the "Translate" button for manual translation
4. Tap the speaker button to hear the translation

### Voice Translate Button

- If no text is entered: Starts voice recording
- If text is present: Translates and speaks the result

## Setup Instructions

### Local Development

1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. Allow microphone permissions when prompted

### Production Deployment

1. Upload all files to a web server
2. Ensure HTTPS is enabled (required for speech recognition)
3. The app will work as a PWA on supported devices

## Browser Requirements

- **Chrome/Edge**: Full support for all features
- **Firefox**: Full support for all features
- **Safari**: Limited speech recognition support
- **Mobile Browsers**: Full support on Chrome Mobile, Safari Mobile

## Technical Details

### APIs Used

- **Web Speech API**: For speech recognition and synthesis
- **Google Translate API**: Primary translation service
- **LibreTranslate API**: Fallback translation service

### File Structure

```
translator-app/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
├── sw.js              # Service worker for PWA
├── manifest.json      # Web app manifest
└── README.md          # This file
```

### PWA Features

- Installable on mobile devices
- Offline functionality
- App-like experience
- Splash screen and icons

## Privacy & Security

- All speech processing happens locally in your browser
- Translation requests are sent to external APIs
- No personal data is stored or transmitted
- Microphone access is only used when actively recording

## Troubleshooting

### Speech Recognition Not Working

- Ensure you're using HTTPS (required for microphone access)
- Check browser permissions for microphone access
- Try refreshing the page and allowing permissions again

### Translation Fails

- Check your internet connection
- The app will try fallback services automatically
- Some translation services may have rate limits

### Voice Output Not Working

- Check device volume settings
- Ensure browser supports speech synthesis
- Try a different browser if issues persist

## Browser Compatibility

| Feature            | Chrome | Firefox | Safari | Edge |
| ------------------ | ------ | ------- | ------ | ---- |
| Speech Recognition | ✅     | ✅      | ⚠️     | ✅   |
| Speech Synthesis   | ✅     | ✅      | ✅     | ✅   |
| PWA Support        | ✅     | ✅      | ✅     | ✅   |
| Offline Mode       | ✅     | ✅      | ✅     | ✅   |

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the troubleshooting section above or create an issue in the project repository.
