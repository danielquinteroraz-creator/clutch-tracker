(() => {
  'use strict';
  const regions = ['LATAM', 'NA', 'BR', 'EU', 'AP', 'KR'];
  const agents = Object.fromEntries(Object.entries({
    Duelista: 'Jett,Raze,Reyna,Phoenix,Neon,Yoru,Iso,Waylay',
    Iniciador: 'Sova,Breach,Skye,KAY/O,Fade,Gekko,Tejo',
    Controlador: 'Omen,Brimstone,Viper,Astra,Harbor,Clove',
    Centinela: 'Killjoy,Cypher,Sage,Chamber,Deadlock,Vyse'
  }).flatMap(([rol, names]) => names.split(',').map(name => [name, rol])));
  const maps = 'Ascent Bind Haven Split Lotus Sunset Icebox Breeze Pearl Fracture Abyss'.split(' ');
  const weapons = 'Vandal,Phantom,Operator,Sheriff,Ghost,Spectre,Guardian,Marshal,Judge,Odin,Classic,Outlaw,Stinger,Bulldog,Shorty,Frenzy,Bucky,Ares'.split(',');
  const weaponPool = [...weapons, ...Array(12).fill('Vandal'), ...Array(8).fill('Phantom'),
    ...Array(3).fill('Ghost'), ...Array(3).fill('Sheriff'), ...Array(2).fill('Spectre'), ...Array(2).fill('Operator')];
  const modes = ['Competitivo', 'No clasificatorio', 'Deathmatch', 'Spike Rush'];
  const tiers = ['Hierro','Bronce','Plata','Oro','Platino','Diamante','Ascendente','Inmortal','Radiante'];
  const colors = ['#a6aeb9','#d29a75','#c3d3e3','#f5b841','#64e1d4','#bc9fff','#6bdfa0','#ff738f','#ffe6a7'];
  const rankName = rank => tiers[Math.floor(rank / 3)] + (rank < 24 ? ' ' + (rank % 3 + 1) : '');
  const featured = [
    { name:'UmbraByte', tag:'404', region:'LATAM', rank:20, rr:74, level:218, agent:'Omen', edge:.20 },
    { name:'PixelFeral', tag:'FANG', region:'LATAM', rank:17, rr:62, level:153, agent:'Raze', edge:.13 },
    { name:'NieblaCero', tag:'VOID', region:'LATAM', rank:22, rr:38, level:304, agent:'Cypher', edge:.17 }
  ];
  const hash = str => {
    let h = 2166136261;
    for (const ch of str.toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    return h >>> 0;
  };
  const rng = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ seed >>> 15, seed | 1);
    x ^= x + Math.imul(x ^ x >>> 7, x | 61);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, list) => list[int(r, 0, list.length - 1)];
  const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0);
  const key = ({name, tag, region}) => [name, tag, region].map(v => encodeURIComponent(v).replace(/-/g, '%2D')).join('-');
  const decode = (id, defaultRegion) => {
    try {
      const [name, tag, region = defaultRegion, extra] = id.split('-').map(decodeURIComponent);
      return name && tag && !extra && regions.includes(region) ? {name, tag, region} : null;
    } catch { return null; }
  };
  const cache = new Map();
  const roundTypes = ['Eliminación', 'Spike detonada', 'Spike desactivada', 'Tiempo'];
  const callSigns = ['VectorLunar','EcoGris','FiloNorte','NodoCobalto','BrumaRX','DeltaMuda','PulsoNulo','LinceSolar','OxidoZen'];
  const agentNames = Object.keys(agents);
  const anchor = Date.now();

  function buildMatch(player, index, map, mode, agent, win, r) {
    const deathmatch = mode === modes[2];
    const target = mode === modes[3] ? 4 : 13;
    const loser = int(r, mode === modes[3] ? 0 : 4, target - 1);
    const scores = win ? [target, loser] : [loser, target];
    const rounds = [];
    const sides = [0, 1];
    if (!deathmatch) {
      const left = [...scores];
      for (let i = 0; i < target + loser; i++) {
        const winner = i === target + loser - 1 ? Number(!win) :
          Number(r() >= (left[0] - Number(win)) / (left[0] + left[1] - 1));
        left[winner]--;
        const attack = i < (target === 4 ? 3 : 12) ? 0 : 1;
        const type = pick(r, winner === attack ? [0,0,1] : [0,0,2,3]);
        const halfStart = i === 0 || i === (target === 4 ? 3 : 12);
        const economy = sides.map(team => halfStart ? 4000 : int(r, 9, rounds[i - 1].winner === team ? 51 : 39) * 500);
        rounds.push({ winner, type, attack, economy });
      }
    }
    const units = rounds.length || 20;
    const players = Array.from({ length: 10 }, (_, i) => {
      const team = Number(i >= 5);
      return {
        ...(i === 0 ? player : {name:callSigns[i - 1], tag:`D${(hash(key(player)) + index * 17 + i) % 900 + 100}`, region:player.region}),
        team, agent:i === 0 ? agent : pick(r, agentNames.filter(name => name !== agent)),
        rank: i === 0 ? player.rank : Math.max(0, Math.min(24, player.rank + int(r, -3, 3))),
        k:0, d:0, a:0, damage:0, first:0, clutches:0, aces:0, hits:[0,0,0], weaponStats:{}, score:0,
        skill:i === 0 ? 1.08 + player.edge : .72 + r() * .62
      };
    });
    function weighted(pool) {
      let selection = r() * sum(pool, p => p.skill);
      return pool.find(p => (selection -= p.skill) < 0) || pool[pool.length - 1];
    }
    function duel(killer, victim, first) {
      const weapon = pick(r, weaponPool);
      const head = r() < .19 + killer.skill * .072;
      const body = head ? int(r, 0, 1) : int(r, 2, 4);
      const legs = Number(r() < .20);
      killer.k++;
      victim.d++;
      killer.first += Number(first);
      killer.hits[0] += Number(head);
      killer.hits[1] += body;
      killer.hits[2] += legs;
      const damage = int(r, 108, 158);
      killer.damage += damage;
      killer.score += damage + (first ? 150 : 105);
      const stats = killer.weaponStats[weapon] ||= {kills:0, head:0, hits:0};
      stats.kills++;
      stats.head += Number(head);
      stats.hits += Number(head) + body + legs;
    }
    if (deathmatch) {
      let leader;
      while (!leader) {
        const eligible = players.filter(p => p.k < 39 || (win ? p === players[0] : p !== players[0]));
        const killer = weighted(eligible);
        duel(killer, pick(r, players.filter(p => p !== killer)), false);
        if (killer.k === 40) leader = killer;
      }
      scores.splice(0, 2, players[0].k, Math.max(...players.slice(1).map(p => p.k)));
    } else {
      for (const round of rounds) {
        const alive = sides.map(team => players.filter(p => p.team === team));
        const winner = round.winner;
        const losingDeaths = round.type === 0 ? 5 : int(r, 1, 4);
        const winningDeaths = int(r, 0, 4);
        const kills = new Map();
        let first = true;
        for (let i = 0; i < losingDeaths + winningDeaths; i++) {
          const leftLosers = alive[1 - winner].length - (5 - losingDeaths);
          const leftWinners = alive[winner].length - (5 - winningDeaths);
          const team = leftLosers && (!leftWinners || (leftLosers === 1 && round.type === 0 ? false : r() < leftLosers / (leftLosers + leftWinners))) ? winner : 1 - winner;
          const killer = weighted(alive[team]);
          const victims = alive[1 - team];
          const victim = victims.splice(int(r, 0, victims.length - 1), 1)[0];
          duel(killer, victim, first);
          first = false;
          kills.set(killer, (kills.get(killer) || 0) + 1);
          const mates = alive[team].filter(p => p !== killer);
          if (mates.length && r() < .37) {
            const assist = pick(r, mates);
            const damage = int(r, 24, 79);
            assist.a++;
            assist.hits[1]++;
            assist.damage += damage;
            assist.score += damage;
          }
        }
        for (const [p, count] of kills) {
          p.aces += Number(count === 5);
          p.clutches += Number(p.team === winner && alive[winner].length === 1 && alive[winner][0] === p && count >= 2);
        }
      }
    }
    players.forEach(p => {
      p.acs = Math.round(p.score / units);
      p.adr = Math.round(p.damage / units);
      p.hs = p.hits[0] / Math.max(1, sum(p.hits, n => n));
    });
    const delta = mode === modes[0] ? int(r, 15, 26) * (win ? 1 : -1) : 0;
    const date = anchor - (index * 11 + 2) * 3600000 - int(r, 0, 45) * 60000;
    return { id:`${key(player)}~${index}`, date, map, mode, win, scores, players, rounds, units, delta,
      duration:deathmatch ? int(r, 360, 555) : units * int(r, 68, 106) };
  }

  function profile(identity) {
    const id = key(identity);
    const cacheKey = id.toLowerCase();
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const preset = featured.find(p => key(p).toLowerCase() === cacheKey);
    const r = rng(hash(id));
    const player = preset || {...identity, rank:int(r, 2, 23), rr:int(r, 20, 91), level:int(r, 38, 350), agent:pick(r, agentNames), edge:r() * .27};
    const pool = [...new Set([player.agent, pick(r, agentNames), pick(r, agentNames), pick(r, agentNames), pick(r, agentNames)])];
    const matches = Array.from({length:40}, (_, i) => {
      const mode = i % 5 < 3 ? modes[0] : modes[1 + (Math.floor(i / 5) + i % 5) % 3];
      const winChance = mode === modes[2] ? .13 + player.edge / 2 : .46 + player.edge;
      return buildMatch(player, i, maps[(i + int(r, 0, 4)) % maps.length], mode,
        r() < .43 ? player.agent : pick(r, pool), r() < winChance, r);
    });
    let rating = player.rank * 100 + player.rr;
    for (const match of matches) {
      const older = Math.max(0, Math.min(2499, rating - match.delta));
      match.rating = rating;
      match.delta = rating - older;
      match.players[0].rank = Math.floor(older / 100);
      rating = older;
    }
    const peak = Math.floor(Math.max(...matches.map(m => m.rating), rating) / 100);
    const result = {...player, peak, id:key(player), matches};
    cache.set(cacheKey, result);
    return result;
  }
  function summary(matches) {
    const get = prop => sum(matches, m => m.players[0][prop]);
    const hits = [0,1,2].map(i => sum(matches, m => m.players[0].hits[i]));
    const d = Math.max(1, get('d'));
    const units = Math.max(1, sum(matches, m => m.units));
    return { kd:get('k') / d, kda:(get('k') + get('a')) / d, hits, hs:hits[0] / Math.max(1, sum(hits, x => x)),
      wr:sum(matches, m => Number(m.win)) / Math.max(1, matches.length),
      acs:get('score') / units, adr:get('damage') / units, first:get('first'), clutches:get('clutches'), aces:get('aces') };
  }
  window.ClutchData = {regions, agents, maps, weapons, modes, tiers, colors, rankName, featured, key, decode, profile, summary, roundTypes};
})();
