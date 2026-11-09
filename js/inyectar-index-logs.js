document.addEventListener('DOMContentLoaded', async () => {
    const diariumFeed = document.getElementById('diarium-feed');
    if (!diariumFeed) return;

    try {
        const res = await fetch('projecta/diarium.json');
        const logs = await res.json();

        diariumFeed.innerHTML = logs.map(log => `
            <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 1rem; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.4rem;">
                    <span>📅 ${log.fecha}</span>
                    ${log.proyecto ? `<span>🔗 Proyecto: <strong>${log.proyecto}</strong></span>` : ''}
                </div>
                <p style="color: var(--text-main); font-size: 0.95rem;">${log.texto}</p>
            </div>
        `).join('');
    } catch (e) {
        diariumFeed.innerHTML = `<p style="color: var(--text-muted);">No hay registros de bitácora todavía.</p>`;
    }
});