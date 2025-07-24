// 1. 引入依赖并加载 .env 配置
require("dotenv").config();
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { createOpenRouter } = require("@openrouter/ai-sdk-provider");
const { generateText } = require("ai");

// 2. 从 .env 文件中获取配置信息
const {
  NOTION_KEY,
  NOTION_DATABASE_ID,
  OPENROUTER_KEY,
  OPENROUTER_MODEL_ID,
  YOUR_APP_URL,
  YOUR_APP_NAME,
} = process.env;

const NOTION_SUMMARY_PROPERTY_NAME = "Summary";

// 3. 初始化 Notion 客户端
const notion = new Client({ auth: NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 4. 初始化 OpenRouter AI Provider
const openrouter = createOpenRouter({
  apiKey: OPENROUTER_KEY,
  site: YOUR_APP_URL,
  title: YOUR_APP_NAME,
});

/**
 * @description 使用 AI SDK 和 OpenRouter 生成摘要
 * @param {string} content - 需要被总结的文章内容
 * @returns {Promise<string|null>} - AI 生成的摘要文本，或在失败时返回 null
 */
async function getAiSummary(content) {
  if (!content || content.length < 100) {
    console.log("-> 内容过短，跳过 AI 总结。");
    return null;
  }

  console.log("-> 正在发送内容给 OpenRouter 进行总结...");

  try {
    const { text } = await generateText({
      model: openrouter(OPENROUTER_MODEL_ID),
      system:
        "你是一个专业的文本摘要助手。请根据用户提供的内容，生成一段简洁、流畅、准确的中文摘要，直接输出摘要本身，不要包含任何额外的前缀或解释，例如不要说'这是摘要：'。",
      prompt: content,
      maxTokens: 256,
      temperature: 0.5,
    });

    console.log("-> AI 摘要生成成功！");
    return text.trim();
  } catch (error) {
    console.error("-> 调用 OpenRouter API 失败:", error.message);
    return null;
  }
}

/**
 * @description 主函数，执行整个工作流 (保持不变)
 */
async function main() {
  console.log("🚀 开始执行 Notion 内容总结任务...");

  try {
    // 4. 查询数据库中的所有页面
    console.log(`正在从数据库 [${NOTION_DATABASE_ID}] 中获取页面...`);
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        and: [
          {
            property: NOTION_SUMMARY_PROPERTY_NAME,
            rich_text: {
              is_empty: true,
            },
          },
          {
            property: "Status",
            status: {
              equals: "New",
            },
          },
        ],
      },
    });
    const pages = response.results;
    console.log(`查询到 ${pages.length} 个需要处理的页面。`);

    // 5. 遍历每个页面进行处理
    for (const page of pages) {
      const pageTitle = page.properties.Name?.title[0]?.plain_text || page.id;
      console.log(`\n📄 正在处理页面: "${pageTitle}" (ID: ${page.id})`);

      try {
        // 6. 获取页面内容并转换为纯文本
        const mdblocks = await n2m.pageToMarkdown(page.id);
        const mdString = n2m.toMarkdownString(mdblocks);
        const pageContent = mdString.parent;

        // 7. 调用 AI 生成摘要
        const summary = await getAiSummary(pageContent);

        // 8. 如果成功生成摘要，则更新 Notion 页面
        if (summary) {
          console.log(`-> 正在将摘要写回 Notion 页面...`);
          await notion.pages.update({
            page_id: page.id,
            properties: {
              [NOTION_SUMMARY_PROPERTY_NAME]: {
                rich_text: [
                  {
                    text: {
                      content: summary,
                    },
                  },
                ],
              },
            },
          });
          console.log(`-> ✅ 页面 "${pageTitle}" 更新成功！`);
        }
      } catch (pageError) {
        console.error(
          `-> 处理页面 "${pageTitle}" 时发生错误:`,
          pageError.message
        );
      }

      // 增加延迟，避免触发 API 速率限制
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n✨ 全部任务执行完毕！");
  } catch (error) {
    console.error("执行主任务时发生严重错误:", error.body || error.message);
  }
}

// 运行主函数
main();
