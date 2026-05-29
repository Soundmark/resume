import { resumeData, saveToStorage, debouncedSave } from '../state.js';
import { renderPreview } from '../preview.js';

export function initCustomSections(container) {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const sIndex = parseInt(btn.dataset.sectionIndex);
        const iIndex = parseInt(btn.dataset.itemIndex);

        if (action === 'remove-custom-section') {
            resumeData.customSections.splice(sIndex, 1);
            renderCustomSections();
            saveToStorage();
        } else if (action === 'add-custom-item') {
            resumeData.customSections[sIndex].items.push({
                title: '',
                subtitle: '',
                description: ''
            });
            renderCustomSections();
            saveToStorage();
        } else if (action === 'remove-custom-item') {
            resumeData.customSections[sIndex].items.splice(iIndex, 1);
            renderCustomSections();
            saveToStorage();
        }
    });

    container.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const sIndex = parseInt(e.target.dataset.sectionIndex);
        const iIndex = parseInt(e.target.dataset.itemIndex);
        if (field && !isNaN(sIndex) && !isNaN(iIndex)) {
            resumeData.customSections[sIndex].items[iIndex][field] = e.target.value;
            renderPreview();
            debouncedSave();
        }
    });
}

export function initDialog() {
    const dialogOverlay = document.getElementById('custom-section-dialog');

    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            hideDialog();
        }
    });

    dialogOverlay.querySelector('[data-action="cancel-dialog"]').addEventListener('click', hideDialog);
    dialogOverlay.querySelector('[data-action="confirm-dialog"]').addEventListener('click', () => {
        const nameInput = document.getElementById('custom-section-name');
        const name = nameInput.value.trim();
        if (name) {
            resumeData.customSections.push({ title: name, items: [] });
            renderCustomSections();
            saveToStorage();
            hideDialog();
        }
    });

    document.querySelector('[data-action="show-custom-dialog"]').addEventListener('click', () => {
        dialogOverlay.classList.add('active');
        document.getElementById('custom-section-name').focus();
    });

    function hideDialog() {
        dialogOverlay.classList.remove('active');
        document.getElementById('custom-section-name').value = '';
    }
}

export function renderCustomSections() {
    const container = document.getElementById('custom-sections-container');
    container.innerHTML = resumeData.customSections.map((section, sIndex) => `
        <div class="section">
            <h2 class="section-title">
                <span class="icon">\u{1F4CC}</span>
                ${section.title}
                <button class="btn-icon delete" style="margin-left: auto;" data-action="remove-custom-section" data-section-index="${sIndex}" title="删除区块">\u{1F5D1}️</button>
            </h2>
            <div id="custom-section-${sIndex}">
                ${section.items.map((item, iIndex) => `
                    <div class="item-card">
                        <div class="item-card-header">
                            <span class="item-card-title">条目 #${iIndex + 1}</span>
                            <button class="btn-icon delete" data-action="remove-custom-item" data-section-index="${sIndex}" data-item-index="${iIndex}" title="删除">\u{1F5D1}️</button>
                        </div>
                        <div class="form-group">
                            <label>标题</label>
                            <input type="text" value="${item.title}" data-field="title" data-section-index="${sIndex}" data-item-index="${iIndex}" placeholder="主标题">
                        </div>
                        <div class="form-group">
                            <label>副标题</label>
                            <input type="text" value="${item.subtitle}" data-field="subtitle" data-section-index="${sIndex}" data-item-index="${iIndex}" placeholder="副标题或时间">
                        </div>
                        <div class="form-group">
                            <label>描述</label>
                            <textarea rows="5" data-field="description" data-section-index="${sIndex}" data-item-index="${iIndex}" placeholder="详细描述">${item.description}</textarea>
                            <div class="form-hint">支持 Markdown 语法（列表、加粗、斜体等）</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add" data-action="add-custom-item" data-section-index="${sIndex}">
                <span>+</span> 添加${section.title}条目
            </button>
        </div>
    `).join('');
}
