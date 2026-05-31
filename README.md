# 简历编辑器

一个纯前端的在线简历编辑器，支持实时预览、AI 智能优化、PDF 导出，无需后端服务。

[![Deploy to GitHub Pages](https://github.com/Soundmark/resume/actions/workflows/deploy.yml/badge.svg)](https://github.com/Soundmark/resume/actions/workflows/deploy.yml)

## 功能特性

- **实时预览** — 左侧编辑、右侧即时渲染，所见即所得
- **AI 优化** — 支持一键润色（STAR 法则）和岗位 JD 定制优化
- **多格式导出** — 导出为 PDF 或 JSON，JSON 支持导入恢复
- **自动保存** — 数据持久化到 localStorage，刷新不丢失
- **灵活定制** — 支持自定义区块（如语言能力、志愿者经历等）
- **多页排版** — 自动分页，A4 尺寸精确预览
- **Markdown 支持** — 描述字段支持 Markdown 语法

## 在线演示

访问 [GitHub Pages](https://Soundmark.github.io/resume/) 体验在线版本。

## 功能截图

> 编辑器采用左右分栏布局，左侧填写简历内容，右侧实时预览 A4 排版效果。

## 快速开始

### 方式一：直接打开（推荐用于体验）

```bash
git clone https://github.com/user/resume.git
cd resume
open index.html
```

### 方式二：本地服务器（推荐用于开发）

由于使用了 ES Modules，部分浏览器需要通过 HTTP 服务访问：

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8080
```

然后访问 `http://localhost:8080`。

## 使用指南

### 基础操作

1. **填写信息** — 在左侧编辑区依次填写基础信息、工作经历、教育经历等
2. **实时预览** — 右侧会实时显示简历的 A4 排版效果
3. **自动保存** — 所有修改自动保存到浏览器本地存储，刷新不丢失
4. **导出 PDF** — 点击「导出 PDF」按钮生成 A4 尺寸的 PDF 文件
5. **导出/导入 JSON** — 点击「导出 JSON」备份数据，通过「导入 JSON」恢复

### AI 智能优化

1. 点击顶部「AI 设置」图标（⚙️），配置 API：
   - 选择 API 格式（OpenAI 兼容 / Anthropic）
   - 填入 API 地址、Key 和模型名称
2. 点击「AI 优化」按钮，选择优化模式：
   - **一键润色** — 使用 STAR 法则自动优化描述
   - **岗位定制** — 粘贴目标岗位 JD，针对性调整简历
3. 查看优化结果，逐条接受或忽略修改

### 自定义区块

点击「添加自定义区块」可创建任意板块，如：

- 语言能力
- 志愿者经历
- 开源贡献
- 兴趣爱好

### Markdown 语法

描述字段支持 Markdown，常用语法：

```markdown
**粗体文本** → 强调关键词

- 列表项 → 项目符号列表

1. 有序列表 → 编号列表
   `代码` → 技术术语高亮
   [链接文本](URL) → 超链接
```

## 项目结构

```
resume/
├── index.html                  # 入口页面（单页应用）
├── css/
│   └── styles.css              # 样式（CSS 变量主题）
├── js/
│   ├── app.js                  # 主入口，模块协调与事件绑定
│   ├── state.js                # 状态管理 + localStorage 持久化
│   ├── preview.js              # 简历预览渲染 + A4 自动分页
│   ├── export.js               # JSON 导入导出 + PDF 生成
│   ├── ai.js                   # AI 优化（OpenAI / Claude 集成）
│   └── sections/
│       ├── basicInfo.js        # 基础信息（姓名、联系方式等）
│       ├── experience.js       # 工作经历（增删排序）
│       ├── education.js        # 教育经历（增删排序）
│       ├── projects.js         # 项目经历（增删排序）
│       ├── tags.js             # 标签输入组件（技能/证书共用）
│       └── customSections.js   # 自定义区块
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 自动部署
└── README.md
```

## 技术栈

| 类别       | 技术                          |
| ---------- | ----------------------------- |
| 语言       | JavaScript (ES Modules)       |
| 样式       | CSS 自定义属性                |
| Markdown   | marked.js                     |
| PDF 生成   | html2canvas + jsPDF           |
| 数据持久化 | localStorage                  |
| AI 集成    | OpenAI API / Anthropic API    |
| 部署       | GitHub Actions + GitHub Pages |

## 架构设计

```
┌─────────────────────────────────────────────┐
│                  app.js                      │
│              (模块协调层)                      │
├──────────┬──────────┬───────────┬───────────┤
│ state.js │preview.js│ export.js │   ai.js   │
│ (状态管理)│(预览渲染) │ (导入导出) │ (AI优化)  │
├──────────┴──────────┴───────────┴───────────┤
│                 sections/                     │
│  (各简历模块的编辑器组件)                       │
└─────────────────────────────────────────────┘
```

**数据流：** 各模块编辑器 → `resumeData` 状态对象 → `debouncedSave()` → localStorage + `renderPreview()`

## 键盘快捷键

| 快捷键         | 功能           |
| -------------- | -------------- |
| `Ctrl/Cmd + S` | 导出 JSON 文件 |

## 隐私说明

- 所有数据仅存储在浏览器本地，不会上传到任何服务器
- AI 功能使用您自行配置的 API，密钥直接发送到对应服务商
- 项目不收集任何用户数据

## 自部署

### GitHub Pages（推荐）

1. Fork 本仓库
2. 在 Settings → Pages 中启用 GitHub Actions
3. 推送到 `main` 分支将自动部署

### 其他静态托管

本项目为纯静态文件，可部署到任何静态托管服务：

- Vercel
- Netlify
- Cloudflare Pages
- 阿里云 OSS + CDN

## License

MIT
