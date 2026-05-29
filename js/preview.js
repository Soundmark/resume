/**
 * preview.js — 简历实时预览渲染器
 *
 * 职责：
 *   1. 根据 resumeData 生成简历 HTML
 *   2. 支持 Markdown 渲染（通过 marked.js）
 *   3. 自动分页：基于 A4 尺寸测量内容高度，智能分页
 *
 * 设计说明：
 *   - 使用离屏测量 div 计算每个 block 的高度
 *   - A4 内容区域高度 = 257mm（297mm - 上下各 20mm 边距）
 *   - 当 block 累计高度超过页面限制时，插入分页符
 */

import { resumeData } from './state.js';

// ========== A4 页面常量 ==========

const PAGE_WIDTH_MM = 210;          // A4 宽度
const PAGE_HEIGHT_MM = 297;         // A4 高度
const PAGE_PADDING_MM = 20;         // 上下内边距
const PAGE_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - 2 * PAGE_PADDING_MM; // 257mm
const PX_PER_MM = 96 / 25.4;       // 毫米转像素（96dpi）

// ========== HTML 构建函数 ==========

/**
 * 构建简历头部（姓名、职位、联系方式）
 * @returns {string} HTML 片段
 */
function buildHeader({ basics }) {
    if (!basics.name && !basics.title && !basics.phone && !basics.email) return '';

    let html = '<div class="resume-header">';
    if (basics.name) html += `<div class="resume-name">${escapeHtml(basics.name)}</div>`;
    if (basics.title) html += `<div class="resume-title">${escapeHtml(basics.title)}</div>`;

    const contacts = [];
    if (basics.phone) contacts.push(`<span>\u{1F4DE} ${escapeHtml(basics.phone)}</span>`);
    if (basics.email) contacts.push(`<span>\u{2709}\u{FE0F} ${escapeHtml(basics.email)}</span>`);
    if (basics.location) contacts.push(`<span>\u{1F4CD} ${escapeHtml(basics.location)}</span>`);
    if (contacts.length) html += `<div class="resume-contact">${contacts.join('')}</div>`;

    html += '</div>';
    return html;
}

/**
 * 构建个人简介区块
 */
function buildSummary({ basics }) {
    if (!basics.summary) return '';
    return `
        <div class="resume-section-title">个人简介</div>
        <div class="resume-item-description">${escapeHtml(basics.summary)}</div>
    `;
}

/**
 * 构建工作经历区块
 */
function buildExperience({ experience }) {
    if (!experience.length) return '';

    let html = '';
    let isFirst = true;

    experience.forEach(exp => {
        if (!exp.company && !exp.position) return;

        if (isFirst) {
            html += '<div class="resume-section-title">工作经历</div>';
            isFirst = false;
        }

        html += '<div class="resume-item">';
        html += '<div class="resume-item-header">';
        html += `<div>
            <div class="resume-item-title">${escapeHtml(exp.company)}</div>
            <div class="resume-item-subtitle">${escapeHtml(exp.position)}</div>
        </div>`;

        const date = formatDateRange(exp.startDate, exp.endDate, exp.current);
        if (date) html += `<div class="resume-item-date">${date}</div>`;

        html += '</div>';
        if (exp.description) html += `<div class="resume-item-description">${renderMarkdown(exp.description)}</div>`;
        html += '</div>';
    });

    return html;
}

/**
 * 构建教育经历区块
 */
function buildEducation({ education }) {
    if (!education.length) return '';

    let html = '';
    let isFirst = true;

    education.forEach(edu => {
        if (!edu.school && !edu.major) return;

        if (isFirst) {
            html += '<div class="resume-section-title">教育经历</div>';
            isFirst = false;
        }

        html += '<div class="resume-item">';
        html += '<div class="resume-item-header">';
        html += `<div>
            <div class="resume-item-title">${escapeHtml(edu.school)}</div>
            <div class="resume-item-subtitle">${escapeHtml(edu.major)}${edu.degree ? ' · ' + escapeHtml(edu.degree) : ''}</div>
        </div>`;

        const date = edu.startDate + (edu.endDate ? ' - ' + edu.endDate : '');
        if (date) html += `<div class="resume-item-date">${date}</div>`;

        html += '</div></div>';
    });

    return html;
}

/**
 * 构建项目经历区块
 */
function buildProjects({ projects }) {
    if (!projects.length) return '';

    let html = '';
    let isFirst = true;

    projects.forEach(proj => {
        if (!proj.name && !proj.role) return;

        if (isFirst) {
            html += '<div class="resume-section-title">项目经历</div>';
            isFirst = false;
        }

        html += '<div class="resume-item">';
        html += '<div class="resume-item-header">';
        html += `<div>
            <div class="resume-item-title">${escapeHtml(proj.name)}</div>
            <div class="resume-item-subtitle">${escapeHtml(proj.role)}</div>
        </div>`;

        const date = proj.startDate + (proj.endDate ? ' - ' + proj.endDate : '');
        if (date) html += `<div class="resume-item-date">${date}</div>`;

        html += '</div>';
        if (proj.description) html += `<div class="resume-item-description">${renderMarkdown(proj.description)}</div>`;
        if (proj.url) html += `<div style="font-size: 0.875rem; color: var(--primary); margin-top: 0.25rem;">${escapeHtml(proj.url)}</div>`;
        html += '</div>';
    });

    return html;
}

/**
 * 构建技能标签区
 */
