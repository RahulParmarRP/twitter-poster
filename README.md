# twitter-poster

Automated Twitter/X poster using Node.js and GitHub Actions.

<p>A collection of web development tools and experiments</p>
  <p><strong>🌐 Live Demo:</strong> <a href="https://rahulparmarrp.github.io/twitter-poster/">Visit GitHub Pages</a></p>
---

## Features

- Generate tweets and save them to a CSV file
- Post tweets from the CSV to Twitter/X using the Twitter API
- Run locally or schedule via GitHub Actions

---

## Setup

1. **Clone the repository:**

   ```sh
   git clone https://github.com/RahulParmarRP/twitter-poster.git
   cd twitter-poster
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Set up Twitter/X API credentials:**

   - Copy `.env.example` to `.env` and fill in your API keys:

     ```sh
     cp .env.example .env
     # Edit .env and add your credentials
     ```

   - Or, if using GitHub Actions, add your credentials as repository secrets: `API_KEY`, `API_SECRET`, `ACCESS_TOKEN`, `ACCESS_SECRET`.

---

## Usage

### Local

1. **Generate posts:**

   ```sh
   npm run generate
   ```

   _Creates/overwrites `posts.csv` with sample tweets._

2. **Post to Twitter/X:**

   ```sh
   npm run post
   ```

   _Reads `posts.csv` and posts each tweet using your credentials._

### Automated (GitHub Actions)

- The workflow in `.github/workflows/tweet.yml` runs every 12 hours or can be triggered manually.
- It installs dependencies, generates tweets, and posts them using the secrets you provide.

---

## Project Structure

```text
twitter-poster/
├── package.json
├── generate.js
├── post.js
├── posts.csv   # generated automatically
├── .env.example
└── .github/
    └── workflows/
        └── tweet.yml
```

---

**Note:** Use responsibly and comply with Twitter/X API terms of service.
