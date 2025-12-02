// backend/server/crawler/crawler.js
const puppeteer = require("puppeteer");
const { extractJobDetails } = require("./extract");
const Job = require("../models/Job");

// Patterns to auto-detect job listing URLs
const JOB_PATTERNS = [
    /career/i,
    /careers/i,
    /jobs/i,
    /jobsearch/i,
    /position/i,
    /opening/i,
    /vacanc/i,
];

// STEP 1: Discover possible job list URLs
async function discoverJobPages(page, baseURL) {
    const links = await page.$$eval("a", as => as.map(a => a.href));
    const scripts = await page.$$eval("script", ss => ss.map(s => s.src).filter(Boolean));

    const candidates = [...links, ...scripts]
        .filter(url => url.startsWith("http"));

    return candidates.filter(url =>
        JOB_PATTERNS.some(regex => regex.test(url))
    );
}

// STEP 2: Auto-detect scroll type
async function detectScrollType(page) {
    return page.evaluate(() => {
        if (document.querySelector("[aria-label='Load more']")) return "load_more_button";
        if (document.querySelector("button.load-more")) return "load_more_button";
        if (document.querySelector(".infinite-scroll")) return "infinite_scroll";
        if (document.querySelector(".pagination")) return "pagination";
        return "scroll_until_no_change"; 
    });
}

// STEP 3A: Infinite scroll
async function scrollUntilEnd(page) {
    let prevHeight = await page.evaluate("document.body.scrollHeight");

    while (true) {
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForTimeout(2000);

        let newHeight = await page.evaluate("document.body.scrollHeight");
        if (newHeight === prevHeight) break;

        prevHeight = newHeight;
    }
}

// STEP 3B: Click Load More
async function clickLoadMore(page) {
    while (true) {
        const button = await page.$("button[aria-label='Load more'], button.load-more");
        if (!button) break;

        await button.click();
        await page.waitForTimeout(2000);
    }
}

// STEP 3C: Pagination
async function paginate(page, extractFn) {
    while (true) {
        await extractFn();

        const next = await page.$("a[aria-label='Next'], a.next");
        if (!next) break;

        await next.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" });
    }
}

// Extract job links after scroll/pagination
async function extractJobLinks(page) {
    return await page.$$eval("a", as =>
        as.map(a => a.href)
            .filter(href => href.includes("/job") || href.includes("position") || href.includes("apply"))
    );
}

// MASTER FUNCTION
async function crawlCompany(startURL) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    console.log("🌐 Visiting:", startURL);
    await page.goto(startURL, { waitUntil: "networkidle2" });

    // STEP 1: Discover URLs
    const discovered = await discoverJobPages(page, startURL);
    console.log("🔍 Discovered URLs:", discovered.length);

    const jobLinks = new Set();

    for (const url of discovered) {
        try {
            await page.goto(url, { waitUntil: "networkidle2" });
            console.log("➡️ Crawling:", url);

            const type = await detectScrollType(page);

            if (type === "infinite_scroll") await scrollUntilEnd(page);
            else if (type === "load_more_button") await clickLoadMore(page);
            else if (type === "pagination") {
                await paginate(page, async () => {
                    const links = await extractJobLinks(page);
                    links.forEach(l => jobLinks.add(l));
                });
                continue;
            } else {
                await scrollUntilEnd(page);
            }

            const links = await extractJobLinks(page);
            links.forEach(l => jobLinks.add(l));

        } catch (err) {
            console.log("❌ Failed to crawl", url, err.message);
        }
    }

    console.log("🟦 Total Job Detail URLs:", jobLinks.size);

    // Extract each job detail page
    let savedCount = 0;
    for (const link of jobLinks) {
        try {
            const data = await extractJobDetails(link);
            if (!data.title) continue;

            // check duplicate
            const exists = await Job.findOne({ apply_url: data.apply_url });
            if (exists) continue;

            // sanitize posted_date
            if (!data.posted_date || isNaN(new Date(data.posted_date))) {
                data.posted_date = null;
            }

            await Job.create(data);
            savedCount++;

        } catch (err) {
            console.log("❌ Job extract error:", err.message);
        }
    }

    console.log("💾 Jobs saved:", savedCount);
    await browser.close();

    return savedCount;
}

module.exports = { crawlCompany };
