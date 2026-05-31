/**
 * preview.js — 简历实时预览渲染器
 *
 * 分页策略：位置测量法
 *   1. 所有内容放在一个离屏容器中一次性渲染
 *   2. 测量每个顶层元素的绝对位置（含 margin 折叠）
 *   3. 按位置切分页面 — 位置是在真实布局中测量的，不受 margin 影响
 */

import { resumeData } from './state.js';

const PAGE_CONTENT_HEIGHT_PX = (297 - 2 * 20) * (96 / 25.4); // 257mm

// ========== HTML 构建 ==========

function buildFullHTML(data) {
    const parts = [];
    const { basics, experience, education, projects, skills, certifications, customSections } = data;

    if (basics.name || basics.title || basics.phone || basics.email) {
        let h = '<div class="resume-header">';
        if (basics.name) h += `<div class="resume-name">${esc(basics.name)}</div>`;
        if (basics.title) h += `<div class="resume-title">${esc(basics.title)}</div>`;
        const c = [];
        if (basics.phone) c.push(`<span>\u{1F4DE} ${esc(basics.phone)}</span>`);
        if (basics.email) c.push(`<span>\u{2709}\u{FE0F} ${esc(basics.email)}</span>`);
        if (basics.location) c.push(`<span>\u{1F4CD} ${esc(basics.location)}</span>`);
        if (c.length) h += `<div class="resume-contact">${c.join('')}</div>`;
        h += '</div>';
        parts.push(h);
    }

    if (basics.summary) {
        parts.push(`<div class="resume-section-title">个人简介</div><div class="resume-item-description">${esc(basics.summary)}</div>`);
    }

    if (experience.length) {
        let h = '<div class="resume-section-title">工作经历</div>';
        experience.forEach(exp => {
            if (!exp.company && !exp.position) return;
            h += '<div class="resume-item-header"><div class="resume-item-info">';
            h += `<div class="resume-item-title">${esc(exp.company)}</div>`;
            h += `<div class="resume-item-subtitle">${esc(exp.position)}</div>`;
            h += '</div>';
            const d = fmtDate(exp.startDate, exp.endDate, exp.current);
            if (d) h += `<div class="resume-item-date">${d}</div>`;
            h += '</div>';
            if (exp.description) h += mdFlat(exp.description);
        });
        parts.push(h);
    }

    if (education.length) {
        let h = '<div class="resume-section-title">教育经历</div>';
        education.forEach(edu => {
            if (!edu.school && !edu.major) return;
            h += '<div class="resume-item-header"><div class="resume-item-info">';
            h += `<div class="resume-item-title">${esc(edu.school)}</div>`;
            h += `<div class="resume-item-subtitle">${esc(edu.major)}${edu.degree ? ' · ' + esc(edu.degree) : ''}</div>`;
            h += '</div>';
            const d = edu.startDate + (edu.endDate ? ' - ' + edu.endDate : '');
            if (d) h += `<div class="resume-item-date">${d}</div>`;
            h += '</div>';
        });
        parts.push(h);
    }

    if (projects.length) {
        let h = '<div class="resume-section-title">项目经历</div>';
        projects.forEach(proj => {
            if (!proj.name && !proj.role) return;
            h += '<div class="resume-item-header"><div class="resume-item-info">';
            h += `<div class="resume-item-title">${esc(proj.name)}</div>`;
            h += `<div class="resume-item-subtitle">${esc(proj.role)}</div>`;
            h += '</div>';
            const d = proj.startDate + (proj.endDate ? ' - ' + proj.endDate : '');
            if (d) h += `<div class="resume-item-date">${d}</div>`;
            h += '</div>';
            if (proj.description) h += mdFlat(proj.description);
            if (proj.url) h += `<div class="resume-item-url">${esc(proj.url)}</div>`;
        });
        parts.push(h);
    }

    if (skills.length) {
        parts.push(`<div class="resume-section-title">技能</div><div class="resume-skills">${skills.map(s => `<span class="resume-skill">${esc(s)}</span>`).join('')}</div>`);
    }

    if (certifications.length) {
        parts.push(`<div class="resume-section-title">证书/奖项</div><ul class="resume-list">${certifications.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`);
    }

    customSections.forEach(section => {
        if (!section.items.length) return;
        let h = `<div class="resume-section-title">${esc(section.title)}</div>`;
        section.items.forEach(item => {
            if (!item.title && !item.subtitle && !item.description) return;
            h += `<div class="resume-item-header"><div class="resume-item-title">${esc(item.title)}</div><div class="resume-item-subtitle">${esc(item.subtitle)}</div></div>`;
            if (item.description) h += `<div class="resume-item-description">${md(item.description)}</div>`;
        });
        parts.push(h);
    });

    return parts.filter(Boolean).join('');
}

