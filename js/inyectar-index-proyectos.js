document.addEventListener('DOMContentLoaded', async () => {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;

    try {
        // Ruta corregida porque projecta.json está dentro de ./projecta/
        const res = await fetch('projecta/projecta.json');
        const projectIds = await res.json();

        projectsGrid.innerHTML = '';

        for (const id of projectIds) {
            try {
                const jsonRes = await fetch(`projecta/${id}/${id}.json`);
                const meta = await jsonRes.json();

                projectsGrid.innerHTML += `
                    <a href="html/projectum.html?id=${id}" class="log-mini-card" style="display: block; text-decoration: none; background: var(--surface-color); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: 8px;">
                        <span class="log-date" style="font-size: 0.8rem; color: var(--text-muted);">v${meta.version} &bull; ${meta.clase.toUpperCase()}</span>
                        <strong style="font-size: 1.1rem; color: var(--text-main); display: block; margin: 0.3rem 0;">${meta.nombre}</strong>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">${meta.sinopsis || ''}</p>
                    </a>
                `;
            } catch (e) {
                console.error(`Error cargando proyecto ${id}:`, e);
            }
        }
    } catch (e) {
        projectsGrid.innerHTML = `<p style="color: #ef4444;">No se pudo cargar 'projecta/projecta.json'.</p>`;
    }
});