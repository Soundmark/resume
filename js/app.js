/**
 * app.js — 应用主入口
 *
 * 职责：
 *   1. 初始化所有模块（编辑器、预览、导出、AI）
 *   2. 协调各模块之间的渲染关系
 *   3. 绑定全局事件（头部按钮、键盘快捷键）
 */

// ========== 模块导入 ==========

import { loadFromStorage, saveToStorage, resetData, onDataChange } from './state.js';
import { initBasicInfo, renderBasicInfo } from './sections/basicInfo.js';
import { initExperience, renderExperience } from './sections/experience.js';
import { initEducation, renderEducation } from './sections/education.js';
import { initProjects, renderProjects } from './sections/projects.js';
import { initSkills, renderSkills, initCertifications, renderCertifications } from './sections/tags.js';
import { initCustomSections, initDialog, renderCustomSections } from './sections/customSections.js';
import { renderPreview } from './preview.js';
import { initExport, exportJSON, exportPDF } from './export.js';
import { initAI } from './ai.js';

// ========== 渲染协调 ==========

/**
 * 重新渲染所有编辑器模块和预览
 * 在数据导入、清空、AI 优化采纳等场景下调用
 */
function renderAll() {
    renderBasicInfo();
    renderExperience();
    renderEducation();
    renderProjects();
    renderSkills();
    renderCertifications();
    renderCustomSections();
    renderPreview();
}

// 数据变更时自动刷新预览（编辑器模块各自负责自己的渲染）
onDataChange(() => renderPreview());

// ========== 应用初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
    // 1. 从 localStorage 恢复数据
    loadFromStorage();

    // 2. 初始化各编辑器模块 — 传入对应的 DOM 容器
    initBasicInfo(document.querySelector('.section'));
    initExperience(document.getElementById('experience-container'));
    initEducation(document.getElementById('education-container'));
    initProjects(document.getElementById('projects-container'));
    initSkills(document.getElementById('skills-container'), document.getElementById('skill-input'));
    initCertifications(document.getElementById('certifications-container'), document.getElementById('cert-input'));
    initCustomSections(document.getElementById('custom-sections-container'));
    initDialog();

    // 3. 初始化导出和 AI — 传入 renderAll 回调用于刷新全量视图
    initExport(renderAll);
    initAI(renderAll);

    // 4. 首次渲染
    renderAll();
});

// ========== 全局事件绑定 ==========

/**
 * 头部操作按钮 — 使用事件委托统一处理
 * 支持的 action: import-json, export-json, export-pdf, clear-all
 */
document.querySelector('.header-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    switch (btn.dataset.action) {
        case 'import-json':
            document.getElementById('importFile').click();
            break;
        case 'export-json':
            exportJSON();
            break;
        case 'export-pdf':
            exportPDF();
            break;
        case 'clear-all':
            if (confirm('确定要清空所有内容吗？此操作不可恢复。')) {
                resetData();
                renderAll();
                saveToStorage();
            }
            break;
    }
});

/**
 * 全局键盘快捷键
 * - Ctrl/Cmd + S: 导出 JSON
 */
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportJSON();
    }
});
