document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.getElementById('project-container').innerHTML = `<h2>Error: No se ha especificado ningún proyecto.</h2><a href="../index.html">← Volver</a>`;
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

        // 1. Vincular metadatos comunes (comunes a cualquier tipo de proyecto)
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
        if (badgeElem) badgeElem.textContent = (meta.clase || meta.tipo || 'opus').toUpperCase();

        // 2. Inyectar imagen de portada (convención general: id.png)
        const imgElem = document.getElementById('proj-img-preview');
        if (imgElem) imgElem.src = `${folder}/${projectId}.png`;

        // 3. Inyectar logs específicos del proyecto
        const projLogsList = document.getElementById('proj-logs-list');
        if (projLogsList) {
            const filteredLogs = diariumLogs.filter(log => log.proyecto === projectId);
            if (filteredLogs.length > 0) {
                projLogsList.innerHTML = filteredLogs.map(log => `
                    <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 0.8rem; border-radius: 6px; margin-bottom: 0.6rem;">
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${log.fecha}</span>
                        <p style="color: var(--text-main); font-size: 0.9rem; margin-top: 0.2rem;">${log.texto}</p>
                    </div>
                `).join('');
            } else {
                projLogsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No hay registros de bitácora para este proyecto todavía.</p>`;
            }
        }

        // 4. Botón BibTeX genérico
        const btnBibtex = document.getElementById('btn-copy-bibtex');
        if (btnBibtex) {
            btnBibtex.addEventListener('click', () => {
                const bibtex = `@article{phibikis_${projectId},\n  title={${meta.nombre}},\n  author={Phibikis},\n  year={2026}\n}`;
                navigator.clipboard.writeText(bibtex);
                alert('BibTeX copiado al portapapeles');
            });
        }

        // 5. SELECCIÓN DE RUTA SEGÚN LA CLASE DEL PROYECTO (¡Aquí está la modularidad!)
        const claseProyecto = (meta.clase || meta.tipo || 'pdf').toLowerCase();

        if (claseProyecto === 'video') {
            renderVideoProject(meta, folder, projectId);
        } else {
            renderPdfProject(meta, folder, projectId); // Por defecto o 'opus'/'pdf'
        }

        // 6. Activar pestañas
        setupTabs();

    } catch (e) {
        console.error(e);
        document.getElementById('project-container').innerHTML = `
            <div style="padding: 3rem; text-align: center; color: #ef4444;">
                <h2>Error al cargar el proyecto '${projectId}'</h2>
                <p style="color: var(--text-muted);">Comprueba que existe la carpeta <code>./projecta/${projectId}/</code> y su archivo <code>${projectId}.json</code>.</p>
                <a href="../index.html" class="btn-icon" style="margin-top: 1rem; display: inline-flex;">← Volver al inicio</a>
            </div>
        `;
    }
});


/* ==========================================
   FUNCIÓN 1: RENDERIZAR PROYECTOS TIPO PDF
   ========================================== */
function renderPdfProject(meta, folder, projectId) {
    const pdfPath = `${folder}/${projectId}-v${meta.version}.pdf`;

    // Visor PDF (iframe)
    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) iframeElem.src = pdfPath;

    // Botón Ver Online
    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver Online (PDF)";
        btnVerOnline.href = pdfPath;
        btnVerOnline.target = "_blank";
    }

    // Botón Descargar PDF
    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.style.display = 'inline-block';
        btnDownload.href = pdfPath;
    }

    // Historial de versiones en PDF
    const versionesList = document.getElementById('proj-versiones-list');
    if (versionesList && meta.versiones) {
        versionesList.innerHTML = meta.versiones.map(v => `
            <li>
                <strong style="color: var(--text-main);">v${v.numero}</strong> (${v.fecha}) 
                — <span style="color: var(--text-muted);">${v.comentario || ''}</span>
                <a href="${folder}/${projectId}-v${v.numero}.pdf" target="_blank" style="color: var(--accent-opus); text-decoration: none; margin-left: 0.5rem;">[Ver PDF]</a>
            </li>
        `).join('');
    }
}


/* ==========================================
   FUNCIÓN 2: RENDERIZAR PROYECTOS TIPO VIDEO
   ========================================== */
function renderVideoProject(meta, folder, projectId) {
    // Cambiar nombre de la pestaña 2 de "Visor PDF" a "Reproductor / Enlace"
    const tabPdfBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabPdfBtn) tabPdfBtn.textContent = "Video";

    const videoUrl = meta.enlace || meta.url || "#";

    // Si hay un iframe de visor, lo transformamos en un embed de YouTube o lo ocultamos
    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem) {
        // Convertir enlace clásico de YouTube a formato embed si es necesario, o usarlo directo
        let embedUrl = videoUrl;
        if (videoUrl.includes("watch?v=")) {
            embedUrl = videoUrl.replace("watch?v=", "embed/");
        }
        iframeElem.src = embedUrl;
    }

    // Botón principal de acción superior ("Ver Video")
    const btnVerOnline = document.getElementById('btn-ver-online');
    if (btnVerOnline) {
        btnVerOnline.textContent = "Ver en YouTube ↗";
        btnVerOnline.href = videoUrl;
        btnVerOnline.target = "_blank";
    }

    // Ocultar botón de descarga de PDF ya que es un vídeo
    const btnDownload = document.getElementById('btn-download-pdf-latest');
    if (btnDownload) {
        btnDownload.style.display = 'none';
    }

    // Historial adaptado a versiones de vídeo
    const versionesList = document.getElementById('proj-versiones-list');
    if (versionesList && meta.versiones) {
        versionesList.innerHTML = meta.versiones.map(v => `
            <li>
                <strong style="color: var(--text-main);">v${v.numero}</strong> (${v.fecha}) 
                — <span style="color: var(--text-muted);">${v.comentario || ''}</span>
                ${v.enlace ? `<a href="${v.enlace}" target="_blank" style="color: var(--accent-opus); text-decoration: none; margin-left: 0.5rem;">[Ver enlace]</a>` : ''}
            </li>
        `).join('');
    }
}


/* ==========================================
   CONTROLADOR DE PESTAÑAS (TABS)
   ========================================== */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = 'var(--text-muted)';
                btn.style.fontWeight = 'normal';
            });

            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            button.classList.add('active');
            button.style.color = 'var(--text-main)';
            button.style.fontWeight = '500';

            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
}