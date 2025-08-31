// index.js - The main script for the AI news Twitter bot.

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

// Import necessary libraries
import { TwitterApi } from "twitter-api-v2";
import { HfInference } from "@huggingface/inference";
import NewsAPI from "newsapi";
import twitter from "twitter-text";

// --- Configuration and Initialization ---

// Twitter client setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

// Hugging Face client setup (unused)
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);
const summarizationModel = "facebook/bart-large-cnn";

// News API setup
const newsApiKey = process.env.NEWS_API_KEY;
const newsAPIClient = new NewsAPI(newsApiKey);

// Constants
const MAX_TWEET_LENGTH = 280;
const HASHTAGS = ["#AI", "#ArtificialIntelligence", "#Tech", "#MachineLearning"];
const RELEVANT_TERMS = /(AI|artificial intelligence|machine learning|chatbot|generative)/i;

// --- Helper Functions ---

async function fetchNews() {
  try {
    const response = await newsAPIClient.v2.topHeadlines({
      qInTitle: "AI OR artificial intelligence OR machine learning OR chatbot OR generative",
      language: "en",
      category: "technology",
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
 * Ensures output is roughly within tweet length limits.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function summarizeText(text) {
  try {
    const output = await hf.summarization({
      model: summarizationModel,
      inputs: text,
      parameters: { max_length: 200 }, // let model produce rich but concise text
    });

    if (Array.isArray(output) && output[0]?.summary_text) {
      return output[0].summary_text;
    }
    return output.summary_text || text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    return text; // fallback
  }
}

/**
 * Formats a tweet to fit within 280 chars and appends hashtags if space allows.
 * @param {string} summary
 * @returns {string}
 */
function formatTweet(summary) {
  let safeSummary = summary.trim();

  // Ensure summary itself fits
  const parsedSummary = twitter.parseTweet(safeSummary);
  if (parsedSummary.weightedLength > MAX_TWEET_LENGTH) {
    const allowedLength = MAX_TWEET_LENGTH - 1; // reserve for "…"
    safeSummary = safeSummary.substring(0, allowedLength) + "…";
  }

  // Add hashtags one by one, only if space allows
  let finalText = safeSummary;
  for (const tag of HASHTAGS) {
    const testText = `${finalText} ${tag}`;
    const testParsed = twitter.parseTweet(testText);
    if (testParsed.valid) {
      finalText = testText;
    } else {
      break;
    }
  }

  return finalText;
}

// --- Main Bot Logic ---

async function runBot() {
  console.log("Starting AI News Bot...");

  const articles = await fetchNews();
  if (articles.length === 0) {
    console.log("No articles found. Exiting.");
    return;
  }

  // Loop through articles until we find a relevant headline that fits Twitter
  let selectedArticle = null;
  for (const article of articles) {
    const { title, description, url } = article;

    if (!title || !RELEVANT_TERMS.test(title)) continue;

    const tweetCandidate = `${title} ${url}`;
    if (twitter.parseTweet(tweetCandidate).valid) {
      selectedArticle = article;
      break;
    }
  }

  if (!selectedArticle) {
    console.log("No relevant article fits Twitter constraints. Exiting.");
    return;
  }

  const { title, description, url } = selectedArticle;
  console.log(`Processing article: "${title}"`);

  // Use title + URL as the tweet (skip HuggingFace summarization)
  const tweetContent = formatTweet(`${title} ${url}`);
  console.log(`Generated Tweet:\n"${tweetContent}"`);

  try {
    await rwClient.v2.tweet(tweetContent);
    console.log("Successfully posted tweet!");
  } catch (e) {
    console.error("Error posting tweet:", e);
  }
}

// Execute the bot
runBot();
