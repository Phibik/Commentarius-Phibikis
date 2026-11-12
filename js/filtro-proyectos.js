async function initCatalogo() {
    const grid = document.getElementById('proyecta-grid');
    const selectFormato = document.getElementById('filtro-formato');
    const contenedorTags = document.getElementById('contenedor-tags');
    const wrapperTags = document.getElementById('wrapper-tags');
    const btnReset = document.getElementById('btn-reset-filtros');

    if (!grid) return;

    let proyectosData = [];
    let tagsSeleccionadas = new Set();

    try {
        proyectosData = await window.cargarProyectos('../');
        
        generarSelectFormatos(); // ¡Nuevo! Genera el desplegable dinámicamente
        generarBotonesTags();
        renderProyectos();

        // Listeners - Radios
        const radiosFiltro = document.querySelectorAll('.segmented-control input[type="radio"]');
        radiosFiltro.forEach(radio => radio.addEventListener('change', renderProyectos));

        // Listeners - Select
        if (selectFormato) selectFormato.addEventListener('change', renderProyectos);

        // Listener - Reset
        if (btnReset) {
            btnReset.addEventListener('click', resetearFiltros);
        }

    } catch (e) {
        console.error("Error cargando el catálogo:", e);
        grid.innerHTML = `<p class="error-msg">No se pudo cargar el catálogo de proyectos.</p>`;
    }

    // ----------------------------------------------------------------------
    // NUEVA FUNCIÓN: Extrae los formatos/tipos dinámicamente
    // ----------------------------------------------------------------------
    function generarSelectFormatos() {
        if (!selectFormato) return;
        
        const formatosUnicos = new Set();
        
        proyectosData.forEach(p => {
            const fmt = (p.formato || p.tipo || 'pdf').toLowerCase().trim();
            formatosUnicos.add(fmt);
        });

        // Siempre la primera opción será "Todos"
        const optionsHTML = ['<option value="todos">Formato: Todos</option>'];
        
        // Ordenamos alfabéticamente y capitalizamos la primera letra
        Array.from(formatosUnicos).sort().forEach(fmt => {
            let nombreFmt = fmt.charAt(0).toUpperCase() + fmt.slice(1);
            // Pequeña corrección de estilo para nombres conocidos
            if(fmt === 'pdf') nombreFmt = 'PDF';
            if(fmt === 'github') nombreFmt = 'GitHub';
            if(fmt === 'video') nombreFmt = 'Vídeo';

            optionsHTML.push(`<option value="${fmt}">Formato: ${nombreFmt}</option>`);
        });

        selectFormato.innerHTML = optionsHTML.join('');
    }

    // ----------------------------------------------------------------------
    // FUNCIÓN RESET: Restaura la vista inicial
    // ----------------------------------------------------------------------
    function resetearFiltros() {
        // 1. Restaurar Radios a sus valores por defecto
        document.getElementById('ord-imp').checked = true;
        document.getElementById('cla-todas').checked = true;
        
        // 2. Restaurar Select
        if (selectFormato) selectFormato.value = 'todos';
        
        // 3. Limpiar Tags
        tagsSeleccionadas.clear();
        if (contenedorTags) {
            contenedorTags.querySelectorAll('.btn-tag').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        // 4. Volver a pintar
        renderProyectos();
    }

    // ... A PARTIR DE AQUÍ TODO SIGUE IGUAL (generarBotonesTags y renderProyectos) ...

    function generarBotonesTags() {
        if (!contenedorTags) return;
        const tagMap = new Map();
        proyectosData.forEach(p => {
            if (Array.isArray(p.tags)) {
                p.tags.forEach(t => {
                    const originalTag = t.trim();
                    const key = originalTag.toLowerCase();
                    if (!tagMap.has(key)) tagMap.set(key, originalTag);
                });
            }
        });

        if (tagMap.size === 0) {
            if (wrapperTags) wrapperTags.style.display = 'none';
            return;
        }

        if (wrapperTags) wrapperTags.style.display = 'block';

        const tagsOrdenados = Array.from(tagMap.values()).sort((a, b) => 
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        contenedorTags.innerHTML = tagsOrdenados.map(tag => `
            <button type="button" class="btn-tag" data-tag="${tag}">${tag}</button>
        `).join('');

        contenedorTags.querySelectorAll('.btn-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                if (tagsSeleccionadas.has(tag)) {
                    tagsSeleccionadas.delete(tag);
                    btn.classList.remove('active');
                } else {
                    tagsSeleccionadas.add(tag);
                    btn.classList.add('active');
                }
                renderProyectos();
            });
        });
    }

    function renderProyectos() {
        let lista = [...proyectosData];

        const radioClase = document.querySelector('input[name="filtro-clase"]:checked');
        const claseSel = radioClase ? radioClase.value : 'todos';
        
        const radioOrden = document.querySelector('input[name="filtro-orden"]:checked');
        const ordenSel = radioOrden ? radioOrden.value : 'importancia';
        
        const formatoSel = selectFormato ? selectFormato.value : 'todos';

        if (claseSel !== 'todos') {
            lista = lista.filter(p => (p.clase || '').toLowerCase() === claseSel);
        }

        if (formatoSel !== 'todos') {
            lista = lista.filter(p => (p.formato || p.tipo || 'pdf').toLowerCase() === formatoSel);
        }

        if (tagsSeleccionadas.size > 0) {
            const arrTagsLower = Array.from(tagsSeleccionadas).map(t => t.toLowerCase());
            lista = lista.filter(p => {
                const pTags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase().trim()) : [];
                return arrTagsLower.every(t => pTags.includes(t));
            });
        }

        lista.sort((a, b) => {
            if (ordenSel === 'importancia') {
                return (a.importancia ?? 99) - (b.importancia ?? 99);
            } else if (ordenSel === 'recientes') {
                const fechaA = a.versiones?.[0]?.fecha || '0000-00-00';
                const fechaB = b.versiones?.[0]?.fecha || '0000-00-00';
                return fechaB.localeCompare(fechaA);
            }
            return 0;
        });

        if (lista.length === 0) {
            grid.innerHTML = `<p class="empty-msg">No hay proyectos que coincidan con estos filtros.</p>`;
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