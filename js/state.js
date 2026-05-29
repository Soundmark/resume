/**
 * state.js — 简历数据状态管理
 *
 * 职责：
 *   1. 持有全局简历数据对象 resumeData
 *   2. 提供 localStorage 持久化（加载/保存/防抖保存）
 *   3. 实现观察者模式（onDataChange / notifyChange）
 *   4. 提供数据重置和 UI 反馈（保存提示条）
 */

// ========== 简历数据模型 ==========

/** @typedef {{ name: string, title: string, phone: string, email: string, location: string, summary: string }} Basics */
/** @typedef {{ company: string, position: string, startDate: string, endDate: string, description: string, current: boolean }} Experience */
/** @typedef {{ school: string, major: string, degree: string, startDate: string, endDate: string }} Education */
/** @typedef {{ name: string, role: string, startDate: string, endDate: string, description: string, url: string }} Project */
/** @typedef {{ title: string, items: Array<{ title: string, subtitle: string, description: string }> }} CustomSection */

/**
 * 全局简历数据对象 — 单一数据源
 * 所有模块直接读写此对象，通过 debouncedSave() 触发持久化和预览刷新
 */
export const resumeData = {
    /** @type {Basics} */
    basics: { name: '', title: '', phone: '', email: '', location: '', summary: '' },
    /** @type {Experience[]} */
    experience: [],
    /** @type {Education[]} */
    education: [],
    /** @type {Project[]} */
    projects: [],
    /** @type {string[]} */
    skills: [],
    /** @type {string[]} */
    certifications: [],
    /** @type {CustomSection[]} */
    customSections: []
};

// ========== 观察者模式 ==========

/** @type {Array<(data: typeof resumeData) => void>} */
const listeners = [];

/**
 * 注册数据变更监听器 — 每次 saveToStorage() 后触发
 * @param {(data: typeof resumeData) => void} fn
 */
export function onDataChange(fn) {
    listeners.push(fn);
}

/** 通知所有监听器数据已变更 */
function notifyChange() {
    listeners.forEach(fn => fn(resumeData));
}

// ========== localStorage 持久化 ==========

const STORAGE_KEY = 'resumeData';

/**
 * 从 localStorage 加载数据，合并到 resumeData
 * 加载失败时静默忽略，保留默认空数据
 */
export function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        // 逐字段合并，避免覆盖新增的默认字段
        Object.assign(resumeData, parsed);
    } catch (e) {
        console.error('[state] Failed to parse saved data:', e);
    }
}

/**
 * 将当前数据保存到 localStorage，并触发变更通知
 * @description 保存后自动显示"已自动保存"提示
 */
export function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
    showSaveIndicator();
    notifyChange();
}

/** 300ms 防抖保存 — 避免每次按键都写入 localStorage */
let saveTimer = null;

export function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 300);
}

/**
 * 重置所有数据为空 — 不会自动保存，调用方需手动调用 saveToStorage()
 */
export function resetData() {
    resumeData.basics = { name: '', title: '', phone: '', email: '', location: '', summary: '' };
    resumeData.experience = [];
    resumeData.education = [];
    resumeData.projects = [];
    resumeData.skills = [];
    resumeData.certifications = [];
    resumeData.customSections = [];
}

// ========== UI 反馈 ==========

/**
 * 显示"已自动保存"提示条，2 秒后自动隐藏
 */
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
}
