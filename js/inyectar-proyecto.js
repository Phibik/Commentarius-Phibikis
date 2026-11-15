const ICON_OPEN_TAB = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

const ICON_UNAVAILABLE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

const ICON_DOWNLOAD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

async function verificarArchivoLocal(url) {
    if (!url) return false;
    if (/^https?:\/\//i.test(url) && !url.startsWith(window.location.origin)) {
        return true;
    }
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch (_) {
        return false;
    }
}

async function cargarTiposProyecto(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[tipos.json] Error HTTP ${res.status}: No se pudo cargar '${url}'.`);
            return {};
        }

        const rawText = await res.text();
        let parsed;

        try {
            parsed = JSON.parse(rawText);
        } catch (syntaxErr) {
            console.error(`[tipos.json] Error de sintaxis JSON en '${url}': ${syntaxErr.message}`);
            return {};
        }

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            console.error(`[tipos.json] Estructura inválida en '${url}': debe ser un objeto clave-valor ({ "tipo": "Nombre" }), no un array ni null.`);
            return {};
        }

        const tiposNormalizados = {};
        for (const [clave, valor] of Object.entries(parsed)) {
            if (typeof valor !== 'string' || !valor.trim()) {
                console.error(`[tipos.json] Valor inválido para la clave "${clave}": se esperaba un texto no vacío.`);
                continue;
            }
            tiposNormalizados[clave.toLowerCase().trim()] = valor.trim();
        }

        return tiposNormalizados;
    } catch (networkErr) {
        console.error(`[tipos.json] Error de red al intentar leer '${url}':`, networkErr);
        return {};
    }
}

function toYoutubeEmbedUrl(url) {
    if (!url) return "";
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            const id = parsed.pathname.slice(1);
            return id ? `https://www.youtube.com/embed/${id}` : url;
        }
        if (parsed.hostname.includes('youtube.com')) {
            if (parsed.pathname === '/watch' && parsed.searchParams.get('v')) {
                return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
            }
            if (parsed.pathname.startsWith('/shorts/')) {
                const id = parsed.pathname.split('/')[2];
                return id ? `https://www.youtube.com/embed/${id}` : url;
            }
        }
    } catch (_) {
        // Si no es una URL absoluta válida, se devuelve tal cual
    }
    return url;
}

function generarCitas(meta, projectId, activeVersionObj, nombreTipo) {
    const fecha = activeVersionObj.fecha || '';
    const yearMatch = String(fecha).match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : '2026';
    const url = window.location.href.split('#')[0];
    const tipoLabel = nombreTipo || 'Documento';

    return {
        bibtex: `@misc{phibikis_${projectId},\n  author = {Martí Figuerola Giner},\n  title = {${meta.nombre}},\n  year = {${year}},\n  note = {Versión ${meta.version}},\n  howpublished = {\\url{${url}}}\n}`,
        apa: `Martí Figuerola Giner. (${year}). ${meta.nombre} (v${meta.version}) [${tipoLabel}]. Commentarius Phibikis. ${url}`,
        ieee: `Martí Figuerola Giner, "${meta.nombre}", Commentarius Phibikis, v${meta.version}, ${year}. [En línea]. Disponible: ${url}`,
        mla: `Martí Figuerola Giner. "${meta.nombre}." Commentarius Phibikis, v${meta.version}, ${year}, ${url}.`
    };
}

