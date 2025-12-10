# Indeed Autofiller

A Chrome extension that automatically fills repeated information on Indeed job application pages, helping applicants apply faster and more efficiently.

## Features

- Auto-fills contact information (phone, address, city, state, zip code)
- Auto-fills common application questions (security clearance, work authorization)
- Auto-fills voluntary disclosure information (demographics, veteran status, disability status)
- Auto-fills signature fields with your name and current date
- Saves your preferences locally using Chrome's storage API
- Works on Indeed's "Apply Now" application flow

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `indeed_autofiller` folder
6. The extension icon should appear in your Chrome toolbar

## Usage

### Initial Setup

1. Click the Indeed Autofiller extension icon in your Chrome toolbar
2. Fill in your personal information in the popup form:
   - **Contact Info**: Phone number, address, city, state, zip code
   - **Application Questions**: Security clearance status, work authorization
   - **Demographics** (optional): Gender, ethnicity, veteran status, disability status
3. Click **Save Settings**

### Applying to Jobs

1. Navigate to Indeed.com and start a job application
2. When you reach an application page, the extension will automatically detect fillable fields
3. Click the extension icon and press **Autofill** to populate the form
4. Review the filled information before submitting
5. Complete any remaining fields that require custom responses

### Keyboard Shortcut

- Press `Alt+Shift+F` to trigger autofill on the current page (customizable in Chrome extension settings)

## Supported Fields

### Contact Information
| Field | Input Type |
|-------|------------|
| Cell Phone | Text |
| Address | Text |
| City | Text |
| State | Dropdown |
| Postal Code | Text |

### Application Questions
| Field | Input Type |
|-------|------------|
| Security Clearance | Yes/No Radio |
| Background Check Eligible | Yes/No Radio |
| Text Message Opt-in | Checkbox |
| Privacy Policy Acknowledgement | Radio |

### Voluntary Disclosure (EEO)
| Field | Input Type |
|-------|------------|
| Gender | Radio (Male/Female/Decline) |
| Ethnicity/Race | Dropdown |
| Veteran Status | Radio |
| Disability Status | Radio |
| Your Name | Text |
| Today's Date | Date (auto-filled) |

## Privacy & Security

- All data is stored locally in your browser using Chrome's `storage.sync` API
- No data is sent to external servers
- Your information never leaves your device
- You can clear all stored data at any time via the extension popup

## Configuration Options

Access settings via the extension popup:

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-fill on page load | Automatically fill forms when detected | Off |
| Show notification | Display notification after autofill | On |
| Fill demographics | Include voluntary disclosure fields | Off |

## Troubleshooting

### Extension not filling fields
- Ensure you're on an Indeed application page (URL contains `indeed.com`)
- Check that you've saved your settings in the extension popup
- Try refreshing the page and clicking Autofill again

### Some fields not recognized
- Indeed occasionally updates their page structure
- Report unrecognized fields by opening an issue on GitHub

### Data not persisting
- Check that Chrome sync is enabled for extensions
- Try disabling and re-enabling the extension

## Development

### Project Structure

```
indeed_autofiller/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup/
│   ├── popup.html         # Settings UI
│   ├── popup.css          # Styling
│   └── popup.js           # Settings logic
├── content/
│   └── content.js         # Form detection and autofill logic
├── background/
│   └── background.js      # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── html_examples/         # Reference HTML from Indeed pages
```

### Building from Source

No build step required - this is a vanilla JavaScript extension.

### Testing

1. Load the extension in developer mode
2. Navigate to an Indeed job application
3. Open Chrome DevTools (F12) and check the Console for debug messages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-field-support`)
3. Commit your changes (`git commit -am 'Add support for new field type'`)
4. Push to the branch (`git push origin feature/new-field-support`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This extension is for personal use to streamline job applications. Use responsibly and always review auto-filled information before submitting applications. The developers are not responsible for incorrect submissions or any consequences arising from use of this extension.
