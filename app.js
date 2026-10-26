(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $('#app');

  // localStorage can throw (private mode, blocked storage) — never let it break the page
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ias:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ias:' + k, JSON.stringify(v)); } catch {} },
  };

  const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4 13.6h6.6L9.6 22l9.4-12h-6.8z" fill="#ffd400"/></svg>';
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.1 4c2 0 3.6 1.1 4.9 2.9C13.3 5.1 14.9 4 16.9 4c3.5 0 5.7 3.6 4.4 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3l3.5 3.5L17 10M20.5 6.5H8a4 4 0 0 0-4 4V12M7 21l-3.5-3.5L7 14M3.5 17.5H16a4 4 0 0 0 4-4V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  let blog, chapters = [], bodies = {}, current = null;

  /* ---------------- formatting ---------------- */

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function inline(s) {
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // \* \_ \~ \^ mean "a literal symbol, not formatting" (e.g. f\*ck)
    s = s.replace(/\\([*_~^])/g, (_, c) => `&#${c.charCodeAt(0)};`);
    // smart quotes + dashes (before emphasis markers are consumed, so *"hi"* curls correctly)
    s = s
      .replace(/(^|[\s(\[{—–\-*_~])"/g, '$1“').replace(/"/g, '”')
      .replace(/(^|[\s(\[{—–\-*_~])'/g, '$1‘').replace(/'/g, '’')
      .replace(/---/g, '—').replace(/--/g, '—')
      .replace(/\.\.\./g, '…');
    return s
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/\^\^(.+?)\^\^/g, '<small>$1</small>');
  }

  // Every non-empty line is its own paragraph, so text pasted from Google Docs/Word just works.
  function render(md) {
    const lines = md.replace(/\r/g, '').split('\n');
    const out = [];
    let quote = null;
    const flushQuote = () => { if (quote) { out.push('<blockquote>' + quote.map(q => `<p>${inline(q)}</p>`).join('') + '</blockquote>'); quote = null; } };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (/^```\s*chat\s*$/i.test(line)) {
        flushQuote();
        const rows = [];
        while (++i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
          const r = lines[i].trim();
          if (!r) continue;
          const m = r.match(/^([^:]{1,40}):\s*(.*)$/);
          rows.push(m ? `<p><b>${inline(m[1])}:</b> ${inline(m[2])}</p>` : `<p>${inline(r)}</p>`);
        }
        out.push(`<div class="chat">${rows.join('')}</div>`);
        continue;
      }
      if (line.startsWith('>')) { (quote ||= []).push(line.replace(/^>\s?/, '')); continue; }
      flushQuote();
      if (!line) continue;

      if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$|^(~\s*){3,}$|^#{3,}$|^(✦\s*)+$/.test(line)) {
        out.push('<div class="break" aria-hidden="true">✦✦✦</div>');
      } else if (/^#{1,3}\s/.test(line)) {
        const lvl = line.match(/^#+/)[0].length;
        out.push(`<h${lvl + 1}>${inline(line.replace(/^#+\s*/, ''))}</h${lvl + 1}>`);
      } else if (/^->.*<-$/.test(line)) {
        out.push(`<p class="center">${inline(line.slice(2, -2).trim())}</p>`);
      } else if (/^->/.test(line)) {
        out.push(`<p class="right">${inline(line.slice(2).trim())}</p>`);
      } else {
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    flushQuote();
    return out.join('\n');
  }

  const words = md => (md.replace(/```\s*chat|```|[#>*_~-]/g, ' ').match(/\S+/g) || []).length;
  const fmtNum = n => n.toLocaleString('en-US');
  const fmtDate = d => {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
  };
  const label = c => `chapter ${c.number}`;
  // untitled chapters already say "Chapter N" as their title, so skip the small label above it
  const kicker = (c, extra = '') => (c.title || extra) ? `<p class="kicker">${c.title ? label(c) : ''}${c.title && extra ? ' · ' : ''}${extra}</p>` : '';
  const title = c => c.title ? esc(c.title) : `Chapter ${c.number}`;

  /* ---------------- shared bits ---------------- */

  // your picture sits on top of the lightning bolt; if the file doesn't exist it removes itself and the bolt shows
  const avatar = () => BOLT + (blog.avatar ? `<img src="${esc(blog.avatar)}" alt="" onerror="this.remove()">` : '');

  const head = (c, extra = '') => `
    <header class="post-head">
      <div class="avatar">${avatar()}</div>
      <div class="post-who"><span class="blogname">${esc(blog.name)}</span><span class="post-date">${fmtDate(c.date)}</span></div>
      ${extra}
    </header>`;

  const tags = c => {
    const t = [blog.title.toLowerCase(), label(c), ...(c.tags || [])];
    return `<div class="tags">${t.map(x => `<span>#${esc(x)}</span>`).join('')}</div>`;
  };

  const foot = c => {
    const w = words(bodies[c.id]);
    const liked = store.get('likes', []).includes(c.id);
    return `
    <footer class="post-foot">
      <span class="notes">${fmtNum(w)} words <span>· ${Math.max(1, Math.round(w / 230))} min</span></span>
      <div class="acts">
        <button class="act" data-share="${esc(c.id)}" aria-label="Share">${ICON.share}</button>
        <button class="act${liked ? ' liked' : ''}" data-like="${esc(c.id)}" aria-label="Like" aria-pressed="${liked}">${ICON.heart}</button>
      </div>
    </footer>`;
  };

  const isRead = c => store.get('read', []).includes(c.id);

  /* ---------------- views ---------------- */

  function home() {
    current = null;
    document.body.classList.remove('is-reader');
    document.title = blog.title;

    const total = Math.max(blog.totalChapters || 0, chapters.length);
    const remaining = total - chapters.length;
    const last = store.get('last');
    const lastCh = last && chapters.find(c => c.id === last.id);
    const cont = lastCh && last.pct > 0.03 && last.pct < 0.97
      ? `<a class="continue" href="#/c/${encodeURIComponent(lastCh.id)}">▶ continue ${label(lastCh)} · ${Math.round(last.pct * 100)}%</a>`
      : '';

    const master = `
      <article class="post">
        ${head(chapters[0] || {}, '<span class="pin-label">📌 pinned</span>')}
        <div class="post-body">
          <div class="prose"><h1>${esc(blog.title)} — masterpost</h1></div>
          <ul class="master">
            ${chapters.map(c => `
              <li><a href="#/c/${encodeURIComponent(c.id)}">
                <span class="num">${esc(c.number)}</span>
                <span class="t">${title(c)}</span>
                ${isRead(c) ? '' : '<span class="dot" aria-label="unread"></span>'}
              </a></li>`).join('')}
          </ul>
          ${remaining > 0 ? `<p class="drafts">✎ ${remaining} more chapter${remaining > 1 ? 's' : ''} in the drafts</p>` : ''}
        </div>
        <div class="tags"><span>#${esc(blog.title.toLowerCase())}</span><span>#masterpost</span><span>#bookmark this</span></div>
        <div style="height:14px"></div>
      </article>`;

    const posts = [...chapters].reverse().map(c => {
      const tmp = document.createElement('div');
      tmp.innerHTML = render(bodies[c.id]);
      const ex = [...tmp.children].filter(n => !n.classList.contains('break')).slice(0, 3).map(n => n.outerHTML).join('');
      const href = `#/c/${encodeURIComponent(c.id)}`;
      return `
      <article class="post">
        ${head(c, isRead(c) ? '' : '<span class="pill">new</span>')}
        <div class="post-body prose">
          ${kicker(c)}
          <a class="post-title-link" href="${href}"><h1>${title(c)}</h1></a>
          ${c.summary ? `<p><em>${inline(c.summary)}</em></p>` : `<div class="excerpt">${ex}</div>`}
        </div>
        <a class="readmore" href="${href}">Keep reading</a>
        ${tags(c)}
        ${foot(c)}
      </article>`;
    }).join('');

    app.innerHTML = `
      <section class="blog-head">
        <div class="banner"></div>
        <div class="avatar avatar-lg">${avatar()}</div>
        <h1 class="blog-title">${esc(blog.title)}</h1>
        ${blog.description ? `<p class="blog-desc">${inline(blog.description)}</p>` : ''}
        <p class="blog-stats">${chapters.length} of ${total} chapters posted</p>
        ${cont}
      </section>
      ${master}
      ${posts}`;
    window.scrollTo(0, 0);
  }

  function reader(id) {
    const i = chapters.findIndex(c => c.id === id);
    if (i < 0) { location.replace('#/'); return; }
    const c = chapters[i], prev = chapters[i - 1], next = chapters[i + 1];
    current = c;
    document.body.classList.add('is-reader');
    document.title = `${c.title || 'Chapter ' + c.number} · ${blog.title}`;

    const total = Math.max(blog.totalChapters || 0, chapters.length);
    let nav = '';
    if (prev) nav += `<a class="nav-card prev" href="#/c/${encodeURIComponent(prev.id)}"><small>‹ previous</small><span>${title(prev)}</span></a>`;
    if (next) nav += `<a class="nav-card next" href="#/c/${encodeURIComponent(next.id)}"><small>next ›</small><span>${title(next)}</span></a>`;
    else if (chapters.length < total) nav += `<div class="nav-card wide"><small>that's all for now</small><span>the next chapter is still in the drafts ⚡ check back soon</span></div>`;
    else nav += `<div class="nav-card wide"><small>the end</small><span>thank you for reading ⚡</span></div>`;

    app.innerHTML = `
      <article class="post">
        ${head(c)}
        <div class="post-body prose">
          ${kicker(c)}
          <h1>${title(c)}</h1>
          ${c.note ? `<div class="an"><b>a/n</b>${inline(c.note)}</div>` : ''}
          ${render(bodies[c.id])}
          ${c.endNote ? `<div class="an end"><b>end note</b>${inline(c.endNote)}</div>` : ''}
        </div>
        ${tags(c)}
        ${foot(c)}
      </article>
      <nav class="chapter-nav">${nav}</nav>`;

    const read = store.get('read', []);
    if (!read.includes(c.id)) store.set('read', [...read, c.id]);

    const pct = store.get('pos:' + c.id, 0);
    const restore = () => window.scrollTo(0, pct > 0.97 ? 0 : pct * (document.documentElement.scrollHeight - innerHeight));
    restore();
    if (document.fonts && pct) document.fonts.ready.then(restore);
    onScroll();
  }

  function route() {
    const m = location.hash.match(/^#\/c\/(.+)$/);
    m ? reader(decodeURIComponent(m[1])) : home();
  }

  /* ---------------- reading progress ---------------- */

  let saveTimer, ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!current) return;
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
      $('.progress i').style.width = pct * 100 + '%';
      const id = current.id;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { store.set('pos:' + id, pct); store.set('last', { id, pct }); }, 250);
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- likes + share ---------------- */

  app.addEventListener('click', e => {
    const like = e.target.closest('[data-like]');
    if (like) {
      const id = like.dataset.like;
      let likes = store.get('likes', []);
      const on = !likes.includes(id);
      likes = on ? [...likes, id] : likes.filter(x => x !== id);
      store.set('likes', likes);
      like.classList.toggle('liked', on);
      like.setAttribute('aria-pressed', on);
      like.classList.remove('pop'); void like.offsetWidth; if (on) like.classList.add('pop');
      return;
    }
    const share = e.target.closest('[data-share]');
    if (share) {
      const c = chapters.find(x => x.id === share.dataset.share);
      const url = location.href.split('#')[0] + '#/c/' + encodeURIComponent(c.id);
      if (navigator.share) navigator.share({ title: `${blog.title} · ${label(c)}`, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url);
    }
  });

  /* ---------------- settings ---------------- */

  const defaults = { theme: 'blue', fs: 18, font: 'serif' };
  const settings = Object.assign({}, defaults, store.get('settings', {}));
  const sheet = $('.sheet'), scrim = $('.scrim');

  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.font;
    root.style.setProperty('--fs', settings.fs + 'px');
    $('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--bg').trim();
    $$('[data-set-theme]').forEach(b => b.classList.toggle('on', b.dataset.setTheme === settings.theme));
    $$('[data-set-font]').forEach(b => b.classList.toggle('on', b.dataset.setFont === settings.font));
    $('#fs').value = settings.fs;
    store.set('settings', settings);
  }

  const openSheet = () => { scrim.hidden = false; sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); };
  const closeSheet = () => { scrim.hidden = true; sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); };
  $('.aa').addEventListener('click', openSheet);
  scrim.addEventListener('click', closeSheet);
  $('.sheet-done').addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => {
    const t = e.target.closest('[data-set-theme]'); if (t) { settings.theme = t.dataset.setTheme; applySettings(); }
    const f = e.target.closest('[data-set-font]'); if (f) { settings.font = f.dataset.setFont; applySettings(); }
  });
  $('#fs').addEventListener('input', e => {
    // keep the reader anchored to the same spot while text reflows
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? scrollY / max : 0;
    settings.fs = +e.target.value; applySettings();
    if (current) window.scrollTo(0, pct * (document.documentElement.scrollHeight - innerHeight));
  });
  applySettings();

  /* ---------------- boot ---------------- */

  async function boot() {
    try {
      const res = await fetch('chapters/chapters.json', { cache: 'no-cache' });
      const data = await res.json();
      blog = Object.assign({ name: 'iamspeed', title: 'I am Speed', description: '', totalChapters: 0, avatar: 'avatar.png' }, data.blog);
      chapters = data.chapters
        .map(c => Object.assign({}, c, { id: String(c.id ?? c.number) }))
        .sort((a, b) => a.number - b.number);
      await Promise.all(chapters.map(async c => {
        const r = await fetch('chapters/' + c.file, { cache: 'no-cache' });
        bodies[c.id] = r.ok ? await r.text() : '*(this chapter file is missing)*';
      }));
    } catch (err) {
      app.innerHTML = `<p class="error">couldn't load the chapters 😭<br><small>${esc(err.message)}</small></p>`;
      return;
    }
    route();
    addEventListener('hashchange', route);
  }
  boot();
})();
