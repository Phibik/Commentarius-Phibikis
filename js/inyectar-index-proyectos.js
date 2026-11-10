// Carga todos los proyectos chivándose en consola si un JSON tiene fallos de sintaxis
window.cargarProyectos = async function(basePath = '') {
    try {
        const res = await fetch(`${basePath}projecta/projecta.json`);
        if (!res.ok) throw new Error(`No se pudo cargar projecta.json (HTTP ${res.status})`);
        const projectIds = await res.json();

        const promesas = projectIds.map(async (id) => {
            try {
                const r = await fetch(`${basePath}projecta/${id}/${id}.json`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const meta = await r.json();
                meta._id = id;
                return meta;
            } catch (e) {
                console.error(`❌ [SINTAXIS JSON ROTA] Revisa 'projecta/${id}/${id}.json':`, e.message);
                return null;
            }
        });

        const resultados = await Promise.all(promesas);
        return resultados.filter(p => p !== null);
    } catch (e) {
        console.error("❌ Error crítico en cargarProyectos:", e);
        return [];
    }
};

window.generarTarjetaHTML = function(meta, hrefPrefix = '') {
    const impVisual = meta.importancia !== undefined ? Math.floor(meta.importancia) : '-';
    const claseStr = (meta.clase || 'opus').toUpperCase();
    const formatoStr = (meta.formato || meta.tipo || 'pdf').toUpperCase();
    
    const tagsHTML = (meta.tags || []).map(t => 
        `<span style="font-size: 0.7rem; background: rgba(255,255,255,0.06); padding: 0.15rem 0.4rem; border-radius: 4px; color: var(--text-muted); font-family: var(--font-mono);">#${t}</span>`
    ).join(' ');

    return `
        <a href="${hrefPrefix}projectum.html?id=${meta._id}" class="log-mini-card" style="display: block; text-decoration: none; background: var(--surface-color); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: 8px; transition: border-color 0.2s;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem; font-family: var(--font-mono);">
                <span>${claseStr} &bull; ${formatoStr} &bull; v${meta.version}</span>
                <span>Imp. ${impVisual}</span>
            </div>
            <strong style="font-size: 1.1rem; color: var(--text-main); display: block; margin: 0.3rem 0;">${meta.nombre}</strong>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.8rem;">${meta.sinopsis || ''}</p>
            ${tagsHTML ? `<div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">${tagsHTML}</div>` : ''}
        </a>
    `;
};

async function initIndex() {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;

    try {
        let proyectos = await window.cargarProyectos('');
        proyectos.sort((a, b) => (a.importancia ?? 99) - (b.importancia ?? 99));

        projectsGrid.innerHTML = proyectos
            .slice(0, 3)
            .map(p => window.generarTarjetaHTML(p, 'html/'))
            .join('');
    } catch (e) {
        console.error("Error cargando destacados en index:", e);
        projectsGrid.innerHTML = `<p style="color: #ef4444;">No se pudieron cargar los proyectos.</p>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndex);
} else {
    initIndex();
}