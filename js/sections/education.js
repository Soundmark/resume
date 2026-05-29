import { resumeData, saveToStorage, debouncedSave } from '../state.js';
import { renderPreview } from '../preview.js';

export function initEducation(container) {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'add-education') {
            resumeData.education.push({
                school: '',
                major: '',
                degree: '',
                startDate: '',
                endDate: ''
            });
            renderEducation();
            saveToStorage();
        } else if (action === 'remove-education') {
            resumeData.education.splice(index, 1);
            renderEducation();
            saveToStorage();
        } else if (action === 'move-education') {
            const direction = parseInt(btn.dataset.direction);
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < resumeData.education.length) {
                [resumeData.education[index], resumeData.education[newIndex]] =
                    [resumeData.education[newIndex], resumeData.education[index]];
                renderEducation();
                saveToStorage();
            }
        }
    });

    container.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field && !isNaN(index)) {
            resumeData.education[index][field] = e.target.value;
            renderPreview();
            debouncedSave();
        }
    });

    container.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field === 'degree' && !isNaN(index)) {
            resumeData.education[index].degree = e.target.value;
            renderPreview();
            saveToStorage();
        }
        if (field === 'time' && !isNaN(index)) {
            const value = e.target.value;
            const parts = value.split('-').map(s => s.trim());
            if (parts.length >= 2) {
                resumeData.education[index].startDate = parts[0] + ' - ' + parts[1];
                resumeData.education[index].endDate = parts[2] || '';
            } else {
                resumeData.education[index].startDate = value;
            }
            renderPreview();
            saveToStorage();
        }
    });
}

export function renderEducation() {
    const container = document.getElementById('education-container');
    container.innerHTML = resumeData.education.map((edu, index) => `
        <div class="item-card">
            <div class="item-card-header">
                <span class="item-card-title">教育经历 #${index + 1}</span>
                <div class="item-actions">
                    ${index > 0 ? `<button class="btn-icon" data-action="move-education" data-index="${index}" data-direction="-1" title="上移">⬆️</button>` : ''}
                    ${index < resumeData.education.length - 1 ? `<button class="btn-icon" data-action="move-education" data-index="${index}" data-direction="1" title="下移">⬇️</button>` : ''}
                    <button class="btn-icon delete" data-action="remove-education" data-index="${index}" title="删除">\u{1F5D1}️</button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>学校名称</label>
                    <input type="text" value="${edu.school}" data-field="school" data-index="${index}" placeholder="如：北京大学">
                </div>
                <div class="form-group">
                    <label>专业</label>
                    <input type="text" value="${edu.major}" data-field="major" data-index="${index}" placeholder="如：计算机科学">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>学历</label>
                    <select data-field="degree" data-index="${index}">
                        <option value="">请选择</option>
                        <option value="高中" ${edu.degree === '高中' ? 'selected' : ''}>高中</option>
                        <option value="大专" ${edu.degree === '大专' ? 'selected' : ''}>大专</option>
                        <option value="本科" ${edu.degree === '本科' ? 'selected' : ''}>本科</option>
                        <option value="硕士" ${edu.degree === '硕士' ? 'selected' : ''}>硕士</option>
                        <option value="博士" ${edu.degree === '博士' ? 'selected' : ''}>博士</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>时间</label>
                    <input type="text" value="${edu.startDate}${edu.endDate ? ' - ' + edu.endDate : ''}" data-field="time" data-index="${index}" placeholder="如：2016-09 - 2020-06">
                </div>
            </div>
        </div>
    `).join('');
}
