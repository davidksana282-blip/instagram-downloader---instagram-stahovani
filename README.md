# Instagram Profile Downloader

**Chrome Extension (Manifest V3) for downloading Instagram profile media**  
**Chrome rozsireni (Manifest V3) pro stahovani medii z Instagram profilu**

---

## EN

### What It Does
Download media from an Instagram profile you can access:
- Posts + Reels
- Stories
- Highlights

Built as a practical downloader with automatic file saving and language-aware UI/logs.

### Key Features
- Full profile media flow (posts, stories, highlights)
- Highlights fallback chain (profile info -> tray endpoints -> DOM fallback from open profile tab)
- Automatic saving (`saveAs: false`)
- Custom base folder inside your Downloads
- Chrome i18n localization:
  - Czech UI/logs when browser language starts with `cs`
  - English for all other languages

### Project Structure
```text
manifest.json
background.js
popup.html
popup.js
popup.css
_locales/
  en/messages.json
  cs/messages.json
```

### Installation (Developer Mode)
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder:
   - `C:\Users\takom\Downloads\downloader ig`

### How To Use
1. Log in to [instagram.com](https://www.instagram.com/) in Chrome.
2. Click the extension icon.
3. Enter username (or use `From tab`).
4. Select what to download.
5. Set `Target folder in Downloads`.
6. Click `Download profile`.

Downloaded files are organized like:
- `Downloads/<baseFolder>/<username>/posts/...`
- `Downloads/<baseFolder>/<username>/stories/...`
- `Downloads/<baseFolder>/<username>/highlights/...`

### Important Notes
- This extension uses unofficial Instagram endpoints that may change.
- It only downloads content your logged-in account can access.
- If Chrome still asks where to save each file, disable:
  - `Chrome > Settings > Downloads > Ask where to save each file before downloading`

### Troubleshooting
- **Highlights = 0**:
  - Open target profile tab (`https://www.instagram.com/<username>/`) and keep it loaded.
  - Run download again so DOM fallback can resolve highlight IDs.
- **No media downloading**:
  - Verify you are logged in on Instagram in the same Chrome profile.
  - Reload extension in `chrome://extensions`.

### Legal
Use responsibly and respect:
- Instagram Terms of Use
- Copyright and ownership rights
- Privacy laws in your jurisdiction

---

## CS

### Co To Umi
Stahuje media z Instagram profilu, ke kteremu mas pristup:
- Prispevky + Reels
- Stories
- Highlights

Je to prakticky downloader s automatickym ukladanim souboru a lokalizovanym UI/logy.

### Hlavni Funkce
- Kompletní tok pro profilova media (prispevky, stories, highlights)
- Fallback retezec pro highlights (profile info -> tray endpointy -> DOM fallback z otevreneho tabu)
- Automaticke ukladani (`saveAs: false`)
- Vlastni cilova slozka v Downloads
- Chrome i18n lokalizace:
  - Cestina pri jazyce prohlizece `cs*`
  - Anglictina pro vsechny ostatni jazyky

### Struktura Projektu
```text
manifest.json
background.js
popup.html
popup.js
popup.css
_locales/
  en/messages.json
  cs/messages.json
```

### Instalace (Developer Mode)
1. Otevri `chrome://extensions`
2. Zapni `Developer mode`
3. Klikni `Load unpacked`
4. Vyber tuto slozku:
   - `C:\Users\takom\Downloads\downloader ig`

### Pouziti
1. Prihlas se na [instagram.com](https://www.instagram.com/) v Chrome.
2. Otevri ikonku rozsireni.
3. Zadej username (nebo pouzij `Z tabu`).
4. Vyber, co chces stahnout.
5. Nastav `Cilova slozka v Downloads`.
6. Klikni `Stahnout profil`.

Soubory se ukladaji takto:
- `Downloads/<baseFolder>/<username>/posts/...`
- `Downloads/<baseFolder>/<username>/stories/...`
- `Downloads/<baseFolder>/<username>/highlights/...`

### Dulezite Poznamky
- Rozsireni pouziva neoficialni Instagram endpointy, ktere se muzou zmenit.
- Stahuje jen obsah, ke kteremu ma tvuj prihlaseny ucet pristup.
- Pokud se i tak otevira dialog pro ulozeni, vypni:
  - `Chrome > Settings > Downloads > Ask where to save each file before downloading`

### Troubleshooting
- **Highlights = 0**:
  - Otevri profil ciloveho uctu v tabu (`https://www.instagram.com/<username>/`) a nech ho nacteny.
  - Spust stahovani znovu, aby fungoval DOM fallback.
- **Nic se nestahuje**:
  - Zkontroluj, ze jsi prihlaseny na Instagramu ve stejnem Chrome profilu.
  - V `chrome://extensions` dej `Reload`.

### Pravni Upozorneni
Pouzivej rozsireni zodpovedne a respektuj:
- Podminky Instagramu
- Autorska prava a vlastnictvi obsahu
- Pravni predpisy o soukromi v tvoji zemi

---

## Disclaimer
This is an independent tool and is not affiliated with Instagram or Meta.
