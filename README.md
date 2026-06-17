# BigQuery Release Notes Explorer & X/Twitter Share

A modern, responsive, and aesthetically premium web dashboard to browse, filter, search, and tweet official updates from Google Cloud's BigQuery release notes feed.

Live Repository: [richysmart/antigravity-event-talks-app](https://github.com/richysmart/antigravity-event-talks-app)

---

## 🌟 Main Features

- **Automated XML Parsing & Categorization**: Fetches the official Atom feed from Google Cloud and automatically categorizes notes into `Feature`, `Announcement`, `Deprecation`, `Changed`, or `Fixed` types based on prefix tags.
- **In-Memory Caching**: Automatically caches entries for 5 minutes (300 seconds) to reduce load times and respect Google Cloud's rate limits, with a manual "Refresh Feed" override that forces a fetch.
- **Dynamic Search & Filtering**: Instant, client-side text searching and category selector pills display relevant notes instantly.
- **Sleek Light/Dark Themes**: Integrated toggler transition with custom variables, backed by ambient colorful background glows.
- **X/Twitter Drafting Composer**: Select a release note card to open a custom sharing drawer.
- **Interactive Post Mockup Preview**: View how your post will look on X in real time, with automatic link preview cards and a live 280-character progress bar.
- **Zero-Config Sharing**: Uses standard X/Twitter Web Intents to securely share draft details in a single click without requesting third-party API credentials.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14 + Flask (utilizes standard library `urllib` and `xml.etree.ElementTree` to maintain zero external parsing dependencies).
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid, transitions), and Vanilla JavaScript (ES6 Modules/Fetch API).

---

## 📂 Project Structure

```text
C:/Users/user/bigquery_release_notes/
├── templates/
│   └── index.html        # Main HTML layout, controls sidebar and drawer
├── static/
│   ├── css/
│   │   └── styles.css    # Premium glassmorphic styling, variables & dark mode
│   └── js/
│   │   └── main.js       # Live search/filters, mock preview & intent handling
├── app.py                # Core Flask server, XML parser & caching controller
├── run.bat               # Windows batch script to launch the app instantly
└── .gitignore            # Excludes cached Python modules & local configs
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have Python installed. You can verify it by running:
```bash
python --version
```

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/richysmart/antigravity-event-talks-app.git
   cd antigravity-event-talks-app
   ```

2. **Install Flask**:
   Since the server uses standard Python libraries for parsing, you only need the Flask framework itself:
   ```bash
   pip install flask
   ```
   *(If you are in a restricted environment, you can specify a mirror: `pip install flask -i https://pypi.tuna.tsinghua.edu.cn/simple/`)*

### Running the Application

- **On Windows**:
  Double-click the **`run.bat`** launcher file in the root folder, or execute:
  ```cmd
  run.bat
  ```

- **Manual Startup**:
  Open your command prompt or terminal and run:
  ```bash
  python app.py
  ```

Once started, open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