function setupCiteDropdown(citasMap) {
    const dropdown = document.getElementById('cite-dropdown');
    const toggleBtn = document.getElementById('btn-cite-toggle');
    if (!dropdown || !toggleBtn) return;

    const options = Array.from(dropdown.querySelectorAll('.cite-option'));
    options.forEach(opt => {
        const statusEl = opt.querySelector('.cite-option-status');
        opt._defaultStatus = statusEl ? statusEl.textContent : 'Copiar';
        opt._resetTimer = null;
    });

    const resetOption = (opt) => {
        clearTimeout(opt._resetTimer);
        opt._resetTimer = null;
        opt.classList.remove('copied');
        const statusEl = opt.querySelector('.cite-option-status');
        if (statusEl) statusEl.textContent = opt._defaultStatus;
    };

    const resetAllOptions = () => {
        options.forEach(resetOption);
    };

    const closeMenu = () => {
        dropdown.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        resetAllOptions();
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', String(isOpen));
        if (!isOpen) {
            resetAllOptions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
            closeMenu();
        }
    });

    options.forEach(option => {
        const statusEl = option.querySelector('.cite-option-status');

        option.addEventListener('click', async () => {
            const format = option.getAttribute('data-format');
            const textoCita = citasMap[format];
            if (!textoCita) return;

            try {
                await navigator.clipboard.writeText(textoCita);
            } catch (_) {
                const ta = document.createElement('textarea');
                ta.value = textoCita;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }

            options.forEach(other => {
                if (other !== option) resetOption(other);
            });

            clearTimeout(option._resetTimer);
            option.classList.add('copied');
            if (statusEl) statusEl.textContent = '✓ Copiado';

            option._resetTimer = setTimeout(() => {
                resetOption(option);
            }, 1400);
        });
    });
}

function setupLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('lightbox-close');
    if (!lightbox || !lightboxImg) return null;

    let clearSrcTimer = null;

    const openLightbox = (src, alt) => {
        clearTimeout(clearSrcTimer);
        lightboxImg.src = src;
        lightboxImg.alt = alt || 'Vista ampliada';
        lightbox.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            lightbox.classList.add('is-open');
        });
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        clearTimeout(clearSrcTimer);
        clearSrcTimer = setTimeout(() => {
            if (!lightbox.classList.contains('is-open')) {
                lightboxImg.src = '';
            }
        }, 300);
    };

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
            closeLightbox();
        }
    });

    return openLightbox;
}

