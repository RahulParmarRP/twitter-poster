// index.ts - Main AI News Twitter Bot
import { TwitterApi } from 'twitter-api-v2';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  urlToImage?: string;
}

interface TweetData {
  text: string;
  url: string;
  imageUrl?: string;
}

class AINewsTwitterBot {
  private twitter: TwitterApi;
  private postedArticles: Set<string>;
  private readonly POSTED_CACHE_FILE = 'posted_articles.json';

  constructor() {
    // Initialize Twitter client
    this.twitter = new TwitterApi({
      appKey: process.env.TWITTER_APP_KEY!,
      appSecret: process.env.TWITTER_APP_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    // Load previously posted articles to avoid duplicates
    this.loadPostedArticles();
  }

  /**
   * Load posted articles cache to avoid duplicates
   */
  private loadPostedArticles(): void {
    try {
      if (fs.existsSync(this.POSTED_CACHE_FILE)) {
        const data = fs.readFileSync(this.POSTED_CACHE_FILE, 'utf8');
        this.postedArticles = new Set(JSON.parse(data));
      } else {
        this.postedArticles = new Set();
      }
    } catch (error) {
      console.error('Error loading posted articles cache:', error);
      this.postedArticles = new Set();
    }
  }

  /**
   * Save posted articles cache
   */
  private savePostedArticles(): void {
    try {
      fs.writeFileSync(
        this.POSTED_CACHE_FILE,
        JSON.stringify(Array.from(this.postedArticles))
      );
    } catch (error) {
      console.error('Error saving posted articles cache:', error);
    }
  }

  /**
   * Fetch AI news from NewsAPI
   */
  async fetchAINews(): Promise<NewsArticle[]> {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY not found in environment variables');
    }

    const queries = [
      'artificial intelligence',
      'machine learning',
      'ChatGPT',
      'OpenAI',
      'AI technology',
      'neural networks'
    ];

    const allArticles: NewsArticle[] = [];

    for (const query of queries) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${newsApiKey}`;
        
        const response = await fetch(url);
        const data = await response.json() as any;

        if (data.articles) {
          const articles: NewsArticle[] = data.articles.map((article: any) => ({
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
            urlToImage: article.urlToImage
          }));

          allArticles.push(...articles);
        }
      } catch (error) {
        console.error(`Error fetching news for query "${query}":`, error);
      }
    }

    // Remove duplicates and filter out already posted articles
    const uniqueArticles = allArticles.filter((article, index, arr) => 
      arr.findIndex(a => a.url === article.url) === index &&
      !this.postedArticles.has(article.url)
    );

    // Sort by publication date (newest first)
    return uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5);
  }

  /**
   * Summarize article using Hugging Face API
   */
  async summarizeArticle(article: NewsArticle): Promise<string> {
    const hfApiKey = process.env.HF_API_KEY;
    if (!hfApiKey) {
      // Fallback to manual summarization
      return this.manualSummarize(article);
    }

    try {
      const text = `${article.title}. ${article.description}`;
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            parameters: {
              max_length: 100,
              min_length: 30,
              do_sample: false
            }
          }),
        }
      );

      const result = await response.json() as any;
      
      if (result[0]?.summary_text) {
        return this.formatForTweet(result[0].summary_text, article);
      } else {
        return this.manualSummarize(article);
      }
    } catch (error) {
      console.error('Error with HF summarization:', error);
      return this.manualSummarize(article);
    }
  }

  /**
   * Manual summarization fallback
   */
  private manualSummarize(article: NewsArticle): string {
    let summary = article.title;
    
    // If title is too long, truncate it
    if (summary.length > 200) {
      summary = summary.substring(0, 197) + '...';
    }

    return this.formatForTweet(summary, article);
  }

  /**
   * Format summary into tweet with hashtags and URL
   */
  private formatForTweet(summary: string, article: NewsArticle): string {
    const hashtags = this.generateHashtags(article);
    const maxSummaryLength = 280 - hashtags.length - article.url.length - 10; // buffer for spaces

    let tweetText = summary;
    if (tweetText.length > maxSummaryLength) {
      tweetText = tweetText.substring(0, maxSummaryLength - 3) + '...';
    }

    return `${tweetText}\n\n${hashtags}\n\n${article.url}`;
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(article: NewsArticle): string {
    const text = `${article.title} ${article.description}`.toLowerCase();
    const hashtags: string[] = [];

    // AI-related hashtags
    if (text.includes('chatgpt') || text.includes('gpt')) hashtags.push('#ChatGPT');
    if (text.includes('openai')) hashtags.push('#OpenAI');
    if (text.includes('anthropic') || text.includes('claude')) hashtags.push('#Anthropic');
    if (text.includes('google') && text.includes('ai')) hashtags.push('#GoogleAI');
    if (text.includes('microsoft') && text.includes('ai')) hashtags.push('#MicrosoftAI');
    if (text.includes('machine learning') || text.includes('ml')) hashtags.push('#MachineLearning');
    if (text.includes('deep learning')) hashtags.push('#DeepLearning');
    if (text.includes('neural network')) hashtags.push('#NeuralNetworks');
    if (text.includes('llm') || text.includes('large language')) hashtags.push('#LLM');

    // Always include core AI hashtags
    if (hashtags.length === 0) {
      hashtags.push('#AI', '#Tech');
    } else {
      hashtags.push('#AI');
    }

    // Limit to 4 hashtags max to avoid spam appearance
    return hashtags.slice(0, 4).join(' ');
  }

  /**
   * Create tweet data from articles
   */
  async createTweets(articles: NewsArticle[]): Promise<TweetData[]> {
    const tweets: TweetData[] = [];

    for (const article of articles) {
      try {
        const summary = await this.summarizeArticle(article);
        tweets.push({
          text: summary,
          url: article.url,
          imageUrl: article.urlToImage
        });
      } catch (error) {
        console.error('Error creating tweet for article:', article.title, error);
      }
    }

    return tweets;
  }

  /**
   * Post tweet to Twitter
   */
  async postTweet(tweetData: TweetData): Promise<boolean> {
    try {
      const tweetOptions: any = {
        text: tweetData.text
      };

      // Add image if available
      if (tweetData.imageUrl) {
        try {
          const imageResponse = await fetch(tweetData.imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const mediaId = await this.twitter.v1.uploadMedia(imageBuffer, {
            mimeType: 'image/jpeg'
          });
          
          tweetOptions.media = { media_ids: [mediaId] };
        } catch (imageError) {
          console.warn('Failed to upload image, posting without it:', imageError);
        }
      }

      const tweet = await this.twitter.v2.tweet(tweetOptions);
      console.log('Tweet posted successfully:', tweet.data.id);
      
      // Mark article as posted
      this.postedArticles.add(tweetData.url);
      this.savePostedArticles();
      
      return true;
    } catch (error) {
      console.error('Error posting tweet:', error);
      return false;
    }
  }

  /**
   * Main bot execution
   */
  async run(): Promise<void> {
    try {
      console.log('🤖 AI News Twitter Bot starting...');

      // Step 1: Fetch AI news
      console.log('📰 Fetching AI news...');
      const articles = await this.fetchAINews();
      console.log(`Found ${articles.length} new articles`);

      if (articles.length === 0) {
        console.log('No new articles to post');
        return;
      }

      // Step 2: Create tweets
      console.log('✍️ Creating tweets...');
      const tweets = await this.createTweets(articles);

      // Step 3: Post tweets (limit to 1-2 per run to avoid spam)
      const tweetsToPost = tweets.slice(0, 2);
      console.log(`📤 Posting ${tweetsToPost.length} tweets...`);

      let successCount = 0;
      for (const tweet of tweetsToPost) {
        const success = await this.postTweet(tweet);
        if (success) successCount++;
        
        // Wait between tweets to avoid rate limits
        if (tweetsToPost.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      console.log(`✅ Successfully posted ${successCount}/${tweetsToPost.length} tweets`);

    } catch (error) {
      console.error('❌ Bot execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test mode - fetch and log without posting
   */
  async test(): Promise<void> {
    try {
      console.log('🧪 Test mode - fetching news without posting...');
      
      const articles = await this.fetchAINews();
      console.log(`Found ${articles.length} articles:`);
      
      for (const article of articles.slice(0, 3)) {
        console.log('\n---');
        console.log('Title:', article.title);
        console.log('Source:', article.source);
        console.log('URL:', article.url);
        
        const summary = await this.summarizeArticle(article);
        console.log('Tweet preview:', summary);
        console.log('Length:', summary.length);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  }
}

// CLI interface
async function main() {
  const bot = new AINewsTwitterBot();
  
  const testMode = process.argv.includes('--test');
  
  if (testMode) {
    await bot.test();
  } else {
    await bot.run();
  }
}

// Export for testing
export { AINewsTwitterBot };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}