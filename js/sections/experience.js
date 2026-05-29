import { resumeData, saveToStorage, debouncedSave } from '../state.js';
import { renderPreview } from '../preview.js';

export function initExperience(container) {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'add-experience') {
            resumeData.experience.push({
                company: '',
                position: '',
                startDate: '',
                endDate: '',
                description: '',
                current: false
            });
            renderExperience();
            saveToStorage();
        } else if (action === 'remove-experience') {
            resumeData.experience.splice(index, 1);
            renderExperience();
            saveToStorage();
        } else if (action === 'move-experience') {
            const direction = parseInt(btn.dataset.direction);
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < resumeData.experience.length) {
                [resumeData.experience[index], resumeData.experience[newIndex]] =
                    [resumeData.experience[newIndex], resumeData.experience[index]];
                renderExperience();
                saveToStorage();
            }
        }
    });

    container.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field && !isNaN(index)) {
            resumeData.experience[index][field] = e.target.value;
            renderPreview();
            debouncedSave();
        }
    });

    container.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field && !isNaN(index)) {
            resumeData.experience[index][field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            renderPreview();
            if (field === 'current') renderExperience();
            saveToStorage();
        }
    });
}

export function renderExperience() {
    const container = document.getElementById('experience-container');
    container.innerHTML = resumeData.experience.map((exp, index) => `
        <div class="item-card">
            <div class="item-card-header">
                <span class="item-card-title">工作经历 #${index + 1}</span>
                <div class="item-actions">
                    ${index > 0 ? `<button class="btn-icon" data-action="move-experience" data-index="${index}" data-direction="-1" title="上移">⬆️</button>` : ''}
                    ${index < resumeData.experience.length - 1 ? `<button class="btn-icon" data-action="move-experience" data-index="${index}" data-direction="1" title="下移">⬇️</button>` : ''}
                    <button class="btn-icon delete" data-action="remove-experience" data-index="${index}" title="删除">\u{1F5D1}️</button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>公司名称</label>
                    <input type="text" value="${exp.company}" data-field="company" data-index="${index}" placeholder="如：阿里巴巴">
                </div>
                <div class="form-group">
                    <label>职位</label>
                    <input type="text" value="${exp.position}" data-field="position" data-index="${index}" placeholder="如：高级前端工程师">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始时间</label>
                    <input type="text" value="${exp.startDate}" data-field="startDate" data-index="${index}" placeholder="如：2020-01">
                </div>
                <div class="form-group">
                    <label>结束时间</label>
                    <input type="text" value="${exp.current ? '至今' : exp.endDate}" data-field="endDate" data-index="${index}" placeholder="如：2023-06" ${exp.current ? 'disabled' : ''}>
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" ${exp.current ? 'checked' : ''} data-field="current" data-index="${index}">
                    当前在职
                </label>
            </div>
            <div class="form-group">
                <label>工作描述</label>
                <textarea rows="6" data-field="description" data-index="${index}" placeholder="描述你的工作内容和成就...">${exp.description}</textarea>
                <div class="form-hint">支持 Markdown 语法（列表、加粗、斜体等）</div>
            </div>
        </div>
    `).join('');
}
