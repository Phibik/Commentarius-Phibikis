document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('proyecta-grid');
    const selectOrden = document.getElementById('filtro-orden');
    const selectClase = document.getElementById('filtro-clase');
    
    if (!grid) return;

    let proyectosData = [];

    try {
        const res = await fetch('../projecta/projecta.json');
        const ids = await res.json();

        // Cargar todos los JSON de los proyectos en paralelo
        const promesas = ids.map(id => fetch(`../projecta/${id}/${id}.json`).then(r => r.json()).catch(() => null));
        proyectosData = (await Promise.all(promesas)).filter(p => p !== null);

        renderProyectos();

        // Escuchar cambios en los filtros
        if (selectOrden) selectOrden.addEventListener('change', renderProyectos);
        if (selectClase) selectClase.addEventListener('change', renderProyectos);

    } catch (e) {
        console.error("Error cargando proyectos:", e);
        grid.innerHTML = `<p style="color: #ef4444;">No se pudo cargar el listado de proyectos.</p>`;
    }

    function renderProyectos() {
        let lista = [...proyectosData];

        // 1. Filtrar por clase (opus, adumbratio, etc.)
        const claseSeleccionada = selectClase ? selectClase.value : 'todos';
        if (claseSeleccionada !== 'todos') {
            lista = lista.filter(p => (p.clase || '').toLowerCase() === claseSeleccionada);
        }

        // 2. Ordenar (Por defecto: importancia ascendente, es decir, 1 es el más importante)
        const ordenSeleccionado = selectOrden ? selectOrden.value : 'importancia';
        lista.sort((a, b) => {
            if (ordenSeleccionado === 'importancia') {
                return (a.importancia || 99) - (b.importancia || 99);
            } else if (ordenSeleccionado === 'recientes') {
                const fechaA = a.versiones?.[0]?.fecha || '0000-00-00';
                const fechaB = b.versiones?.[0]?.fecha || '0000-00-00';
                return fechaB.localeCompare(fechaA);
            } else if (ordenSeleccionado === 'alfabetico') {
                return (a.nombre || '').localeCompare(b.nombre || '');
            }
            return 0;
        });

        // 3. Pintar en pantalla
        if (lista.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No hay proyectos que coincidan con este filtro.</p>`;
            return;
        }

        grid.innerHTML = lista.map(meta => `
            <a href="projectum.html?id=${meta.id || meta.nombre.toLowerCase().replace(/\s+/g, '-')}" class="log-mini-card" style="display: block; text-decoration: none; background: var(--surface-color); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 8px; transition: border-color 0.2s;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; font-family: var(--font-mono);">
                    <span>v${meta.version} &bull; ${(meta.clase || 'opus').toUpperCase()}</span>
                    <span>Imp. ${meta.importancia || '-'}</span>
                </div>
                <strong style="font-size: 1.2rem; color: var(--text-main); display: block; margin-bottom: 0.5rem;">${meta.nombre}</strong>
                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5;">${meta.sinopsis || 'Sin sinopsis disponible.'}</p>
            </a>
        `).join('');
    }
});