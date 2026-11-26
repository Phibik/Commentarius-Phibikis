async function initDiarium() {
    const feed = document.getElementById('diarium-full-feed');
    const selectProyecto = document.getElementById('filtro-proyecto-log');
    const inputBusqueda = document.getElementById('filtro-busqueda-log');
    const btnReset = document.getElementById('btn-reset-logs');
    const counterElem = document.getElementById('diarium-counter');

    if (!feed) return;

    let logsData = [];

    try {
        logsData = await window.cargarLogs('../');

        if (selectProyecto) {
            const proyectosMap = new Map();
            logsData.forEach(log => {
                if (log._projId && !proyectosMap.has(log._projId)) {
                    proyectosMap.set(log._projId, log._projNombre || log._projId);
                }
            });

            const proyectosOrdenados = Array.from(proyectosMap.entries())
                .map(([id, nombre]) => ({ id, nombre }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

            selectProyecto.innerHTML = [
                `<option value="todos">Proyecto: Todos</option>`,
                `<option value="general">General</option>`,
                ...proyectosOrdenados.map(p => `<option value="${p.id}">${p.nombre}</option>`)
            ].join('');

            selectProyecto.addEventListener('change', renderLogs);
        }

        document.querySelectorAll('input[name="filtro-orden-log"]').forEach(radio => {
            radio.addEventListener('change', renderLogs);
        });

        if (inputBusqueda) {
            inputBusqueda.addEventListener('input', renderLogs);
        }

        if (btnReset) {
            btnReset.addEventListener('click', resetearFiltros);
        }

        renderLogs();
    } catch (e) {
        console.error("Error cargando el diarium:", e);
        feed.innerHTML = `<p class="diarium-error-msg">No se pudo cargar la bitácora.</p>`;
    }

    function resetearFiltros() {
        const radioRecientes = document.getElementById('log-ord-rec');
        if (radioRecientes) radioRecientes.checked = true;
        if (selectProyecto) selectProyecto.value = 'todos';
        if (inputBusqueda) inputBusqueda.value = '';
        renderLogs();
    }

    function renderLogs() {
        const radioOrden = document.querySelector('input[name="filtro-orden-log"]:checked');
        const ordenSel = radioOrden ? radioOrden.value : 'recientes';
        const proyectoSel = selectProyecto ? selectProyecto.value : 'todos';
        const query = (inputBusqueda ? inputBusqueda.value : '').trim().toLowerCase();

        let lista = logsData.filter(log => {
            const projId = log._projId;
            const projNombre = projId ? log._projNombre : 'general';

            if (proyectoSel === 'general' && projId) return false;
            if (proyectoSel !== 'todos' && proyectoSel !== 'general' && projId !== proyectoSel) return false;

            if (query) {
                const texto = `${log.fecha || ''} ${projNombre} ${log.texto || ''}`.toLowerCase();
                if (!texto.includes(query)) return false;
            }

            return true;
        });

        if (ordenSel === 'antiguos') {
            lista = [...lista].reverse();
        }

        if (counterElem) {
            const total = logsData.length;
            counterElem.textContent = lista.length === total
                ? `${total} ${total === 1 ? 'registro' : 'registros'}`
                : `${lista.length} de ${total} registros`;
        }

        if (lista.length === 0) {
            feed.innerHTML = `<p class="diarium-empty-msg">No hay registros que coincidan con estos filtros.</p>`;
            return;
        }

        feed.innerHTML = lista
            .map((log, idx) => window.generarTarjetaLogHTML(log, '', idx))
            .join('');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiarium);
} else {
    initDiarium();
}