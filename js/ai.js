/**
 * ai.js — AI 简历优化模块
 *
 * 职责：
 *   1. AI 服务配置管理（endpoint / apiKey / model）
 *   2. 两种优化模式：一键润色 + 岗位 JD 定制
 *   3. 调用 OpenAI 兼容或 Anthropic API
 *   4. 解析 AI 返回的 JSON，构建 diff 对比 UI
 *   5. 支持逐条接受/忽略优化建议
 *
 * 支持的 API 格式：
 *   - OpenAI 兼容（OpenAI / DeepSeek / 本地模型等）
 *   - Anthropic Claude
 *
 * 隐私说明：
 *   - API Key 仅存储在浏览器 localStorage
 *   - 请求直接发送到用户配置的 API 端点，不经过任何中间服务器
 */

import { resumeData, saveToStorage } from './state.js';

/** @type {Function|null} 全量渲染回调，由 initAI 注入 */
let renderAllFn = null;

// ============================================================
// 1. AI 配置管理
// ============================================================

const CONFIG_STORAGE_KEY = 'aiConfig';

/** API 格式预设的默认值 */
const FORMAT_PRESETS = {
    openai: {
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        hint: 'OpenAI 兼容接口地址'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
        hint: 'Anthropic API 地址'
    }
};

function loadConfig() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveConfig(config) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function isConfigured() {
    const c = loadConfig();
    return !!(c.endpoint && c.apiKey && c.model);
}

// ============================================================
// 2. 设置弹窗（API 配置）
// ============================================================

function initSettingsDialog() {
    const overlay = document.getElementById('ai-settings-dialog');

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSettingsDialog();
    });

    // 取消按钮
    overlay.querySelector('[data-action="cancel-ai-settings"]').addEventListener('click', closeSettingsDialog);

    // 保存按钮
    overlay.querySelector('[data-action="save-ai-settings"]').addEventListener('click', () => {
        const format = document.getElementById('ai-format').value;
        const endpoint = document.getElementById('ai-endpoint').value.trim();
        const apiKey = document.getElementById('ai-apikey').value.trim();
        const model = document.getElementById('ai-model').value.trim();

        if (!endpoint || !apiKey || !model) {
            alert('请填写所有配置项');
            return;
        }

        saveConfig({
            format,
            endpoint: endpoint.replace(/\/+$/, ''), // 去除尾部斜杠
            apiKey,
            model
        });
        closeSettingsDialog();
    });

    // API 格式切换时更新提示文本
    document.getElementById('ai-format').addEventListener('change', (e) => {
        updateFormatHints(e.target.value);
    });

    // API Key 显示/隐藏切换
    overlay.querySelector('[data-action="toggle-apikey"]').addEventListener('click', () => {
        const input = document.getElementById('ai-apikey');
        const btn = overlay.querySelector('[data-action="toggle-apikey"]');
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '隐藏';
        } else {
            input.type = 'password';
            btn.textContent = '显示';
        }
    });
}

function updateFormatHints(format) {
    const preset = FORMAT_PRESETS[format] || FORMAT_PRESETS.openai;
    document.getElementById('ai-endpoint').placeholder = preset.endpoint;
    document.getElementById('ai-model').placeholder = preset.model;
    document.getElementById('ai-endpoint-hint').textContent = preset.hint;
}

function openSettingsDialog() {
    const c = loadConfig();
    const format = c.format || 'openai';
    document.getElementById('ai-format').value = format;
    document.getElementById('ai-endpoint').value = c.endpoint || '';
    document.getElementById('ai-apikey').value = c.apiKey || '';
    document.getElementById('ai-model').value = c.model || '';
    updateFormatHints(format);
    document.getElementById('ai-settings-dialog').classList.add('active');
}

function closeSettingsDialog() {
    document.getElementById('ai-settings-dialog').classList.remove('active');
}

// ============================================================
// 3. JD 输入弹窗
// ============================================================

function initJDDialog() {
    const overlay = document.getElementById('ai-jd-dialog');

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeJDDialog();
    });

    overlay.querySelector('[data-action="cancel-jd-dialog"]').addEventListener('click', closeJDDialog);
}

