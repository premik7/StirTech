const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

class TwitterScraper {
    constructor(twitterUsername, twitterPassword) {
        this.twitterUsername = twitterUsername;
        this.twitterPassword = twitterPassword;

        // MongoDB Configuration
        const password = encodeURIComponent('chinna244662'); // Encode special characters
        this.mongoUri = `mongodb+srv://premikk7:${password}@premik123.rie3d.mongodb.net/?retryWrites=true&w=majority&appName=premik123`;

        this.mongoClient = new MongoClient(this.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        this.dbName = 'twitter_trends';
        this.collectionName = 'trending_topics';

        // Proxy Configuration (Optional)
        this.proxyHost = 'open.proxymesh.com';
        this.proxyPort = '31280';
        this.proxyUsername = 'Premik';
        this.proxyPassword = 'DBJf@PDz7TvjrT.';
    }

    async setupDriver() {
        const options = new chrome.Options();

        // Add arguments to the Chrome options
        options.addArguments('--disable-extensions');
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments('--start-maximized');
        options.addArguments(
            'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        );

        // Uncomment the following line to run in headless mode
        // options.addArguments('--headless'); 

        // Initialize the driver without explicitly using `ServiceBuilder`
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        return { driver, proxyIp: this.proxyHost };
    }

    async loginToTwitter(driver) {
        try {
            // Change from x.com/login to twitter.com/i/flow/login for direct login
            await driver.get('https://twitter.com/i/flow/login');
            console.log('Navigated to Twitter login page.');
    
            // Wait for the username input to appear
            const usernameInput = await driver.wait(
                until.elementLocated(By.css('input[autocomplete="username"]')),
                120000 // Keeping your original timeout
            );
            await usernameInput.sendKeys(this.twitterUsername);
    
            // Click 'Next' button
            const nextButton = await driver.findElement(By.xpath("//span[text()='Next']"));
            await nextButton.click();
    
            // Wait for the password input to appear
            const passwordInput = await driver.wait(
                until.elementLocated(By.css('input[name="password"]')),
                120000 // Keeping your original timeout
            );
            await passwordInput.sendKeys(this.twitterPassword);
    
            // Click 'Log in' button
            const loginButton = await driver.findElement(By.xpath("//span[text()='Log in']"));
            await loginButton.click();
    
            // Confirm login by waiting for the home navigation element
            await driver.wait(
                until.elementLocated(By.xpath('//a[@aria-label="Home"]')),
                120000 // Keeping your original timeout
            );
    
            console.log("Successfully logged into Twitter.");
        } catch (error) {
            console.error(`Login failed: ${error.message}`);
            const currentUrl = await driver.getCurrentUrl();
            console.log(`Current URL during failure: ${currentUrl}`);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async getTrendingTopics() {
        let driver;
        try {
            // Initialize the browser
            const { driver: initializedDriver } = await this.setupDriver();
            driver = initializedDriver;
    
            // Connect to MongoDB
            await this.mongoClient.connect();
            const db = this.mongoClient.db(this.dbName);
            const collection = db.collection(this.collectionName);
    
            // Log in to Twitter
            await this.loginToTwitter(driver);
    
            // Navigate to the "What’s Happening" section
            await driver.get('https://twitter.com/explore');
            await driver.wait(until.titleContains('Explore'), 60000);
    
            // Locate trending topics using data-testid
            const trendElements = await driver.wait(
                until.elementsLocated(By.css('div[data-testid="trend"] span')),
                30000 // Increased timeout
            );
    
            const trends = [];
            for (let trendElement of trendElements) {
                const trendText = await trendElement.getText();
    
                // Filter out irrelevant data
                if (
                    trendText &&
                    trendText.trim() !== "" && // Exclude empty strings
                    !trendText.match(/^(Entertainment|Politics|Business & finance|Trending in|posts|\d+)$/i) // Exclude unwanted patterns
                ) {
                    trends.push(trendText);
                }
            }
    
            // Ensure the list only contains unique trend names
            const uniqueTrends = [...new Set(trends)];
    
            // Save trending topics to the database
            const record = {
                _id: uuidv4(),
                trends: uniqueTrends,
                timestamp: new Date(),
            };
    
            await collection.insertOne(record);
            console.log('Trends saved:', record);
            return record;
        } catch (error) {
            console.error(`Error fetching trending topics: ${error.message}`);
            throw error;
        } finally {
            if (driver) await driver.quit();
            await this.mongoClient.close();
        }
    
      }
    
    
}

module.exports = TwitterScraper;
