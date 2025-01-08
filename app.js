const express = require('express');
const path = require('path');
require('dotenv').config();
const TwitterScraper = require('./twitterScraper');

// Initialize express
const app = express();
const port = process.env.PORT || 3000;

// Function to get client IP address
// Function to get client IP address
const getClientIp = (req) => {
    // Check for the 'X-Forwarded-For' header (commonly used behind proxies)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // The forwarded header might contain multiple IPs, the first one is the real IP
        return forwarded.split(',')[0];
    }
    // Fallback to the remote address if no forwarded header exists
    return req.connection.remoteAddress || req.socket.remoteAddress;
};


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
        const clientIp = getClientIp(req);

        // Filter out category headers and post counts
        const cleanTrends = record.trends.filter(trend => 
            !trend.includes(' · Trending') &&
            !trend.includes('posts') &&
            !trend.includes('Trending in') &&
            trend.startsWith('#')  // Only include hashtags
        ).slice(0, 5);  // Get top 5 trending hashtags

        // Create formatted MongoDB record
        const formattedRecord = {
            _id: { XXX: "XXXXXXX" },
            nameoftrend1: cleanTrends[0] || "XXXX",
            nameoftrend2: cleanTrends[1] || "XXXX",
            nameoftrend3: cleanTrends[2] || "XXXX",
            nameoftrend4: cleanTrends[3] || "XXXX",
            nameoftrend5: cleanTrends[4] || "XXXX"
        };

        res.json({
            success: true,
            data: {
                trends: cleanTrends,
                timestamp: record.timestamp,
                ip_address: clientIp,
                mongo_record: formattedRecord
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