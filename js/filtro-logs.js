document.addEventListener('DOMContentLoaded', async () => {
    const feed = document.getElementById('diarium-full-feed');
    const selectProyecto = document.getElementById('filtro-proyecto-log');

    if (!feed) return;

    let logsData = [];

    try {
        const [logsRes, progsRes] = await Promise.all([
            fetch('../projecta/diarium.json'),
            fetch('../projecta/projecta.json').catch(() => null)
        ]);

        logsData = logsRes.ok ? await logsRes.json() : [];

        // Poblar el desplegable de filtro de proyectos si existe
        if (selectProyecto && progsRes && progsRes.ok) {
            const projectIds = await progsRes.json();
            selectProyecto.innerHTML = `<option value="todos">Todos los proyectos (General)</option>` + 
                projectIds.map(id => `<option value="${id}">${id}</option>`).join('');
            
            selectProyecto.addEventListener('change', renderLogs);
        }

        renderLogs();

    } catch (e) {
        console.error("Error cargando el diarium:", e);
        feed.innerHTML = `<p style="color: #ef4444;">No se pudo cargar la bitácora.</p>`;
    }

    function renderLogs() {
        let lista = [...logsData];
        const filtro = selectProyecto ? selectProyecto.value : 'todos';

        if (filtro !== 'todos') {
            lista = lista.filter(log => log.proyecto === filtro);
        }

        if (lista.length === 0) {
            feed.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay registros para este filtro.</p>`;
            return;
        }

        feed.innerHTML = lista.map(log => `
            <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.5rem;">
                    <span>📅 ${log.fecha}</span>
                    ${log.proyecto ? `<span>🔗 Proyecto: <strong style="color: var(--text-main);">${log.proyecto}</strong></span>` : '<span>✨ Nota general</span>'}
                </div>
                <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.6;">${log.texto}</p>
            </div>
        `).join('');
    }
});