// ========== 工具 ==========

function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
function md(t) { return typeof marked !== 'undefined' ? marked.parse(t || '') : (t || '').replace(/\n/g, '<br>'); }
// 平铺版：移除外层 div 包裹，让列表项独立
function mdFlat(t) {
    const html = md(t);
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    // 如果外层只有一个 div，提取其内容
    if (d.children.length === 1 && d.firstElementChild.tagName === 'DIV') {
        return Array.from(d.firstElementChild.children).map(el => el.outerHTML).join('');
    }
    return Array.from(d.children).map(el => el.outerHTML).join('');
}
function fmtDate(s, e, c) { return s ? s + (c ? ' - 至今' : (e ? ` - ${e}` : '')) : ''; }

// ========== 分页 ==========

/**
 * 拍平：将 HTML 拆为顶层子元素
 */
function flatten(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return Array.from(d.children).map(el => el.outerHTML);
}

/**
 * 核心分页：位置测量法
 *
 * 1. 把所有元素放在一个容器中一次性渲染
 * 2. 用 getBoundingClientRect 测量每个元素的真实位置
 * 3. 按位置切分页面
 *
 * 优点：位置是在真实布局中测量的，margin 折叠等行为完全正确。
 */
/**
 * 在容器中测量一组 HTML 片段的位置
 * 返回 [{top, height}] 数组
 */
function measurePositions(container, htmlPieces) {
    container.innerHTML = htmlPieces.map((h, i) =>
        `<div data-idx="${i}" style="margin:0;padding:0;border:none;">${h}</div>`
    ).join('');
    container.offsetHeight;

    const markers = container.querySelectorAll('[data-idx]');
    const baseTop = markers[0].getBoundingClientRect().top;

    return Array.from(markers).map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top - baseTop, height: rect.height };
    });
}

/**
 * 拆分叶子元素的内容（无法按子元素拆分时的最后手段）
 *
 * 策略：遍历子元素，按顺序添加，找到能放下的数量
 *
 * 返回 [fittingHTML, remainingHTML] 或 [null, null]
 */
function splitLeafContent(container, html, availableHeight) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // 直接遍历子元素（保持 DOM 顺序）
    const children = Array.from(tmp.children);
    if (children.length <= 1) return [null, null];

    // 逐个添加，找到能放下的最大数量
    let count = children.length;
    while (count > 1) {
        const test = document.createElement('div');
        for (let i = 0; i < count; i++) {
            test.appendChild(children[i].cloneNode(true));
        }
        container.innerHTML = '';
        container.appendChild(test);
        container.offsetHeight;
        if (container.scrollHeight <= availableHeight) {
            break;
        }
        count--;
    }

    if (count < children.length) {
        // 构建 fitting 和 remaining
        const fittingDiv = document.createElement('div');
        for (let i = 0; i < count; i++) {
            fittingDiv.appendChild(children[i].cloneNode(true));
        }

        const remainingDiv = document.createElement('div');
        for (let i = count; i < children.length; i++) {
            remainingDiv.appendChild(children[i].cloneNode(true));
        }

        return [fittingDiv.innerHTML, remainingDiv.innerHTML];
    }

    return [null, null];
}

/**
 * 递归拆分：用位置测量法测量子元素，找到能放下多少
 *
 * 返回 [能放下的部分HTML, 剩余部分HTML]
 * 如果无法拆分，返回 [null, 原始HTML]
 */
