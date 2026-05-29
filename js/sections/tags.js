import { resumeData, saveToStorage } from '../state.js';

function initTagSection(container, input, dataKey, renderFn) {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = e.target.value.trim();
            if (value && !resumeData[dataKey].includes(value)) {
                resumeData[dataKey].push(value);
                e.target.value = '';
                renderFn();
                saveToStorage();
            }
        }
    });

    container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove');
        if (removeBtn) {
            const index = parseInt(removeBtn.dataset.index);
            resumeData[dataKey].splice(index, 1);
            renderFn();
            saveToStorage();
        }
    });
}

function renderTags(container, dataArray) {
    container.innerHTML = dataArray.map((item, index) => `
        <span class="tag">
            ${item}
            <span class="remove" data-index="${index}">×</span>
        </span>
    `).join('');
}

export function initSkills(container, input) {
    initTagSection(container, input, 'skills', renderSkills);
}

export function renderSkills() {
    const container = document.getElementById('skills-container');
    renderTags(container, resumeData.skills);
}

export function initCertifications(container, input) {
    initTagSection(container, input, 'certifications', renderCertifications);
}

export function renderCertifications() {
    const container = document.getElementById('certifications-container');
    renderTags(container, resumeData.certifications);
}