function renderImagenesCarrusel(meta, folder, projectId, hasDescripcion) {
    const descSection = document.getElementById('proj-descripcion-section');
    const imgBlock = document.getElementById('proj-imagenes-block');
    const viewport = document.getElementById('proj-carousel-viewport');
    const stage = document.getElementById('proj-carousel-stage');
    const track = document.getElementById('proj-carousel-track');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    const counterEl = document.getElementById('carousel-counter');

    const numImagenes = Number.isFinite(Number(meta.imagenes))
        ? Math.max(0, Math.floor(Number(meta.imagenes)))
        : 0;

    if (!imgBlock || !track || numImagenes <= 0) {
        if (imgBlock) imgBlock.classList.add('hidden');
        return false;
    }

    const openLightbox = setupLightbox();
    const CLONE_COUNT = 3;

    const items = Array.from({ length: numImagenes }, (_, idx) => ({
        src: `${folder}/${projectId}-${idx + 1}.png`,
        alt: `${meta.nombre} — Imagen ${idx + 1}`,
        valid: true,
        naturalWidth: 0,
        naturalHeight: 0
    }));

    let currentIndex = 0;
    let trackIndex = 0;

    const getValidItems = () => items.filter(item => item.valid);
    const getSlides = () => Array.from(track.querySelectorAll('.carousel-slide'));

    const fitSlideDimensions = (slide, item, total) => {
        if (!stage || !item || !item.naturalWidth || !item.naturalHeight) return;
        const stageWidth = stage.clientWidth || 800;
        const maxRatio = total > 1 ? 0.74 : 1;
        const maxAllowedWidth = stageWidth * maxRatio;
        const targetHeight = window.innerWidth <= 768 ? 290 : 440;
        const renderedWidth = targetHeight * (item.naturalWidth / item.naturalHeight);

        slide.classList.toggle('is-ultrawide', renderedWidth > maxAllowedWidth);
    };

    const fitAllSlides = () => {
        const valid = getValidItems();
        const total = valid.length;
        getSlides().forEach(slide => {
            const realIdx = Number(slide.dataset.realIndex);
            fitSlideDimensions(slide, valid[realIdx], total);
        });
    };

    const centerCurrentSlide = () => {
        const slides = getSlides();
        const activeSlide = slides[trackIndex];
        if (!stage || !activeSlide) return;

        const stageWidth = stage.clientWidth;
        const slideCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
        const offset = stageWidth / 2 - slideCenter;
        track.style.transform = `translateX(${offset}px)`;
    };

    const syncDotsState = () => {
        if (!dotsContainer) return;
        const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
        dots.forEach((dot, idx) => {
            const active = idx === currentIndex;
            dot.classList.toggle('active', active);
            dot.setAttribute('aria-selected', String(active));
        });
    };

    const renderDots = (total) => {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        if (total <= 1) return;

        for (let idx = 0; idx < total; idx++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `carousel-dot ${idx === currentIndex ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Ir a imagen ${idx + 1}`);
            dot.setAttribute('aria-selected', String(idx === currentIndex));
            dot.addEventListener('click', () => {
                currentIndex = idx;
                trackIndex = CLONE_COUNT + idx;
                syncVisualState(true);
            });
            dotsContainer.appendChild(dot);
        }
    };

    const syncVisualState = (animate = true) => {
        const valid = getValidItems();
        const total = valid.length;
        const slides = getSlides();

        if (total <= 0 || slides.length === 0) return;

        const multiple = total > 1;
        slides.forEach((slide, idx) => {
            slide.classList.toggle('is-active', idx === trackIndex);
            slide.classList.toggle('is-single', !multiple);
        });

        if (counterEl) {
            counterEl.textContent = `${currentIndex + 1} / ${total}`;
        }

        syncDotsState();

        if (!animate) {
            track.classList.add('no-transition');
            centerCurrentSlide();
            track.offsetHeight;
            track.classList.remove('no-transition');
        } else {
            centerCurrentSlide();
        }
    };

    const rebuildCarousel = () => {
        const valid = getValidItems();
        const total = valid.length;

        if (total <= 0) {
            imgBlock.classList.add('hidden');
            if (!hasDescripcion && descSection) {
                descSection.classList.add('hidden');
            }
            return;
        }

        if (currentIndex >= total) currentIndex = total - 1;
        if (currentIndex < 0) currentIndex = 0;

        const multiple = total > 1;
        const clonesPerSide = multiple ? CLONE_COUNT : 0;

        if (stage) stage.classList.toggle('has-multiple', multiple);
        if (prevBtn) prevBtn.classList.toggle('hidden', !multiple);
        if (nextBtn) nextBtn.classList.toggle('hidden', !multiple);

        const sequence = [];
        if (!multiple) {
            sequence.push({ item: valid[0], realIdx: 0 });
        } else {
            for (let k = -clonesPerSide; k < 0; k++) {
                const realIdx = ((k % total) + total) % total;
                sequence.push({ item: valid[realIdx], realIdx });
            }
            for (let r = 0; r < total; r++) {
                sequence.push({ item: valid[r], realIdx: r });
            }
            for (let k = 0; k < clonesPerSide; k++) {
                const realIdx = k % total;
                sequence.push({ item: valid[realIdx], realIdx });
            }
        }

        track.innerHTML = '';

        sequence.forEach(({ item, realIdx }, domIdx) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.dataset.realIndex = String(realIdx);
            slide.dataset.trackIndex = String(domIdx);

            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.alt;
            img.className = 'carousel-img';

            fitSlideDimensions(slide, item, total);

            slide.addEventListener('click', () => {
                if (domIdx !== trackIndex) {
                    currentIndex = realIdx;
                    trackIndex = domIdx;
                    syncVisualState(true);
                } else if (openLightbox) {
                    openLightbox(item.src, item.alt);
                }
            });

            slide.appendChild(img);
            track.appendChild(slide);
        });

        trackIndex = clonesPerSide + currentIndex;
        renderDots(total);
        syncVisualState(false);
    };

    track.addEventListener('transitionend', (e) => {
        if (e.target !== track || e.propertyName !== 'transform') return;
        const total = getValidItems().length;
        if (total <= 1) return;

        if (trackIndex < CLONE_COUNT) {
            trackIndex += total;
            syncVisualState(false);
        } else if (trackIndex >= CLONE_COUNT + total) {
            trackIndex -= total;
            syncVisualState(false);
        }
    });

    const goPrev = () => {
        const total = getValidItems().length;
        if (total <= 1) return;

        if (trackIndex < CLONE_COUNT) {
            trackIndex += total;
            syncVisualState(false);
        }

        currentIndex = (currentIndex - 1 + total) % total;
        trackIndex -= 1;
        syncVisualState(true);
    };

    const goNext = () => {
        const total = getValidItems().length;
        if (total <= 1) return;

        if (trackIndex >= CLONE_COUNT + total) {
            trackIndex -= total;
            syncVisualState(false);
        }

        currentIndex = (currentIndex + 1) % total;
        trackIndex += 1;
        syncVisualState(true);
    };

    // Precarga y validación de dimensiones reales
    items.forEach(item => {
        const probe = new Image();
        probe.onload = () => {
            item.naturalWidth = probe.naturalWidth;
            item.naturalHeight = probe.naturalHeight;
            fitAllSlides();
            syncVisualState(false);
        };
        probe.onerror = () => {
            item.valid = false;
            rebuildCarousel();
        };
        probe.src = item.src;
    });

    if (prevBtn) prevBtn.addEventListener('click', goPrev);
    if (nextBtn) nextBtn.addEventListener('click', goNext);

    window.addEventListener('resize', () => {
        fitAllSlides();
        syncVisualState(false);
    });

    if (viewport) {
        let touchStartX = 0;
        viewport.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(deltaX) > 40) {
                if (deltaX > 0) goPrev();
                else goNext();
            }
        }, { passive: true });
    }

    imgBlock.classList.remove('hidden');
    rebuildCarousel();
    return true;
}

