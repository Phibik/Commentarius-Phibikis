document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.getElementById('project-container').innerHTML = `
            <div class="error-container">
                <h2>Error: No se ha especificado ningún proyecto.</h2>
                <a href="../index.html" class="btn-icon">← Volver al inicio</a>
            </div>
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
        document.getElementById('page-title').textContent = `${meta.nombre}`;
        
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
            badgeElem.className = `badge badge-type ${meta.clase ? meta.clase.toLowerCase() : 'opus'}`;
        }

        // 2. Descripción ampliada opcional
        const descContainer = document.getElementById('proj-descripcion-container');
        const descText = document.getElementById('proj-descripcion-text');
        if (descContainer) {
            if (meta.descripcion) {
                if (descText) descText.textContent = meta.descripcion;
                descContainer.classList.remove('hidden');
            } else {
                descContainer.classList.add('hidden');
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
                figuraContainer.classList.remove('hidden');
            } else {
                figuraContainer.classList.add('hidden');
            }
        }

        // 4. Logs del Diarium
        const projLogsList = document.getElementById('proj-logs-list');
        if (projLogsList) {
            const filteredLogs = diariumLogs.filter(log => log.proyecto === projectId);
            if (filteredLogs.length > 0) {
                projLogsList.innerHTML = filteredLogs.map(log => `
                    <div class="log-card">
                        <div class="log-header">
                            <span class="log-date">📅 ${log.fecha}</span>
                        </div>
                        <p class="log-text">${log.texto}</p>
                    </div>
                `).join('');
            } else {
                projLogsList.innerHTML = `<p class="empty-logs-msg">No hay registros de bitácora para este proyecto todavía.</p>`;
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
            <div class="error-container">
                <h2 class="error-title">Error al cargar el proyecto '${projectId}'</h2>
                <p class="error-text">Comprueba que existe <code>./projecta/${projectId}/${projectId}.json</code>.</p>
                <a href="../index.html" class="btn-icon btn-icon-margin">← Volver al inicio</a>
            </div>
        `;
    }
});


function renderPdfProject(meta, folder, projectId) {
    const pdfPath = `${folder}/${projectId}-v${meta.version}.pdf`;

    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.textContent = "Visor PDF";
        tabVisorBtn.classList.remove('hidden');
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) iframeElem.src = pdfPath;

    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver Online (PDF)";
        btnVerOnline.href = pdfPath;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.classList.remove('hidden');
        btnDownload.textContent = "Descargar PDF";
        btnDownload.href = pdfPath;
    }

    renderVersionesList(meta.versiones, (v) => `<a href="${folder}/${projectId}-v${v.numero}.pdf" target="_blank" class="version-link">[Ver PDF]</a>`);
}


function renderVideoProject(meta, folder, projectId) {
    const videoUrl = meta.enlace || meta.url || "#";

    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.textContent = "Vídeo";
        tabVisorBtn.classList.remove('hidden');
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) {
        let embedUrl = videoUrl;
        if (videoUrl.includes("watch?v=")) {
            embedUrl = videoUrl.replace("watch?v=", "embed/");
        }
        iframeElem.src = embedUrl;
    }

    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver en YouTube ↗";
        btnVerOnline.href = videoUrl;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.classList.add('hidden');
    }

    renderVersionesList(meta.versiones, (v) => v.enlace ? `<a href="${v.enlace}" target="_blank" class="version-link">[Ver Vídeo]</a>` : '');
}


function renderGithubProject(meta, folder, projectId) {
    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.classList.add('hidden');
    }

    const githubUrl = meta.enlace || meta.github || meta.url || `https://github.com/Phibik/${projectId}`;

    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Abrir en GitHub ↗";
        btnVerOnline.href = githubUrl;
        btnVerOnline.target = "_blank";
    }

    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.classList.remove('hidden');
        btnDownload.textContent = "Descargar .ZIP ⬇";
        const zipLocal = `${folder}/${projectId}-v${meta.version}.zip`;
        const zipRemote = meta.zip || `${githubUrl}/archive/refs/heads/main.zip`;
        btnDownload.href = meta.zip_local ? zipLocal : zipRemote;
        btnDownload.target = "_blank";
    }

    renderVersionesList(meta.versiones, (v) => `<a href="${v.enlace || githubUrl}" target="_blank" class="version-link">[Ver Código]</a>`);
}


function renderVersionesList(versiones, linkGenerator) {
    const versionesList = document.getElementById('proj-versiones-list');
    if (versionesList && versiones) {
        versionesList.innerHTML = versiones.map(v => `
            <li class="version-item">
                <div class="version-item-header">
                    <strong class="version-number">v${v.numero}</strong>
                    <span class="version-date">${v.fecha}</span>
                </div>
                <span class="version-comment">${v.comentario || ''}</span>
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

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}