function openJDDialog() {
    document.getElementById('ai-jd-input').value = '';
    document.getElementById('ai-jd-dialog').classList.add('active');
}

function closeJDDialog() {
    document.getElementById('ai-jd-dialog').classList.remove('active');
}

// ============================================================
// 4. API 调用层
// ============================================================

/**
 * 根据 API 格式构建 fetch 请求参数
 * @param {object} config - AI 配置
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userPrompt - 用户提示词（简历数据 JSON）
 * @returns {{ url: string, init: RequestInit }}
 */
function buildFetchOptions(config, systemPrompt, userPrompt) {
    const isAnthropic = config.format === 'anthropic';

    if (isAnthropic) {
        return {
            url: `${config.endpoint}/v1/messages`,
            init: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }]
                })
            }
        };
    }

    // OpenAI 兼容格式
    return {
        url: `${config.endpoint}/chat/completions`,
        init: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 4096
            })
        }
    };
}

/**
 * 检查 API 响应状态
 * @description 401/403 会自动打开设置弹窗
 * @param {Response} response
 * @returns {Promise<{ ok: true } | { ok: false, error: Error }>}
 */
async function checkAPIError(response) {
    if (response.ok) return { ok: true };

    const status = response.status;
    if (status === 401 || status === 403) {
        openSettingsDialog();
        return { ok: false, error: new Error('API 密钥无效，请检查配置') };
    }
    if (status === 429) {
        return { ok: false, error: new Error('请求频率过高，请稍后重试') };
    }

    const body = await response.text().catch(() => '');
    return { ok: false, error: new Error(`API 请求失败 (${status}): ${body || response.statusText}`) };
}

/**
 * 从 API 响应中提取 AI 生成的文本内容
 */
function extractAIContent(data, format) {
    if (format === 'anthropic') {
        if (!data.content?.[0]?.text) throw new Error('API 未返回有效内容');
        return data.content[0].text;
    }
    // OpenAI 兼容格式
    if (!data.choices?.[0]?.message) throw new Error('API 未返回有效内容');
    return data.choices[0].message.content;
}

/**
 * 统一的 AI 调用入口
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userPrompt - 用户提示词
 * @returns {Promise<string>} AI 生成的文本内容
 */
async function callAI(systemPrompt, userPrompt) {
    const config = loadConfig();

    if (!config.endpoint || !config.apiKey || !config.model) {
        openSettingsDialog();
        throw new Error('not_configured');
    }

    const format = config.format || 'openai';

    try {
        const { url, init } = buildFetchOptions(config, systemPrompt, userPrompt);
        const response = await fetch(url, init);

        const result = await checkAPIError(response);
        if (!result.ok) throw result.error;

        const data = await response.json();
        return extractAIContent(data, format);
    } catch (err) {
        if (err.message === 'not_configured') throw err;
        if (err.name === 'TypeError') {
            throw new Error('网络连接失败，请检查网络或 API 地址');
        }
        throw err;
    }
}

/**
 * 解析 AI 返回的 JSON 文本
 * 尝试直接解析，失败则提取 { ... } 块
 */
function parseAIJSON(text) {
    try {
        return JSON.parse(text);
    } catch { /* 继续尝试提取 */ }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch { /* 解析失败 */ }
    }

    throw new Error('AI 返回了无法解析的内容');
}

// ============================================================
// 5. 提示词（Prompts）
// ============================================================

/** 一键润色 — STAR 法则优化 */
const POLISH_SYSTEM = `你是一位资深的简历优化顾问，擅长使用STAR法则和量化成果来优化简历描述。

你需要优化用户提供的简历内容。规则如下：
1. 使用STAR法则（情境-任务-行动-结果）重写描述
2. 使用强有力的动作动词开头（如：主导、优化、设计、实现、推动）
3. 尽可能添加量化数据（百分比、数字、规模）
4. 保持专业简洁的风格
5. 不要编造虚假信息，仅在原文基础上优化表达
6. 保持Markdown格式（列表、加粗等）

请以JSON格式返回优化结果。格式如下：
{
    "summary": "优化后的个人简介",
    "experience": [{ "index": 0, "description": "优化后的工作描述" }],
    "projects": [{ "index": 0, "description": "优化后的项目描述" }],
    "customSections": [{ "sectionIndex": 0, "itemIndex": 0, "description": "优化后的描述" }]
}

只返回有内容的字段。如果某个字段没有需要优化的内容，不要包含在JSON中。
只返回JSON，不要返回任何其他文字。`;

