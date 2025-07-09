// index.js (使用原生 fetch)

// 1. 引入依赖并加载 .env 配置
require("dotenv").config();
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
// 注意：这里不再需要 require('axios')

// 2. 从 .env 文件中获取配置信息 (保持不变)
const {
	NOTION_KEY,
	NOTION_DATABASE_ID,
	OPENROUTER_KEY,
	OPENROUTER_MODEL_ID,
	YOUR_APP_URL,
	YOUR_APP_NAME,
} = process.env;

const NOTION_SUMMARY_PROPERTY_NAME = "Summary";

// 3. 初始化 Notion 客户端 (保持不变)
const notion = new Client({ auth: NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

/**
 * @description 调用 OpenRouter API 生成摘要 (使用原生 fetch 重构)
 * @param {string} content - 需要被总结的文章内容
 * @returns {Promise<string|null>} - AI 生成的摘要文本，或在失败时返回 null
 */
async function getAiSummary(content) {
	if (!content || content.length < 100) {
		console.log("-> 内容过短，跳过 AI 总结。");
		return null;
	}

	console.log("-> 正在发送内容给 OpenRouter 进行总结...");

	// 准备 fetch 请求的参数
	const url = "https://openrouter.ai/api/v1/chat/completions";
	const headers = {
		Authorization: `Bearer ${OPENROUTER_KEY}`,
		"HTTP-Referer": YOUR_APP_URL,
		"X-Title": YOUR_APP_NAME,
		"Content-Type": "application/json",
	};
	const body = {
		model: OPENROUTER_MODEL_ID,
		messages: [
			{
				role: "system",
				content:
					"你是一个专业的文本摘要助手。请根据用户提供的内容，生成一段简洁、流畅、准确的中文摘要，直接输出摘要本身，不要包含任何额外的前缀或解释，例如不要说'这是摘要：'。",
			},
			{ role: "user", content: content },
		],
		max_tokens: 256,
		temperature: 0.5,
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(body), // 使用 fetch 时，必须手动将 body 对象转换为 JSON 字符串
		});

		// fetch 不会自动因 HTTP 错误（如 4xx, 5xx）而抛出异常，所以需要手动检查
		if (!response.ok) {
			// 尝试解析错误详情以提供更清晰的日志
			const errorDetails = await response.json().catch(() => response.text());
			throw new Error(
				`HTTP 错误: ${response.status} ${response.statusText} - ${JSON.stringify(errorDetails)}`,
			);
		}

		const data = await response.json();
		const summary = data.choices[0].message.content.trim();
		console.log("-> AI 摘要生成成功！");
		return summary;
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
					pageError.message,
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
