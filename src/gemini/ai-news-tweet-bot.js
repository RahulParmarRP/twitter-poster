// index.js - AI News Twitter Bot

import dotenv from "dotenv";
dotenv.config();

import { TwitterApi } from "twitter-api-v2";
import { HfInference } from "@huggingface/inference";
import NewsAPI from "newsapi";
import twitter from "twitter-text";

// --- Config ---
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

const MAX_TWEET_LENGTH = 280;
const HASHTAGS = ["#AI", "#ArtificialIntelligence", "#Tech", "#MachineLearning"];
const RELEVANT_TERMS = /(AI|artificial intelligence|machine learning|chatbot|generative)/i;

// --- Helpers ---
async function fetchNews() {
  // Try multiple search strategies
  const searchStrategies = [
    {
      name: "AI-focused with technology category",
      params: {
        q: "AI OR \"artificial intelligence\" OR \"machine learning\" OR chatbot OR generative",
        language: "en",
        category: "technology",
        pageSize: 10,
      }
    },
    {
      name: "AI-focused without category",
      params: {
        q: "AI OR \"artificial intelligence\" OR \"machine learning\"",
        language: "en",
        pageSize: 10,
      }
    },
    {
      name: "Just technology headlines",
      params: {
        language: "en",
        category: "technology",
        pageSize: 10,
      }
    },
    {
      name: "General headlines",
      params: {
        language: "en",
        pageSize: 10,
      }
    }
  ];

  for (const strategy of searchStrategies) {
    try {
      console.log(`\nTrying strategy: ${strategy.name}...`);
      const response = await newsAPIClient.v2.topHeadlines(strategy.params);

      console.log("News API Response Status:", response.status);
      console.log("Total Results:", response.totalResults);
      console.log("Number of articles returned:", response.articles?.length || 0);

      if (response.status === "ok" && response.articles && response.articles.length > 0) {
        console.log(`\n=== ALL ARTICLES FOUND (${strategy.name}) ===`);
        response.articles.forEach((article, index) => {
          console.log(`\n--- Article ${index + 1} ---`);
          console.log("Title:", article.title);
          console.log("Source:", article.source?.name);
          console.log("Published:", article.publishedAt);
          console.log("URL:", article.url);
          console.log("Description:", article.description?.substring(0, 100) + "...");
          console.log("Has AI relevance:", RELEVANT_TERMS.test(article.title || ""));
        });
        console.log("\n=== END OF ARTICLES ===\n");
        
        return response.articles;
      } else {
        console.log(`No articles found with strategy: ${strategy.name}`);
      }
      
    } catch (err) {
      console.error(`Strategy "${strategy.name}" failed:`, err.message);
      if (err.response) {
        console.error("API Response Status:", err.response.status);
        console.error("API Response Data:", err.response.data);
      }
    }
  }

  console.log("All search strategies exhausted, no articles found.");
  return [];
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

function formatTweet(text) {
  let finalText = text.trim();
  const parsed = twitter.parseTweet(finalText);
  if (parsed.weightedLength > MAX_TWEET_LENGTH) {
    finalText = finalText.substring(0, MAX_TWEET_LENGTH - 1) + "…";
  }
  for (const tag of HASHTAGS) {
    const test = `${finalText} ${tag}`;
    if (twitter.parseTweet(test).valid) finalText = test;
    else break;
  }
  return finalText;
}

// --- Main ---
async function runBot() {
  console.log("Starting AI News Bot...");
  console.log("News API Key present:", !!process.env.NEWS_API_KEY);

  const articles = await fetchNews();
  if (!articles.length) {
    console.log("No articles found. This could be due to:");
    console.log("1. Invalid News API key");
    console.log("2. API quota exceeded");
    console.log("3. Network issues");
    console.log("4. No matching articles for the search terms");
    return;
  }

  // Pick first relevant article with both title and URL
  const article = articles.find(a => 
    a.title && 
    a.url && 
    RELEVANT_TERMS.test(a.title)
  );
  
  if (!article) {
    console.log("No relevant articles with title and URL found.");
    console.log("Available articles:");
    articles.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title || 'No title'} - Has URL: ${!!a.url} - AI Relevant: ${RELEVANT_TERMS.test(a.title || '')}`);
    });
    return;
  }

  console.log("\n=== SELECTED ARTICLE ===");
  console.log("Title:", article.title);
  console.log("URL:", article.url);
  console.log("========================\n");

  const tweetContent = formatTweet(`${article.title} ${article.url}`);
  console.log("Tweeting:", tweetContent);
  console.log("Tweet length:", twitter.parseTweet(tweetContent).weightedLength);

  try {
    await rwClient.v2.tweet(tweetContent);
    console.log("Tweet posted successfully!");
  } catch (err) {
    console.error("Tweet failed:", err);
  }
}

runBot();