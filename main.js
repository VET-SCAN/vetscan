/* ==========================================================================
   VET-SCAN · main.js
   - Menú móvil accesible
   - Resaltado del enlace activo al hacer scroll
   - Animaciones de aparición (scroll reveal) con IntersectionObserver
   - Botón "volver arriba"
   - Formulario de agenda -> arma un mensaje y abre WhatsApp
   - Año actual en el footer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Año actual en el footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Menú móvil ---------- */
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    // Cierra el menú al elegir una opción (útil en móvil)
    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Enlace activo según la sección visible ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  if (sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('active-link', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(section => sectionObserver.observe(section));
  }

  /* ---------- Animaciones de aparición al hacer scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (revealEls.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------- Números animados en indicadores ---------- */
  const statNumbers = document.querySelectorAll('[data-stat-value]');

  if (statNumbers.length) {
    const animateStat = (el) => {
      if (el.dataset.animated === 'true') return;
      el.dataset.animated = 'true';

      const target = Number(el.dataset.statValue || 0);
      const prefix = el.dataset.statPrefix || '';
      const suffix = el.dataset.statSuffix || '';
      const duration = 1100;
      const start = performance.now();

      const frame = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = `${prefix}${value}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(frame);
        }
      };

      requestAnimationFrame(frame);
    };

    const statObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStat(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => statObserver.observe(el));
  }

  /* ---------- Botón "volver arriba" ---------- */
  const backToTop = document.getElementById('backToTop');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('is-visible', window.scrollY > 480);
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Formulario de agenda -> WhatsApp ---------- */
  const bookingForm = document.getElementById('bookingForm');
  const WHATSAPP_NUMBER = '573181577351'; // Sin "+" ni espacios, código de país incluido

  if (bookingForm) {
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const data = new FormData(bookingForm);
      const name = (data.get('name') || '').trim();
      const phone = (data.get('phone') || '').trim();
      const petName = (data.get('petName') || '').trim();
      const species = data.get('species') || '';
      const service = data.get('service') || '';
      const location = (data.get('location') || '').trim();
      const message = (data.get('message') || '').trim();

      if (!name || !phone) {
        bookingForm.reportValidity();
        return;
      }

      const lines = [
        'Hola VET-SCAN, quiero agendar una cita 🐾',
        `*Nombre:* ${name}`,
        `*Teléfono:* ${phone}`,
        petName ? `*Mascota:* ${petName} (${species})` : `*Especie:* ${species}`,
        `*Servicio:* ${service}`,
        location ? `*Ubicación:* ${location}` : null,
        message ? `*Mensaje:* ${message}` : null
      ].filter(Boolean);

      const text = encodeURIComponent(lines.join('\n'));
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

      window.open(url, '_blank', 'noopener');
      bookingForm.reset();
    });
  }

});

/* ========================================================================== 
   VET-SCAN · Carrusel de servicios
   - Avance automático suave hacia la derecha
   - Desplazamiento manual con dedo / trackpad / mouse
   - Pausa al interactuar y reanudación automática
   - Bucle visual continuo mediante clonación de tarjetas
   ========================================================================== */


function navigateToServiceFromCard(link) {
  const card = link.closest('a.service-card');
  const href = card?.getAttribute('href') || link.getAttribute('href');
  if (!href) return;
  window.location.href = href;
}

function initServicesCarousel() {
  const carousel = document.querySelector('[data-services-carousel]');
  if (!carousel) return;

  const viewport = carousel.querySelector('.services-carousel__viewport');
  const track = carousel.querySelector('[data-services-track]');
  const nextButton = carousel.querySelector('[data-services-next]');
  const prevButton = carousel.querySelector('[data-services-prev]');

  if (!viewport || !track) return;

  const originalCards = Array.from(track.querySelectorAll('[data-service-card]'));
  if (originalCards.length < 2) return;

  // Creamos una segunda vuelta visual para que el desplazamiento sea continuo.
  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.removeAttribute('data-reveal');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    track.appendChild(clone);
  });

  let paused = false;
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let resumeTimer = null;
  let firstLoopWidth = 0;
  const autoSpeed = 0.45;

  const measureLoop = () => {
    let width = 0;
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0');

    originalCards.forEach((card, index) => {
      width += card.getBoundingClientRect().width;
      if (index < originalCards.length - 1) width += gap;
    });

    firstLoopWidth = width;
  };

  const normalizeScroll = () => {
    if (!firstLoopWidth) return;

    if (viewport.scrollLeft >= firstLoopWidth) {
      viewport.scrollLeft -= firstLoopWidth;
    }

    if (viewport.scrollLeft < 0) {
      viewport.scrollLeft += firstLoopWidth;
    }
  };

  const stopAuto = () => {
    paused = true;
    if (resumeTimer) window.clearTimeout(resumeTimer);
  };

  const resumeAuto = (delay = 1500) => {
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      paused = false;
    }, delay);
  };

  const animate = () => {
    if (!paused && !isDragging && document.visibilityState === 'visible') {
      viewport.scrollLeft += autoSpeed;
      normalizeScroll();
    }
    window.requestAnimationFrame(animate);
  };

  const scrollByCard = (direction) => {
    stopAuto();
    const card = track.querySelector('[data-service-card]');
    if (!card || !firstLoopWidth) return;

    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0');
    const amount = card.getBoundingClientRect().width + gap;

    // Al retroceder desde el inicio, saltamos a la segunda vuelta antes de movernos.
    if (direction < 0 && viewport.scrollLeft <= 1) {
      viewport.scrollLeft = firstLoopWidth;
    }

    viewport.scrollBy({
      left: direction * amount,
      behavior: 'smooth'
    });

    window.setTimeout(() => {
      normalizeScroll();
      resumeAuto(1800);
    }, 450);
  };

  let suppressNextClick = false;

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    isDragging = true;
    dragMoved = false;
    stopAuto();
    dragStartX = event.clientX;
    dragStartScrollLeft = viewport.scrollLeft;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!isDragging) return;
    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) < 6 && !dragMoved) return;
    dragMoved = true;
    event.preventDefault();
    viewport.scrollLeft = dragStartScrollLeft - distance;
    normalizeScroll();
  };

  const onPointerUp = (event) => {
    if (!isDragging) return;
    suppressNextClick = dragMoved;
    isDragging = false;
    viewport.classList.remove('is-dragging');
    viewport.releasePointerCapture?.(event.pointerId);
    resumeAuto(1800);
    window.setTimeout(() => { dragMoved = false; }, 0);
  };

  const onMouseEnter = () => stopAuto();
  const onMouseLeave = () => {
    if (!isDragging) resumeAuto(900);
  };

  const onFocusIn = () => stopAuto();
  const onFocusOut = () => resumeAuto(1200);

  viewport.addEventListener('scroll', normalizeScroll, { passive: true });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
  viewport.addEventListener('mouseenter', onMouseEnter);
  viewport.addEventListener('mouseleave', onMouseLeave);
  viewport.addEventListener('focusin', onFocusIn);
  viewport.addEventListener('focusout', onFocusOut);

  // Dejamos que cada tarjeta use su <a href="..."> nativo para que la navegación
  // sea estable en cada carga de la página. Solo anulamos el clic sintético que
  // puede generarse al terminar un arrastre del carrusel.

  viewport.addEventListener('click', (event) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // Los CTA visibles deben funcionar como enlaces reales en cada carga.
  // Esto evita que el arrastre del carrusel capture accidentalmente el clic.
  viewport.querySelectorAll('.service-card__link[data-service-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.stopPropagation();
      const card = link.closest('a.service-card');
      const href = card?.getAttribute('href');
      if (href) {
        event.preventDefault();
        window.location.href = href;
      }
    });
  });

  nextButton?.addEventListener('click', () => scrollByCard(1));
  prevButton?.addEventListener('click', () => scrollByCard(-1));

  window.addEventListener('resize', () => {
    measureLoop();
    normalizeScroll();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resumeAuto(900);
    } else {
      stopAuto();
    }
  });

  window.setTimeout(() => {
    measureLoop();
    normalizeScroll();
    window.requestAnimationFrame(animate);
  }, 100);
}

// Se ejecuta además del bloque DOMContentLoaded existente sin reemplazarlo.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicesCarousel);
} else {
  initServicesCarousel();
}

/* ========================================================================== 
   VET-SCAN · Vista servicios
   - Galería visual en cuadrícula responsive
   - Selección directa desde ?service=
   - Selector de Servicios / Productos
   - Mantiene la navegación global y demás funcionalidades existentes
   ========================================================================== */


function initServicesGalleryCarousel(){
  const gallery = document.querySelector('[data-services-gallery]');
  if (!gallery) return;
  const viewport = gallery.querySelector('[data-gallery-viewport]');
  const track = gallery.querySelector('[data-gallery-track]');
  const prev = gallery.querySelector('[data-gallery-prev]');
  const next = gallery.querySelector('[data-gallery-next]');
  if (!viewport || !track) return;

  const cards = Array.from(track.querySelectorAll('[data-gallery-card]'));
  if (!cards.length) return;

  const updateButtons = () => {
    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
    if (prev) prev.disabled = viewport.scrollLeft <= 2;
    if (next) next.disabled = viewport.scrollLeft >= max;
  };

  const step = () => {
    const first = cards[0];
    if (!first) return Math.max(260, viewport.clientWidth * .72);
    const gap = parseFloat(getComputedStyle(track).gap || '16') || 16;
    return first.getBoundingClientRect().width + gap;
  };

  prev?.addEventListener('click', () => viewport.scrollBy({left: -step(), behavior:'smooth'}));
  next?.addEventListener('click', () => viewport.scrollBy({left: step(), behavior:'smooth'}));
  viewport.addEventListener('scroll', updateButtons, {passive:true});
  window.addEventListener('resize', updateButtons);

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startScroll = viewport.scrollLeft;
    viewport.classList.add('is-dragging');
    // Keep the native mouse click target on the card. Pointer capture is only
    // needed for touch/pen dragging, otherwise some touch-capable PCs can
    // retarget the click to the gallery viewport.
    if (event.pointerType !== 'mouse') viewport.setPointerCapture?.(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    viewport.scrollLeft = startScroll - dx;
  });

  const endDrag = (event) => {
    const wasMoved = moved;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (event?.pointerType !== 'mouse') viewport.releasePointerCapture?.(event.pointerId);
    if (wasMoved) {
      viewport.dataset.justDragged = 'true';
      window.setTimeout(() => { delete viewport.dataset.justDragged; }, 120);
    }
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  viewport.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && viewport.scrollWidth > viewport.clientWidth) {
      viewport.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, {passive:false});

  // The lightbox checks data-just-dragged so a swipe never opens a card.
  // Do not intercept ordinary mouse clicks here.
  cards.forEach((card) => {
    card.addEventListener('pointerup', () => {
      if (!dragging) return;
    }, { passive: true });
  });

  updateButtons();
}

function initServicesPage() {
  const gallery = document.querySelector('[data-services-gallery]');
  const tabs = document.querySelectorAll('[data-catalog-tab]');
  const panels = document.querySelectorAll('[data-catalog-panel]');

  if (tabs.length && panels.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-catalog-tab');
        tabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        panels.forEach((panel) => {
          const active = panel.getAttribute('data-catalog-panel') === target;
          panel.classList.toggle('is-active', active);
          panel.hidden = !active;
        });
      });
    });
  }

  if (!gallery) return;

  const cards = Array.from(gallery.querySelectorAll('[data-gallery-card]'));
  if (!cards.length) return;

  const selectedService = new URLSearchParams(window.location.search).get('service');
  if (selectedService) {
    const selectedCard = cards.find((card) => card.getAttribute('data-service-id') === selectedService);
    if (selectedCard) {
      window.setTimeout(() => {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        selectedCard.classList.add('is-selected');
        window.setTimeout(() => selectedCard.classList.remove('is-selected'), 1800);
      }, 140);
    }
  }

  // Keyboard users can move naturally between cards.
  cards.forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicesPage);
} else {
  initServicesPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicesGalleryCarousel);
} else {
  initServicesGalleryCarousel();
}


/* ========================================================================== 
   VET-SCAN · Mapa real de cobertura
   - Leaflet + OpenStreetMap como mapa base
   - Límites municipales consultados desde IGAC en GeoJSON
   - Colores interactivos según cobertura confirmada / por confirmar
   ========================================================================== */

function initCoverageMap() {
  const mapEl = document.getElementById('coverageMap');
  if (mapEl && mapEl.dataset.mapInitialized === 'true') return;
  if (mapEl) mapEl.dataset.mapInitialized = 'true';
  if (!mapEl) return;

  const infoTitle = document.getElementById('zoneInfoTitle');
  const infoText = document.getElementById('zoneInfoText');
  const infoAction = document.getElementById('zoneInfoAction');
  const infoStatus = document.getElementById('zoneInfoStatus');

  const confirmed = new Set([
    'Bogotá, D.C.', 'Bogotá', 'Chía', 'Cajicá', 'Funza', 'Tenjo', 'Subachoque'
  ]);

  const municipalities = [
    'Bogotá, D.C.','Soacha','Sibaté','Mosquera','Funza','Madrid','Facatativá','Bojacá','Zipacón',
    'El Rosal','Subachoque','Tenjo','Tabio','Cajicá','Chía','Cota','Sopó','La Calera','Guasca',
    'Guatavita','Tocancipá','Gachancipá','Zipaquirá','Cogua','Nemocón','Suesca','Sesquilé',
    'Chocontá','Villapinzón','Tausa','Ubaté','Cucunubá'
  ];

  const mapStage = mapEl.closest('.coverage-map__stage');
  const mapFallback = document.getElementById('coverageMapFallback');

  const keepFallback = () => {
    if (mapStage) mapStage.classList.remove('is-live');
    if (mapFallback) mapFallback.setAttribute('aria-hidden', 'false');
  };
  const showLiveMap = () => {
    if (mapStage) mapStage.classList.add('is-live');
    if (mapFallback) mapFallback.setAttribute('aria-hidden', 'true');
  };

  if (!window.L) {
    keepFallback();
    return;
  }

  const map = L.map(mapEl, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
    minZoom: 9,
    maxZoom: 15
  }).setView([4.82, -74.06], 10);

  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let tileLoaded = false;
  tiles.once('load', () => { tileLoaded = true; showLiveMap(); });
  setTimeout(() => { if (!tileLoaded) keepFallback(); }, 4500);

  const layerGroup = L.featureGroup().addTo(map);

  const normalize = (value = '') => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/D\.C\./gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const isConfirmed = (name) => {
    const n = normalize(name);
    return Array.from(confirmed).some(item => normalize(item) === n);
  };

  const updateZone = (name, confirmedZone) => {
    if (!infoTitle || !infoText || !infoAction) return;

    infoTitle.textContent = name;
    infoText.textContent = confirmedZone
      ? `Cobertura confirmada para ${name}. Escríbenos para coordinar disponibilidad y horario.`
      : `Esta zona está dentro del mapa de referencia. La disponibilidad para ${name} debe confirmarse antes de agendar.`;

    if (infoStatus) {
      infoStatus.textContent = confirmedZone ? 'Cobertura confirmada' : 'Disponibilidad por confirmar';
      infoStatus.classList.toggle('zone-info__status--confirmed', confirmedZone);
      infoStatus.classList.toggle('zone-info__status--consult', !confirmedZone);
    }

    const message = encodeURIComponent(
      `Hola VET-SCAN, quiero confirmar disponibilidad para atención veterinaria en ${name}.`
    );
    infoAction.href = `https://wa.me/573181577351?text=${message}`;
    infoAction.textContent = confirmedZone ? 'Agendar en esta zona' : 'Consultar disponibilidad';
  };

  const makePopup = (name, confirmedZone) => `
    <div style="min-width:190px">
      <strong style="display:block;font-family:Georgia,serif;color:#2D145C;font-size:1rem;margin-bottom:5px">${name}</strong>
      <span style="display:block;font-size:.72rem;font-weight:800;color:${confirmedZone ? '#673DB7' : '#77708A'};margin-bottom:8px">
        ${confirmedZone ? 'COBERTURA CONFIRMADA' : 'DISPONIBILIDAD POR CONFIRMAR'}
      </span>
      <span style="font-size:.78rem;line-height:1.5;color:#4A4360">
        ${confirmedZone ? 'Atención a domicilio disponible.' : 'Consulta primero la disponibilidad para este municipio.'}
      </span>
    </div>`;

  const query = `mpnombre IN (${municipalities.map(name => `'${name.replace(/'/g, "''")}'`).join(',')})`;
  const url = `https://mapas2.igac.gov.co/server/rest/services/ordenamiento/instrumentospot/FeatureServer/1/query?where=${encodeURIComponent(query)}&outFields=mpcodigo,mpnombre&returnGeometry=true&outSR=4326&f=geojson`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('No se pudo consultar el servicio cartográfico.');
      return response.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data.features) || !data.features.length) {
        throw new Error('El servicio no devolvió municipios.');
      }

      data.features.forEach(feature => {
        const props = feature.properties || {};
        const name = props.mpnombre || props.MPNOMBRE || props.nombre || 'Municipio';
        const confirmedZone = isConfirmed(name);

        const layer = L.geoJSON(feature, {
          style: {
            color: '#6D28D9',
            weight: 1.9,
            opacity: 1,
            fillColor: confirmedZone ? '#BFA9EA' : '#EEEAF7',
            fillOpacity: confirmedZone ? 0.72 : 0.58
          }
        });

        layer.bindTooltip(name, {
          permanent: true,
          direction: 'center',
          className: 'map-place-label',
          opacity: 0.9
        });
        layer.bindPopup(makePopup(name, confirmedZone));

        layer.on({
          mouseover: (event) => {
            const target = event.target;
            target.setStyle({
              weight: 3,
              fillOpacity: confirmedZone ? 0.9 : 0.78
            });
            target.bringToFront();
          },
          mouseout: (event) => {
            layer.setStyle({
              weight: 1.9,
              fillOpacity: confirmedZone ? 0.72 : 0.58
            });
          },
          click: (event) => {
            layerGroup.eachLayer(other => {
              if (other !== event.target && typeof other.setStyle === 'function') {
                const otherName = other.feature?.properties?.mpnombre || other.feature?.properties?.MPNOMBRE || '';
                const otherConfirmed = isConfirmed(otherName);
                other.setStyle({
                  weight: 1.9,
                  fillOpacity: otherConfirmed ? 0.72 : 0.58
                });
              }
            });
            event.target.setStyle({ weight: 2.8, fillOpacity: confirmedZone ? 0.9 : 0.78 });
            updateZone(name, confirmedZone);
          }
        });

        layer.addTo(layerGroup);
      });

      const bounds = layerGroup.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.04));
      updateZone('Bogotá, D.C.', true);
    })
    .catch(error => {
      console.error('VET-SCAN · mapa:', error);
      updateZone('Bogotá', true);
      keepFallback();
    });

  setTimeout(() => map.invalidateSize({ pan: false }), 120);
  setTimeout(() => { if (tileLoaded) showLiveMap(); else keepFallback(); }, 4600);
  map.whenReady(() => map.invalidateSize({ pan: false }));
  window.addEventListener('resize', () => map.invalidateSize());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCoverageMap);
} else {
  initCoverageMap();
}