/** 岗位 JD 定制优化 */
const JD_SYSTEM = `你是一位资深的简历优化顾问，擅长根据岗位描述（JD）定制简历。

用户会提供一份简历内容和一个目标岗位的描述。你需要：
1. 分析岗位描述中的关键技能要求和关键词
2. 调整简历内容，突出与岗位匹配的经验和技能
3. 在描述中自然地融入JD中的关键词
4. 调整个人简介，使其与目标岗位高度匹配
5. 不要编造虚假经历，仅优化表述方式和侧重点
6. 如果某些技能与岗位不相关，适当降低其优先级
7. 保持Markdown格式

请以JSON格式返回优化结果。格式如下：
{
    "summary": "针对岗位优化后的个人简介",
    "experience": [{ "index": 0, "description": "优化后的工作描述" }],
    "projects": [{ "index": 0, "description": "优化后的项目描述" }],
    "skills": ["调整后的技能列表顺序"],
    "customSections": [{ "sectionIndex": 0, "itemIndex": 0, "description": "优化后的描述" }]
}

只返回有内容的字段。如果某个字段没有需要优化的内容，不要包含在JSON中。
只返回JSON，不要返回任何其他文字。`;

// ============================================================
// 6. Prompt 构建 — 提取简历数据供 AI 分析
// ============================================================

/** 构建润色模式的 payload */
function buildPolishPayload() {
    return JSON.stringify({
        basics: { summary: resumeData.basics.summary },
        experience: resumeData.experience
            .map((e, i) => ({ index: i, company: e.company, position: e.position, description: e.description }))
            .filter(e => e.description),
        projects: resumeData.projects
            .map((p, i) => ({ index: i, name: p.name, role: p.role, description: p.description }))
            .filter(p => p.description),
        customSections: resumeData.customSections
            .map((s, si) => ({
                sectionIndex: si, title: s.title,
                items: s.items
                    .map((item, ii) => ({ itemIndex: ii, title: item.title, description: item.description }))
                    .filter(i => i.description)
            }))
            .filter(s => s.items.length)
    }, null, 2);
}

/** 构建 JD 定制模式的 payload */
function buildJDPayload(jd) {
    return JSON.stringify({
        jobDescription: jd,
        resume: {
            basics: { title: resumeData.basics.title, summary: resumeData.basics.summary },
            experience: resumeData.experience
                .map((e, i) => ({ index: i, company: e.company, position: e.position, description: e.description }))
                .filter(e => e.description),
            projects: resumeData.projects
                .map((p, i) => ({ index: i, name: p.name, role: p.role, description: p.description }))
                .filter(p => p.description),
            skills: resumeData.skills,
            customSections: resumeData.customSections
                .map((s, si) => ({
                    sectionIndex: si, title: s.title,
                    items: s.items
                        .map((item, ii) => ({ itemIndex: ii, title: item.title, description: item.description }))
                        .filter(i => i.description)
                }))
                .filter(s => s.items.length)
        }
    }, null, 2);
}

// ============================================================
// 7. Diff 对比 UI — 展示优化前/后的差异
// ============================================================

/** 待确认的修改项 — Map<fieldKey, ChangeItem> */
const pendingChanges = new Map();

let markedReady = false;

function ensureMarked() {
    if (!markedReady && typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true });
        markedReady = true;
    }
}

function renderMarkdown(text) {
    ensureMarked();
    if (typeof marked !== 'undefined') return marked.parse(text || '');
    return (text || '').replace(/\n/g, '<br>');
}

/** 字段标签映射 — 用于在 diff 卡片上显示可读名称 */
const FIELD_LABELS = { 'basics-summary': '个人简介' };