function renderDescripcionYImagenes(meta, folder, projectId) {
    const descSection = document.getElementById('proj-descripcion-section');
    const descBlock = document.getElementById('proj-descripcion-block');
    const descContent = document.getElementById('proj-descripcion-content');

    if (!descSection) return;

    const descripcionTexto = typeof meta.descripcion === 'string' ? meta.descripcion.trim() : '';
    const hasDescripcion = Boolean(descripcionTexto);

    // 1. Primero renderizar el carrusel de imágenes
    const hasImagenes = renderImagenesCarrusel(meta, folder, projectId, hasDescripcion);

    // 2. Después renderizar los párrafos de descripción
    if (hasDescripcion && descBlock && descContent) {
        descContent.innerHTML = '';
        const parrafos = descripcionTexto.split(/\r?\n+/).filter(p => p.trim().length > 0);
        parrafos.forEach(parrafo => {
            const p = document.createElement('p');
            p.className = 'text-block text-extended';
            p.textContent = parrafo.trim();
            descContent.appendChild(p);
        });
        descBlock.classList.remove('hidden');
    } else if (descBlock) {
        descBlock.classList.add('hidden');
    }

    // 3. Mostrar u ocultar la sección completa
    if (hasImagenes || hasDescripcion) {
        descSection.classList.remove('hidden');
    } else {
        descSection.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.getElementById('project-container').innerHTML = `
            <div class="error-container">
                <h2 class="error-title">Error: No se ha especificado ningún proyecto.</h2>
                <a href="../index.html" class="btn-icon btn-icon-margin">← Volver al inicio</a>
            </div>
        `;
        return;
    }

    const folder = `../projecta/${projectId}`;

    try {
        const [jsonRes, diariumRes, tiposMap] = await Promise.all([
            fetch(`${folder}/${projectId}.json`),
            fetch(`../projecta/diarium.json`),
            cargarTiposProyecto(`../projecta/tipos.json`)
        ]);

        if (!jsonRes.ok) throw new Error(`No se encontró el archivo JSON del proyecto (${jsonRes.status})`);

        let meta;
        try {
            meta = await jsonRes.json();
        } catch (err) {
            console.error(`[${projectId}.json] Error de sintaxis JSON:`, err.message);
            throw new Error(`El archivo ${projectId}.json está mal escrito.`);
        }

        let diariumLogs = [];
        if (diariumRes.ok) {
            try {
                diariumLogs = await diariumRes.json();
            } catch (err) {
                console.error(`[diarium.json] Error de sintaxis JSON:`, err.message);
            }
        }

        const tipoProyecto = (meta.formato || meta.tipo || 'pdf').toLowerCase().trim();
        const versiones = Array.isArray(meta.versiones) ? meta.versiones : [];
        const activeVersionObj = versiones.find(v => String(v.numero) === String(meta.version)) || versiones[0] || {};
        const nombreTipo = tiposMap[tipoProyecto] || tipoProyecto;

        // 1. Metadatos globales
        document.getElementById('page-title').textContent = `${meta.nombre}`;

        const titleElem = document.getElementById('proj-titulo-principal');
        if (titleElem) titleElem.textContent = meta.nombre;

        const sinopsisElem = document.getElementById('proj-sinopsis-text');
        if (sinopsisElem) sinopsisElem.textContent = meta.sinopsis || 'Sin descripción disponible.';

        const versionElem = document.getElementById('proj-version-latest');
        if (versionElem) versionElem.textContent = `v${meta.version}`;

        const badgeElem = document.getElementById('proj-type-badge');
        if (badgeElem) {
            const claseStr = (meta.clase || 'opus').toLocaleUpperCase('es');
            const tipoStr = nombreTipo.toLocaleUpperCase('es');

            badgeElem.textContent = `${claseStr} · ${tipoStr}`;
            badgeElem.className = `badge badge-type ${meta.clase ? meta.clase.toLowerCase().trim() : 'opus'}`;
        }

        // Etiquetas clicables junto al badge (llevan a projecta.html?tag=...)
        const tagsListElem = document.getElementById('proj-tags-list');
        if (tagsListElem) {
            const tagsOrdenadas = Array.isArray(meta.tags)
                ? [...meta.tags].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
                : [];

            if (tagsOrdenadas.length > 0) {
                tagsListElem.innerHTML = tagsOrdenadas
                    .map(t => `<a href="projecta.html?tag=${encodeURIComponent(t)}" class="tag-pill">${t}</a>`)
                    .join('');
                tagsListElem.classList.remove('hidden');
            } else {
                tagsListElem.classList.add('hidden');
            }
        }

        // 2. Sección opcional: Imágenes (carrusel) y Descripción
        renderDescripcionYImagenes(meta, folder, projectId);

        // 3. Logs del Diarium
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

        // 4. Desplegable de Citas (Siempre visible)
        setupCiteDropdown(generarCitas(meta, projectId, activeVersionObj, nombreTipo));

        // 5. Enrutador de botones primario/secundario según el tipo
        if (tipoProyecto === 'github') {
            await renderGithubProject(meta, folder, projectId, activeVersionObj);
        } else if (tipoProyecto === 'video') {
            renderVideoProject(meta, folder, projectId, activeVersionObj);
        } else {
            await renderPdfProject(meta, folder, projectId, activeVersionObj);
        }

        setupTabs();

    } catch (e) {
        console.error("Error inyectando proyecto:", e);
        document.getElementById('project-container').innerHTML = `
            <div class="error-container">
                <h2 class="error-title">Error al cargar el proyecto '${projectId}'</h2>
                <p class="error-text">Comprueba la consola y verifica que <code>./projecta/${projectId}/${projectId}.json</code> existe y tiene sintaxis válida.</p>
                <a href="../index.html" class="btn-icon btn-icon-margin">← Volver al inicio</a>
            </div>
        `;
    }
});


