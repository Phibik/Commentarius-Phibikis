async function initIndexLogs() {
    const diariumFeed = document.getElementById('diarium-feed');
    if (!diariumFeed) return;

    try {
        const res = await fetch('projecta/diarium.json');
        
        if (!res.ok) {
            throw new Error(`No se pudo encontrar diarium.json (HTTP Status ${res.status})`);
        }

        let logs = [];
        try {
            logs = await res.json();
        } catch (jsonErr) {
            console.error("❌ [SINTAXIS JSON ROTA] Revisa 'projecta/diarium.json':", jsonErr);
            diariumFeed.innerHTML = `<p style="color: #ef4444; font-size: 0.9rem;">Sintaxis corrupta en <code>projecta/diarium.json</code>. Revisa la consola para ver el fallo exacto.</p>`;
            return;
        }

        if (!Array.isArray(logs) || logs.length === 0) {
            diariumFeed.innerHTML = `<p style="color: var(--text-muted);">No hay registros de bitácora todavía.</p>`;
            return;
        }

        // Mostramos los 3 más recientes en la portada
        const recientes = logs.slice(0, 3);

        diariumFeed.innerHTML = recientes.map(log => `
            <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 1rem; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.4rem;">
                    <span>📅 ${log.fecha || 'Sin fecha'}</span>
                    ${log.proyecto ? `<span>🔗 Proyecto: <strong>${log.proyecto}</strong></span>` : ''}
                </div>
                <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.5; margin: 0;">${log.texto || ''}</p>
            </div>
        `).join('');

    } catch (e) {
        console.error("❌ Error al cargar los logs de la portada:", e);
        diariumFeed.innerHTML = `<p style="color: var(--text-muted);">No se pudieron cargar los registros de bitácora.</p>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndexLogs);
} else {
    initIndexLogs();
}