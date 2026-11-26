window.logsMetaProyectosMap = {};

function formatearFechaLog(fecha) {
    const str = String(fecha || '').trim();
    const match = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (match) {
        const [, y, m, d] = match;
        return `${y}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
    }
    return str.replace(/[-/]/g, '.');
}

// Resuelve nombre y clase (opus / adumbratio) de cada proyecto con logs
window.cargarMetaProyectosLogs = async function(projectIds, basePath = '') {
    const entries = await Promise.all(
        projectIds.map(async (id) => {
            const url = `${basePath}projecta/${id}/${id}.json`;
            try {
                const res = await fetch(url);
                if (!res.ok) return [id, { nombre: id, clase: '' }];
                const meta = await res.json();
                return [id, {
                    nombre: (meta.nombre || id).trim(),
                    clase: (meta.clase || '').toLowerCase().trim()
                }];
            } catch (e) {
                console.error(`❌ [SINTAXIS JSON ROTA] Revisa '${url}':`, e.message);
                return [id, { nombre: id, clase: '' }];
            }
        })
    );

    const mapa = Object.fromEntries(entries);
    window.logsMetaProyectosMap = mapa;
    return mapa;
};

// Carga y valida diarium.json avisando en consola si hay errores de sintaxis o estructura
window.cargarLogs = async function(basePath = '') {
    const url = `${basePath}projecta/diarium.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`❌ [diarium.json] Error HTTP ${res.status}: No se pudo cargar '${url}'.`);
            throw new Error(`HTTP ${res.status}`);
        }

        const rawText = await res.text();
        let parsed;

        try {
            parsed = JSON.parse(rawText);
        } catch (syntaxErr) {
            console.error(`❌ [SINTAXIS JSON ROTA] Revisa '${url}':`, syntaxErr.message);
            const err = new Error('JSON_SYNTAX_ERROR');
            err.cause = syntaxErr;
            throw err;
        }

        if (!Array.isArray(parsed)) {
            console.error(`❌ [ESTRUCTURA JSON INVÁLIDA] '${url}' debe ser un array de entradas ([ ... ]).`);
            return [];
        }

        const idsConEntradas = [...new Set(
            parsed.map(log => (log.proyecto || '').trim()).filter(Boolean)
        )];

        const metaProyectos = await window.cargarMetaProyectosLogs(idsConEntradas, basePath);

        return parsed.map(log => {
            const projId = (log.proyecto || '').trim();
            const meta = projId ? (metaProyectos[projId] || { nombre: projId, clase: '' }) : null;

            return {
                ...log,
                _projId: projId,
                _projNombre: meta ? meta.nombre : '',
                _projClase: meta ? meta.clase : ''
            };
        });
    } catch (e) {
        if (e.message !== 'JSON_SYNTAX_ERROR') {
            console.error(`❌ Error crítico en cargarLogs ('${url}'):`, e);
        }
        throw e;
    }
};

// Genera el HTML unificado de .log-card para index, diarium y projectum
window.generarTarjetaLogHTML = function(log, hrefPrefix = '', index = 0, opciones = {}) {
    const { mostrarProyecto = true } = opciones;
    const projId = log._projId ?? (log.proyecto || '').trim();
    const projNombre = log._projNombre || projId;
    const projClase = log._projClase || '';
    const claseAttr = projClase ? ` data-clase="${projClase}"` : '';

    let badgeHTML = '';
    if (mostrarProyecto) {
        badgeHTML = projId
            ? `<a href="${hrefPrefix}projectum.html?id=${encodeURIComponent(projId)}" class="log-project-tag"${claseAttr}>${projNombre}</a>`
            : `<span class="log-general-tag">General</span>`;
    }

    return `
        <article class="log-card" style="--card-index: ${index};">
            <div class="log-header">
                <span class="log-date">${formatearFechaLog(log.fecha)}</span>
                ${badgeHTML}
            </div>
            <p class="log-text">${log.texto || ''}</p>
        </article>
    `;
};

// Helper reutilizable para la bitácora de un proyecto concreto (projectum.html)
window.renderizarLogsProyecto = async function(projectId, containerId = 'proj-logs-list', basePath = '../') {
    const container = document.getElementById(containerId);
    if (!container || !projectId) return;

    try {
        const logs = await window.cargarLogs(basePath);
        const filtrados = logs.filter(log => log._projId === projectId.trim());

        if (filtrados.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No hay registros en la bitácora para este proyecto.</p>`;
            return;
        }

        container.innerHTML = filtrados
            .map((log, idx) => window.generarTarjetaLogHTML(log, '', idx, { mostrarProyecto: false }))
            .join('');
    } catch (e) {
        console.error(`❌ Error cargando bitácora del proyecto '${projectId}':`, e);
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No se pudieron cargar los registros de bitácora.</p>`;
    }
};

// ==========================================================================
// INICIALIZACIÓN EN INDEX.HTML (5 últimos registros) Y PROJECTUM.HTML
// ==========================================================================
async function initIndexLogs() {
    const diariumFeed = document.getElementById('diarium-feed');
    if (!diariumFeed) return;

    try {
        const logs = await window.cargarLogs('');

        if (logs.length === 0) {
            diariumFeed.innerHTML = `<p style="color: var(--text-muted);">No hay registros de bitácora todavía.</p>`;
            return;
        }

        diariumFeed.innerHTML = logs
            .slice(0, 5)
            .map((log, idx) => window.generarTarjetaLogHTML(log, 'html/', idx))
            .join('');
    } catch (e) {
        if (e.message === 'JSON_SYNTAX_ERROR') {
            diariumFeed.innerHTML = `<p style="color: #ef4444; font-size: 0.9rem;">Sintaxis corrupta en <code>projecta/diarium.json</code>. Revisa la consola para ver el fallo exacto.</p>`;
            return;
        }
        diariumFeed.innerHTML = `<p style="color: var(--text-muted);">No se pudieron cargar los registros de bitácora.</p>`;
    }
}

async function initProjectumLogs() {
    const projLogsList = document.getElementById('proj-logs-list');
    if (!projLogsList) return;

    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) return;

    await window.renderizarLogsProyecto(projectId, 'proj-logs-list', '../');
}

function initLogsGlobal() {
    initIndexLogs();
    initProjectumLogs();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogsGlobal);
} else {
    initLogsGlobal();
}