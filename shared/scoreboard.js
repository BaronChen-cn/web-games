// shared/scoreboard.js

/**
 * 将记录对象渲染为记分板 HTML，注入到 container 元素
 * records 格式: [{ label: '最快时间', value: '01:23', highlight: true }, ...]
 */
function renderScoreboard(container, records) {
  container.innerHTML = `
    <div style="
      display:flex; gap:16px; flex-wrap:wrap; justify-content:center;
      margin:12px 0; font-family:'Segoe UI',system-ui,sans-serif;
    ">
      ${records.map(r => `
        <div style="
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; padding:10px 18px; text-align:center; min-width:90px;
          ${r.highlight ? 'border-color:rgba(91,106,255,0.5);box-shadow:0 0 12px rgba(91,106,255,0.2);' : ''}
        ">
          <div style="font-size:11px;color:rgba(180,185,230,0.55);letter-spacing:1px;margin-bottom:4px;">
            ${r.label}
          </div>
          <div style="font-size:20px;font-weight:800;color:${r.highlight ? '#a8b0ff' : '#e8eaff'};">
            ${r.value ?? '—'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
