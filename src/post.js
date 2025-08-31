import { TwitterApi } from "twitter-api-v2";
import fs from "fs";
import csv from "csv-parser";
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

// Read CSV and post tweets
async function postFromCSV() {
  const rows = [];

  fs.createReadStream("posts.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      console.log(`Found ${rows.length} tweets to post`);
      
      for (const row of rows) {
        const text = `${row.tweet} ${row.url} ${row.hashtags}`.trim();
        
        try {
          await client.v2.tweet({ text });
          console.log("Posted:", text);
          
          // Wait 10 seconds to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 10000));
          
        } catch (error) {
          console.error("Error posting tweet:", error.message);
        }
      }
      
      console.log("Finished posting all tweets");
    });
}

// Run the posting function
postFromCSV();
