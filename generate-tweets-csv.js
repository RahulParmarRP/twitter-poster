import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";

function createTweets() {
  const now = new Date();
  const today = now.toLocaleDateString();
  const time = now.toLocaleTimeString();
  
  return [
    ["Automation tip: Use GitHub Actions to auto-post to Twitter!", "https://example.com", "#automation"],
    [`Daily coding thought (${today} ${time})`, "", "#life"],
    ["Check out this awesome open-source project!", "https://github.com", "#open-source"],
    ["Node.js makes scripting so much easier", "", "#nodejs"],
    ["GitHub Actions are better than traditional cron jobs", "", "#devops"],
    ["Building something cool today! What about you?", "", "#coding"]
  ];
}

async function generateTweetsCSV() {
  try {
    const tweets = createTweets();
    
    const csvWriter = createArrayCsvWriter({
      header: ["tweet", "url", "hashtags"],
      path: "posts.csv"
    });
    
    await csvWriter.writeRecords(tweets);
    
    console.log("posts.csv generated!");
    console.log(`Created ${tweets.length} tweets`);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}


generateTweetsCSV();
