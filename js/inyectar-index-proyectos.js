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

window.generarTarjetaHTML = function(meta, hrefPrefix = '', index = 0) {
    const claseLower = (meta.clase || 'opus').toLowerCase();
    const formatoStr = (meta.formato || meta.tipo || 'pdf').toUpperCase();
    
    // Jerarquía de Importancia: 0 (Ultra/Destacado), 1 (Alta), 2 (Media), 3 (Normal/Sin icono)
    const impVal = Math.min(Math.max(parseInt(meta.importancia ?? 3), 0), 3);
    
    let importanciaHTML = '';
    let titleShimmerClass = '';

    if (impVal === 0) {
        // Nivel 0: Estrella con resplandor + Título Shimmer Permanente
        importanciaHTML = `<span class="card-importance star-level-0" title="Destacado (Nivel 0)">★</span>`;
        titleShimmerClass = 'has-shimmer';
    } else if (impVal === 1) {
        // Nivel 1: Estrella en color primario
        importanciaHTML = `<span class="card-importance star-level-1" title="Importancia Nivel 1">★</span>`;
    } else if (impVal === 2) {
        // Nivel 2: Estrella sobria gris
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

    const tagsHTML = (meta.tags || []).map(t => 
        `<span class="tag-pill">${t}</span>`
    ).join('');

    return `
        <a href="${hrefPrefix}projectum.html?id=${meta._id}" class="card-project" style="--card-index: ${index};">
            <div class="card-top-bar">
                <span class="badge-type ${claseLower}">${claseLower} &bull; ${formatoStr}</span>
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