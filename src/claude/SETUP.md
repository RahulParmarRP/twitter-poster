# AI News Twitter Bot - Complete Setup Guide

## 🎯 What This Bot Does

- ✅ Fetches latest AI news from multiple sources
- ✅ Summarizes articles using Hugging Face AI models
- ✅ Posts smart tweets with hashtags and images
- ✅ Avoids duplicate posts with caching
- ✅ Runs automatically daily via GitHub Actions
- ✅ **Completely free** (uses free tiers of all services)

## 🚀 Quick Start (5 Steps)

### Step 1: Create Repository

```bash
mkdir ai-news-bot
cd ai-news-bot
git init
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install twitter-api-v2 node-fetch @types/node-fetch dotenv

# Development dependencies  
npm install -D typescript @types/node ts-node
```

### Step 3: Get API Keys

#### A) NewsAPI Key (Free)
1. Go to https://newsapi.org/register
2. Sign up for free account
3. Copy your API key

#### B) Hugging Face Key (Free)
1. Go to https://huggingface.co/join
2. Create account
3. Go to Settings → Access Tokens
4. Create new token

#### C) Twitter API Keys (Free)
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create new project/app
3. Generate API keys and tokens
4. Copy all 4 credentials:
   - API Key
   - API Secret Key  
   - Access Token
   - Access Token Secret

### Step 4: Add GitHub Secrets

In your GitHub repo:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `NEWS_API_KEY`: Your NewsAPI key
   - `HF_API_KEY`: Your Hugging Face token
   - `TWITTER_APP_KEY`: Twitter API Key
   - `TWITTER_APP_SECRET`: Twitter API Secret Key
   - `TWITTER_ACCESS_TOKEN`: Twitter Access Token
   - `TWITTER_ACCESS_SECRET`: Twitter Access Token Secret

### Step 5: Project Structure

Create this file structure:

```
ai-news-bot/
├── src/
│   └── index.ts                 # Main bot code
├── .github/
│   └── workflows/
│       └── ai-news-bot.yml      # GitHub Actions workflow
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 📁 Additional Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example
```env
# Copy this to .env for local development
NEWS_API_KEY=your_newsapi_key_here
HF_API_KEY=your_huggingface_token_here
TWITTER_APP_KEY=your_twitter_api_key
TWITTER_APP_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

### .gitignore
```
node_modules/
dist/
.env
*.log
posted_articles.json
```

## 🧪 Local Testing

```bash
# Install dependencies
npm install

# Create .env file with your API keys
cp .env.example .env
# Edit .env with your actual keys

# Test without posting
npm run dev -- --test

# Run actual bot
npm run dev
```

## 🔧 Customization Options

### Change Posting Schedule

Edit `.github/workflows/ai-news-bot.yml`:

```yaml
schedule:
  - cron: "0 8,16 * * *"    # Twice daily: 8 AM & 4 PM UTC
  - cron: "0 */4 * * *"     # Every 4 hours
  - cron: "0 12 * * 1-5"    # Weekdays only at noon
```

### Modify News Sources

In `index.ts`, update the `queries` array:

```typescript
const queries = [
  'OpenAI ChatGPT',
  'Google Bard AI',
  'Anthropic Claude',
  'artificial general intelligence',
  'AI regulation',
  'machine learning breakthrough'
];
```

### Customize Tweet Format

Modify the `formatForTweet` method:

```typescript
private formatForTweet(summary: string, article: NewsArticle): string {
  const emoji = this.getRelevantEmoji(article);
  const hashtags = this.generateHashtags(article);
  
  return `${emoji} ${summary}\n\n${hashtags}\n\n🔗 ${article.url}`;
}

private getRelevantEmoji(article: NewsArticle): string {
  const text = article.title.toLowerCase();
  if (text.includes('breakthrough')) return '🚀';
  if (text.includes('warning') || text.includes('risk')) return '⚠️';
  if (text.includes('new') || text.includes('launch')) return '🆕';
  return '🤖';
}
```

## 📊 Monitoring & Analytics

### View Bot Performance

1. **GitHub Actions logs**: See execution details in Actions tab
2. **Twitter Analytics**: Monitor tweet performance on Twitter
3. **Custom logging**: Add console.log statements for debugging

### Error Handling

