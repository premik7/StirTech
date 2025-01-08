// app.js
const express = require('express');
const path = require('path');
require('dotenv').config();
const TwitterScraper = require('./twitterScraper');

// Initialize express
const app = express();
const port = process.env.PORT || 3000;

// Initialize scraper with environment variables
const scraper = new TwitterScraper(
    process.env.TWITTER_USERNAME,
    process.env.TWITTER_PASSWORD
);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/scrape', async (req, res) => {
    try {
        const record = await scraper.getTrendingTopics();
        
        // Filter out category headers and post counts
        const cleanTrends = record.trends.filter(trend => 
            !trend.includes(' · Trending') &&
            !trend.includes('posts') &&
            !trend.includes('Trending in') &&
            trend.startsWith('#')  // Only include hashtags
        ).slice(0, 5);  // Get top 5 trending hashtags

        res.json({
            success: true,
            data: {
                trends: cleanTrends,
                timestamp: record.timestamp,
                mongo_record: record
            }
        });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});