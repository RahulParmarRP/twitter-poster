// index.js - The main script for the AI news Twitter bot.

// Load environment variables from .env file
require("dotenv").config();

// Import necessary libraries
const { TwitterApi } = require("twitter-api-v2");
const { HfInference } = require("@huggingface/inference");
const NewsAPI = require("newsapi");

// --- Configuration and Initialization ---

// Twitter client setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

// Hugging Face client setup
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);
const summarizationModel = "facebook/bart-large-cnn";
const newsApiKey = process.env.NEWS_API_KEY;
const newsAPIClient = new NewsAPI(newsApiKey);

// --- Helper Functions ---

/**
 * Fetches the latest AI news articles from NewsAPI.org.
 * @returns {Promise<Array>} An array of news articles.
 */
async function fetchNews() {
  try {
    const response = await newsAPIClient.v2.topHeadlines({
      q: "AI",
      language: "en",
      pageSize: 5,
    });

    if (response.status === "ok") {
      return response.articles;
    } else {
      console.error("Error fetching news:", response);
      return [];
    }
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

/**
 * Summarizes a given text using the Hugging Face summarization model.
 * @param {string} text The text to summarize.
 * @returns {Promise<string>} The summarized text.
 */
async function summarizeText(text) {
  try {
    const output = await hf.summarization({
      model: summarizationModel,
      inputs: text,
      parameters: { max_length: 80 },
    });

    if (Array.isArray(output) && output[0]?.summary_text) {
      return output[0].summary_text;
    }
    return output.summary_text || text; // fallback
  } catch (error) {
    console.error("Error summarizing text:", error);
    return text; // fallback to original
  }
}

/**
 * Formats a tweet safely by truncating only the summary
 * while keeping hashtags and URL intact.
 */
function formatTweet(summary, url) {
  const hashtags = "#AI #ArtificialIntelligence #Tech";
  const reservedLength = hashtags.length + url.length + 10; // spaces + newline
  const maxSummaryLength = 280 - reservedLength;

  let safeSummary = summary;
  if (summary.length > maxSummaryLength) {
    safeSummary = summary.substring(0, maxSummaryLength - 3) + "...";
  }

  return `${safeSummary} ${hashtags}\n\nRead more: ${url}`;
}

// --- Main Bot Logic ---

async function runBot() {
  console.log("Starting AI News Bot...");

  // 1. Fetch news articles
  const articles = await fetchNews();

  if (articles.length === 0) {
    console.log("No articles found. Exiting.");
    return;
  }

  // Pick a random article to avoid duplicates
  const latestArticle = articles[Math.floor(Math.random() * articles.length)];
  const { title, description, url } = latestArticle;

  console.log(`Processing article: "${title}"`);

  // 2. Summarize the article
  const combinedText = `${title}. ${description || ""}`;
  const summary = await summarizeText(combinedText);

  // 3. Format the tweet safely
  const finalTweet = formatTweet(summary, url);

  console.log(`Generated Tweet:\n"${finalTweet}"`);

  // 4. Post the tweet
  try {
    await rwClient.v2.tweet(finalTweet);
    console.log("✅ Successfully posted tweet!");
  } catch (e) {
    console.error("❌ Error posting tweet:", e);
  }
}

// Execute the bot
runBot();