async function renderPdfProject(meta, folder, projectId, activeVersionObj) {
    const versiones = Array.isArray(meta.versiones) ? meta.versiones : [];

    const versionesVerificadas = await Promise.all(
        versiones.map(async (v) => {
            if (v.disponible === false || v.archivo === false || v.enlace === false) {
                return { ...v, _resolvedUrl: null };
            }
            const candidateUrl = v.enlace || (v.archivo ? `${folder}/${v.archivo}` : `${folder}/${projectId}-v${v.numero}.pdf`);
            const existe = await verificarArchivoLocal(candidateUrl);
            return { ...v, _resolvedUrl: existe ? candidateUrl : null };
        })
    );

    const activeEntry = versionesVerificadas.find(v => String(v.numero) === String(meta.version));
    const defaultPdfPath = activeVersionObj.archivo
        ? `${folder}/${activeVersionObj.archivo}`
        : `${folder}/${projectId}-v${meta.version}.pdf`;

    const pdfPath = activeEntry
        ? activeEntry._resolvedUrl
        : ((await verificarArchivoLocal(defaultPdfPath)) ? defaultPdfPath : null);

    const disponible = Boolean(pdfPath);

    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        if (disponible) {
            tabVisorBtn.textContent = "Visor PDF";
            tabVisorBtn.classList.remove('hidden');
        } else {
            tabVisorBtn.classList.add('hidden');
        }
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem && disponible) {
        iframeElem.classList.remove('is-video');
        iframeElem.src = pdfPath;
    }

    const btnPrimary = document.getElementById('btn-action-primary');
    if (btnPrimary) {
        if (disponible) {
            btnPrimary.classList.remove('hidden');
            btnPrimary.innerHTML = `${ICON_DOWNLOAD}<span>Descargar PDF</span>`;
            btnPrimary.href = pdfPath;
            btnPrimary.setAttribute('download', '');
            btnPrimary.removeAttribute('target');
        } else {
            btnPrimary.classList.add('hidden');
        }
    }

    const btnSecondary = document.getElementById('btn-action-secondary');
    if (btnSecondary) {
        if (disponible) {
            btnSecondary.classList.remove('hidden');
            btnSecondary.innerHTML = `${ICON_OPEN_TAB}<span>Ver PDF</span>`;
            btnSecondary.href = pdfPath;
            btnSecondary.target = "_blank";
            btnSecondary.removeAttribute('download');
        } else {
            btnSecondary.classList.add('hidden');
        }
    }

    renderVersionesList(versionesVerificadas, meta.version, (v) => v._resolvedUrl);
}


