async function initCatalogo() {
    const grid = document.getElementById('proyecta-grid');
    const selectOrden = document.getElementById('filtro-orden');
    const selectClase = document.getElementById('filtro-clase');
    const selectFormato = document.getElementById('filtro-formato');
    const contenedorTags = document.getElementById('contenedor-tags');
    const wrapperTags = document.getElementById('wrapper-tags');

    if (!grid) return;

    let proyectosData = [];
    let tagsSeleccionadas = new Set();

    try {
        proyectosData = await window.cargarProyectos('../');
        
        generarBotonesTags();
        renderProyectos();

        if (selectOrden) selectOrden.addEventListener('change', renderProyectos);
        if (selectClase) selectClase.addEventListener('change', renderProyectos);
        if (selectFormato) selectFormato.addEventListener('change', renderProyectos);

    } catch (e) {
        console.error("Error cargando el catálogo:", e);
        grid.innerHTML = `<p style="color: #ef4444;">No se pudo cargar el catálogo de proyectos.</p>`;
    }

    function generarBotonesTags() {
        if (!contenedorTags) return;

        const todastags = new Set();
        proyectosData.forEach(p => {
            if (Array.isArray(p.tags)) {
                p.tags.forEach(t => todastags.add(t.toLowerCase().trim()));
            }
        });

        if (todastags.size === 0) {
            if (wrapperTags) wrapperTags.style.display = 'none';
            return;
        }

        if (wrapperTags) wrapperTags.style.display = 'block';

        contenedorTags.innerHTML = Array.from(todastags).map(tag => `
            <button type="button" class="btn-tag" data-tag="${tag}" style="background: var(--surface-color); color: var(--text-muted); border: 1px solid var(--border-color); padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.8rem; cursor: pointer; font-family: var(--font-mono); transition: all 0.15s;">
                #${tag}
            </button>
        `).join('');

        contenedorTags.querySelectorAll('.btn-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                if (tagsSeleccionadas.has(tag)) {
                    tagsSeleccionadas.delete(tag);
                    btn.style.background = 'var(--surface-color)';
                    btn.style.color = 'var(--text-muted)';
                    btn.style.borderColor = 'var(--border-color)';
                } else {
                    tagsSeleccionadas.add(tag);
                    btn.style.background = 'var(--text-main)';
                    btn.style.color = 'var(--bg-color, #111)';
                    btn.style.borderColor = 'var(--text-main)';
                }
                renderProyectos();
            });
        });
    }

    function renderProyectos() {
        let lista = [...proyectosData];

        // 1. Filtro por Clase (Opus vs Adumbratio)
        const claseSel = selectClase ? selectClase.value : 'todos';
        if (claseSel !== 'todos') {
            lista = lista.filter(p => (p.clase || '').toLowerCase() === claseSel);
        }

        // 2. Filtro por Formato (PDF vs Vídeo)
        const formatoSel = selectFormato ? selectFormato.value : 'todos';
        if (formatoSel !== 'todos') {
            lista = lista.filter(p => (p.formato || p.tipo || 'pdf').toLowerCase() === formatoSel);
        }

        // 3. Coincidencia de Tags (AND prioritario -> OR)
        const arrTags = Array.from(tagsSeleccionadas);
        if (arrTags.length > 0) {
            lista = lista
                .map(p => {
                    const pTags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase().trim()) : [];
                    const coinc = arrTags.filter(t => pTags.includes(t)).length;
                    return { ...p, _coincidencias: coinc };
                })
                .filter(p => p._coincidencias > 0);
        } else {
            lista = lista.map(p => ({ ...p, _coincidencias: 0 }));
        }

        // 4. Ordenación
        const ordenSel = selectOrden ? selectOrden.value : 'importancia';

        lista.sort((a, b) => {
            if (arrTags.length > 0 && b._coincidencias !== a._coincidencias) {
                return b._coincidencias - a._coincidencias;
            }

            if (ordenSel === 'importancia') {
                return (a.importancia ?? 99) - (b.importancia ?? 99);
            } else if (ordenSel === 'recientes') {
                const fechaA = a.versiones?.[0]?.fecha || '0000-00-00';
                const fechaB = b.versiones?.[0]?.fecha || '0000-00-00';
                return fechaB.localeCompare(fechaA);
            } else if (ordenSel === 'alfabetico') {
                return (a.nombre || '').localeCompare(b.nombre || '');
            }
            return 0;
        });

        if (lista.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No hay proyectos que coincidan con estos filtros.</p>`;
            return;
        }

        grid.innerHTML = lista.map(p => window.generarTarjetaHTML(p, '')).join('');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogo);
} else {
    initCatalogo();
}