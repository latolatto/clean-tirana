(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = $('#menuToggle');
  const nav = $('#navigation');
  const packageMenu = $('#navPackages');
  function closeMenu(returnFocus = false) {
    nav.classList.remove('open');
    if (packageMenu) packageMenu.open = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Hap menynë');
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Mbyll menynë' : 'Hap menynë');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (packageMenu?.open) { if (packageMenu) packageMenu.open = false; packageMenu.querySelector('summary').focus(); }
    else if (nav.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-packages')) if (packageMenu) packageMenu.open = false;
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Entrance animations settle by themselves; no persistent banner controls.
  const hero = $('#krye');
  if (window.matchMedia('(pointer:fine)').matches) {
    let pointerFrame = 0;
    hero.addEventListener('pointermove', event => {
      if (reduced.matches || pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty('--pointer-x', (event.clientX - bounds.left) + 'px');
        hero.style.setProperty('--pointer-y', (event.clientY - bounds.top) + 'px');
        pointerFrame = 0;
      });
    }, { passive: true });
  }

  // Each pulse moves only while invisible; positions stay over the hero photograph.
  const twinkles = $$('.tirana-twinkles i');
  const sparkleColours = ['#81b858', '#7fa9cb', '#c9e5b1', '#bdd9e9'];
  const sparkleTimers = new Map();
  function placeTwinkle(spark, index) {
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const x = mobile ? 14 + Math.random() * 76 : 64 + Math.random() * 31;
    const photoHeight = Math.min(280, Math.max(180, hero.clientHeight * .27));
    const y = mobile ? hero.clientHeight - photoHeight + Math.random() * (photoHeight - 35) : hero.clientHeight * (.16 + Math.random() * .66);
    spark.style.setProperty('--spark-x', x + '%');
    spark.style.setProperty('--spark-y', y + 'px');
    spark.style.setProperty('--spark-size', (mobile ? 10 + Math.random() * 7 : 12 + Math.random() * 11) + 'px');
    spark.style.setProperty('--spark-color', sparkleColours[index % sparkleColours.length]);
    spark.style.setProperty('--spark-duration', (3.2 + Math.random() * 2) + 's');
  }
  function runTwinkle(spark, index) {
    if (reduced.matches || document.hidden) return;
    placeTwinkle(spark, index);
    spark.classList.add('is-pulsing');
  }
  function scheduleTwinkle(spark, index, delay) {
    clearTimeout(sparkleTimers.get(spark));
    sparkleTimers.set(spark, setTimeout(() => runTwinkle(spark, index), delay));
  }
  twinkles.forEach((spark, index) => {
    placeTwinkle(spark, index);
    spark.addEventListener('animationend', () => {
      spark.classList.remove('is-pulsing');
      scheduleTwinkle(spark, index, 250 + Math.random() * 1400);
    });
    if (!reduced.matches) scheduleTwinkle(spark, index, index * 850);
  });
  function restartTwinkles() {
    twinkles.forEach((spark, index) => {
      clearTimeout(sparkleTimers.get(spark));
      spark.classList.remove('is-pulsing');
      if (!document.hidden && !reduced.matches) scheduleTwinkle(spark, index, 150 + index * 700);
    });
  }
  reduced.addEventListener('change', restartTwinkles);
  document.addEventListener('visibilitychange', restartTwinkles);
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    twinkles.forEach((spark, index) => placeTwinkle(spark, index));
  });

  const content = window.TIRANA_CONTENT || { reviews: [], videos: [], mediaIsReference: true };
  $$('[data-reference-label]').forEach(label => { label.hidden = !content.mediaIsReference; });
  const comparison = $('#comparisonRange');
  const stage = $('#comparisonStage');
  const pairs = content.comparisons || (content.comparison ? [content.comparison] : []);
  const previous = $('.comparison-prev');
  const next = $('.comparison-next');
  const thumbs = $('#comparisonThumbnails');
  const figure = $('.comparison-figure');
  let activePair = 0;
  let comparisonFrame = null;
  const identityMatrix = [1,0,0,0,1,0,0,0,1];
  function cropMatrix(crop, size, width, height) {
    const [x,y,w,h] = crop || [0,0,size.width,size.height];
    const scale = Math.max(width / w, height / h);
    return [scale,0,width / 2 - (x + w / 2) * scale,0,scale,height / 2 - (y + h / 2) * scale,0,0,1];
  }
  function setComparisonImage(side, pair, matrix, crop) {
    const img = side === 'before' ? $('#beforeImage') : $('#afterImage');
    const size = pair[side + 'Size'];
    const h = matrix || identityMatrix;
    const s = [h[0]-crop.x*h[6],h[1]-crop.x*h[7],h[2]-crop.x*h[8],h[3]-crop.y*h[6],h[4]-crop.y*h[7],h[5]-crop.y*h[8],h[6],h[7],h[8]];
    if (pair[side + 'Display']) {
      img.srcset = pair[side + 'Display'] + ' ' + pair[side + 'DisplayWidth'] + 'w, ' + pair[side] + ' ' + size.width + 'w';
      img.sizes = '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 60vw, 760px';
    }
    img.src = pair[side + 'Display'] || pair[side];
    img.alt = pair.title + (side === 'before' ? ' — para larjes' : ' — pas larjes');
    img.style.width = size.width + 'px';
    img.style.height = size.height + 'px';
    img.style.transform = 'matrix3d(' + [s[0],s[3],0,s[6],s[1],s[4],0,s[7],0,0,1,0,s[2],s[5],0,s[8]].join(',') + ')';
  }
  function fitComparison() {
    if (!comparisonFrame) return;
    stage.style.setProperty('--comparison-scale',Math.max(stage.clientWidth / comparisonFrame.width,stage.clientHeight / comparisonFrame.height));
  }
  function updateComparison() {
    const split = Number(comparison.value);
    stage.style.setProperty('--split',split + '%');
    comparison.setAttribute('aria-valuetext',(100 - split) + '% e pamjes pas larjes');
  }
  function showComparison(index, animate = true) {
    if (!pairs.length) return;
    activePair = (index + pairs.length) % pairs.length;
    const pair = pairs[activePair];
    const crop = pair.alignment?.crop || {x:0,y:0,width:1000,height:720};
    comparisonFrame = crop;
    stage.classList.add('registered');
    stage.style.setProperty('--comparison-width',crop.width + 'px');
    stage.style.setProperty('--comparison-height',crop.height + 'px');
    for (const side of ['before','after']) {
      const matrix = pair.alignment?.[side] || cropMatrix(pair[side + 'Crop'],pair[side + 'Size'],crop.width,crop.height);
      setComparisonImage(side,pair,matrix,crop);
    }
    comparison.value = '50';
    updateComparison();
    fitComparison();
    $('#comparisonCaption').textContent = pair.title;
    $('#comparisonCount').textContent = String(activePair + 1).padStart(2,'0') + ' / ' + String(pairs.length).padStart(2,'0');
    [...thumbs.children].forEach((button,i) => button.setAttribute('aria-current',String(i === activePair)));
    previous.disabled = next.disabled = pairs.length < 2;
    if (animate && !reduced.matches) { figure.classList.remove('is-switching'); void figure.offsetWidth; figure.classList.add('is-switching'); }
  }
  thumbs.replaceChildren();
  if (pairs.length > 1) pairs.forEach((pair,index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'comparison-thumb';
    button.setAttribute('aria-label',pair.title + ' — krahasimi ' + (index + 1));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    const size = pair.afterPreviewSize || pair.afterSize;
    svg.setAttribute('viewBox',(pair.afterPreviewCrop || pair.afterCrop || [0,0,size.width,size.height]).join(' '));
    svg.setAttribute('preserveAspectRatio','xMidYMid slice');svg.setAttribute('aria-hidden','true');
    const img = document.createElementNS(ns,'image');img.dataset.src = pair.afterPreview || pair.after;img.setAttribute('width',size.width);img.setAttribute('height',size.height);svg.append(img);button.append(svg);
    button.addEventListener('click',() => showComparison(index));thumbs.append(button);
  });
  previous?.addEventListener('click',() => showComparison(activePair - 1));
  next?.addEventListener('click',() => showComparison(activePair + 1));
  comparison.addEventListener('input',updateComparison);
  if ('ResizeObserver' in window) new ResizeObserver(fitComparison).observe(stage);
  else window.addEventListener('resize',fitComparison);
  showComparison(0,false);
  // Fetch thumbnails only as the comparison section approaches the viewport.
  function loadComparisonThumbnails() {
    thumbs.querySelectorAll('image[data-src]').forEach(image => {
      image.setAttribute('href',image.dataset.src);
      delete image.dataset.src;
    });
  }
  if ('IntersectionObserver' in window) {
    const thumbnailObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      loadComparisonThumbnails();
      thumbnailObserver.disconnect();
    }, {rootMargin:'600px 0px'});
    thumbnailObserver.observe(stage);
  } else loadComparisonThumbnails();

  const videoGrid = $('#videoGrid');
  const playIcon = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 2 16 11 2 20Z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M5 3v16M13 3v16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const videoPlayers = new Map();
  function syncVideoPlayback(player) {
    const {video} = player;
    if (document.hidden || !player.visible || player.manuallyPaused) {
      video.pause();
      return;
    }
    video.play().then(() => {
      // A pending play request can resolve after the visitor scrolls away.
      if (document.hidden || !player.visible || player.manuallyPaused) video.pause();
    }).catch(player.update);
  }
  const videoWarmup = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      // Metadata is enough to prepare playback without downloading every clip.
      entry.target.preload = 'metadata';
      videoWarmup.unobserve(entry.target);
    });
  }, {rootMargin:'300px 0px'}) : null;
  const videoVisibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const player = videoPlayers.get(entry.target);
      player.visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      syncVideoPlayback(player);
    });
  }, {threshold:[0,0.1]}) : null;
  (content.videos || []).forEach((item, index) => {
    const figure = videoGrid.querySelector('[data-video-index="' + index + '"]') || document.createElement('figure');
    figure.className = 'video-card'; figure.dataset.videoIndex = String(index);
    const frame = figure.querySelector('.video-frame') || document.createElement('div'); frame.className = 'video-frame';
    const video = frame.querySelector('video') || document.createElement('video');
    video.preload = 'none'; video.muted = true; video.defaultMuted = true; video.autoplay = false; video.loop = true; video.playsInline = true; video.controls = false;
    video.removeAttribute('autoplay');
    ['muted','loop','playsinline'].forEach(attribute => video.setAttribute(attribute,''));
    video.setAttribute('loading','lazy');
    if (video.getAttribute('src') !== item.src) video.src = item.src;
    if (item.poster) video.poster = item.poster;
    video.setAttribute('aria-label', item.title + ' — Kompani Pastrimi Tirana');
    const play = frame.querySelector('.video-play') || document.createElement('button'); play.type = 'button'; play.className = 'video-play';
    function updatePlaybackControl() { frame.classList.toggle('playing',!video.paused); play.setAttribute('aria-label',(video.paused ? 'Luaj videon: ' : 'Ndalo videon: ') + item.title); play.innerHTML = '<span>' + (video.paused ? playIcon : pauseIcon) + '</span>'; }
    const player = {video,visible:false,manuallyPaused:false,update:updatePlaybackControl};
    videoPlayers.set(video,player);
    play.addEventListener('click',async () => {
      player.manuallyPaused = !video.paused;
      if (player.manuallyPaused) { video.pause(); return; }
      try { await video.play(); } catch { showVideoError(); }
    });
    video.addEventListener('play',updatePlaybackControl); video.addEventListener('pause',updatePlaybackControl);
    function showVideoError() { if (frame.querySelector('.video-error')) return; const error = document.createElement('a'); error.className = 'video-error'; error.href = 'https://www.instagram.com/kompani_pastrimi_tirana/'; error.target = '_blank'; error.rel = 'noopener'; error.textContent = 'Shihni videot në Instagram ↗'; frame.append(error); }
    video.addEventListener('error',showVideoError);
    frame.append(video,play);
    const caption = figure.querySelector('figcaption') || document.createElement('figcaption');
    if (!caption.children.length) { const text = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title; const subtitle = document.createElement('p'); subtitle.textContent = item.subtitle || ''; text.append(title,subtitle); caption.append(text); }
    figure.append(frame,caption); if (!figure.isConnected) videoGrid.append(figure);
    updatePlaybackControl();
    videoWarmup?.observe(video);
    videoVisibility?.observe(video);
    // Without observer support the play button remains available.
  });
  document.addEventListener('visibilitychange',() => videoPlayers.forEach(syncVideoPlayback));

  const reviews = (content.reviews || []).filter(item => typeof item.name === 'string' && typeof item.text === 'string' && item.name.trim() && item.text.trim());
  $('#reviewsEmpty').hidden = reviews.length > 0;
  $('#pershtypje').hidden = reviews.length === 0;
  reviews.forEach((item, index) => {
    const figure = document.createElement('figure');
    figure.className = 'review-card';
    figure.hidden = index >= 3;
    const mark = document.createElement('span'); mark.className = 'review-quote'; mark.textContent = '“'; mark.setAttribute('aria-hidden', 'true');
    figure.append(mark);
    if (Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5) {
      const stars = document.createElement('span'); stars.className = 'review-stars';
      stars.textContent = '★'.repeat(item.rating); stars.setAttribute('aria-label', item.rating + ' nga 5 yje');
      figure.append(stars);
    }
    const quote = document.createElement('blockquote'); quote.textContent = item.text;
    const caption = document.createElement('figcaption');
    const avatar = document.createElement('span'); avatar.className = 'review-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = item.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const captionText = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = item.name;
    const detail = document.createElement('p'); detail.textContent = [item.service, item.source].filter(Boolean).join(' · ');
    captionText.append(name, detail);
    if (item.source === 'Google' && typeof item.url === 'string' && item.url.startsWith('https://www.google.com/maps')) {
      const sourceLink = document.createElement('a');
      sourceLink.className = 'review-source-link';
      sourceLink.href = item.url;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener';
      sourceLink.textContent = 'Shiko në Google ↗';
      sourceLink.setAttribute('aria-label', 'Hap profilin në Google për të parë përshtypjen e ' + item.name);
      captionText.append(sourceLink);
    }
    caption.append(avatar, captionText);
    figure.append(quote, caption); $('#reviewsGrid').append(figure);
  });

  if (reviews.length > 3) {
    const grid = $('#reviewsGrid');
    const actions = document.createElement('div');
    actions.className = 'reviews-actions';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn btn-outline reviews-toggle';
    more.setAttribute('aria-controls', 'reviewsGrid');
    more.setAttribute('aria-expanded', 'false');
    more.textContent = 'Shfaq më shumë';
    more.addEventListener('click', () => {
      const expanded = more.getAttribute('aria-expanded') !== 'true';
      const cards = [...grid.querySelectorAll('.review-card')];
      if (!expanded && cards.slice(3).some(card => card.contains(document.activeElement))) more.focus();
      cards.forEach((card, index) => { card.hidden = !expanded && index >= 3; });
      grid.classList.toggle('is-expanded', expanded);
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? 'Shfaq më pak' : 'Shfaq më shumë';
    });
    actions.append(more);
    grid.after(actions);
  }

  // Progressive enhancement: all content is visible without JavaScript.
  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      $('#mobileDock').classList.toggle('visible', !entries[0].isIntersecting);
    }, { threshold: 0 });
    heroObserver.observe($('#krye'));
    if (!reduced.matches) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); } });
      }, { threshold: 0.08 });
      $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('waiting'); observer.observe(el); } });
      // Long pages remain available even if observation is interrupted.
      window.setTimeout(() => $$('.reveal.waiting').forEach(el => el.classList.remove('waiting')), 12000);
    }
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) $$('.site-nav a').forEach(link => {
          const active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -60% 0px' });
    $$('.site-nav a').forEach(link => { const target = document.querySelector(link.hash); if (target) sectionObserver.observe(target); });
  }

  const form = $('#offerForm');
  const serviceField = $('#service');
  const result = $('#formResult');
  const status = $('#formStatus');
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    serviceField.value = link.dataset.service;
    serviceField.dispatchEvent(new Event('change', { bubbles: true }));
    result.hidden = true;
    closeMenu();
  }));

  function phoneValid(value) {
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }
  const rules = {
    name: value => value.length >= 2,
    phone: phoneValid,
    service: value => [...serviceField.options].some(option => option.value === value && value),
    area: value => value.length >= 2,
  };
  function checkField(name) {
    const field = form.elements.namedItem(name);
    const valid = rules[name](field.value.trim());
    field.closest('.field').classList.toggle('has-error', !valid);
    field.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  Object.keys(rules).forEach(name => {
    const field = form.elements.namedItem(name);
    ['input', 'change'].forEach(event => field.addEventListener(event, () => {
      if (field.getAttribute('aria-invalid') === 'true') checkField(name);
      status.textContent = '';
    }));
  });
  form.addEventListener('input', () => { result.hidden = true; });
  form.addEventListener('change', () => { result.hidden = true; });
  function buildMessage() {
    const value = name => form.elements.namedItem(name).value.trim();
    const lines = [
      'Përshëndetje Kompani Pastrimi Tirana! Dëshiroj të rezervoj një pastrim dhe të di çmimin.', '',
      'Emri: ' + value('name'), 'Telefoni: ' + value('phone'),
      'Shërbimi: ' + value('service'), 'Qyteti / zona / adresa: ' + value('area'),
    ];
    if (value('size')) lines.push('Sipërfaqja: ' + value('size') + ' m²');
    if (value('date')) { const parts = value('date').split('-'); lines.push('Data e preferuar: ' + parts.reverse().join('.')); }
    if (value('notes')) lines.push('Shënime: ' + value('notes'));
    lines.push('', 'Mund t’ju dërgoj foto ose video të ambientit në WhatsApp. Faleminderit!');
    return lines.join('\n');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    let firstInvalid;
    Object.keys(rules).forEach(name => { if (!checkField(name) && !firstInvalid) firstInvalid = form.elements.namedItem(name); });
    if (firstInvalid) {
      result.hidden = true;
      status.textContent = 'Ju lutem kontrolloni fushat e shënuara.';
      firstInvalid.focus();
      return;
    }
    status.textContent = '';
    const message = buildMessage();
    $('#messagePreview').textContent = message;
    $('#whatsappLink').href = 'https://wa.me/355699813229?text=' + encodeURIComponent(message);
    result.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  $('#copyMessage').addEventListener('click', async () => {
    const button = $('#copyMessage');
    try {
      await navigator.clipboard.writeText($('#messagePreview').textContent);
      button.textContent = 'U kopjua';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#messagePreview'));
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      button.textContent = 'Përzgjidhni Kopjo';
    }
    window.setTimeout(() => { button.textContent = 'Kopjo mesazhin'; }, 3000);
  });
  $('#year').textContent = new Date().getFullYear();
})();
