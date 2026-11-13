async function initCatalogo() {
    const grid = document.getElementById('proyecta-grid');
    const selectFormato = document.getElementById('filtro-formato');
    const contenedorTags = document.getElementById('contenedor-tags');
    const wrapperTags = document.getElementById('wrapper-tags');
    const btnReset = document.getElementById('btn-reset-filtros');

    if (!grid) return;

    let proyectosData = [];
    let tagsSeleccionadas = new Set();

    const cardObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            ajustarLineasSinopsis(entry.target);
        }
    });

    function ajustarLineasSinopsis(card) {
        const sinopsis = card.querySelector('.card-sinopsis');
        if (!sinopsis) return;

        const csCard = getComputedStyle(card);
        const padV = parseFloat(csCard.paddingTop) + parseFloat(csCard.paddingBottom);
        const gap = parseFloat(csCard.rowGap || csCard.gap) || 0;
        const innerHeight = card.clientHeight - padV;

        let otrosHijos = 0;
        let visibles = 0;
        for (const child of card.children) {
            if (getComputedStyle(child).display === 'none') continue;
            visibles++;
            if (child !== sinopsis) {
                otrosHijos += child.offsetHeight;
            }
        }

        const disponible = innerHeight - otrosHijos - gap * Math.max(0, visibles - 1);
        const lineHeight = parseFloat(getComputedStyle(sinopsis).lineHeight);
        if (lineHeight > 0) {
            const lines = Math.max(3, Math.floor((disponible + 1) / lineHeight));
            sinopsis.style.setProperty('--sinopsis-lines', lines);
        }
    }

    function observarTarjetas() {
        cardObserver.disconnect();
        grid.querySelectorAll('.card-project').forEach(card => {
            ajustarLineasSinopsis(card);
            cardObserver.observe(card);
        });
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            grid.querySelectorAll('.card-project').forEach(ajustarLineasSinopsis);
        });
    }

    try {
        proyectosData = await window.cargarProyectos('../');

        proyectosData.forEach(p => {
            if (Array.isArray(p.tags)) {
                p.tags.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
            }
        });
        
        generarSelectFormatos();
        generarBotonesTags();
        renderProyectos();

        const radiosFiltro = document.querySelectorAll('.segmented-control input[type="radio"]');
        radiosFiltro.forEach(radio => radio.addEventListener('change', renderProyectos));

        if (selectFormato) selectFormato.addEventListener('change', renderProyectos);
        if (btnReset) btnReset.addEventListener('click', resetearFiltros);

    } catch (e) {
        console.error("Error cargando el catálogo:", e);
        grid.innerHTML = `<p class="error-msg">No se pudo cargar el catálogo de proyectos.</p>`;
    }

    function generarSelectFormatos() {
        if (!selectFormato) return;
        
        const formatosUnicos = new Set();
        proyectosData.forEach(p => {
            const fmt = (p.formato || p.tipo || 'pdf').toLowerCase().trim();
            formatosUnicos.add(fmt);
        });

        const optionsHTML = ['<option value="todos">Formato: Todos</option>'];
        Array.from(formatosUnicos).sort().forEach(fmt => {
            let nombreFmt = fmt.charAt(0).toUpperCase() + fmt.slice(1);
            if (fmt === 'pdf') nombreFmt = 'PDF';
            if (fmt === 'github') nombreFmt = 'GitHub';
            if (fmt === 'video') nombreFmt = 'Vídeo';

            optionsHTML.push(`<option value="${fmt}">Formato: ${nombreFmt}</option>`);
        });

        selectFormato.innerHTML = optionsHTML.join('');
    }

    function resetearFiltros() {
        document.getElementById('ord-imp').checked = true;
        document.getElementById('cla-todas').checked = true;
        if (selectFormato) selectFormato.value = 'todos';
        
        tagsSeleccionadas.clear();
        if (contenedorTags) {
            contenedorTags.querySelectorAll('.btn-tag').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        renderProyectos();
    }

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
        observarTarjetas();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogo);
} else {
    initCatalogo();
}