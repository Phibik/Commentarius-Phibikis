window.tiposProyectoMap = {};

// Carga y valida tipos.json avisando en consola si hay errores de sintaxis o estructura
window.cargarTiposProyecto = async function(basePath = '') {
    const url = `${basePath}projecta/tipos.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`❌ [tipos.json] Error HTTP ${res.status}: No se pudo cargar '${url}'.`);
            return {};
        }

        const rawText = await res.text();
        let parsed;

        try {
            parsed = JSON.parse(rawText);
        } catch (syntaxErr) {
            console.error(`❌ [SINTAXIS JSON ROTA] Revisa '${url}':`, syntaxErr.message);
            return {};
        }

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            console.error(`❌ [ESTRUCTURA JSON INVÁLIDA] '${url}' debe ser un objeto clave-valor ({ "tipo": "Nombre" }), no un array ni null.`);
            return {};
        }

        const normalizado = {};
        for (const [clave, valor] of Object.entries(parsed)) {
            if (typeof valor !== 'string' || !valor.trim()) {
                console.error(`❌ [tipos.json] Valor inválido para "${clave}": se esperaba un texto no vacío.`);
                continue;
            }
            normalizado[clave.toLowerCase().trim()] = valor.trim();
        }

        window.tiposProyectoMap = normalizado;
        return normalizado;
    } catch (e) {
        console.error(`❌ [tipos.json] Error de red leyendo '${url}':`, e);
        return {};
    }
};

// Carga todos los proyectos y los tipos chivándose en consola si un JSON tiene fallos
window.cargarProyectos = async function(basePath = '') {
    try {
        const [res] = await Promise.all([
            fetch(`${basePath}projecta/projecta.json`),
            window.cargarTiposProyecto(basePath)
        ]);

        if (!res.ok) throw new Error(`No se pudo cargar projecta.json (HTTP ${res.status})`);
        const projectIds = await res.json();

        const promesas = projectIds.map(async (id) => {
            try {
                const r = await fetch(`${basePath}projecta/${id}/${id}.json`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const meta = await r.json();
                meta._id = id;

                if (Array.isArray(meta.tags)) {
                    meta.tags.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
                }

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

window.generarTarjetaHTML = function(meta, hrefPrefix = '', index = 0) {
    const claseLower = (meta.clase || 'opus').toLowerCase().trim();
    const claseStr = claseLower.toLocaleUpperCase('es');

    const tipoKey = (meta.formato || meta.tipo || 'pdf').toLowerCase().trim();
    const tipoNombre = window.tiposProyectoMap[tipoKey] || tipoKey;
    const formatoStr = tipoNombre.toLocaleUpperCase('es');
    
    // Jerarquía de Importancia: 0 (Ultra/Destacado), 1 (Alta), 2 (Media), 3 (Normal/Sin icono)
    const impVal = Math.min(Math.max(parseInt(meta.importancia ?? 3), 0), 3);
    
    let importanciaHTML = '';
    let titleShimmerClass = '';

    if (impVal === 0) {
        importanciaHTML = `<span class="card-importance star-level-0" title="Destacado (Nivel 0)">★</span>`;
        titleShimmerClass = 'has-shimmer';
    } else if (impVal === 1) {
        importanciaHTML = `<span class="card-importance star-level-1" title="Importancia Nivel 1">★</span>`;
    } else if (impVal === 2) {
        importanciaHTML = `<span class="card-importance star-level-2" title="Importancia Nivel 2">★</span>`;
    }

    // Fecha
    let fechaStr = 'Sin fecha';
    if (Array.isArray(meta.versiones) && meta.version) {
        const verObj = meta.versiones.find(v => String(v.numero || v.version) === String(meta.version));
        if (verObj && verObj.fecha) {
            fechaStr = verObj.fecha;
        }
    }

    const tagsOrdenadas = Array.isArray(meta.tags)
        ? [...meta.tags].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
        : [];

    const tagsHTML = tagsOrdenadas.map(t => 
        `<span class="tag-pill">${t}</span>`
    ).join('');

    return `
        <a href="${hrefPrefix}projectum.html?id=${meta._id}" class="card-project" style="--card-index: ${index};">
            <div class="card-top-bar">
                <span class="badge-type ${claseLower}">${claseStr} &middot; ${formatoStr}</span>
                ${importanciaHTML}
            </div>

            <h3 class="card-title ${titleShimmerClass}">${meta.nombre}</h3>

            <p class="card-sinopsis">${meta.sinopsis || ''}</p>

            <div class="card-footer">
                <span class="card-date">${fechaStr}</span>
                ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
            </div>
        </a>
    `;
};

/* ==========================================================================
   AJUSTE RESPONSIVE DE ETIQUETAS Y LÍNEAS DE SINOPSIS
   ========================================================================== */
function ajustarTagsTarjeta(card) {
    const footer = card.querySelector('.card-footer');
    const date = card.querySelector('.card-date');
    const tags = card.querySelector('.card-tags');
    if (!footer || !tags) return;

    const count = tags.querySelectorAll('.tag-pill').length;
    if (count <= 1) {
        tags.removeAttribute('data-wrap');
        return;
    }

    const csFooter = getComputedStyle(footer);
    const minGap = parseFloat(csFooter.columnGap || csFooter.gap) || 14;
    const dateWidth = date ? date.offsetWidth : 0;
    const disponible = footer.clientWidth - dateWidth - minGap;

    tags.removeAttribute('data-wrap');
    if (tags.scrollWidth <= disponible + 1) return;

    if (count === 4) {
        tags.setAttribute('data-wrap', 'grid-2');
    } else if (count === 6) {
        tags.setAttribute('data-wrap', 'grid-3');
        if (tags.scrollWidth > disponible + 1) {
            tags.setAttribute('data-wrap', 'grid-2');
        }
    } else {
        tags.setAttribute('data-wrap', 'flex');
    }
}

function ajustarSinopsisTarjeta(card) {
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

function ajustarTarjetaCompleta(card) {
    if (card._lastCardWidth !== card.clientWidth) {
        card._lastCardWidth = card.clientWidth;
        ajustarTagsTarjeta(card);
    }
    ajustarSinopsisTarjeta(card);
}

/* ==========================================================================
   LÓGICA DE PROXIMIDAD (SPOTLIGHT DE BORDE) & INCLINACIÓN 3D
   ========================================================================== */
const PROXIMITY_RADIUS = 180;

document.addEventListener('mousemove', (e) => {
    const mx = e.clientX;
    const my = e.clientY;
    const cards = document.querySelectorAll('.card-project');

    // 1. Proximidad del cursor a cada tarjeta
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const dx = Math.max(rect.left - mx, 0, mx - rect.right);
        const dy = Math.max(rect.top - my, 0, my - rect.bottom);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PROXIMITY_RADIUS) {
            const proximityOpacity = ((1 - dist / PROXIMITY_RADIUS) * 0.35).toFixed(2);
            card.style.setProperty('--proximity-opacity', proximityOpacity);
        } else {
            card.style.setProperty('--proximity-opacity', '0');
        }
    });

    // 2. Inclinación 3D (8° máximo) sobre la tarjeta activa
    const hoveredCard = e.target.closest('.card-project');
    if (hoveredCard) {
        const rect = hoveredCard.getBoundingClientRect();
        const x = mx - rect.left;
        const y = my - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        hoveredCard.style.setProperty('--rotate-x', `${rotateX.toFixed(2)}deg`);
        hoveredCard.style.setProperty('--rotate-y', `${rotateY.toFixed(2)}deg`);
    }
});

// Reseteo progresivo al salir del área de la tarjeta
document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.card-project');
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
        card.style.setProperty('--rotate-x', '0deg');
        card.style.setProperty('--rotate-y', '0deg');
        card.style.setProperty('--proximity-opacity', '0');
    }
});

// ==========================================================================
// RESIZE OBSERVER CENTRALIZADO (Para evitar duplicación de código)
// ==========================================================================
window.observarTarjetasGrid = function(containerElement) {
    if (!containerElement) return null;

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (typeof window.ajustarTarjetaCompleta === 'function') {
                window.ajustarTarjetaCompleta(entry.target);
            }
        }
    });

    containerElement.querySelectorAll('.card-project').forEach(card => {
        card._lastCardWidth = null;
        if (typeof window.ajustarTarjetaCompleta === 'function') {
            window.ajustarTarjetaCompleta(card);
        }
        observer.observe(card);
    });

    return observer;
};

// ==========================================================================
// CARGA Y RENDERIZADO DE PROYECTOS EN EL INDEX
// ==========================================================================
async function initIndex() {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;

    try {
        let proyectos = await window.cargarProyectos('');

        // 1. Filtrar solo los de clase 'opus' para la sección Opera
        const proyectosOpus = proyectos.filter(p => (p.clase || 'opus').toLowerCase().trim() === 'opus');

        // 2. Ordenar por importancia y recortar los 3 primeros
        proyectosOpus.sort((a, b) => (a.importancia ?? 99) - (b.importancia ?? 99));

        projectsGrid.innerHTML = proyectosOpus
            .slice(0, 3)
            .map((p, idx) => window.generarTarjetaHTML(p, 'html/', idx))
            .join('');

        // 3. Inicializar el ResizeObserver centralizado
        window.observarTarjetasGrid(projectsGrid);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                projectsGrid.querySelectorAll('.card-project').forEach(card => {
                    card._lastCardWidth = null;
                    if (typeof window.ajustarTarjetaCompleta === 'function') {
                        window.ajustarTarjetaCompleta(card);
                    }
                });
            });
        }
    } catch (e) {
        console.error("Error cargando destacados en index:", e);
        projectsGrid.innerHTML = `<p class="error-msg">No se pudieron cargar los proyectos.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', initIndex);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndex);
} else {
    initIndex();
}