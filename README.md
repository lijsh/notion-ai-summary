# Notion AI Summarizer 🤖️

这是一个自动化脚本，可以连接到指定的 Notion 数据库，读取其中每个新页面的内容，通过 AI 模型（使用 OpenRouter 服务）生成摘要，然后将摘要自动写回到该 Notion 页面的指定属性中。

整个流程既可以在本地手动运行，也可以通过 GitHub Actions 设置为周期性自动执行。

## ✨ 主要功能

  * **自动化内容总结**: 自动抓取 Notion 数据库中新页面的全部内容。
  * **灵活的 AI 模型集成**: 可连接到 OpenRouter 上提供的任何摘要模型。
  * **无缝的 Notion 集成**: 将生成的摘要更新到 Notion 数据库的指定属性（列）中。
  * **周期性执行**: 内置 GitHub Actions 工作流，可以按设定的时间表（例如每天）自动运行。
  * **安全配置**: 在本地开发时使用 `.env` 文件，在自动化流程中则使用 GitHub Secrets 来保证您的 API 密钥安全。

-----

## 🛠️ 环境要求

在开始之前，请确保您已准备好以下各项：

  * **Node.js**: v18.x 或更高版本。
  * **Notion 账户**: 并准备好一个用于操作的数据库。
  * **Notion 集成 Token**: 一个可以访问目标数据库的内部集成 Token。
  * **OpenRouter 账户**: 并创建一个 API Key。

-----

## 🚀 安装与设置

1.  **克隆仓库**

    ```bash
    git clone <你的仓库地址>
    cd <仓库名称>
    ```

2.  **安装依赖**

    ```bash
    npm install
    ```

3.  **创建环境变量文件**
    将示例文件 `.env.example` 复制为一份名为 `.env` 的新文件。

    ```bash
    cp .env.example .env
    ```

4.  **配置环境变量**
    打开 `.env` 文件，填入您自己的密钥和ID。详细说明请参考下方的“配置”部分。

-----

## 🏃 如何运行

在本地手动执行此脚本，请使用以下命令：

```bash
node index.js
```

脚本将会查找指定数据库中摘要栏位为空的所有页面，为它们生成摘要，并更新页面。

-----

## ⚙️ GitHub Actions 自动化

本项目已包含一个位于 `.github/workflows/summarize.yml` 的工作流文件，可以按预设的时间表自动运行脚本。

1.  **设置 Secrets**: 要启用此功能，您必须在您的 GitHub 仓库的 `Settings` \> `Secrets and variables` \> `Actions` 页面中，将您的环境变量添加为 **Repository Secrets**。
2.  **触发方式**: 工作流默认设置为每天运行，但您也可以在仓库的 "Actions" 标签页中手动触发它。

-----

## 🔑 配置说明

以下环境变量需要在本地开发的 `.env` 文件中，或在 GitHub Actions 的 Secrets 中进行设置。

| 变量名 | 描述 | 示例 |
| :--- | :--- | :--- |
| `NOTION_KEY` | 你的 Notion 内部集成 Token。 | `secret_...` 或 `ntn_...` |
| `NOTION_DATABASE_ID`| 你的目标 Notion 数据库 ID。 | `a1b2c3d4e5f6...` |
| `NOTION_SUMMARY_PROPERTY_NAME`| Notion 数据库中用于存放摘要的属性（列）的准确名称。 | `Summary` 或 `AI摘要` |
| `OPENROUTER_KEY` | 你从 OpenRouter 获取的 API Key。 | `sk-or-v1-abc...` |
| `OPENROUTER_MODEL_ID`| 你选择用于生成摘要的 OpenRouter 模型ID。 | `anthropic/claude-3-haiku` |
| `YOUR_APP_URL` | (推荐) 你的项目URL，用于API请求头。 | `https://github.com/你的用户名/你的仓库` |
| `YOUR_APP_NAME` | (推荐) 你的项目名称，用于API请求头。 | `Notion AI Summarizer` |