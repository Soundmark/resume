import { resumeData, saveToStorage, debouncedSave } from '../state.js';
import { renderPreview } from '../preview.js';

export function initProjects(container) {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'add-project') {
            resumeData.projects.push({
                name: '',
                role: '',
                startDate: '',
                endDate: '',
                description: '',
                url: ''
            });
            renderProjects();
            saveToStorage();
        } else if (action === 'remove-project') {
            resumeData.projects.splice(index, 1);
            renderProjects();
            saveToStorage();
        } else if (action === 'move-project') {
            const direction = parseInt(btn.dataset.direction);
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < resumeData.projects.length) {
                [resumeData.projects[index], resumeData.projects[newIndex]] =
                    [resumeData.projects[newIndex], resumeData.projects[index]];
                renderProjects();
                saveToStorage();
            }
        }
    });

    container.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field && !isNaN(index)) {
            resumeData.projects[index][field] = e.target.value;
            renderPreview();
            debouncedSave();
        }
    });
}

export function renderProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = resumeData.projects.map((proj, index) => `
        <div class="item-card">
            <div class="item-card-header">
                <span class="item-card-title">项目经历 #${index + 1}</span>
                <div class="item-actions">
                    ${index > 0 ? `<button class="btn-icon" data-action="move-project" data-index="${index}" data-direction="-1" title="上移">⬆️</button>` : ''}
                    ${index < resumeData.projects.length - 1 ? `<button class="btn-icon" data-action="move-project" data-index="${index}" data-direction="1" title="下移">⬇️</button>` : ''}
                    <button class="btn-icon delete" data-action="remove-project" data-index="${index}" title="删除">\u{1F5D1}️</button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>项目名称</label>
                    <input type="text" value="${proj.name}" data-field="name" data-index="${index}" placeholder="如：电商平台">
                </div>
                <div class="form-group">
                    <label>担任角色</label>
                    <input type="text" value="${proj.role}" data-field="role" data-index="${index}" placeholder="如：前端负责人">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始时间</label>
                    <input type="text" value="${proj.startDate}" data-field="startDate" data-index="${index}" placeholder="如：2021-03">
                </div>
                <div class="form-group">
                    <label>结束时间</label>
                    <input type="text" value="${proj.endDate}" data-field="endDate" data-index="${index}" placeholder="如：2022-06">
                </div>
            </div>
            <div class="form-group">
                <label>项目链接</label>
                <input type="text" value="${proj.url}" data-field="url" data-index="${index}" placeholder="https://...">
            </div>
            <div class="form-group">
                <label>项目描述</label>
                <textarea rows="6" data-field="description" data-index="${index}" placeholder="描述项目背景、你的职责和成果...">${proj.description}</textarea>
                <div class="form-hint">支持 Markdown 语法（列表、加粗、斜体等）</div>
            </div>
        </div>
    `).join('');
}
