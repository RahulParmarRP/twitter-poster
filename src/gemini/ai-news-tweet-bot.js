// AI News Twitter Bot (Randomized Hugging Face models)
// Fetch AI-focused RSS → Summarize → Validate → Tweet
// Dry-run logging included

import RSSParser from 'rss-parser';
import { TwitterApi } from 'twitter-api-v2';
import { HfInference } from '@huggingface/inference';
import twitterText from 'twitter-text';
import dotenv from 'dotenv';

dotenv.config();

// -------------------
// Environment & Config
// -------------------
const ENV = {
  DRY_RUN: process.env.DRY_RUN?.toLowerCase() === 'true',
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
  HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY
};

const CONFIG = {
  MAX_TWEET_LENGTH: 280,
  ARTICLES_PER_FEED: 3,
  HASHTAGS: '#AI #Quantum #Tech',
  SUMMARIZATION_MODELS: [
    'facebook/bart-large-cnn',
    'sshleifer/distilbart-cnn-12-6',
    'google/pegasus-xsum'
  ]
};

// -------------------
// RSS Feeds (AI-focused)
// -------------------
const FEEDS = [
  { url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', weight: 2 },
  { url: 'https://venturebeat.com/category/ai/feed/', weight: 1 }
];

// -------------------
// Instances
// -------------------
const rss = new RSSParser();
const hf = new HfInference(ENV.HUGGING_FACE_API_KEY);
const { parseTweet } = twitterText;

// -------------------
// Utilities
// -------------------
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function cleanSummary(text) {
  // Remove leading/trailing spaces
  text = text.trim();

  // Remove spaces before punctuation
  text = text.replace(/\s+([.,!?;:])/g, '$1');

  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, ' ');

  return text;
}


function appendHashtags(text, hashtags) {
  const spaceLeft = CONFIG.MAX_TWEET_LENGTH - text.length - 1;
  return spaceLeft >= hashtags.length ? `${text} ${hashtags}` : text;
}

function validateTweetLength(text) {
  const parsed = parseTweet(text);
  return (!parsed.valid || parsed.weightedLength > CONFIG.MAX_TWEET_LENGTH)
    ? truncateText(text, CONFIG.MAX_TWEET_LENGTH)
    : text;
}

function weightedPickFeed(feeds) {
  const weighted = feeds.flatMap(feed => Array(feed.weight).fill(feed.url));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function randomModel() {
  const models = CONFIG.SUMMARIZATION_MODELS;
  return models[Math.floor(Math.random() * models.length)];
}

// -------------------
// Feed Handling
// -------------------
async function fetchFeed(url, count = CONFIG.ARTICLES_PER_FEED) {
  try {
    const feed = await rss.parseURL(url);
    if (!feed.items?.length) {
      console.warn(`[WARN] Feed has no items: ${url}`);
      return [];
    }
    return feed.items.slice(0, count).map(i => ({
      title: i.title,
      description: i.contentSnippet || ''
    }));
  } catch (err) {
    console.error(`[ERROR] Feed parse failed (${url}): ${err.message}`);
    return [];
  }
}

// -------------------
// Article Processing
// -------------------
async function summarizeArticle(article) {
  const model = randomModel();
  const inputText = `Summarize this as a concise AI news tweet under 280 characters:\nTitle: ${article.title}\nDescription: ${article.description}`;

  try {
    const result = await hf.summarization({
      model,
      inputs: inputText,
      parameters: {
        max_length: 120,
        min_length: 30,
        temperature: 0.7,
        top_p: 0.9
      }
    });

    if (ENV.DRY_RUN) console.log(`[DEBUG] HF raw response from ${model}:`, result);

    let summary;
    if (Array.isArray(result)) {
      summary = result[0]?.summary_text;
    } else if (result.summary_text) {
      summary = result.summary_text;
    }

    summary = summary || article.title;
    summary = cleanSummary(summary)
    summary = appendHashtags(summary, CONFIG.HASHTAGS);
    summary = validateTweetLength(summary);
    return summary;

  } catch (err) {
    console.error(`[ERROR] Summarization failed: ${err.message}`);
    return appendHashtags(article.title, CONFIG.HASHTAGS);
  }
}

// -------------------
// Twitter Posting
// -------------------
async function postTweet(text) {
  if (ENV.DRY_RUN) {
    console.log(`[DRY RUN] Tweet ready: ${text}`);
    return;
  }

  try {
    const client = new TwitterApi({
      appKey: ENV.TWITTER_API_KEY,
      appSecret: ENV.TWITTER_API_SECRET,
      accessToken: ENV.TWITTER_ACCESS_TOKEN,
      accessSecret: ENV.TWITTER_ACCESS_SECRET,
    });
    await client.v2.tweet(text);
    console.log('[INFO] ✅ Tweet posted!');
  } catch (err) {
    console.error(`[ERROR] Twitter post failed: ${err.message}`);
  }
}

// -------------------
// Main Orchestration
// -------------------
export async function main() {
  let articles = [];

  const pickFeed = weightedPickFeed(FEEDS);
  const feedArticles = await fetchFeed(pickFeed);
  articles = articles.concat(feedArticles);

  if (!articles.length) {
    console.error('[ERROR] ❌ No valid AI articles found.');
    return;
  }

  // Dry-run logging
  if (ENV.DRY_RUN) {
    console.log(`[DRY RUN] Fetched ${articles.length} article(s) from: ${pickFeed}`);
    articles.forEach((a, i) => {
      console.log(`\n[Article ${i + 1}]`);
      console.log(`Title      : ${a.title}`);
      console.log(`Description: ${a.description}`);
    });
  }

  // Pick random article
  const pick = articles[Math.floor(Math.random() * articles.length)];
  if (ENV.DRY_RUN) console.log(`\n[DRY RUN] Picking article for tweet: ${pick.title}`);

  const tweet = await summarizeArticle(pick);
  await postTweet(tweet);
}

// -------------------
// Run main directly
// -------------------
main().catch(err => console.error(`[FATAL] Uncaught error: ${err.message}`));
