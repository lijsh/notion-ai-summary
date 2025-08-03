const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const { chromium } = require("playwright");

/**
 * @description 使用Playwright获取动态加载的网页内容
 * @param {string} url - 目标网页URL
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} - 网页HTML内容
 */
async function fetchWebContentWithPlaywright(url, options = {}) {
  const {
    waitTime = 3000, // 等待页面加载时间
    timeout = 30000, // 页面超时时间（恢复30秒）
    headless = true, // 是否无头模式
    waitForSelector = null, // 等待特定元素加载
    scrollToBottom = false, // 是否滚动到底部加载更多内容
  } = options;

  let browser = null;
  try {
    console.log(`-> 启动Playwright浏览器访问: ${url}`);

    // 随机选择User-Agent
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ];
    
    const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    browser = await chromium.launch({
      headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ],
    });

    const context = await browser.newContext({
      userAgent: selectedUserAgent,
      viewport: { width: 1920, height: 1080 },
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });

    const page = await context.newPage();
    
    // 隐藏webdriver特征
    await page.addInitScript(() => {
      // 删除webdriver属性
      delete navigator.webdriver;
      
      // 覆盖permissions查询
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // 覆盖plugins长度
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      // 覆盖语言属性
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en']
      });
    });

    // 设置超时时间
    page.setDefaultTimeout(timeout);

    // 访问页面
    await page.goto(url, { waitUntil: "load" });

    // 等待特定元素（如果指定）
    if (waitForSelector) {
      console.log(`-> 等待元素加载: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // 滚动到底部加载更多内容
    if (scrollToBottom) {
      console.log(`-> 滚动页面加载更多内容`);
      await autoScroll(page);
    }

    // 等待页面加载完成
    console.log(`-> 等待 ${waitTime}ms 确保内容完全加载`);
    await page.waitForTimeout(waitTime);

    // 获取页面HTML
    const html = await page.content();
    
    // 调试信息：查看页面文本内容
    const textContent = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
    console.log(`-> 页面文本内容长度: ${textContent.length} 字符`);
    if (textContent.length < 1000) {
      console.log(`-> 页面文本预览: ${textContent.slice(0, 500)}`);
    }

    console.log(`-> Playwright获取成功，HTML长度: ${html.length} 字符`);
    return html;
  } catch (error) {
    console.error(`-> Playwright获取失败: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * @description 自动滚动页面到底部
 * @param {Page} page - Playwright页面对象
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}


/**
 * @description 使用Readability清洗HTML内容，提取主要文章内容
 * @param {string} html - 原始HTML内容
 * @param {string} url - 网页URL（用于设置baseURI）
 * @param {Object} options - 配置选项
 * @param {string} options.outputFormat - 输出格式：'html'（默认）或 'text'
 * @returns {Object} - 包含标题、内容等信息的对象
 */
function cleanContent(html, url, options = {}) {
  const { outputFormat = 'html' } = options;
  
  try {
    console.log("-> 正在使用Readability清洗内容...");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Readability无法解析该页面内容");
    }

    console.log(`-> 内容清洗成功 (${outputFormat}格式)`);
    
    const result = {
      title: article.title || "无标题",
      excerpt: article.excerpt || "",
      length: article.length || 0,
      siteName: article.siteName || "",
    };
    
    if (outputFormat === 'html') {
      result.content = article.content || "";
      result.textContent = article.textContent || "";
    } else {
      result.content = article.textContent || "";
    }
    
    return result;
  } catch (error) {
    console.error(`-> 内容清洗失败: ${error.message}`);
    throw error;
  }
}

/**
 * @description 完整的网页爬取和内容清洗流程
 * @param {string} url - 目标网页URL
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} - 清洗后的内容对象
 */
async function getCleanedWebContent(url, options = {}) {
  try {
    // 验证URL格式
    new URL(url);

    // 直接使用Playwright
    const html = await fetchWebContentWithPlaywright(url, options);
    
    // 清洗内容
    const cleanedContent = cleanContent(html, url, options);

    console.log(
      `-> 爬取完成 (playwright)，提取内容长度: ${cleanedContent.length} 字符`
    );
    return {
      url,
      method: "playwright",
      ...cleanedContent,
      success: true,
    };
  } catch (error) {
    console.error(`-> 爬取URL失败: ${url}, 错误: ${error.message}`);
    return {
      url,
      method: "playwright",
      title: "",
      content: "",
      excerpt: "",
      length: 0,
      siteName: "",
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  fetchWebContentWithPlaywright,
  cleanContent,
  getCleanedWebContent,
};
