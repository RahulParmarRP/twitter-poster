import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Twitter API client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Post a simple tweet with current date and time
async function postCurrentTime() {
  try {
    const now = new Date();
    const dateTime = now.toLocaleString();
    const text = `Current date and time: ${dateTime}`;
    
    console.log(`Posting: "${text}"`);
    
    const result = await client.v2.tweet({ text });
    
    console.log("Tweet posted successfully!");
    console.log(`Tweet ID: ${result.data.id}`);
    
  } catch (error) {
    console.error("Error posting tweet:", error.message);
  }
}

// Run the function
postCurrentTime();
