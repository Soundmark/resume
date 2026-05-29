/**
 * export.js — 简历数据导入/导出模块
 *
 * 职责：
 *   1. JSON 导出 — 将 resumeData 序列化为带日期的 .json 文件下载
 *   2. JSON 导入 — 从文件读取并恢复简历数据（带格式校验）
 *   3. PDF 导出 — 使用 html2canvas + jsPDF 生成 A4 尺寸 PDF
 *
 * 依赖：
 *   - html2canvas (CDN) — DOM 截图为 Canvas
 *   - jsPDF (CDN) — 生成 PDF 文档
 *   - state.js — 读写 resumeData
 */

import { resumeData, saveToStorage } from './state.js';

// ========== JSON 导入 ==========

/**
 * 初始化 JSON 导入功能 — 绑定隐藏文件输入框的 change 事件
 * @param {Function} renderAllFn — 导入成功后的全量渲染回调
 */
export function initExport(renderAllFn) {
    const fileInput = document.getElementById('importFile');

    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);

                if (!validateImportData(data)) {
                    alert('文件格式不正确！请确认是本工具导出的 JSON 文件。');
                    return;
                }

                // 合并数据到 resumeData
                Object.assign(resumeData, data);
                renderAllFn();
                saveToStorage();
                alert('导入成功！');
            } catch (err) {
                alert('解析文件失败：' + err.message);
            }
        };
        reader.readAsText(file);

        // 清空 input 值，允许重复导入同一文件
        this.value = '';
    });
}

/**
 * 校验导入数据的基本结构
 * @param {object} data - 解析后的 JSON 对象
 * @returns {boolean} 至少包含一个有效字段即通过
 */
function validateImportData(data) {
    return data && typeof data === 'object' &&
        (data.basics || data.experience || data.education || data.skills);
}

// ========== JSON 导出 ==========

/**
 * 导出 resumeData 为 JSON 文件并触发浏览器下载
 * 文件名格式：resume-YYYY-MM-DD.json
 */
export function exportJSON() {
    const dataStr = JSON.stringify(resumeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${getDateString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// ========== PDF 导出 ==========

/**
 * 将简历预览区域导出为 PDF
 *
 * 流程：
 *   1. 遍历所有 .preview-page 元素
 *   2. 临时移除 box-shadow、设置固定高度（避免截图截断）
 *   3. 使用 html2canvas 以 2x 分辨率截图为 Canvas
 *   4. 将 Canvas 图片添加到 jsPDF 文档的 A4 页面
 *   5. 恢复原始样式
 *
 * @description 导出期间显示 loading 遮罩
 */
export async function exportPDF() {
    const preview = document.getElementById('resume-preview');

    // 检查是否有内容可导出
    if (!preview.innerHTML.trim() || preview.innerHTML.includes('在左侧编辑')) {
        alert('请先填写简历内容！');
        return;
    }

    const loading = document.getElementById('loading');
    loading.classList.add('active');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pages = preview.querySelectorAll('.preview-page');
        if (!pages.length) {
            alert('没有可导出的页面');
            return;
        }

        for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();

            // 保存原始样式
            const origStyle = {
                boxShadow: pages[i].style.boxShadow,
                height: pages[i].style.height,
                overflow: pages[i].style.overflow
            };

            // 临时调整样式以获得干净截图
            pages[i].style.boxShadow = 'none';
            pages[i].style.height = '297mm';
            pages[i].style.overflow = 'hidden';

            // 截图为 Canvas（2x 分辨率保证清晰度）
            const canvas = await html2canvas(pages[i], {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            // 恢复原始样式
            pages[i].style.boxShadow = origStyle.boxShadow;
            pages[i].style.height = origStyle.height;
            pages[i].style.overflow = origStyle.overflow;

            // 添加到 PDF
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = 210; // A4 宽度 mm
            const pdfHeight = Math.min(297, (canvas.height / canvas.width) * pdfWidth);
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        // 触发下载
        pdf.save(`resume-${getDateString()}.pdf`);
    } catch (err) {
        console.error('[export] PDF export failed:', err);
        alert('PDF 导出失败：' + err.message);
    } finally {
        loading.classList.remove('active');
    }
}

// ========== 工具函数 ==========

/** 获取当前日期字符串 YYYY-MM-DD */
function getDateString() {
    return new Date().toISOString().split('T')[0];
}