function renderVideoProject(meta, folder, projectId, activeVersionObj) {
    const videoUrl = activeVersionObj.enlace || activeVersionObj.url || meta.enlace || meta.url || "";
    const disponible = Boolean(videoUrl) && activeVersionObj.disponible !== false;

    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        if (disponible) {
            tabVisorBtn.textContent = "Vídeo";
            tabVisorBtn.classList.remove('hidden');
        } else {
            tabVisorBtn.classList.add('hidden');
        }
    }

    const iframeElem = document.getElementById('proj-pdf-iframe');
    if (iframeElem && disponible) {
        iframeElem.classList.add('is-video');
        iframeElem.src = toYoutubeEmbedUrl(videoUrl);
    }

    const btnPrimary = document.getElementById('btn-action-primary');
    if (btnPrimary) {
        if (disponible) {
            btnPrimary.classList.remove('hidden');
            btnPrimary.innerHTML = `${ICON_OPEN_TAB}<span>Ver Vídeo</span>`;
            btnPrimary.href = videoUrl;
            btnPrimary.target = "_blank";
            btnPrimary.removeAttribute('download');
        } else {
            btnPrimary.classList.add('hidden');
        }
    }

    const btnSecondary = document.getElementById('btn-action-secondary');
    if (btnSecondary) {
        btnSecondary.classList.add('hidden');
    }

    renderVersionesList(meta.versiones, meta.version, (v) => {
        if (v.disponible === false || v.enlace === false) return null;
        return v.enlace || v.url || null;
    });
}