/* ========================================================================== 
   VET-SCAN · Lightbox de servicios
   - Click en una tarjeta para ampliar la información
   - Flechas, teclado y swipe para navegar entre servicios
   - El enlace Agendar permanece directo a WhatsApp
   ========================================================================== */
function initServicesLightbox() {
  const lightbox = document.getElementById('serviceLightbox');
  const gallery = document.querySelector('[data-services-gallery]');
  if (!lightbox || !gallery) return;

  const cards = Array.from(gallery.querySelectorAll('[data-gallery-card]'));
  if (!cards.length) return;

  const dialog = lightbox.querySelector('.service-lightbox__dialog');
  const title = document.getElementById('lightboxTitle');
  const tag = document.getElementById('lightboxTag');
  const description = document.getElementById('lightboxDescription');
  const features = document.getElementById('lightboxFeatures');
  const quote = document.getElementById('lightboxQuote');
  const action = document.getElementById('lightboxAction');
  const visual = document.getElementById('lightboxVisual');
  const index = document.getElementById('lightboxIndex');
  const total = document.getElementById('lightboxTotal');
  const prev = lightbox.querySelector('[data-lightbox-prev]');
  const next = lightbox.querySelector('[data-lightbox-next]');
  const closeButtons = lightbox.querySelectorAll('[data-lightbox-close]');

  let activeIndex = 0;
  let previousFocus = null;
  let touchStartX = 0;
  let touchStartY = 0;

  if (total) total.textContent = String(cards.length);

  const getCardData = (card) => ({
    title: card.querySelector('h3')?.textContent.trim() || 'Servicio VET-SCAN',
    tag: card.querySelector('.catalog-card__tag')?.textContent.trim() || 'Servicio',
    description: card.querySelector('.catalog-card__body > p')?.textContent.trim() || '',
    features: Array.from(card.querySelectorAll('.catalog-card__features li')).map(item => item.textContent.trim()),
    actionHref: card.querySelector('.catalog-card__action')?.getAttribute('href') || '#',
    visualHTML: card.querySelector('.catalog-card__visual')?.innerHTML || '',
    visualClass: card.querySelector('.catalog-card__visual')?.className || ''
  });

  const render = (newIndex) => {
    activeIndex = (newIndex + cards.length) % cards.length;
    const data = getCardData(cards[activeIndex]);

    if (title) title.textContent = data.title;
    if (tag) tag.textContent = data.tag;
    if (description) description.textContent = data.description;
    if (quote) {
      const quoteMessage = encodeURIComponent(`Hola VET-SCAN, quiero cotizar el servicio: ${data.title}.`);
      quote.href = `https://wa.me/573181577351?text=${quoteMessage}`;
      quote.setAttribute('aria-label', `Cotizar ${data.title}`);
    }
    if (action) {
      action.href = data.actionHref;
      action.setAttribute('aria-label', `Agendar ${data.title}`);
    }
    if (features) {
      features.innerHTML = data.features.map(item => `<li>${item}</li>`).join('');
    }
    if (visual) {
      const softClass = data.visualClass.includes('catalog-card__visual--soft') ? 'service-lightbox__visual--soft' : '';
      const photoClass = data.visualClass.includes('catalog-card__visual--photo') ? 'service-lightbox__visual--photo' : '';
      visual.className = `service-lightbox__visual ${softClass} ${photoClass}`.replace(/\s+/g, ' ').trim();
      visual.innerHTML = data.visualHTML;
      visual.querySelectorAll('.catalog-card__icon').forEach(icon => {
        icon.classList.add('service-lightbox__visual-icon');
      });
      visual.querySelectorAll('.catalog-card__badge').forEach(badge => {
        badge.classList.add('service-lightbox__visual-badge');
      });
    }
    if (index) index.textContent = String(activeIndex + 1);
    if (prev) prev.disabled = cards.length < 2;
    if (next) next.disabled = cards.length < 2;
  };

  const open = (newIndex, sourceCard = cards[newIndex]) => {
    previousFocus = sourceCard || document.activeElement;
    render(newIndex);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    window.setTimeout(() => dialog?.focus(), 30);
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (previousFocus && typeof previousFocus.focus === 'function') {
      window.setTimeout(() => previousFocus.focus(), 20);
    }
  };

  cards.forEach((card, cardIndex) => {
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver ${getCardData(card).title} en detalle`);
    // Pointer events make desktop mouse, pen and touch interactions consistent.
    // A recent horizontal swipe is ignored so the gallery remains draggable.
    card.addEventListener('click', (event) => {
      if (event.target.closest('.catalog-card__action')) return;
      if (gallery.querySelector('[data-gallery-viewport]')?.dataset.justDragged === 'true') return;
      event.preventDefault();
      open(cardIndex, card);
    });
  });

  prev?.addEventListener('click', () => render(activeIndex - 1));
  next?.addEventListener('click', () => render(activeIndex + 1));
  closeButtons.forEach(button => button.addEventListener('click', close));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });

  lightbox.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) render(activeIndex + 1);
    else render(activeIndex - 1);
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight') { event.preventDefault(); render(activeIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); render(activeIndex - 1); }
  });

  // ?service=... abre directamente el servicio seleccionado desde index.html.
  const requestedService = new URLSearchParams(window.location.search).get('service');
  const legacyServiceMap = {
    ecografia: 'ecografia-abdominal',
    consulta: 'consulta-domicilio',
    vacunacion: 'vacunacion',
    laboratorio: 'laboratorio',
    desparasitacion: 'procedimientos-basicos',
    presion: 'consulta-domicilio',
    escaner: 'ecografia-abdominal'
  };
  const selectedService = legacyServiceMap[requestedService] || requestedService;
  if (selectedService) {
    const selectedIndex = cards.findIndex(card => card.getAttribute('data-service-id') === selectedService);
    if (selectedIndex >= 0) {
      window.setTimeout(() => open(selectedIndex, cards[selectedIndex]), 160);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicesLightbox);
} else {
  initServicesLightbox();
}