function trySplit(container, html, availableHeight) {
    const children = flatten(html);
    if (children.length <= 1) {
        // 叶子节点：尝试按内容块拆分（多段落、多列表项）
        const [fitting, remaining] = splitLeafContent(container, html, availableHeight);
        if (fitting) return [fitting, remaining];
        return [null, html];
    }

    // 提取父容器的开/闭标签
    const m = html.match(/^<(\w+)([^>]*)>/);
    if (!m) return [null, html];
    const openTag = m[0];
    const closeTag = '</' + m[1] + '>';

    // 用父容器包装每个子元素，保持 CSS 上下文
    const wrapped = children.map(c => openTag + c + closeTag);
    const positions = measurePositions(container, wrapped);

    // 逐个累加，找到能放下的最多个数
    let count = 0;
    for (let j = 0; j < positions.length; j++) {
        const bottom = positions[j].top + positions[j].height;
        if (bottom > availableHeight + 0.5 && j > 0) break;
        count = j + 1;
    }

    if (count === 0) {
        // 尝试进一步拆分叶子元素内容
        const [fitting, remaining] = splitLeafContent(container, html, availableHeight);
        if (fitting) {
            // 用外层容器包装
            const m = html.match(/^<(\w+)([^>]*)>/);
            if (m) {
                return [m[0] + fitting + '</' + m[1] + '>', remaining];
            }
            return [fitting, remaining];
        }
        return [null, html];
    }

    const fitting = wrapped.slice(0, count).map(w => {
        // 去掉父容器包装，只保留子元素
        const tmp = document.createElement('div');
        tmp.innerHTML = w;
        return tmp.firstElementChild.outerHTML;
    });
    const remaining = wrapped.slice(count).map(w => {
        const tmp = document.createElement('div');
        tmp.innerHTML = w;
        return tmp.firstElementChild.outerHTML;
    });

    return [fitting.join(''), remaining.join('')];
}

/**
 * 核心分页：位置测量 + 递归拆分
 */
function paginate(html) {
    const flat = flatten(html);
    if (!flat.length) return [];

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;width:210mm;padding:20mm;font-size:11pt;line-height:1.6;box-sizing:border-box;background:white';
    document.body.appendChild(container);

    const pages = [];
    let currentPage = [...flat]; // 当前待处理的元素列表
    let safety = 0;

    while (currentPage.length > 0 && safety < 100) {
        safety++;

        // 测量当前所有元素的位置
        const positions = measurePositions(container, currentPage);
        const pageTop = positions[0].top;

        // 找到第一个超出页面的元素
        let breakIdx = -1;
        for (let i = 0; i < positions.length; i++) {
            const bottom = positions[i].top + positions[i].height - pageTop;
            if (bottom > PAGE_CONTENT_HEIGHT_PX + 0.5) {
                breakIdx = i;
                break;
            }
        }

        if (breakIdx === -1) {
            // 所有元素都能放下
            pages.push(currentPage);
            break;
        }

        if (breakIdx === 0) {
            // 第一个元素就超出页面 — 尝试拆分
            const availableH = PAGE_CONTENT_HEIGHT_PX;
            const [fitting, remaining] = trySplit(container, currentPage[0], availableH);

            if (fitting) {
                // 拆分成功：放得下的部分 + 剩余部分
                pages.push([fitting]);
                currentPage = remaining ? [remaining, ...currentPage.slice(1)] : currentPage.slice(1);
            } else {
                // 无法拆分 — 整个放下一页
                pages.push([currentPage[0]]);
                currentPage = currentPage.slice(1);
            }
        } else {
            // 把 breakIdx 之前的元素放到当前页
            pages.push(currentPage.slice(0, breakIdx));

            // 检查 breakIdx 处的元素是否需要拆分
            const elemTop = positions[breakIdx].top;
            const elemBottom = positions[breakIdx].top + positions[breakIdx].height;
            const remainingOnPage = PAGE_CONTENT_HEIGHT_PX - (elemTop - pageTop);

            if (remainingOnPage > 20 && elemBottom - pageTop > PAGE_CONTENT_HEIGHT_PX + 0.5) {
                // 尝试拆分这个元素，把能放下的部分留在当前页
                const [fitting, remainPart] = trySplit(container, currentPage[breakIdx], remainingOnPage);
                if (fitting) {
                    // 把 fitting 追加到当前页（最后一页）
                    pages[pages.length - 1] = [...pages[pages.length - 1], fitting];
                    currentPage = remainPart ? [remainPart, ...currentPage.slice(breakIdx + 1)] : currentPage.slice(breakIdx + 1);
                    continue;
                }
            }

            // 不拆分，整个放到下一轮
            currentPage = currentPage.slice(breakIdx);
        }
    }

    document.body.removeChild(container);
    return pages;
}

// ========== 渲染 ==========

export function renderPreview() {
    const preview = document.getElementById('resume-preview');
    const fullHTML = buildFullHTML(resumeData);

    if (!fullHTML) {
        preview.innerHTML = '<div style="text-align:center;color:#999;padding:3rem;">在左侧编辑简历内容，此处将实时预览</div>';
        return;
    }

    const pages = paginate(fullHTML);

    if (pages.length <= 1) {
        preview.innerHTML = `<div class="preview-page">${fullHTML}</div>`;
    } else {
        preview.innerHTML = pages
            .map(page => `<div class="preview-page">${page.join('')}</div>`)
            .join('<div class="page-gap"></div>');
    }
}
