(() => {
  'use strict';
  const D = window.ClutchData;
  const app = document.querySelector('#app');
  const header = document.querySelector('#header');
  const nav = document.querySelector('#nav');
  const toast = document.querySelector('#toast');
  const storageKey = 'clutch.v1';
  const defaults = {region:'LATAM', format:'relative', contrast:false, favorites:[], recent:[]};
  let state = {...defaults};
  try { state = {...defaults, ...JSON.parse(localStorage.getItem(storageKey))}; } catch {}
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} };
  let searchRegion = state.region;
  let current;
  let renderToken = 0;
  let toastTimer;
  let lastRoute;
  const seen = new Set();
  const paths = {
    home:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7', search:'M16 16l5 5 M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
    star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
    settings:'M4 6h16M4 12h16M4 18h16 M8 3v6m8 0v6m-6 0v6', globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 4 5 14 0 18-5-4-5-14 0-18Z',
    back:'m14 5-7 7 7 7', next:'m9 5 7 7-7 7', down:'m6 9 6 6 6-6', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
    pulse:'M2 12h5l3-7 4 14 3-7h5', target:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 2v5m0 10v5M2 12h5m10 0h5',
    bolt:'m13 2-9 12h7l-1 8 10-12h-7z', crown:'m3 7 5 4 4-7 4 7 5-4-2 11H5z', close:'m6 6 12 12M6 18 18 6',
    refresh:'M20 10a8 8 0 1 0-1 8m1-14v6h-6', spike:'m12 2 7 8-7 12-7-12z M5 10h14', defuse:'m3 13 5 5L21 5',
    chart:'M3 3v18h18M6 15l5-5 4 2 5-6', trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'
  };
  const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  const num = (n, digits = 0) => n.toLocaleString('es-419', {minimumFractionDigits:digits, maximumFractionDigits:digits});
  const pct = n => num(n * 100, 1) + '%';
  const sign = n => n > 0 ? '+' + n : String(n).replace('-', '−');
  const label = p => `${esc(p.name)}<span class="tag">#${esc(p.tag)}</span>`;
  const playerLink = p => '#/player/' + esc(D.key(p));
  const isFavorite = id => state.favorites.some(x => x.toLowerCase() === id.toLowerCase());
  const dateFormat = new Intl.DateTimeFormat('es-419', {dateStyle:'medium', timeStyle:'short'});
  const relativeFormat = new Intl.RelativeTimeFormat('es-419', {numeric:'auto'});
  function when(date) {
    if (state.format === 'absolute') return dateFormat.format(date);
    const hours = Math.max(1, Math.floor((Date.now() - date) / 3600000));
    return hours < 24 ? relativeFormat.format(-hours, 'hour') : relativeFormat.format(-Math.floor(hours / 24), 'day');
  }
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('shown');
    toastTimer = setTimeout(() => toast.classList.remove('shown'), 2300);
  }
  const selectOptions = (options, selected) => options.map(([value, text]) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(text)}</option>`).join('');
  const regionOptions = selected => selectOptions(D.regions.map(r => [r,r]), selected);
  const heading = (title, subtitle, symbol) => `<div class="page-heading"><span class="eyebrow">${icon(symbol,16)} ${subtitle}</span><h1>${title}</h1></div>`;
  const sectionHead = (title, symbol, extra = '') => `<div class="section-head"><h2>${icon(symbol,18)} ${title}</h2>${extra}</div>`;
  const empty = (symbol, title, message) => `<div class="empty panel">${icon(symbol,27)}<strong>${title}</strong><p>${message}</p></div>`;
  const bar = (value, color = 'var(--green)', accessibleLabel = '') =>
    `<svg class="bar" viewBox="0 0 100 5" preserveAspectRatio="none" ${accessibleLabel ? `role="progressbar" aria-label="${accessibleLabel}" aria-valuenow="${value}"` : 'aria-hidden="true"'}><rect width="100" height="5" fill="var(--line)"/><path fill="${color}" d="M0 0H${value}L${Math.max(0,value-1.5)} 5H0Z"/></svg>`;
  const gemPaths = [
    'm15 18 9-6 9 6v12l-9 6-9-6z', 'm12 20 7 8 5-13 5 13 7-8-5 14h-14z',
    'm24 11 12 10-12 15-12-15z M12 21h24', 'm10 24 14-13 14 13-14 13z M16 24l8-7 8 7-8 7z',
    'm24 10 13 8-5 14-8 5-8-5-5-14z M11 18l13 8 13-8m-13 8v11',
    'm24 9 13 15-13 14-13-14z M24 9l5 15-5 14-5-14z',
    'm9 17 15 7 15-7-4 10-11 10-11-10z M17 15l7-6 7 6-7 5z',
    'm10 13 8 5 6-8 6 8 8-5-4 14-10 11-10-11z M18 18l6 12 6-12',
    'm24 7 5 10 11 7-11 5-5 11-5-11-11-5 11-7z M24 16l8 8-8 8-8-8z'
  ];
  function badge(rank, size = 44) {
    const tier = Math.floor(rank / 3);
    const division = tier === 8 ? 0 : rank % 3 + 1;
    return `<svg class="badge" style="--rank:${D.colors[tier]}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
      <path class="badge-shell" d="M12 2h24l10 10v24L34 46H12L2 36V12Z"/>
      <path class="badge-gem" d="${gemPaths[tier]}"/>
      ${Array.from({length:division}, (_, i) => `<path class="badge-pip" d="M${24 - division * 3 + i * 6} 41h4"/>`).join('')}</svg>`;
  }
  function chrome(route) {
    const deep = ['player','match'].includes(route.page);
    const titles = {player:'Perfil de jugador', match:'Detalle de partida'};
    const back = route.page === 'match' && route.id.includes('~') ? '#/player/' + esc(route.id.slice(0, route.id.lastIndexOf('~'))) : '#/home';
    header.innerHTML = `<div class="top-inner">${deep
      ? `<a class="icon-button back" data-back href="${back}" aria-label="Volver">${icon('back')}</a><span class="top-title">${titles[route.page]}</span>`
      : '<a class="brand" href="#/home"><img src="./icons/clutch.svg" width="32" height="32" alt=""><span>CLUTCH<span class="brand-dot">.</span></span></a>'}
      <span class="demo"><i></i> DEMO</span></div>`;
    const tabs = [['home','Inicio','home'],['search','Buscar','search'],['favorites','Favoritos','star'],['settings','Ajustes','settings']];
    const selected = deep ? route.page === 'player' && lastRoute?.page === 'search' ? 'search' : 'home' : route.page;
    nav.innerHTML = `<div class="nav-inner">${tabs.map(([id, text, symbol]) => `<a href="#/${id}"${id === selected ? ' aria-current="page"' : ''}>${icon(symbol,22)}<span>${text}</span></a>`).join('')}</div>`;
    document.documentElement.dataset.contrast = String(state.contrast);
  }
  function searchForm() {
    return `<form id="search-form" novalidate><label for="riot-id" class="sr">Nombre y tag</label>
      <div class="search-field">${icon('search',22)}<input id="riot-id" name="riot-id" placeholder="Nombre#TAG" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="48" aria-describedby="search-error"><button type="submit" aria-label="Buscar jugador">${icon('next',23)}</button></div>
      <p id="search-error" class="form-error" aria-live="polite" hidden></p></form>`;
  }
  function regionControl() {
    return `<label class="region">${icon('globe',16)}<span class="sr">Región de búsqueda</span><select data-search-region>${regionOptions(searchRegion)}</select>${icon('down',13)}</label>`;
  }
  function personRow(p, meta, extra = '') {
    return `<div class="person-row"><a href="${playerLink(p)}">${badge(p.rank)}<span class="person-name"><strong>${label(p)}</strong><small>${meta}</small></span>${!extra ? `<span class="row-next">${icon('next',17)}</span>` : ''}</a>${extra}</div>`;
  }
  const fromIds = ids => ids.map(id => D.decode(id)).filter(Boolean).map(D.profile);
  function browserView(home) {
    const recents = fromIds(state.recent);
    const featured = D.featured.map(D.profile);
    return `${home ? `<section class="hero"><svg class="hero-mark" viewBox="0 0 256 256" aria-hidden="true"><path d="M198 55H92L35 112v63l47 47h88l40-40h-49l-17 17H97l-33-32v-41l40-40h67z"/><path d="M211 81H111l-29 29v47l24 24h34l21-21h-45l-10-10v-26l18-18h62z"/></svg>
      <div class="hero-copy"><span class="eyebrow"><i></i> VALORANT TRACKER</span><h1>Tu juego.<br><em>En números.</em></h1><p>Tu rango, tus partidas y los detalles que definen tu juego.</p></div><div class="hero-bottom">${regionControl()}</div></section>`
      : `${heading('Buscar jugador','VALORANT TRACKER','search')}<div class="search-region-row"><span>Región de búsqueda</span>${regionControl()}</div>`}
      ${searchForm()}
      <section class="section">${sectionHead('Búsquedas recientes','clock')}${recents.length ? `<div class="stack">${recents.map(p => personRow(p, `${p.region} · ${D.rankName(p.rank)}`)).join('')}</div>` :
        '<div class="inline-empty">Tus búsquedas aparecerán aquí.</div>'}</section>
      ${home ? `<section class="section">${sectionHead('Favoritos','star', '<a class="text-link" href="#/favorites">Ver todos</a>')}
      ${state.favorites.length ? `<div class="stack">${fromIds(state.favorites.slice(0,3)).map(p => personRow(p, `${D.rankName(p.rank)} · ${p.rr} RR`)).join('')}</div>` : '<div class="inline-empty">Guarda jugadores desde su perfil para seguir su rango.</div>'}</section>
      <section class="section">${sectionHead('Destacados de la semana','bolt')}
      <div class="stack">${featured.map(p => personRow(p, `${D.rankName(p.rank)} · ${p.rr} RR`)).join('')}</div></section>` : ''}
      <footer class="footnote">CLUTCH <span> / </span> DATOS DE DEMOSTRACIÓN</footer>`;
  }
  function favoritesView() {
    const players = fromIds(state.favorites);
    return heading('Favoritos','SEGUIMIENTO','star') + (players.length ? `<div class="stack">${players.map(p => personRow(p, `${D.rankName(p.rank)} · <b>${p.rr} RR</b> · ${p.region}`,
      `<button class="icon-button favorite" data-fav="${esc(p.id)}" aria-label="Quitar de favoritos: ${esc(p.name)}">${icon('star')}</button>`)).join('')}</div>` :
      empty('star','Aún no tienes favoritos','Abre un perfil y toca la estrella para guardarlo.') + '<a class="primary wide" href="#/search">Buscar jugador</a>');
  }
  function settingsView() {
    return `${heading('Ajustes','PREFERENCIAS','settings')}
    <section class="panel settings">
      <label><span><strong>Región por defecto</strong><small>Se usa al iniciar una búsqueda.</small></span><select data-setting="region">${regionOptions(state.region)}</select></label>
      <label><span><strong>Formato de fecha</strong><small>En el historial de partidas.</small></span><select data-setting="format">${selectOptions([['relative','Relativo'],['absolute','Fecha y hora']], state.format)}</select></label>
      <label><span><strong>Tema</strong><small>Contraste de la interfaz.</small></span><select data-setting="contrast">${selectOptions([['false','Oscuro'],['true','Alto contraste']], String(state.contrast))}</select></label>
      <div><span><strong>Historial de búsqueda</strong><small>${state.recent.length} jugadores recientes</small></span><button class="icon-button" data-clear aria-label="Borrar historial" ${state.recent.length ? '' : 'disabled'}>${icon('trash')}</button></div>
    </section><section class="section">${sectionHead('Acerca de','pulse','<span class="micro">V1.0.0</span>')}
    <div class="panel legal"><p><strong>Datos de demostración: los jugadores y partidas son ficticios</strong></p><p>CLUTCH no está respaldada por Riot Games y no refleja las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o registradas de Riot Games, Inc.</p></div></section>`;
  }
  const profileTabs = [['overview','Resumen'],['matches','Partidas'],['agents','Agentes'],['maps','Mapas'],['weapons','Armas'],['seasons','Temporadas']];
  function profileView(p, tab, mode) {
    const favorite = isFavorite(p.id);
    return `<div class="pull-indicator" aria-hidden="true">${icon('refresh',18)} Actualizando perfil</div>
    <section class="profile-hero panel">
      <div class="profile-id"><div><span class="eyebrow">${p.region} <b>·</b> NIVEL ${p.level}</span><h1>${label(p)}</h1></div>
      <button class="icon-button ${favorite ? 'favorite' : ''}" data-fav="${esc(p.id)}" aria-pressed="${favorite}" aria-label="Favorito">${icon('star',22)}</button></div>
      <div class="rank-row">${badge(p.rank,64)}<div class="rank-info"><span class="micro">Rango actual</span><strong>${D.rankName(p.rank)}</strong><div class="rr">${bar(p.rr,'var(--coral)','RR')}<b>${p.rr} RR</b></div></div></div>
      <div class="peak">${icon('crown',16)} Pico de rango <b>${D.rankName(p.peak)}</b></div>
    </section>
    <nav class="profile-tabs" aria-label="Secciones del perfil">${profileTabs.map(([id, title]) => `<a ${id === tab ? 'aria-current="page"' : ''} href="#/player/${esc(p.id)}${id === 'overview' ? '' : '/' + id}">${title}</a>`).join('')}</nav>
    ${tab === 'matches' ? matchesView(p, mode) : tab === 'overview' ? overview(p) : statsView(p, tab)}`;
  }
  function chart(p) {
    const data = p.matches.slice(0,20).reverse();
    const values = data.map(m => m.rating);
    const low = Math.floor(Math.min(...values) / 50) * 50 - 20;
    const high = Math.ceil(Math.max(...values) / 50) * 50 + 20;
    const coords = values.map((v, i) => [51 + i * 14, 111 - (v - low) / (high - low) * 92]);
    const points = coords.map(pair => pair.join(',')).join(' ');
    const last = coords.at(-1);
    const change = data.at(-1).rating - (data[0].rating - data[0].delta);
    const axis = [high, (high + low) / 2, low].map((v,i) => `<path class="gridline" d="M49 ${19 + i * 46}h268"/><text x="43" y="${23 + i * 46}" text-anchor="end">${Math.round(v)}</text>`).join('');
    return `<section class="section">${sectionHead('Evolución de RR','chart', `<b class="${change >= 0 ? 'win' : 'loss'}">${sign(change)} RR</b>`)}
    <div class="panel chart"><span class="micro">Últimas 20 partidas · RR acumulado</span>
    <svg viewBox="0 0 328 139" role="img" aria-label="Evolución de RR acumulado de ${values[0]} a ${values.at(-1)}">
      <defs><linearGradient id="rr-fill" x2="0" y2="1"><stop stop-color="#3ee6c1" stop-opacity=".26"/><stop offset="1" stop-color="#3ee6c1" stop-opacity="0"/></linearGradient></defs>
      ${axis}<polygon points="51,111 ${points} 317,111" fill="url(#rr-fill)"/>
      <polyline points="${points}" fill="none" stroke="var(--green)" stroke-width="2"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--green)"/>
      <text x="51" y="132">Partida 1</text><text x="317" y="132" text-anchor="end">Partida 20</text>
    </svg></div></section>`;
  }
  function overview(p) {
    const s = D.summary(p.matches);
    const total = s.hits.reduce((a,b) => a+b, 0);
    const metrics = [['K/D',num(s.kd,2)],['KDA',num(s.kda,2)],['HS%',pct(s.hs)],['Win rate',pct(s.wr)],['ADR',num(s.adr)],['ACS',num(s.acs)]];
    return `<section>${sectionHead('Rendimiento','pulse','<span class="micro">40 partidas</span>')}
    <div class="metrics">${metrics.map(([title,value], i) => `<div class="metric panel"><span class="micro">${title}</span>${i === 3 ? `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14"/><circle cx="18" cy="18" r="14" pathLength="100" stroke-dasharray="${s.wr * 100} 100"/></svg>` : ''}<strong class="${i === 3 ? 'win' : ''}">${value}</strong></div>`).join('')}</div>
    <div class="events panel">${[['clutches','Clutches','target'],['aces','Aces','crown'],['first','First bloods','bolt']].map(([key,title,symbol]) => `<div>${icon(symbol,16)}<strong>${s[key]}</strong><small>${title}</small></div>`).join('')}</div></section>
    ${chart(p)}
    <section class="section">${sectionHead('Distribución de disparos','target')}<div class="panel shots">
    <svg viewBox="0 0 100 150" role="img" aria-label="Silueta de cabeza, cuerpo y piernas"><path fill="var(--coral)" d="M40 8h20l9 10v11L57 42H43L31 29V18Z"/><path fill="var(--green)" d="M27 45h46l13 14 10 39-11 4-14-33V99H29V69l-14 33-11-4 10-39Z"/><path fill="var(--muted)" d="M29 103h42l-3 40H53l-3-27-3 27H32Z"/></svg>
    <div>${['Cabeza','Cuerpo','Piernas'].map((title,i) => `<div class="shot"><div><span>${title}</span><strong>${pct(s.hits[i] / total)}</strong></div>${bar(100 * s.hits[i] / total,['var(--coral)','var(--green)','var(--muted)'][i])}</div>`).join('')}</div></div></section>`;
  }
  function matchesView(p, mode) {
    const list = p.matches.filter(m => m.mode === mode || !mode);
    return `<div class="section-head match-filter"><h2>${icon('target',18)} Historial</h2><label><span class="sr">Modo de juego</span><select data-mode>${selectOptions([['','Todos los modos'],...D.modes.map(v => [v,v])],mode)}</select></label></div>
    <div class="stack">${list.map(m => {
      const x = m.players[0];
      const flag = m.win ? 'win' : 'loss';
      return `<a class="match-card panel ${flag}" href="#/match/${esc(m.id)}">
      <div class="match-main"><span class="match-mode">${m.mode}</span><strong>${m.map} <small>· ${x.agent}</small></strong><small>${when(m.date)}</small></div>
      <div class="match-score"><span class="micro">${m.win ? 'Victoria' : 'Derrota'}</span><strong>${m.scores.join(' : ')}</strong>${m.delta ? `<small>${sign(m.delta)} RR</small>` : ''}</div>
      <div class="match-kda"><b>${x.k}/${x.d}/${x.a}</b><small>${x.acs} ACS</small></div>${icon('next',15)}</a>`;
    }).join('')}</div>`;
  }
  function statsView(p, tab) {
    if (tab === 'seasons') {
      const competitive = p.matches.filter(m => m.mode === D.modes[0]);
      const offsets = [6,13,20];
      return sectionHead('Rango por acto','crown','<span class="micro">Historial demo</span>') + `<div class="stack">${offsets.map((offset, i) => {
        const rank = Math.floor(competitive[offset].rating / 100);
        return `<div class="stat-row panel">${badge(rank)}<div><strong>Episodio 9 · Acto ${3-i}</strong><small>Rango final</small></div><b>${D.rankName(rank)}</b></div>`;
      }).join('')}</div>`;
    }
    if (tab === 'weapons') {
      const records = D.weapons.map(name => {
        const entries = p.matches.map(m => m.players[0].weaponStats[name]).filter(Boolean);
        const measure = field => entries.reduce((total, entry) => total + entry[field], 0);
        return {name, count:measure('kills'), hs:measure('head') / Math.max(1, measure('hits'))};
      }).sort((a,b) => b.count-a.count);
      return sectionHead('Armas por bajas','target') + `<div class="stack">${records.map(w => `<div class="panel breakdown"><div><strong>${w.name}</strong><b>${w.count} bajas</b></div>${bar(100*w.count / records[0].count)}<small>${pct(w.hs)} HS</small></div>`).join('')}</div>`;
    }
    const isAgent = tab === 'agents';
    const groups = new Map();
    for (const match of p.matches) {
      const name = isAgent ? match.players[0].agent : match.map;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(match);
    }
    const rows = [...groups].map(([name,list]) => ({name, list, s:D.summary(list)}))
      .sort((a,b) => isAgent ? b.list.length-a.list.length : b.s.wr-a.s.wr);
    return sectionHead(isAgent ? 'Top agentes' : 'Win rate por mapa', isAgent ? 'target' : 'chart') + `<div class="stack">${rows.map(({name,list,s},i) =>
      `<div class="panel breakdown"><div><strong>${name}</strong><b class="win">${pct(s.wr)} WR</b></div>
      ${bar(s.wr*100)}<small>${isAgent ? D.agents[name] + ' · ' : ''}${list.length} partidas${isAgent ? ` · ${num(s.kda,2)} KDA · ${num(s.acs)} ACS` : i === 0 ? ' · Mejor mapa' : i === rows.length - 1 ? ' · Peor mapa' : ''}</small></div>`).join('')}</div>`;
  }
  function matchView(m) {
    const deathmatch = m.mode === 'Deathmatch';
    const best = [...m.players].sort((a,b) => deathmatch ? b.k-a.k : b.score-a.score)[0];
    const teams = deathmatch ? [m.players] : [0,1].map(team => m.players.filter(p => p.team === team));
    return `<section class="panel scoreboard">
    <span class="eyebrow">${m.mode} <b>·</b> ${Math.floor(m.duration/60)}:${String(m.duration%60).padStart(2,'0')} MIN</span><h1>${m.map}</h1>
    <div class="big-score"><span><small>${deathmatch ? 'Tus bajas' : 'Inicia ataque'}</small><strong class="${m.win ? 'win' : 'loss'}">${m.scores[0]}</strong></span><b>:</b><span><small>${deathmatch ? 'Mejor rival' : 'Inicia defensa'}</small><strong class="${m.win ? 'loss' : 'win'}">${m.scores[1]}</strong></span></div>
    <div class="score-date">${icon('clock',15)} ${dateFormat.format(m.date)}</div></section>
    ${teams.map((players,i) => {
      const sorted = [...players].sort((a,b) => deathmatch ? b.k-a.k || b.score-a.score : b.score-a.score);
      return `<section class="section">${sectionHead(deathmatch ? 'Jugadores' : i ? 'Equipo defensor' : 'Equipo atacante','target')}
      <div class="panel roster"><table><thead><tr><th scope="col">Jugador</th><th scope="col">ACS</th><th scope="col">K/D/A</th><th scope="col">ADR</th><th scope="col">HS%</th><th scope="col"><abbr title="First bloods">FB</abbr></th></tr></thead><tbody>
      ${sorted.map((x, position) => `<tr class="${x === best || (!deathmatch && position === 0) ? 'mvp-row' : ''}"><th scope="row"><a href="${playerLink(x)}">${badge(x.rank,23)}<span><strong>${esc(x.name)}</strong><small>${x.agent} · ${D.rankName(x.rank)}</small>${x === best || (!deathmatch && position === 0) ? `<em>${x === best ? 'MVP partida' : 'MVP equipo'}</em>` : ''}</span></a></th>
      <td>${x.acs}</td><td>${x.k}/${x.d}/${x.a}</td><td>${x.adr}</td><td>${num(x.hs*100)}%</td><td>${x.first}</td></tr>`).join('')}</tbody></table></div></section>`;
    }).join('')}
    ${deathmatch ? empty('target','Deathmatch individual','El marcador compara las bajas del jugador con las del mejor rival.') :
      `<section class="section">${sectionHead('Rondas y economía','pulse','<span class="micro">Créditos iniciales</span>')}
      <div class="panel timeline"><div class="round-grid">${m.rounds.map((r,i) => `<button data-round="${i}" class="${r.winner === 0 ? 'win' : 'loss'}" aria-pressed="${i === 0}" aria-label="Ronda ${i+1}, ${r.winner === 0 ? 'victoria' : 'derrota'}, ${D.roundTypes[r.type]}">${icon(['target','spike','defuse','clock'][r.type],16)}<span>${i+1}</span></button>`).join('')}</div>
      <div id="round-detail" aria-live="polite">${roundView(m.rounds[0],0)}</div></div></section>`}`;
  }
  function roundView(r,i) {
    return `<div class="round-heading"><strong>Ronda ${i+1} · ${D.roundTypes[r.type]}</strong><b class="${r.winner === 0 ? 'win' : 'loss'}">${r.winner === 0 ? 'Victoria' : 'Derrota'}</b></div>
    <div class="economy">${r.economy.map((money, team) => `<div><small>Equipo ${team === 0 ? 'aliado' : 'rival'} · ${team === r.attack ? 'Ataque' : 'Defensa'}</small><b>${num(money)} cr.</b>${bar(money/260,team ? 'var(--coral)' : 'var(--green)')}</div>`).join('')}</div>`;
  }
  function parseRoute() {
    const [page = 'home', id = '', sub = '', mode = ''] = location.hash.slice(2).split('/');
    const format = D.modes.find(m => m.toLowerCase().replace(/ /g, '-') === mode) || '';
    return {page, id, sub:profileTabs.some(([key]) => key === sub) ? sub : 'overview', mode:format};
  }
  function findMatch(id) {
    const match = /^(.*)~(\d{1,2})$/.exec(id);
    const identity = match && D.decode(match[1]);
    return identity ? D.profile(identity).matches[Number(match[2])] : null;
  }
  function errorView(player) {
    return heading(player ? 'Jugador no encontrado' : 'Pantalla no encontrada','ERROR','search') +
      empty('search','Revisa el enlace','Puedes buscar un jugador con el formato Nombre#TAG.') + '<a class="primary wide" href="#/search">Buscar jugador</a>';
  }
  function setContent(content) { app.innerHTML = `<div class="view">${content}</div>`; }
  function render(route) {
    switch (route.page) {
      case 'home': return browserView(true);
      case 'search': return browserView(false);
      case 'favorites': return favoritesView();
      case 'settings': return settingsView();
      case 'player': {
        const person = D.decode(route.id, state.region);
        return person ? profileView(D.profile(person), route.sub, route.mode) : errorView(true);
      }
      case 'match': {
        route.match = findMatch(route.id);
        return route.match ? matchView(route.match) : errorView(false);
      }
      default: return errorView(false);
    }
  }
  function navigate({refresh = false} = {}) {
    const route = parseRoute();
    const token = ++renderToken;
    if (!refresh) lastRoute = current;
    current = route;
    chrome(route);
    if (!refresh) {
      window.scrollTo(0, 0);
      app.focus({preventScroll:true});
    }
    const key = `${route.page}/${route.id.toLowerCase()}`;
    const delay = refresh || (['player','match'].includes(route.page) && !seen.has(key));
    app.setAttribute('aria-busy', String(delay));
    if (delay) {
      setContent(`<div class="skeleton" role="status"><span class="sr">${refresh ? 'Actualizando perfil' : 'Cargando datos demo'}</span><i></i><i></i><i></i><i></i></div>`);
      setTimeout(finish, 400);
    } else finish();
    function finish() {
      if (token !== renderToken) return;
      seen.add(key);
      setContent(render(route));
      app.setAttribute('aria-busy','false');
      if (refresh) notify('Perfil actualizado');
    }
  }
  window.addEventListener('hashchange', () => navigate());
  document.addEventListener('submit', event => {
    if (event.target.id !== 'search-form') return;
    event.preventDefault();
    const field = document.querySelector('#riot-id');
    const error = document.querySelector('#search-error');
    const match = /^([^#\p{C}]{3,32})#([\p{L}\p{N}]{2,8})$/u.exec(field.value.trim());
    if (!match || match[1] !== match[1].trim()) {
      error.textContent = 'Usa Nombre#TAG, con 3–32 caracteres para el nombre y 2–8 letras o números para el tag.';
      error.hidden = false;
      field.setAttribute('aria-invalid','true');
      field.focus();
      return;
    }
    const p = D.profile({name:match[1],tag:match[2],region:searchRegion});
    state.recent = [p.id, ...state.recent.filter(id => id.toLowerCase() !== p.id.toLowerCase())].slice(0, 5);
    save();
    location.hash = '/player/' + p.id;
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'riot-id') return;
    event.target.removeAttribute('aria-invalid');
    document.querySelector('#search-error').hidden = true;
  });
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-fav],[data-back],[data-clear],[data-round]');
    if (!control) return;
    if (control.hasAttribute('data-back')) {
      if (lastRoute) {
        event.preventDefault();
        history.back();
      }
    } else if (control.dataset.fav) {
      const id = control.dataset.fav;
      const exists = isFavorite(id);
      state.favorites = exists ? state.favorites.filter(v => v.toLowerCase() !== id.toLowerCase()) : [id,...state.favorites];
      save();
      if (current.page === 'favorites') {
        setContent(favoritesView());
        app.focus({preventScroll:true});
      } else {
        control.classList.toggle('favorite', !exists);
        control.setAttribute('aria-pressed', String(!exists));
      }
      notify(exists ? 'Eliminado de favoritos' : 'Agregado a favoritos');
    } else if (control.hasAttribute('data-clear')) {
      state.recent = [];
      save();
      setContent(settingsView());
      notify('Historial borrado');
    } else if (current.match) {
      document.querySelector('[data-round][aria-pressed="true"]')?.setAttribute('aria-pressed','false');
      control.setAttribute('aria-pressed','true');
      const i = Number(control.dataset.round);
      document.querySelector('#round-detail').innerHTML = roundView(current.match.rounds[i], i);
    }
  });
  document.addEventListener('change', event => {
    const field = event.target;
    if (field.hasAttribute('data-search-region')) searchRegion = field.value;
    if (field.dataset.setting) {
      state[field.dataset.setting] = field.dataset.setting === 'contrast' ? field.value === 'true' : field.value;
      if (field.dataset.setting === 'region') searchRegion = state.region;
      save();
      document.documentElement.dataset.contrast = String(state.contrast);
      notify('Preferencia guardada');
    }
    if (field.hasAttribute('data-mode')) {
      const suffix = field.value ? '/' + field.value.toLowerCase().replace(/ /g, '-') : '';
      location.hash = '/player/' + current.id + '/matches' + suffix;
    }
  });
  let touch;
  app.addEventListener('touchstart', event => {
    touch = current.page === 'player' && window.scrollY <= 0 && event.touches.length === 1 ?
      [event.touches[0].clientX,event.touches[0].clientY] : null;
  }, {passive:true});
  app.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) return;
    const point = event.touches[0];
    const distance = point.clientY - touch[1];
    if (Math.abs(point.clientX - touch[0]) > 40 || distance < -10) touch = null;
    app.classList.toggle('pull-ready', Boolean(touch && distance > 65));
  }, {passive:true});
  app.addEventListener('touchcancel', () => { touch = null; app.classList.remove('pull-ready'); });
  app.addEventListener('touchend', () => {
    const ready = touch && app.classList.contains('pull-ready');
    touch = null;
    app.classList.remove('pull-ready');
    if (ready) navigate({refresh:true});
  }, {passive:true});
  if (!location.hash) history.replaceState(null,'','#/home');
  navigate();
})();