The bot includes comprehensive error handling:
- **API failures**: Graceful fallbacks and retries
- **Rate limits**: Automatic delays and respect for limits
- **Duplicate prevention**: Caches posted articles
- **Image upload failures**: Posts text-only if image fails

## 🔒 Security Best Practices

### API Key Safety
- ✅ Use GitHub Secrets (never commit keys)
- ✅ Limit API permissions to minimum required
- ✅ Rotate keys periodically
- ✅ Monitor usage for unusual activity

### Twitter Guidelines
- ✅ Limit posting frequency (max 2 tweets per run)
- ✅ Add delays between tweets
- ✅ Include proper attribution and links
- ✅ Avoid spam-like behavior

## 🚀 Advanced Features

### 1. Multiple News Sources
Add RSS feeds or other news APIs:

```typescript
// Add RSS feed parsing
import Parser from 'rss-parser';

async fetchRSSNews(): Promise<NewsArticle[]> {
  const parser = new Parser();
  const feeds = [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.wired.com/feed/tag/ai/latest/rss'
  ];
  
  // Parse and combine feeds
}
```

### 2. Sentiment Analysis
Filter articles by sentiment:

```typescript
async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  // Use Hugging Face sentiment analysis model
  // Only post positive/neutral AI news
}
```

### 3. Thread Creation
Create Twitter threads for longer articles:

```typescript
async createThread(article: NewsArticle): Promise<string[]> {
  const chunks = this.splitIntoTweetChunks(article);
  return chunks.map((chunk, i) => `${i + 1}/${chunks.length} ${chunk}`);
}
```

### 4. Database Integration
Store articles in a database:

```typescript
// Add database for better tracking
import { Pool } from 'pg';

class BotDatabase {
  async saveArticle(article: NewsArticle, tweetId: string) {
    // Store in PostgreSQL, SQLite, or MongoDB
  }
  
  async getPostedArticles(): Promise<string[]> {
    // Query database instead of JSON file
  }
}
```

## 📈 Scaling Options

### 1. Multiple Topics
Create separate bots for different topics:
- AI News Bot
- Tech News Bot  
- Crypto News Bot

### 2. Multi-Platform
Extend to other platforms:
- LinkedIn posts
- Reddit submissions
- Discord notifications
- Slack updates

### 3. Cloud Hosting
Move beyond GitHub Actions:
- **Vercel** (free tier with cron jobs)
- **Railway** (free tier)
- **Render** (free tier)
- **AWS Lambda** (pay per execution)

## 🔧 Troubleshooting

### Common Issues

**"Rate limit exceeded"**
- Reduce posting frequency
- Add longer delays between API calls
- Check your API usage quotas

**"Authentication failed"**
- Verify all API keys are correct in GitHub Secrets
- Check Twitter app permissions
- Regenerate tokens if needed

**"No articles found"**
- Check NewsAPI key validity
- Verify news sources are working
- Try different search queries

**"Summarization failed"**
- Hugging Face model might be loading (try again)
- Check HF API key
- Use manual summarization fallback

### Debug Mode

Add logging for troubleshooting:

```typescript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug: Article data:', JSON.stringify(article, null, 2));
  console.log('Debug: Generated summary:', summary);
  console.log('Debug: Tweet length:', summary.length);
}
```

## 🎯 Success Metrics

Track your bot's performance:
- **Articles processed**: Number of articles found daily
- **Tweet engagement**: Likes, retweets, comments on your tweets
- **Follower growth**: Monitor if AI news content attracts followers
- **Link clicks**: Track traffic to news articles
- **Execution time**: Keep GitHub Actions usage efficient

## 💡 Pro Tips

1. **Start small**: Begin with 1 tweet per day, increase gradually
2. **Quality over quantity**: Better to post 1 great tweet than 5 mediocre ones
3. **Engage manually**: Like and reply to comments on bot tweets
4. **Monitor trends**: Adjust hashtags based on trending AI topics
5. **Regular maintenance**: Review and update news sources quarterly

## Next Steps

1. Set up the basic bot following this guide
2. Test thoroughly in test mode
3. Deploy to GitHub Actions
4. Monitor performance for 1 week
5. Iterate and improve based on engagement data

Your AI news Twitter bot will be running fully automated, posting quality AI news summaries daily for free!