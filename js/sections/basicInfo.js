import { resumeData, debouncedSave } from '../state.js';
import { renderPreview } from '../preview.js';

export function initBasicInfo(container) {
    // Fill initial values
    container.querySelector('[data-field="name"]').value = resumeData.basics.name;
    container.querySelector('[data-field="title"]').value = resumeData.basics.title;
    container.querySelector('[data-field="phone"]').value = resumeData.basics.phone;
    container.querySelector('[data-field="email"]').value = resumeData.basics.email;
    container.querySelector('[data-field="location"]').value = resumeData.basics.location;
    container.querySelector('[data-field="summary"]').value = resumeData.basics.summary;

    // Event delegation for input changes
    container.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        if (field && field in resumeData.basics) {
            resumeData.basics[field] = e.target.value;
            renderPreview();
            debouncedSave();
        }
    });
}

export function renderBasicInfo() {
    document.getElementById('basic-name').value = resumeData.basics.name;
    document.getElementById('basic-title').value = resumeData.basics.title;
    document.getElementById('basic-phone').value = resumeData.basics.phone;
    document.getElementById('basic-email').value = resumeData.basics.email;
    document.getElementById('basic-location').value = resumeData.basics.location;
    document.getElementById('basic-summary').value = resumeData.basics.summary;
}