function getFieldLabel(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];

    const parts = key.split('-');
    if (parts[0] === 'experience') return `工作经历 #${parseInt(parts[1]) + 1} - 工作描述`;
    if (parts[0] === 'projects') return `项目经历 #${parseInt(parts[1]) + 1} - 项目描述`;
    if (parts[0] === 'skills') return '技能列表';
    if (parts[0] === 'customSections') return `自定义区块 #${parseInt(parts[1]) + 1} - 项目 #${parseInt(parts[2]) + 1} - 描述`;
    return key;
}

/**
 * 将 AI 返回的数组型变更添加到 pendingChanges
 * @param {string} prefix - 字段前缀（如 "experience"）
 * @param {Array} items - AI 返回的修改项 [{ index, description }]
 * @param {Array} dataArr - 当前数据数组
 */
function addListChanges(prefix, items, dataArr) {
    if (!items) return;
    items.forEach(item => {
        const key = `${prefix}-${item.index}`;
        const current = dataArr[item.index];
        if (current && item.description && item.description !== current.description) {
            pendingChanges.set(key, {
                original: current.description,
                suggested: item.description,
                apply: () => { current.description = item.description; }
            });
        }
    });
}

/**
 * 从 AI 返回结果构建 pendingChanges Map
 * 每个变更项包含：original（原文）、suggested（建议）、apply（应用函数）
 */
function buildPendingChanges(aiResult) {
    pendingChanges.clear();

    // 个人简介
    if (aiResult.summary && aiResult.summary !== resumeData.basics.summary) {
        pendingChanges.set('basics-summary', {
            original: resumeData.basics.summary,
            suggested: aiResult.summary,
            apply: () => { resumeData.basics.summary = aiResult.summary; }
        });
    }

    // 工作经历 & 项目经历
    addListChanges('experience', aiResult.experience, resumeData.experience);
    addListChanges('projects', aiResult.projects, resumeData.projects);

    // 技能列表
    if (Array.isArray(aiResult.skills) && aiResult.skills.join(',') !== resumeData.skills.join(',')) {
        pendingChanges.set('skills', {
            original: resumeData.skills.join('、'),
            suggested: aiResult.skills.join('、'),
            apply: () => { resumeData.skills = aiResult.skills; }
        });
    }

    // 自定义区块
    if (aiResult.customSections) {
        aiResult.customSections.forEach(section => {
            if (!section.items) return;
            section.items.forEach(item => {
                const key = `customSections-${section.sectionIndex}-${item.itemIndex}`;
                const current = resumeData.customSections[section.sectionIndex]?.items[item.itemIndex];
                if (current && item.description && item.description !== current.description) {
                    pendingChanges.set(key, {
                        original: current.description,
                        suggested: item.description,
                        apply: () => { current.description = item.description; }
                    });
                }
            });
        });
    }
}

/**
 * 渲染 diff 对比卡片列表
 * 每张卡片显示：字段标签、修改前/后内容、采纳/忽略按钮
 */
