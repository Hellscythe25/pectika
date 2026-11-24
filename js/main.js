/* ==========================================================================
   PECTIKÁ · Interacciones de la landing
   Sin librerías: JavaScript simple, ligero y accesible.
   ========================================================================== */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  // ---------------------------------------------------------------------------
  // CONFIGURACIÓN EDITABLE
  // ---------------------------------------------------------------------------
  // Para recibir los pedidos de muestra por correo, crea un formulario en
  // https://formspree.io y pega aquí su dirección (ej.: 'https://formspree.io/f/abcdwxyz').
  const SAMPLE_ENDPOINT = '';
  const COMMENTS_KEY = 'pectika-comentarios-v1';
  const REACTIONS_KEY = 'pectika-reacciones-v1';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Reinicia una animación CSS de clase (para poder repetirla)
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function animateMascot(btn) {
    if (reduceMotion) return;
    ['jump', 'spin', 'wiggle'].forEach((c) => btn.classList.remove(c));
    void btn.offsetWidth;
    btn.classList.add(rand(['jump', 'spin', 'wiggle']));
  }

  // ---------------------------------------------------------------------------
  // 1. MENÚ
  // ---------------------------------------------------------------------------
  const header = $('#header');
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');

  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navMenu.classList.toggle('open', open);
    $('.sr-only', navToggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
  }
  navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', navMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
  });

  const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  // ---------------------------------------------------------------------------
  // APARICIÓN AL HACER SCROLL
  // ---------------------------------------------------------------------------
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  // Pequeño retraso escalonado para elementos vecinos
  $$('.reveal').forEach((el) => {
    const siblings = $$(':scope > .reveal', el.parentElement);
    const i = siblings.indexOf(el);
    if (i > 0) el.style.transitionDelay = `${Math.min(i, 6) * 90}ms`;
    revealIO.observe(el);
  });

  // ---------------------------------------------------------------------------
  // MASCOTAS DE CADA SECCIÓN (clic = salta / gira + cambia de frase)
  // ---------------------------------------------------------------------------
  $$('.mascot-spot').forEach((spot) => {
    const btn = $('.mascot-btn', spot);
    const bubble = $('.bubble', spot);
    let phrases = [];
    try { phrases = JSON.parse(spot.dataset.phrases || '[]'); } catch (_) { phrases = []; }
    let idx = 0;
    btn.addEventListener('click', () => {
      animateMascot(btn);
      if (phrases.length > 1 && bubble) {
        idx = (idx + 1) % phrases.length;
        bubble.textContent = phrases[idx];
        replay(bubble, 'pop');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. HERO: la mascota sigue suavemente el cursor
  // ---------------------------------------------------------------------------
  const tilt = $('#heroTilt');
  const heroStage = $('#heroStage');
  if (tilt && finePointer && !reduceMotion) {
    const target = { rx: 0, ry: 0, tx: 0, ty: 0 };
    const cur = { rx: 0, ry: 0, tx: 0, ty: 0 };
    let raf = null;
    const loop = () => {
      let moving = false;
      for (const k in cur) {
        cur[k] += (target[k] - cur[k]) * 0.08;
        if (Math.abs(target[k] - cur[k]) > 0.01) moving = true;
        tilt.style.setProperty(`--${k}`, cur[k].toFixed(2));
      }
      raf = moving ? requestAnimationFrame(loop) : null;
    };
    window.addEventListener('pointermove', (e) => {
      const r = heroStage.getBoundingClientRect();
      if (r.bottom < 0) return; // hero fuera de pantalla
      const cx = r.left + r.width * 0.62;
      const cy = r.top + r.height * 0.3;
      const dx = clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1);
      const dy = clamp((e.clientY - cy) / (window.innerHeight / 2), -1, 1);
      target.ry = dx * 16;
      target.rx = -dy * 9;
      target.tx = dx * 10;
      target.ty = dy * 6;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // 3. CONTADORES ANIMADOS
  // ---------------------------------------------------------------------------
  function formatNum(v, dec) {
    const [int, frac] = v.toFixed(dec).split('.');
    const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac ? `${withSep}.${frac}` : withSep;
  }
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      counterIO.unobserve(el);
      const end = parseFloat(el.dataset.target);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      if (reduceMotion) { el.textContent = formatNum(end, dec); return; }
      const dur = 2000;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatNum(end * eased, dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('.counter').forEach((c) => counterIO.observe(c));

  // ---------------------------------------------------------------------------
  // 4. PRODUCTO: etiquetas interactivas + giro suave del empaque
  // ---------------------------------------------------------------------------
  const pack = $('#packTilt');
  const packStage = $('#packStage');
  if (pack) {
    const hotspots = $$('.hotspot', pack);
    const tags = $$('.tag');
    const tip = document.createElement('div');
    tip.className = 'pack-tip';
    tip.setAttribute('aria-hidden', 'true');
    pack.appendChild(tip);

    const activate = (i) => {
      hotspots.forEach((h, j) => h.classList.toggle('active', j === i));
      tags.forEach((t, j) => t.classList.toggle('active', j === i));
      if (i == null) { tip.classList.remove('show'); return; }
      const h = hotspots[i];
      tip.textContent = $('strong', tags[i]).textContent;
      tip.style.left = h.style.getPropertyValue('--x');
      tip.style.top = h.style.getPropertyValue('--y');
      replay(tip, 'show');
    };
    hotspots.forEach((h, i) => {
      h.addEventListener('mouseenter', () => activate(i));
      h.addEventListener('focus', () => activate(i));
      h.addEventListener('click', (e) => { e.stopPropagation(); activate(i); });
    });
    tags.forEach((t, i) => {
      t.addEventListener('mouseenter', () => activate(i));
      t.addEventListener('focus', () => activate(i));
      t.addEventListener('click', (e) => { e.stopPropagation(); activate(i); });
    });
    packStage.addEventListener('mouseleave', () => activate(null));
    document.addEventListener('click', () => activate(null));

    if (finePointer && !reduceMotion) {
      packStage.addEventListener('pointermove', (e) => {
        const r = pack.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
        pack.style.setProperty('--ry', (dx * 14).toFixed(1));
        pack.style.setProperty('--rx', (-dy * 10).toFixed(1));
        pack.style.setProperty('--s', '1.05');
      });
      packStage.addEventListener('pointerleave', () => {
        pack.style.setProperty('--ry', '0');
        pack.style.setProperty('--rx', '0');
        pack.style.setProperty('--s', '1');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // MASCOTA FLOTANTE (cambia de mensaje según la sección)
  // ---------------------------------------------------------------------------
  const buddy = $('#buddy');
  const buddyBubble = $('#buddyBubble');
  const buddyBtn = $('#buddyBtn');
  const buddyClose = $('#buddyClose');
  const smallScreen = window.matchMedia('(max-width: 600px)');
  const funPhrases = [
    '¡Wiii! 🎉', '¡Me haces cosquillas! 😆', 'Soy 100% cacao de San Martín 🍫',
    '¿Ya pediste tu muestra? 📦', 'Un producto, mil posibilidades ✨', '¡Sin azúcar añadida en tus postres! 🍮',
  ];
  let buddyText = '';
  let quietTimer = null;

  function setBuddy(text, force = false) {
    if (!text || (text === buddyText && !force)) return;
    buddyText = text;
    buddyBubble.textContent = text;
    buddy.classList.remove('quiet');
    replay(buddyBubble, 'pop');
    clearTimeout(quietTimer);
    if (smallScreen.matches) quietTimer = setTimeout(() => buddy.classList.add('quiet'), 5000);
  }
  buddyBtn.addEventListener('click', () => {
    animateMascot(buddyBtn);
    setBuddy(rand(funPhrases.filter((p) => p !== buddyText)), true);
  });
  buddyClose.addEventListener('click', () => { clearTimeout(quietTimer); buddy.classList.add('quiet'); });

  // Aparece cuando dejamos atrás el inicio
  const hero = $('#inicio');
  new IntersectionObserver(([en]) => {
    buddy.classList.toggle('show', !en.isIntersecting || en.intersectionRatio < 0.35);
  }, { threshold: [0, 0.35, 0.6] }).observe(hero);

  // Sección actual -> mensaje de la mascota + enlace activo del menú
  const navMap = { proceso: 'producto', juego: 'aplicaciones' };
  const navLinks = $$('.nav__links a');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      if (id !== 'inicio') setBuddy(en.target.dataset.mascot);
      const navId = navMap[id] || id;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${navId}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach((s) => sectionIO.observe(s));

  // ---------------------------------------------------------------------------
  // 5. LÍNEA DE TIEMPO DEL PROCESO
  // ---------------------------------------------------------------------------
  const timeline = $('#timeline');
  const fill = $('#timelineFill');
  const steps = $$('.step', timeline);
  const processBubble = $('#processBubble');
  let currentStep = -1;
  let ticking = false;

  function updateTimeline() {
    ticking = false;
    const vh = window.innerHeight;
    const r = timeline.getBoundingClientRect();
    const p = clamp((vh * 0.65 - r.top) / r.height, 0, 1);
    fill.style.setProperty('--p', `${(p * 100).toFixed(1)}%`);
    let last = -1;
    steps.forEach((s, i) => {
      const on = s.getBoundingClientRect().top < vh * 0.72;
      s.classList.toggle('active', on);
      if (on) last = i;
    });
    if (last !== currentStep) {
      currentStep = last;
      steps.forEach((s, i) => s.classList.toggle('current', i === last));
      if (last >= 0) {
        const txt = steps[last].dataset.comment;
        processBubble.textContent = txt;
        replay(processBubble, 'pop');
        const mBtn = $('.process__mascot .mascot-btn');
        if (mBtn) animateMascot(mBtn);
        // En celular la mascota del costado se oculta: comenta la flotante
        if (window.matchMedia('(max-width: 900px)').matches) setBuddy(txt);
      }
    }
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateTimeline); }
  }, { passive: true });
  window.addEventListener('resize', updateTimeline);
  updateTimeline();

  // ---------------------------------------------------------------------------
  // 6. TARJETAS QUE SE VOLTEAN (aplicaciones) — clic / toque / teclado
  // ---------------------------------------------------------------------------
  $$('.flip').forEach((card) => {
    card.addEventListener('click', () => {
      const on = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(on));
    });
  });

  // 9. Tarjetas del equipo
  $$('.member').forEach((m) => {
    const toggle = () => m.classList.toggle('is-flipped');
    m.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
    m.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === m) { e.preventDefault(); toggle(); }
    });
    if (canHover) m.addEventListener('mouseleave', () => m.classList.remove('is-flipped'));
  });

  // ---------------------------------------------------------------------------
  // 7. MINI JUEGO: ARMA TU POSTRE
  // ---------------------------------------------------------------------------
  const S = 'stroke="#7A3E12" stroke-width="2.2" stroke-linejoin="round"';
  const FRUITS = [
    { id: 'fresa', name: 'fresa', label: 'Fresa', gel: '#E8335A', pc: '#C81E45',
      icon: `<path d="M24 44 C12 36 8 24 12 16 Q24 11 36 16 C40 24 36 36 24 44Z" fill="#E8335A" ${S}/><path d="M13 15 Q18 7 24 12 Q30 7 35 15 Q28 13 24 17 Q20 13 13 15Z" fill="#689455" ${S}/><g fill="#FFE58A"><ellipse cx="19" cy="24" rx="1.3" ry="2"/><ellipse cx="29" cy="24" rx="1.3" ry="2"/><ellipse cx="24" cy="31" rx="1.3" ry="2"/><ellipse cx="18" cy="32" rx="1.3" ry="2"/><ellipse cx="30" cy="32" rx="1.3" ry="2"/></g>` },
    { id: 'mango', name: 'mango', label: 'Mango', gel: '#FFA41B', pc: '#F08C00',
      icon: `<ellipse cx="24" cy="27" rx="14" ry="16" fill="#FFA41B" transform="rotate(-25 24 27)" ${S}/><path d="M26 10 Q34 4 40 9 Q33 14 26 10Z" fill="#689455" ${S}/><ellipse cx="18" cy="22" rx="3" ry="6" fill="#fff" opacity=".4" transform="rotate(-25 18 22)"/>` },
    { id: 'aguaymanto', name: 'aguaymanto', label: 'Aguaymanto', gel: '#F7B500', pc: '#E07B00',
      icon: `<path d="M24 5 C35 11 41 24 35 37 Q24 45 13 37 C7 24 13 11 24 5Z" fill="#EAD7A4" ${S}/><circle cx="24" cy="30" r="9" fill="#F7B500" ${S}/><circle cx="21" cy="27" r="2.5" fill="#fff" opacity=".6"/>` },
    { id: 'maracuya', name: 'maracuyá', label: 'Maracuyá', gel: '#F2C230', pc: '#4A2560',
      icon: `<circle cx="24" cy="25" r="17" fill="#6B2F7E" ${S}/><circle cx="24" cy="25" r="12.5" fill="#F2C230"/><g fill="#3A1F0D"><circle cx="20" cy="21" r="1.6"/><circle cx="27" cy="20" r="1.6"/><circle cx="24" cy="26" r="1.6"/><circle cx="19" cy="29" r="1.6"/><circle cx="29" cy="28" r="1.6"/></g>` },
    { id: 'arandano', name: 'arándanos', label: 'Arándanos', gel: '#6A57B8', pc: '#3A2F7A',
      icon: `<circle cx="16" cy="29" r="9" fill="#5B4BA8" ${S}/><circle cx="32" cy="29" r="9" fill="#5B4BA8" ${S}/><circle cx="24" cy="16" r="9" fill="#6A57B8" ${S}/><path d="M22 14 l2 -2 2 2" stroke="#3A1F0D" stroke-width="1.6" fill="none"/><circle cx="13" cy="26" r="2" fill="#fff" opacity=".5"/>` },
    { id: 'pina', name: 'piña', label: 'Piña', gel: '#F6D04D', pc: '#E0A800',
      icon: `<path d="M24 16 L18 4 L23 10 L24 2 L26 10 L31 4Z" fill="#689455" ${S}/><ellipse cx="24" cy="30" rx="12" ry="15" fill="#F6D04D" ${S}/><path d="M15 22 L33 38 M15 32 L28 44 M20 17 L34 30 M33 22 L15 38 M33 32 L20 44 M28 17 L14 30" stroke="#C99400" stroke-width="1.4"/>` },
  ];
  const CUPS = [
    { id: 'copa', label: 'Copa', title: (f) => `Copa de gelatina de ${f}`,
      icon: `<path d="M7 12 Q7 30 24 31 Q41 30 41 12Z" fill="#DFF3F6" ${S}/><path d="M24 31 V40 M14 42 H34" stroke="#7A3E12" stroke-width="3" stroke-linecap="round"/>`,
      gel: 'M44 74 Q46 120 100 122 Q154 120 156 74Z',
      front: '<path d="M36 64 Q36 130 100 132 Q164 130 164 64Z" fill="rgba(223,243,246,.35)" stroke="#7A3E12" stroke-width="4"/><path d="M100 132 V166" stroke="#7A3E12" stroke-width="6" stroke-linecap="round"/><ellipse cx="100" cy="170" rx="36" ry="8" fill="#DFF3F6" stroke="#7A3E12" stroke-width="4"/><path d="M50 82 Q54 110 74 118" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>',
      top: 72, xs: [66, 84, 100, 116, 134], face: [100, 100] },
    { id: 'vasito', label: 'Vasito', title: (f) => `Vasito de yogur con ${f}`,
      icon: `<path d="M11 9 L15 41 Q24 44 33 41 L37 9Z" fill="#fff" ${S}/><path d="M13 22 H35" stroke="#CC42A5" stroke-width="4"/>`,
      gel: 'M65 88 L72 156 Q100 162 128 156 L135 88Z',
      front: '<path d="M56 52 L68 162 Q100 172 132 162 L144 52Z" fill="rgba(255,255,255,.25)" stroke="#7A3E12" stroke-width="4"/><ellipse cx="100" cy="52" rx="44" ry="8" fill="none" stroke="#7A3E12" stroke-width="4"/><path d="M70 66 L76 140" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>',
      top: 86, xs: [80, 93, 107, 120], face: [100, 126] },
    { id: 'molde', label: 'Molde', title: (f) => `Postre en molde de ${f}`,
      icon: `<ellipse cx="24" cy="40" rx="19" ry="4" fill="#fff" ${S}/><path d="M10 39 L14 16 Q24 10 34 16 L38 39Z" fill="#F7C3E3" ${S}/>`,
      back: '<ellipse cx="100" cy="160" rx="78" ry="13" fill="#fff" stroke="#7A3E12" stroke-width="4"/>',
      gel: 'M46 156 L60 84 Q100 64 140 84 L154 156 Q100 166 46 156Z',
      front: '<path d="M76 74 Q70 116 72 160 M124 74 Q130 116 128 160" stroke="rgba(0,0,0,.12)" stroke-width="4" fill="none"/><path d="M62 100 Q64 88 74 82" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>',
      top: 76, xs: [80, 100, 120], face: [100, 120] },
    { id: 'frasco', label: 'Frasco', title: (f) => `Mermelada de ${f}`,
      icon: `<rect x="11" y="15" width="26" height="28" rx="6" fill="#fff" ${S}/><rect x="9" y="7" width="30" height="9" rx="3" fill="#CC42A5" ${S}/>`,
      gel: 'M64 88 H136 V154 Q136 162 128 162 H72 Q64 162 64 154Z',
      front: '<path d="M56 62 H144 V158 Q144 170 132 170 H68 Q56 170 56 158Z" fill="rgba(255,255,255,.22)" stroke="#7A3E12" stroke-width="4"/><rect x="50" y="42" width="100" height="22" rx="7" fill="#CC42A5" stroke="#7A3E12" stroke-width="4"/><g fill="#fff"><circle cx="66" cy="53" r="3"/><circle cx="83" cy="53" r="3"/><circle cx="100" cy="53" r="3"/><circle cx="117" cy="53" r="3"/><circle cx="134" cy="53" r="3"/></g><path d="M70 76 V140" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>',
      top: 86, xs: [78, 92, 108, 122], face: [100, 126] },
  ];

  const fruitOpts = $('#fruitOpts');
  const cupOpts = $('#cupOpts');
  const gameGo = $('#gameGo');
  const gameStage = $('#gameStage');
  const gameResult = $('#gameResult');
  const gameMsg = $('#gameMsg');
  const gameAgain = $('#gameAgain');
  const choice = { fruit: null, cup: null };

  function makeOpt(kind, item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.draggable = true;
    b.dataset.kind = kind;
    b.dataset.id = item.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${item.icon}</svg><span>${item.label}</span>`;
    b.addEventListener('click', () => pick(kind, item.id));
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', `${kind}:${item.id}`);
      e.dataTransfer.effectAllowed = 'copy';
    });
    return b;
  }
  FRUITS.forEach((f) => fruitOpts.appendChild(makeOpt('fruit', f)));
  CUPS.forEach((c) => cupOpts.appendChild(makeOpt('cup', c)));

  function pick(kind, id) {
    choice[kind] = id;
    $$(`.opt[data-kind="${kind}"]`).forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.id === id)));
    const f = FRUITS.find((x) => x.id === choice.fruit);
    const c = CUPS.find((x) => x.id === choice.cup);
    $('#slotFruit em').textContent = f ? f.label : '—';
    $('#slotCup em').textContent = c ? c.label : '—';
    gameGo.disabled = !(f && c);
    if (f && c) gameGo.focus({ preventScroll: true });
  }

  gameStage.addEventListener('dragover', (e) => { e.preventDefault(); gameStage.classList.add('is-over'); });
  gameStage.addEventListener('dragleave', () => gameStage.classList.remove('is-over'));
  gameStage.addEventListener('drop', (e) => {
    e.preventDefault();
    gameStage.classList.remove('is-over');
    const [kind, id] = (e.dataTransfer.getData('text/plain') || '').split(':');
    if ((kind === 'fruit' || kind === 'cup') && id) pick(kind, id);
  });

  function piece(f, x, y, i) {
    const d = `style="animation-delay:${0.9 + i * 0.12}s"`;
    switch (f.id) {
      case 'fresa': return `<g class="fruit-pc" ${d}><path d="M${x} ${y + 9} C${x - 8} ${y + 3} ${x - 8} ${y - 6} ${x} ${y - 6} C${x + 8} ${y - 6} ${x + 8} ${y + 3} ${x} ${y + 9}Z" fill="#E8335A" stroke="#7A3E12" stroke-width="2"/><path d="M${x - 4} ${y - 6} l4 -4 4 4" stroke="#689455" stroke-width="2.5" fill="none"/></g>`;
      case 'arandano': return `<g class="fruit-pc" ${d}><circle cx="${x}" cy="${y}" r="7" fill="#5B4BA8" stroke="#3A1F0D" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".6"/></g>`;
      case 'pina': return `<g class="fruit-pc" ${d}><path d="M${x - 8} ${y + 6} L${x} ${y - 8} L${x + 8} ${y + 6}Z" fill="#F6D04D" stroke="#7A3E12" stroke-width="2" stroke-linejoin="round"/></g>`;
      case 'maracuya': return `<g class="fruit-pc" ${d}><circle cx="${x}" cy="${y}" r="4" fill="${f.pc}"/><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#F7D768" stroke-width="2"/></g>`;
      case 'aguaymanto': return `<g class="fruit-pc" ${d}><circle cx="${x}" cy="${y}" r="7" fill="#F7B500" stroke="#7A3E12" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".6"/></g>`;
      default: return `<g class="fruit-pc" ${d}><rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="4" fill="${f.gel}" stroke="#7A3E12" stroke-width="2"/></g>`;
    }
  }

  function buildDessert() {
    const f = FRUITS.find((x) => x.id === choice.fruit);
    const c = CUPS.find((x) => x.id === choice.cup);
    if (!f || !c) return;
    const [fx, fy] = c.face;
    const pieces = c.xs.map((x, i) => piece(f, x, c.top - 2 - (i % 2) * 5, i)).join('');
    const sparkles = [[30, 40], [170, 50], [24, 120], [176, 130]].map(([x, y], i) =>
      `<path class="sparkle" style="animation-delay:${i * 0.35}s" d="M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3}Z" fill="#EFBF00"/>`
    ).join('');
    gameResult.innerHTML = `
      <svg viewBox="0 0 200 200" role="img" aria-label="${c.title(f.name)}">
        ${c.back || ''}
        <g class="gel">
          <path d="${c.gel}" fill="${f.gel}"/>
          <circle cx="${fx - 13}" cy="${fy}" r="4.5" fill="#3A1F0D"/><circle cx="${fx + 13}" cy="${fy}" r="4.5" fill="#3A1F0D"/>
          <circle cx="${fx - 11.5}" cy="${fy - 1.5}" r="1.5" fill="#fff"/><circle cx="${fx + 14.5}" cy="${fy - 1.5}" r="1.5" fill="#fff"/>
          <path d="M${fx - 8} ${fy + 8} Q${fx} ${fy + 16} ${fx + 8} ${fy + 8}" stroke="#3A1F0D" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="${fx - 22}" cy="${fy + 8}" r="4" fill="#fff" opacity=".35"/><circle cx="${fx + 22}" cy="${fy + 8}" r="4" fill="#fff" opacity=".35"/>
        </g>
        ${c.front}
        ${pieces}
        ${sparkles}
      </svg>`;
    $('#gameName').textContent = `${c.title(f.name)}`;
    gameMsg.hidden = false;
    replay(gameMsg, 'pop');
    gameAgain.hidden = false;
    setBuddy('¡Qué rico te quedó! 😋', true);
    beanBurst(gameStage.getBoundingClientRect().left + gameStage.offsetWidth / 2, gameStage.getBoundingClientRect().top + gameStage.offsetHeight / 2, 18);
  }
  gameGo.addEventListener('click', buildDessert);
  gameAgain.addEventListener('click', () => {
    choice.fruit = null; choice.cup = null;
    $$('.opt').forEach((o) => o.setAttribute('aria-pressed', 'false'));
    $('#slotFruit em').textContent = '—';
    $('#slotCup em').textContent = '—';
    gameGo.disabled = true;
    gameMsg.hidden = true;
    gameAgain.hidden = true;
    gameResult.innerHTML = '<p class="game__hint">Suelta aquí tu fruta y tu envase 👇</p>';
    $('.opt', fruitOpts).focus();
  });

  // ---------------------------------------------------------------------------
  // CONFETI DE GRANOS DE CACAO
  // ---------------------------------------------------------------------------
  function beanBurst(x, y, n = 12) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('class', 'confetti');
      s.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', rand(['#i-bean', '#i-bean', '#i-leaf']));
      s.appendChild(use);
      s.style.left = `${x - 8}px`;
      s.style.top = `${y - 6}px`;
      document.body.appendChild(s);
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 80;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 30;
      const rot = (Math.random() - 0.5) * 720;
      s.animate([
        { transform: 'translate(0,0) rotate(0) scale(.6)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.15}px, ${dy + 70}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => s.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // 10. COMENTARIOS (guardados en el navegador)
  // ---------------------------------------------------------------------------
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* almacenamiento lleno o bloqueado */ }
    },
  };
  let comments = store.get(COMMENTS_KEY, []);
  let myReactions = store.get(REACTIONS_KEY, {});

  const AV_COLORS = ['#FF751F', '#CC42A5', '#0097B2', '#EFBF00', '#689455', '#A0521C'];
  const AV_BG = ['#FFE6D4', '#FBE0EF', '#D3F0F5', '#FFF0B8', '#E2EEDC', '#F2E1D2'];
  function avatarSVG(a) {
    const col = AV_COLORS[a.c % AV_COLORS.length];
    const bg = AV_BG[(a.c + 2) % AV_BG.length];
    const eyes = [
      '<circle cx="26" cy="31" r="3.4" fill="#fff"/><circle cx="38" cy="31" r="3.4" fill="#fff"/><circle cx="26.5" cy="31.6" r="1.8" fill="#3A1F0D"/><circle cx="38.5" cy="31.6" r="1.8" fill="#3A1F0D"/>',
      '<path d="M22 32 Q26 27 30 32 M34 32 Q38 27 42 32" stroke="#3A1F0D" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      '<circle cx="26" cy="31" r="3.4" fill="#fff"/><circle cx="26.5" cy="31.6" r="1.8" fill="#3A1F0D"/><path d="M34 31 H42" stroke="#3A1F0D" stroke-width="2.4" stroke-linecap="round"/>',
    ][a.e % 3];
    const mouth = [
      '<path d="M26 39 Q32 45 38 39" stroke="#3A1F0D" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      '<path d="M26 38 Q32 48 38 38Z" fill="#3A1F0D"/><path d="M29 42 Q32 45 35 42" fill="#E8335A"/>',
      '<circle cx="32" cy="41" r="3" fill="#3A1F0D"/>',
    ][a.m % 3];
    const acc = [
      '<path d="M32 9 C36 2 46 2 48 6 C42 10 36 11 32 9Z" fill="#689455" stroke="#7A3E12" stroke-width="1.5"/>',
      '<g transform="translate(36 2) scale(.32)" color="#CC42A5"><use href="#i-flower"/></g>',
      '<path d="M32 10 V4" stroke="#7A3E12" stroke-width="3" stroke-linecap="round"/>',
      '<g transform="translate(34 2) scale(.3)" color="#EFBF00"><use href="#i-flower"/></g>',
    ][a.a % 4];
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}"/>
      <path d="M32 9 C45 13 50 28 46 43 C44 52 37 57 32 59 C27 57 20 52 18 43 C14 28 19 13 32 9Z" fill="${col}" stroke="#7A3E12" stroke-width="2"/>
      <path d="M32 12 V56 M24 16 Q20 36 25 54 M40 16 Q44 36 39 54" stroke="#7A3E12" stroke-width="1.4" fill="none" opacity=".25"/>
      <circle cx="21" cy="38" r="2.6" fill="#fff" opacity=".35"/><circle cx="43" cy="38" r="2.6" fill="#fff" opacity=".35"/>
      ${eyes}${mouth}${acc}</svg>`;
  }

  const list = $('#commentList');
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; }
  }
  function renderComments() {
    list.innerHTML = '';
    if (!comments.length) {
      const empty = document.createElement('p');
      empty.className = 'comments__empty';
      empty.textContent = 'Aún no hay comentarios. ¡Sé la primera persona en escribir! 🌱';
      list.appendChild(empty);
      return;
    }
    comments.slice().sort((a, b) => b.ts - a.ts).forEach((c) => list.appendChild(commentEl(c)));
  }
  function commentEl(c) {
    const art = document.createElement('article');
    art.className = 'comment';
    const mine = myReactions[c.id] || {};
    art.innerHTML = `
      <div class="comment__avatar">${avatarSVG(c.av)}</div>
      <div>
        <div class="comment__head"><h3 class="comment__name"></h3><span class="comment__date"></span></div>
        <p class="comment__text"></p>
        <div class="comment__actions">
          <button class="react" type="button" data-r="like" aria-pressed="${!!mine.like}"><svg viewBox="0 0 52 48" aria-hidden="true"><use href="#r-like"/></svg><span class="react__label">Me gusta</span> <span class="react__n">${c.like || 0}</span></button>
          <button class="react" type="button" data-r="love" aria-pressed="${!!mine.love}"><svg viewBox="0 0 52 52" aria-hidden="true"><use href="#r-love"/></svg><span class="react__label">Me encanta</span> <span class="react__n">${c.love || 0}</span></button>
          ${c.own ? '<button class="comment__del" type="button">Eliminar</button>' : ''}
        </div>
      </div>`;
    // Texto del usuario siempre como texto (nunca como HTML)
    $('.comment__name', art).textContent = c.name;
    $('.comment__date', art).textContent = fmtDate(c.ts);
    $('.comment__text', art).textContent = c.text;

    $$('.react', art).forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.r;
        const state = myReactions[c.id] || (myReactions[c.id] = {});
        state[r] = !state[r];
        c[r] = Math.max(0, (c[r] || 0) + (state[r] ? 1 : -1));
        store.set(REACTIONS_KEY, myReactions);
        store.set(COMMENTS_KEY, comments);
        btn.setAttribute('aria-pressed', String(state[r]));
        $('.react__n', btn).textContent = c[r];
        replay(btn, 'bounce');
        if (state[r]) {
          const rb = btn.getBoundingClientRect();
          beanBurst(rb.left + 20, rb.top + rb.height / 2, 10);
        }
      });
    });
    const del = $('.comment__del', art);
    if (del) {
      del.addEventListener('click', () => {
        comments = comments.filter((x) => x.id !== c.id);
        delete myReactions[c.id];
        store.set(COMMENTS_KEY, comments);
        store.set(REACTIONS_KEY, myReactions);
        renderComments();
      });
    }
    return art;
  }

  const cForm = $('#commentForm');
  cForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameI = $('#cName');
    const textI = $('#cText');
    const name = nameI.value.trim();
    const text = textI.value.trim();
    nameI.setAttribute('aria-invalid', String(!name));
    textI.setAttribute('aria-invalid', String(!text));
    if (!name || !text) {
      $('#cError').textContent = 'Escribe tu nombre y tu comentario, por favor.';
      (name ? textI : nameI).focus();
      return;
    }
    $('#cError').textContent = '';
    const r = () => Math.floor(Math.random() * 12);
    const c = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, text, ts: Date.now(), like: 0, love: 0, own: true, av: { c: r(), e: r(), m: r(), a: r() } };
    comments.push(c);
    store.set(COMMENTS_KEY, comments);
    renderComments();
    cForm.reset();
    setBuddy(`¡Gracias por comentar, ${name.split(' ')[0]}! 💬`, true);
    const first = $('.comment', list);
    if (first) {
      const rb = first.getBoundingClientRect();
      beanBurst(rb.left + 40, rb.top + 40, 14);
    }
  });
  renderComments();

  // ---------------------------------------------------------------------------
  // 11. FORMULARIO "PIDE TU MUESTRA"
  // ---------------------------------------------------------------------------
  const sForm = $('#sampleForm');
  const thanks = $('#thanks');
  sForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = ['#sName', '#sCompany', '#sEmail', '#sProduct'].map((s) => $(s));
    let firstBad = null;
    fields.forEach((f) => {
      const ok = f.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim() !== '';
      f.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = f;
    });
    if (firstBad) {
      $('#sError').textContent = 'Revisa los campos marcados: nombre, empresa, un correo válido y el producto de interés.';
      firstBad.focus();
      return;
    }
    $('#sError').textContent = '';

    if (SAMPLE_ENDPOINT) {
      try {
        const res = await fetch(SAMPLE_ENDPOINT, { method: 'POST', body: new FormData(sForm), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('envío');
      } catch (_) {
        $('#sError').textContent = 'No pudimos enviar tu pedido. Inténtalo otra vez en un momento.';
        return;
      }
    }

    const name = $('#sName').value.trim().split(' ')[0];
    $('#thanksTitle').textContent = `¡Gracias, ${name}!`;
    $('#thanksText').textContent = 'Recibimos tu pedido de muestra. Te escribiremos pronto para coordinar la entrega en Lima. 📦';
    sForm.reset();
    if (typeof thanks.showModal === 'function') thanks.showModal(); else thanks.setAttribute('open', '');
    const tb = thanks.getBoundingClientRect();
    beanBurst(tb.left + tb.width / 2, tb.top + 120, 20);
    setBuddy('¡Yupi! Pronto te escribimos 🥳', true);
  });
  $('#thanksClose').addEventListener('click', () => (thanks.close ? thanks.close() : thanks.removeAttribute('open')));
  thanks.addEventListener('click', (e) => { if (e.target === thanks) thanks.close(); });

  // ---------------------------------------------------------------------------
  // 8. VIDEO "UNA SILLA VACÍA"
  // ---------------------------------------------------------------------------
  const video = $('#video');
  if (video) {
    $('.video__play', video).addEventListener('click', () => {
      const id = (video.dataset.youtubeId || '').trim();
      if (!id) {
        $('#videoSub').textContent = 'El video se publicará muy pronto 🎬';
        replay($('.video__icon', video), 'wiggle');
        return;
      }
      video.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Una silla vacía" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    });
  }

  // ---------------------------------------------------------------------------
  // DESTELLOS DE CACAO QUE SIGUEN AL CURSOR (sutil)
  // ---------------------------------------------------------------------------
  if (finePointer && !reduceMotion) {
    let lx = 0, ly = 0, last = 0, alive = 0;
    const colors = ['#7A3E12', '#CC42A5', '#EFBF00', '#0097B2', '#FF751F'];
    window.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 45 || alive > 14) return;
      if (Math.hypot(e.clientX - lx, e.clientY - ly) < 26) return;
      last = now; lx = e.clientX; ly = e.clientY;
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('class', 'spark');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('viewBox', '0 0 40 26');
      const isBean = Math.random() < 0.6;
      s.innerHTML = isBean
        ? '<use href="#i-bean"/>'
        : `<path d="M20 1 L24 9 L33 13 L24 17 L20 25 L16 17 L7 13 L16 9Z" fill="${rand(colors.slice(1))}"/>`;
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      document.body.appendChild(s);
      alive++;
      s.addEventListener('animationend', () => { s.remove(); alive--; });
    }, { passive: true });
  }
})();