async function renderGithubProject(meta, folder, projectId, activeVersionObj) {
    const tabVisorBtn = document.querySelector('[data-tab="tab-latex"]');
    if (tabVisorBtn) {
        tabVisorBtn.classList.add('hidden');
    }

    const githubUrl = activeVersionObj.enlace || meta.enlace || meta.github || meta.url || `https://github.com/Phibik/${projectId}`;

    const esZipLocal = Boolean(activeVersionObj.zip_local ?? meta.zip_local);
    const zipUrl = esZipLocal
        ? `${folder}/${projectId}-v${meta.version}.zip`
        : (activeVersionObj.zip || meta.zip || `${githubUrl}/archive/refs/heads/main.zip`);

    const zipDisponible = esZipLocal ? await verificarArchivoLocal(zipUrl) : Boolean(zipUrl);

    const btnPrimary = document.getElementById('btn-action-primary');
    if (btnPrimary) {
        if (zipDisponible) {
            btnPrimary.classList.remove('hidden');
            btnPrimary.innerHTML = `${ICON_DOWNLOAD}<span>Descargar ZIP</span>`;
            btnPrimary.href = zipUrl;
            if (esZipLocal) {
                btnPrimary.setAttribute('download', '');
                btnPrimary.removeAttribute('target');
            } else {
                btnPrimary.removeAttribute('download');
                btnPrimary.target = "_blank";
            }
        } else {
            btnPrimary.classList.add('hidden');
        }
    }

    const btnSecondary = document.getElementById('btn-action-secondary');
    if (btnSecondary) {
        btnSecondary.classList.remove('hidden');
        btnSecondary.innerHTML = `${ICON_OPEN_TAB}<span>Ver en GitHub</span>`;
        btnSecondary.href = githubUrl;
        btnSecondary.target = "_blank";
        btnSecondary.removeAttribute('download');
    }

    renderVersionesList(meta.versiones, meta.version, (v) => {
        if (v.disponible === false || v.enlace === false) return null;
        return v.enlace || v.url || githubUrl;
    });
}


function renderVersionesList(versiones, activeVersion, getVersionUrl) {
    const versionesList = document.getElementById('proj-versiones-list');
    if (versionesList && Array.isArray(versiones)) {
        versionesList.innerHTML = versiones.map(v => {
            const comentario = (v.comentario || '').trim();
            const url = getVersionUrl(v);
            const isCurrent = String(v.numero) === String(activeVersion);

            const labelHTML = comentario
                ? `<span class="version-number">v${v.numero}</span><span class="version-text">: ${comentario}</span>`
                : `<span class="version-number">v${v.numero}</span>`;

            const actionHTML = url
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="version-action available" title="Abrir en nueva pestaña" aria-label="Abrir versión ${v.numero} en nueva pestaña">${ICON_OPEN_TAB}</a>`
                : `<span class="version-action unavailable" title="No disponible" aria-label="Versión ${v.numero} no disponible">${ICON_UNAVAILABLE}</span>`;

            return `
                <li class="version-item ${isCurrent ? 'is-current' : ''}">
                    <span class="version-main">${labelHTML}</span>
                    <span class="version-meta-actions">
                        <span class="version-date">${v.fecha}</span>
                        ${actionHTML}
                    </span>
                </li>
            `;
        }).join('');
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