function renderResultCards() {
    const list = document.getElementById('ai-result-list');
    const summary = document.getElementById('ai-result-summary');
    const actions = document.getElementById('ai-result-actions');

    if (pendingChanges.size === 0) {
        summary.textContent = 'AI 未发现需要优化的内容';
        list.innerHTML = '';
        actions.style.display = 'none';
        return;
    }

    summary.textContent = `发现 ${pendingChanges.size} 处可优化内容`;
    actions.style.display = 'flex';

    list.innerHTML = '';
    pendingChanges.forEach((change, key) => {
        const card = document.createElement('div');
        card.className = 'ai-compare-card';
        card.dataset.key = key;
        card.innerHTML = `
            <div class="ai-compare-header">
                <span class="ai-compare-label">${getFieldLabel(key)}</span>
                <div class="ai-compare-actions">
                    <button class="btn btn-sm" data-action="ai-reject-field" data-key="${key}">忽略</button>
                    <button class="btn btn-sm btn-primary" data-action="ai-accept-field" data-key="${key}">采纳</button>
                </div>
            </div>
            <div class="ai-compare-body">
                <div class="ai-compare-before">
                    <div class="ai-compare-side-label">修改前</div>
                    <div class="ai-compare-content">${renderMarkdown(change.original)}</div>
                </div>
                <div class="ai-compare-after">
                    <div class="ai-compare-side-label">修改后</div>
                    <div class="ai-compare-content">${renderMarkdown(change.suggested)}</div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// ============================================================
// 8. 结果弹窗管理
// ============================================================

function openResultDialog() {
    document.getElementById('ai-result-title').textContent = '✨ AI 优化';
    document.getElementById('ai-result-menu').style.display = 'flex';
    document.getElementById('ai-result-summary').textContent = '';
    document.getElementById('ai-result-list').innerHTML = '';
    document.getElementById('ai-result-actions').style.display = 'none';
    document.getElementById('ai-result-dialog').classList.add('active');
}

function closeResultDialog() {
    document.getElementById('ai-result-dialog').classList.remove('active');
    pendingChanges.clear();
}

/** 采纳单条修改 */
function acceptField(key) {
    const change = pendingChanges.get(key);
    if (!change) return;
    change.apply();
    pendingChanges.delete(key);

    const card = document.querySelector(`.ai-compare-card[data-key="${key}"]`);
    if (card) {
        card.classList.add('ai-compare-accepted');
        card.querySelector('.ai-compare-actions').innerHTML =
            '<span style="color:#16a34a;font-size:0.8125rem;">✓ 已采纳</span>';
    }
    updateSummary();
}

/** 忽略单条修改 */
function rejectField(key) {
    pendingChanges.delete(key);

    const card = document.querySelector(`.ai-compare-card[data-key="${key}"]`);
    if (card) {
        card.classList.add('ai-compare-rejected');
        card.querySelector('.ai-compare-actions').innerHTML =
            '<span style="color:var(--text-muted);font-size:0.8125rem;">已忽略</span>';
    }
    updateSummary();
}

/** 全部采纳 */
function acceptAll() {
    pendingChanges.forEach(change => change.apply());
    pendingChanges.clear();

    document.querySelectorAll('.ai-compare-card').forEach(card => {
        card.classList.add('ai-compare-accepted');
        card.querySelector('.ai-compare-actions').innerHTML =
            '<span style="color:#16a34a;font-size:0.8125rem;">✓ 已采纳</span>';
    });

    document.getElementById('ai-result-summary').textContent = '全部已采纳';
    document.getElementById('ai-result-actions').style.display = 'none';

    saveToStorage();
    if (renderAllFn) renderAllFn();
    setTimeout(closeResultDialog, 600);
}

/** 全部忽略 */
function ignoreAll() {
    pendingChanges.clear();

    document.querySelectorAll('.ai-compare-card').forEach(card => {
        card.classList.add('ai-compare-rejected');
        card.querySelector('.ai-compare-actions').innerHTML =
            '<span style="color:var(--text-muted);font-size:0.8125rem;">已忽略</span>';
    });

    document.getElementById('ai-result-summary').textContent = '已全部忽略';
    document.getElementById('ai-result-actions').style.display = 'none';
    setTimeout(closeResultDialog, 600);
}

/** 更新摘要文本，全部处理完毕后自动关闭弹窗 */
function updateSummary() {
    const remaining = pendingChanges.size;
    const summary = document.getElementById('ai-result-summary');
    if (remaining === 0) {
        summary.textContent = '已完成所有操作';
        document.getElementById('ai-result-actions').style.display = 'none';
        saveToStorage();
        if (renderAllFn) renderAllFn();
        setTimeout(closeResultDialog, 600);
    } else {
        summary.textContent = `还有 ${remaining} 处待确认`;
    }
}

// ============================================================
// 9. AI 操作入口
// ============================================================

/** 检查简历是否有可供优化的内容 */
function hasContent() {
    return resumeData.basics.summary
        || resumeData.experience.some(e => e.description)
        || resumeData.projects.some(p => p.description)
        || resumeData.customSections.some(s => s.items.some(i => i.description));
}

/** 一键润色 */
async function handlePolish() {
    if (!isConfigured()) { openSettingsDialog(); return; }
    if (!hasContent()) { alert('请先填写简历内容'); return; }

    const loadingEl = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');

    try {
        loadingText.textContent = 'AI 正在优化简历...';
        loadingEl.classList.add('active');

        const response = await callAI(POLISH_SYSTEM, buildPolishPayload());
        const result = parseAIJSON(response);
        buildPendingChanges(result);

        loadingEl.classList.remove('active');

        document.getElementById('ai-result-title').textContent = '✨ 一键润色结果';
        document.getElementById('ai-result-menu').style.display = 'none';
        renderResultCards();
        document.getElementById('ai-result-dialog').classList.add('active');
    } catch (err) {
        loadingEl.classList.remove('active');
        if (err.message !== 'not_configured') alert(err.message);
    }
}

/** 岗位 JD 定制优化 */
async function handleJDOptimize() {
    if (!isConfigured()) { openSettingsDialog(); return; }
    if (!hasContent()) { alert('请先填写简历内容'); return; }

    openJDDialog();

    // 绑定确认按钮 — 使用 { once: true } 避免重复绑定
    const confirmBtn = document.querySelector('[data-action="confirm-jd-dialog"]');
    const handler = async () => {
        const jd = document.getElementById('ai-jd-input').value.trim();
        if (!jd) { alert('请输入岗位描述'); return; }

        closeJDDialog();
        confirmBtn.removeEventListener('click', handler);

        const loadingEl = document.getElementById('loading');
        const loadingText = document.getElementById('loading-text');

        try {
            loadingText.textContent = 'AI 正在根据岗位定制优化...';
            loadingEl.classList.add('active');

            const response = await callAI(JD_SYSTEM, buildJDPayload(jd));
            const result = parseAIJSON(response);
            buildPendingChanges(result);

            loadingEl.classList.remove('active');

            document.getElementById('ai-result-title').textContent = '🎯 岗位定制结果';
            document.getElementById('ai-result-menu').style.display = 'none';
            renderResultCards();
            document.getElementById('ai-result-dialog').classList.add('active');
        } catch (err) {
            loadingEl.classList.remove('active');
            if (err.message !== 'not_configured') alert(err.message);
        }
    };

    confirmBtn.addEventListener('click', handler, { once: true });
}

// ============================================================
// 10. 结果弹窗事件绑定
// ============================================================

function initResultDialog() {
    const overlay = document.getElementById('ai-result-dialog');

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeResultDialog();
    });

    // 选择优化模式（使用 catch 避免 unhandled rejection）
    overlay.querySelector('[data-action="ai-choose-polish"]')?.addEventListener('click', () => {
        handlePolish().catch(() => {});
    });
    overlay.querySelector('[data-action="ai-choose-jd"]')?.addEventListener('click', () => {
        handleJDOptimize().catch(() => {});
    });

    // 逐条接受/忽略 + 批量操作
    overlay.addEventListener('click', (e) => {
        const acceptBtn = e.target.closest('[data-action="ai-accept-field"]');
        if (acceptBtn) { acceptField(acceptBtn.dataset.key); return; }

        const rejectBtn = e.target.closest('[data-action="ai-reject-field"]');
        if (rejectBtn) { rejectField(rejectBtn.dataset.key); return; }

        if (e.target.closest('[data-action="ai-accept-all"]')) { acceptAll(); return; }
        if (e.target.closest('[data-action="ai-ignore-all"]')) { ignoreAll(); }
    });
}

// ============================================================
// 11. 初始化入口
// ============================================================

/**
 * 初始化 AI 模块
 * @param {Function} renderAll - 全量渲染回调
 */
export function initAI(renderAll) {
    renderAllFn = renderAll;

    initSettingsDialog();
    initJDDialog();
    initResultDialog();

    // 头部 AI 按钮
    document.querySelector('.header-actions').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        if (btn.dataset.action === 'show-ai-settings') openSettingsDialog();
        else if (btn.dataset.action === 'ai-optimize') openResultDialog();
    });

    // ESC 键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        if (document.getElementById('ai-result-dialog').classList.contains('active')) closeResultDialog();
        else if (document.getElementById('ai-jd-dialog').classList.contains('active')) closeJDDialog();
        else if (document.getElementById('ai-settings-dialog').classList.contains('active')) closeSettingsDialog();
    });
}