function buildSkills({ skills }) {
    if (!skills.length) return '';
    return `
        <div class="resume-section-title">技能</div>
        <div class="resume-skills">
            ${skills.map(s => `<span class="resume-skill">${escapeHtml(s)}</span>`).join('')}
        </div>
    `;
}

/**
 * 构建证书/奖项列表
 */
function buildCertifications({ certifications }) {
    if (!certifications.length) return '';
    return `
        <div class="resume-section-title">证书/奖项</div>
        <ul class="resume-list">
            ${certifications.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
    `;
}

/**
 * 构建自定义区块
 */
function buildCustomSections({ customSections }) {
    let html = '';

    customSections.forEach(section => {
        if (!section.items.length) return;

        let isFirst = true;
        section.items.forEach(item => {
            if (!item.title && !item.subtitle && !item.description) return;

            if (isFirst) {
                html += `<div class="resume-section-title">${escapeHtml(section.title)}</div>`;
                isFirst = false;
            }

            html += '<div class="resume-item">';
            html += '<div class="resume-item-header">';
            html += `<div>
                <div class="resume-item-title">${escapeHtml(item.title)}</div>
                <div class="resume-item-subtitle">${escapeHtml(item.subtitle)}</div>
            </div>`;
            html += '</div>';
            if (item.description) html += `<div class="resume-item-description">${renderMarkdown(item.description)}</div>`;
            html += '</div>';
        });
    });

    return html;
}

// ========== 工具函数 ==========

/** HTML 转义，防止 XSS */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

/** 渲染 Markdown 文本 */
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        return marked.parse(text || '');
    }
    return (text || '').replace(/\n/g, '<br>');
}

/**
 * 格式化日期范围
 * @param {string} start - 开始日期
 * @param {string} end - 结束日期
 * @param {boolean} current - 是否在职
 * @returns {string} 如 "2020-06 - 至今"
 */
function formatDateRange(start, end, current) {
    if (!start) return '';
    const suffix = current ? ' - 至今' : (end ? ` - ${end}` : '');
    return start + suffix;
}

// ========== 自动分页 ==========

/**
 * 将 HTML blocks 按 A4 页面高度自动分页
 *
 * 原理：
 *   1. 创建离屏测量 div（A4 宽度 + 相同字体/行高）
 *   2. 将每个 block 放入测量 div，获取其顶部位置
 *   3. 当下一个 block 超过页面内容高度时，切断当前页
 *
 * @param {string[]} blocks - 各区块的 HTML 字符串数组
 * @returns {string[][]} 分页后的二维数组
 */
function paginateBlocks(blocks) {
    // 创建离屏测量容器
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = `position:absolute;visibility:hidden;width:${PAGE_WIDTH_MM}mm;padding:${PAGE_PADDING_MM}mm;font-size:11pt;line-height:1.6`;
    document.body.appendChild(measureDiv);

    // 放入所有 block 并触发渲染
    measureDiv.innerHTML = blocks.map((html, i) => `<div class="bm" id="bm-${i}">${html}</div>`).join('');
    measureDiv.offsetHeight; // 强制 reflow

    // 获取每个 block 的绝对位置
    const bmElements = measureDiv.querySelectorAll('.bm');
    const positions = Array.from(bmElements).map(el => el.getBoundingClientRect().top);
    const basePos = positions[0];
    const pageContentHeightPx = PAGE_CONTENT_HEIGHT_MM * PX_PER_MM;

    // 分页算法：遍历 block，检测是否超出当前页
    const pages = [];
    let pageStart = 0;

    for (let i = 0; i < bmElements.length - 1; i++) {
        const nextBlockPos = positions[i + 1] - basePos;
        const currentPageOffset = pageStart > 0 ? (positions[pageStart] - basePos) : 0;

        if (nextBlockPos - currentPageOffset > pageContentHeightPx + 0.5) {
            pages.push(blocks.slice(pageStart, i + 1));
            pageStart = i + 1;
        }
    }
    pages.push(blocks.slice(pageStart));

    // 清理测量容器
    document.body.removeChild(measureDiv);

    return pages;
}

// ========== 主渲染函数 ==========

/**
 * 渲染简历预览 — 由 state.js 的 onDataChange 回调触发
 *
 * 流程：
 *   1. 从 resumeData 构建所有 HTML blocks
 *   2. 如果无内容，显示占位提示
 *   3. 使用离屏测量进行自动分页
 *   4. 渲染为单页或多页 A4 预览
 */
export function renderPreview() {
    const preview = document.getElementById('resume-preview');

    // 构建所有 HTML blocks
    const blocks = [
        buildHeader(resumeData),
        buildSummary(resumeData),
        buildExperience(resumeData),
        buildEducation(resumeData),
        buildProjects(resumeData),
        buildSkills(resumeData),
        buildCertifications(resumeData),
        buildCustomSections(resumeData)
    ].filter(html => html.trim());

    // 空状态提示
    if (!blocks.length) {
        preview.innerHTML = '<div style="text-align: center; color: #999; padding: 3rem;">在左侧编辑简历内容，此处将实时预览</div>';
        return;
    }

    // 自动分页
    const pages = paginateBlocks(blocks);

    // 渲染到 DOM
    if (pages.length <= 1) {
        preview.innerHTML = `<div class="preview-page">${blocks.join('')}</div>`;
    } else {
        preview.innerHTML = pages
            .map(page => `<div class="preview-page">${page.join('')}</div>`)
            .join('<div class="page-gap"></div>');
    }
}
