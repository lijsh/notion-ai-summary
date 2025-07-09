// index.js (已更新为使用时间戳筛选)

require("dotenv").config();
const { Client } = require("@notionhq/client");

const { READ_LOG_NOTION_KEY, READ_LOG_NOTION_DATABASE_ID } = process.env;

const NOTION_TIMESTAMP_PROPERTY_NAME = "时间戳";
const NOTION_CHECKBOX_PROPERTY_NAME = "已同步";
const NOTION_TIME_PROPERTY_NAME = "时长";

const notion = new Client({ auth: READ_LOG_NOTION_KEY });

async function main() {
	console.log("🚀 开始执行每日同步任务 (时间戳模式)...");

	try {
		// --- START: 时间戳计算逻辑 ---
		// 1. 获取一个表示“今天”凌晨 00:00:00 UTC 的 Date 对象
		const today = new Date();
		today.setUTCHours(-8, 0, 0, 0); // 设置为 UTC-8 时区的凌晨 00:00:00

		// 2. 基于“今天”的 Date 对象，创建一个表示“昨天”凌晨 00:00:00 UTC 的对象
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);
		// --- END: 时间戳计算逻辑结束 ---

		console.log(
			`🔍 正在查找“${NOTION_TIMESTAMP_PROPERTY_NAME}”为 ${yesterdayTimestamp} 的项目...`,
		);

		const response = await notion.databases.query({
			database_id: READ_LOG_NOTION_DATABASE_ID,
			// --- START: 筛选逻辑已更新为使用 number filter ---
			filter: {
				and: [
					{
						property: NOTION_TIMESTAMP_PROPERTY_NAME,
						number: {
							equals: yesterdayTimestamp,
						},
					},
					{
						property: NOTION_CHECKBOX_PROPERTY_NAME,
						checkbox: {
							equals: false,
						},
					},
					{
						property: NOTION_TIME_PROPERTY_NAME,
						number: {
							greater_than: 300, // 确保有其他属性存在
						},
					},
				],
			},
			// --- END: 筛选逻辑更新结束 ---
		});

		const pagesToUpdate = response.results;
		console.log(`找到了 ${pagesToUpdate.length} 个需要同步的项目。`);

		if (pagesToUpdate.length === 0) {
			console.log("✨ 没有需要处理的项目，任务结束。");
			return;
		}

		// 后续的遍历和更新逻辑保持不变
		for (const page of pagesToUpdate) {
			const pageId = page.id;
			const titleProperty = Object.values(page.properties).find(
				(prop) => prop.type === "title",
			);
			const pageTitle = titleProperty?.title[0]?.plain_text || pageId;

			console.log(`  -> 正在更新项目: "${pageTitle}"...`);

			await notion.pages.update({
				page_id: pageId,
				properties: {
					[NOTION_CHECKBOX_PROPERTY_NAME]: {
						checkbox: true,
					},
				},
			});

			console.log(`  -> ✅ 项目 "${pageTitle}" 已成功标记为“已同步”。`);
			await new Promise((resolve) => setTimeout(resolve, 333));
		}

		console.log("\n🎉 所有项目均已同步完成！");
	} catch (error) {
		console.error("执行任务时发生错误:", error.body || error.message);
	}
}

main();
