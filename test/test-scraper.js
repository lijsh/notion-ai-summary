const { getCleanedWebContent } = require("../src/web-scraper.js");

/**
 * @description 打印测试结果的通用函数
 */
function printResult(result, duration = null) {
  if (result.success) {
    console.log(`✅ 爬取成功!`);
    if (duration !== null) {
      console.log(`⏱️  耗时: ${duration}ms`);
    }
    console.log(`📰 标题: ${result.title}`);
    console.log(`📊 内容长度: ${result.length} 字符`);
    console.log(`🌐 站点: ${result.siteName || "未知"}`);

    if (result.excerpt) {
      console.log(
        `📝 摘要: ${result.excerpt.slice(0, 150)}${
          result.excerpt.length > 150 ? "..." : ""
        }`
      );
    }

    if (result.content) {
      console.log(
        `📄 内容预览: ${result.content.slice(0, 200)}${
          result.content.length > 200 ? "..." : ""
        }`
      );
    }
  } else {
    console.log(`❌ 爬取失败: ${result.error}`);
  }
}

/**
 * @description 测试预设的网页列表
 */
async function testPresetUrls() {
  console.log("🧪 开始测试预设网页列表...\n");

  const testUrls = [
    "https://www.stats.gov.cn/sj/zxfb/202406/t20240617_1954711.html",
  ];

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n📄 测试 ${i + 1}/${testUrls.length}: ${url}`);
    console.log("=" + "=".repeat(50));

    try {
      const startTime = Date.now();
      const result = await getCleanedWebContent(url);
      const endTime = Date.now();

      printResult(result, endTime - startTime);
    } catch (error) {
      console.log(`💥 测试出错: ${error.message}`);
    }

    // 添加延迟避免请求过快
    if (i < testUrls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n✨ 测试完成!");
}

/**
 * @description 测试不同配置选项
 */
async function testDifferentOptions() {
  console.log("🚀 开始测试不同配置选项...\n");

  const testCases = [
    {
      name: "基础测试（默认配置）",
      url: "https://httpbin.org/html",
      options: {},
    },
    {
      name: "滚动加载测试",
      url: "https://quotes.toscrape.com/js/",
      options: {
        scrollToBottom: true,
        waitTime: 5000,
      },
    },
    {
      name: "快速测试（短等待时间）",
      url: "https://httpbin.org/html",
      options: {
        waitTime: 1000,
      },
    },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📄 测试 ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log("=" + "=".repeat(60));

    try {
      const startTime = Date.now();
      const result = await getCleanedWebContent(testCase.url, testCase.options);
      const endTime = Date.now();

      printResult(result, endTime - startTime);
    } catch (error) {
      console.log(`💥 测试出错: ${error.message}`);
    }

    // 添加延迟避免请求过快
    if (i < testCases.length - 1) {
      console.log("\n⏳ 等待2秒后继续下一个测试...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n✨ 所有测试完成!");
}

// 支持命令行调用
if (require.main === module) {
  const url = process.argv[2];
  const mode = process.argv[3] || "preset"; // preset, options, single

  // 解析命令行参数
  const scrollToBottom = process.argv.includes("--scroll");
  const headless =
    !process.argv.includes("--show-browser") &&
    !process.argv.includes("--debug");
  const debug = process.argv.includes("--debug");
  const waitTimeArg = process.argv.find((arg) => arg.startsWith("--wait="));
  const waitTime = waitTimeArg
    ? parseInt(waitTimeArg.split("=")[1])
    : debug
    ? 10000
    : 3000;

  if (url) {
    console.log(`🚀 测试单个URL: ${url}`);
    console.log(`📜 滚动加载: ${scrollToBottom}`);
    console.log(`👻 无头模式: ${headless}`);
    console.log(`⏰ 等待时间: ${waitTime}ms`);
    if (debug) console.log(`🐛 调试模式: 已启用`);
    console.log("");

    const options = {
      scrollToBottom,
      headless,
      waitTime,
    };

    getCleanedWebContent(url, options)
      .then((result) => {
        console.log("\n📋 完整结果:");
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error("❌ 错误:", error.message);
      });
  } else {
    // 根据模式运行不同的测试
    if (mode === "options") {
      testDifferentOptions();
    } else {
      testPresetUrls();
    }
  }
}
