document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.getElementById('project-container').innerHTML = `
            <h2>Error: No se ha especificado ningún proyecto.</h2>
            <a href="../index.html">← Volver al inicio</a>
        `;
        return;
    }

    const folder = `../projecta/${projectId}`;
    
    try {
        const [jsonRes, diariumRes] = await Promise.all([
            fetch(`${folder}/${projectId}.json`),
            fetch(`../projecta/diarium.json`)
        ]);

        if (!jsonRes.ok) throw new Error("No se encontró el archivo JSON del proyecto");

        const meta = await jsonRes.json();
        const diariumLogs = diariumRes.ok ? await diariumRes.json() : [];

        // 1. Metadatos globales
        document.getElementById('page-title').textContent = `${meta.nombre} — Commentarius Phibikis`;
        
        const titleElem = document.getElementById('proj-titulo-principal');
        if (titleElem) titleElem.textContent = meta.nombre;

        const sinopsisElem = document.getElementById('proj-sinopsis-text');
        if (sinopsisElem) sinopsisElem.textContent = meta.sinopsis || 'Sin descripción disponible.';

        const versionElem = document.getElementById('proj-version-latest');
        if (versionElem) versionElem.textContent = `v${meta.version}`;

        const dateElem = document.getElementById('proj-date-latest');
        if (dateElem && meta.versiones?.[0]) dateElem.textContent = meta.versiones[0].fecha;

        const badgeElem = document.getElementById('proj-type-badge');
        if (badgeElem) {
            const claseStr = (meta.clase || 'opus').toUpperCase();
            const tipoStr = (meta.formato || meta.tipo || 'pdf').toUpperCase();
            badgeElem.textContent = `${claseStr} • ${tipoStr}`;
        }

        // 2. Descripción ampliada opcional
        const descContainer = document.getElementById('proj-descripcion-container');
        const descText = document.getElementById('proj-descripcion-text');
        if (descContainer) {
            if (meta.descripcion) {
                if (descText) descText.textContent = meta.descripcion;
                descContainer.style.display = 'block';
            } else {
                descContainer.style.display = 'none';
            }
        }

        // 3. Figura / Demostración opcional
        const figuraContainer = document.getElementById('proj-figura-container');
        const figuraImg = document.getElementById('proj-figura-img');
        const figuraCaption = document.getElementById('proj-figura-caption');
        if (figuraContainer) {
            if (meta.figura) {
                if (figuraImg) figuraImg.src = `${folder}/${meta.figura}`;
                if (figuraCaption) figuraCaption.textContent = meta.figura_caption || '';
                figuraContainer.style.display = 'block';
            } else {
                figuraContainer.style.display = 'none';
            }
        }

        // 4. Logs horizontales en la Bitácora
        const projLogsList = document.getElementById('proj-logs-list');
        if (projLogsList) {
            const filteredLogs = diariumLogs.filter(log => log.proyecto === projectId);
            if (filteredLogs.length > 0) {
                projLogsList.style.display = 'flex';
                projLogsList.style.flexWrap = 'wrap';
                projLogsList.style.gap = '1rem';
                
                projLogsList.innerHTML = filteredLogs.map(log => `
                    <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 0.9rem 1.1rem; border-radius: 6px; flex: 1 1 240px; min-width: 200px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); display: block; margin-bottom: 0.3rem;">📅 ${log.fecha}</span>
                        <p style="color: var(--text-main); font-size: 0.88rem; margin: 0; line-height: 1.4;">${log.texto}</p>
                    </div>
                `).join('');
            } else {
                projLogsList.style.display = 'block';
                projLogsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No hay registros de bitácora para este proyecto todavía.</p>`;
            }
        }

        // 5. Generador BibTeX
        const btnBibtex = document.getElementById('btn-copy-bibtex');
        if (btnBibtex) {
            btnBibtex.addEventListener('click', () => {
                const bibtex = `@misc{phibikis_${projectId},\n  title={${meta.nombre}},\n  author={Phibikis},\n  year={2026},\n  version={${meta.version}}\n}`;
                navigator.clipboard.writeText(bibtex);
                alert('BibTeX copiado al portapapeles');
            });
        }

        // 6. ENRUTADOR SEGÚN EL TIPO (PDF / VIDEO / GITHUB)
        const tipoProyecto = (meta.formato || meta.tipo || 'pdf').toLowerCase();

        if (tipoProyecto === 'github') {
            renderGithubProject(meta, folder, projectId);
        } else if (tipoProyecto === 'video') {
            renderVideoProject(meta, folder, projectId);
        } else {
            renderPdfProject(meta, folder, projectId);
        }

        setupTabs();

    } catch (e) {
        console.error("Error inyectando proyecto:", e);
        document.getElementById('project-container').innerHTML = `
            <div style="padding: 3rem; text-align: center; color: #ef4444;">
                <h2>Error al cargar el proyecto '${projectId}'</h2>
                <p style="color: var(--text-muted);">Comprueba que existe <code>./projecta/${projectId}/${projectId}.json</code>.</p>
                <a href="../index.html" class="btn-icon" style="margin-top: 1rem; display: inline-flex;">← Volver al inicio</a>
            </div>
        `;
    }
});


function renderPdfProject(meta, folder, projectId) {
    const pdfPath = `${folder}/${projectId}-v${meta.version}.pdf`;

    // Configurar Visor PDF
    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.textContent = "Visor PDF";
        tabVisorBtn.style.display = "inline-block";
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) iframeElem.src = pdfPath;

    // Botones superiores
    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver Online (PDF)";
        btnVerOnline.href = pdfPath;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.style.display = 'inline-block';
        btnDownload.textContent = "Descargar PDF";
        btnDownload.href = pdfPath;
    }

    // Historial lateral
    renderVersionesList(meta.versiones, (v) => `<a href="${folder}/${projectId}-v${v.numero}.pdf" target="_blank" style="color: var(--text-main); text-decoration: none; font-size: 0.8rem; display: block; margin-top: 0.2rem;">[Ver PDF]</a>`);
}


function renderVideoProject(meta, folder, projectId) {
    const videoUrl = meta.enlace || meta.url || "#";

    // Configurar Visor de Vídeo
    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.textContent = "Vídeo";
        tabVisorBtn.style.display = "inline-block";
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) {
        let embedUrl = videoUrl;
        if (videoUrl.includes("watch?v=")) {
            embedUrl = videoUrl.replace("watch?v=", "embed/");
        }
        iframeElem.src = embedUrl;
    }

    // Botones superiores
    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver en YouTube ↗";
        btnVerOnline.href = videoUrl;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.style.display = 'none';
    }

    // Historial lateral
    renderVersionesList(meta.versiones, (v) => v.enlace ? `<a href="${v.enlace}" target="_blank" style="color: var(--text-main); text-decoration: none; font-size: 0.8rem; display: block; margin-top: 0.2rem;">[Ver Vídeo]</a>` : '');
}


function renderGithubProject(meta, folder, projectId) {
    // Proyectos GitHub no tienen visor embebido: ocultamos la pestaña 2
    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.style.display = 'none';
    }

    const githubUrl = meta.enlace || meta.github || meta.url || `https://github.com/Phibik/${projectId}`;

    // Botones superiores
    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Abrir en GitHub ↗";
        btnVerOnline.href = githubUrl;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.style.display = 'inline-block';
        btnDownload.textContent = "Descargar .ZIP ⬇";
        const zipLocal = `${folder}/${projectId}-v${meta.version}.zip`;
        const zipRemote = meta.zip || `${githubUrl}/archive/refs/heads/main.zip`;
        btnDownload.href = meta.zip_local ? zipLocal : zipRemote;
        btnDownload.target = "_blank";
    }

    // Historial lateral
    renderVersionesList(meta.versiones, (v) => `<a href="${v.enlace || githubUrl}" target="_blank" style="color: var(--text-main); text-decoration: none; font-size: 0.8rem; display: block; margin-top: 0.2rem;">[Ver Código]</a>`);
}


function renderVersionesList(versiones, linkGenerator) {
    const versionesList = document.getElementById('proj-versiones-list');
    if (versionesList && versiones) {
        versionesList.innerHTML = versiones.map(v => `
            <li style="margin-bottom: 0.7rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--text-main); font-size: 0.9rem;">v${v.numero}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${v.fecha}</span>
                </div>
                <span style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">${v.comentario || ''}</span>
                ${linkGenerator(v)}
            </li>
        `).join('');
    }
}


function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-tab');

            // 1. Resetear estilos de todos los botones
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = 'var(--text-muted)';
                btn.style.borderBottom = 'none';
            });

            // 2. Ocultar todos los contenedores de pestaña
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // 3. Activar el botón pulsado
            button.classList.add('active');
            button.style.color = 'var(--text-main)';
            button.style.borderBottom = '2px solid var(--text-main)';

            // 4. Mostrar el contenedor elegido (Bitácora o Visor)
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
}