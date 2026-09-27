// Volg je kleur — mockup (F2 van het project gidsrobot).
//
// Een verzonnen museum: entreehal, een lange gang, vijf zalen. Een bezoeker kiest op het scherm
// in de hal een zaal, krijgt een eigen kleur en symbool, en de route licht op in die kleur:
//   A  golvend lichtspoor over de hele route
//   B  een Pi-scherm met pijl op elk kruispunt
//   C  de schermen van B plus golvend licht bij de hal en bij de zaaldeur
// De droomknop voegt een blimp in jouw kleur toe en het verhaal bij het stuk.
//
// Voor de toets (scripts/mockup-toets.mjs) en de video (scripts/maak-video.mjs) staat alles wat
// ze nodig hebben op window.mockup; het WebGL-beeld blijft leesbaar (preserveDrawingBuffer).

import * as THREE from 'three';

// ---------------------------------------------------------------- gegevens

const KLEUREN = [
  { naam: 'blauw', hex: '#2f6bff', symbool: 'driehoek' },
  { naam: 'oranje', hex: '#ff8a00', symbool: 'rondje' },
  { naam: 'groen', hex: '#1fbf5b', symbool: 'vierkant' },
  { naam: 'paars', hex: '#9b4dff', symbool: 'ruit' },
  { naam: 'roze', hex: '#ff3d8b', symbool: 'ster' },
  { naam: 'geel', hex: '#ffd400', symbool: 'plus' },
  { naam: 'turquoise', hex: '#00c2d1', symbool: 'hart' },
];

const ZALEN = [
  { id: 1, naam: 'De Gouden Eeuw', stuk: 'Portret van een vrouw met parels',
    verhaal: 'Niemand weet wie zij is. De schilder gaf haar parels die ze zich nooit had kunnen veroorloven — kijk maar naar de gerafelde kraag.' },
  { id: 2, naam: 'Zee en Schepen', stuk: 'Scheepsmodel De Hoop, 1731',
    verhaal: 'Dit model werd gebouwd vóór het echte schip. Als het de reders niet beviel, werd het schip nooit gebouwd.' },
  { id: 3, naam: 'Licht en Glas', stuk: 'Blauwe kom uit Murano',
    verhaal: 'Het blauw komt van kobalt, toen duurder dan goud. De blazer had één adem om de kom rond te krijgen.' },
  { id: 4, naam: 'Moderne Tijd', stuk: 'Compositie met drie lijnen',
    verhaal: 'De kunstenaar hing dit werk eerst op zijn kop. Pas twintig jaar later draaide een conservator het om.' },
  { id: 5, naam: 'De Schatkamer', stuk: 'Zilveren bruiloftsschaal, 1652',
    verhaal: 'Gemaakt voor een bruiloft die nooit doorging. De schaal bleef driehonderd jaar in de familie, ongebruikt.' },
];

const VARIANT_UITLEG = {
  A: 'A — golvend lichtspoor over de hele route',
  B: 'B — een Pi-scherm met pijl op elk kruispunt',
  C: 'C — schermen op de kruispunten, plus licht bij de hal en de zaaldeur',
};

// Plattegrond (meters). x naar rechts, z naar het noorden.
const WANDHOOGTE = 3.2;
const LOOPTEMPO = 1.4; // m/s
const GOLF = { snelheid: 3.2, lengte: 6, kern: 1.8, rand: 0.8 };

// Segmenten van het lichtspoor; een route is een rij segmenten. 'soort' bepaalt variant C.
const SEGMENTEN = {
  hal: { soort: 'hal', punten: [[-3, -4.2], [0, -1], [0, 6]] },
  gang1: { soort: 'gang', punten: [[0, 6], [0, 17]] },
  gang2: { soort: 'gang', punten: [[0, 17], [0, 33]] },
  gang3: { soort: 'gang', punten: [[0, 33], [0, 46]] },
  deur1: { soort: 'deur', punten: [[0, 17], [-2, 17], [-6.8, 17]] },
  deur2: { soort: 'deur', punten: [[0, 17], [2, 17], [6.8, 17]] },
  deur3: { soort: 'deur', punten: [[0, 33], [-2, 33], [-6.8, 33]] },
  deur4: { soort: 'deur', punten: [[0, 33], [2, 33], [6.8, 33]] },
  deur5: { soort: 'deur', punten: [[0, 46], [0, 50.8]] },
};
const ROUTES = {
  1: ['hal', 'gang1', 'deur1'],
  2: ['hal', 'gang1', 'deur2'],
  3: ['hal', 'gang1', 'gang2', 'deur3'],
  4: ['hal', 'gang1', 'gang2', 'deur4'],
  5: ['hal', 'gang1', 'gang2', 'gang3', 'deur5'],
};
const STUK = { 1: [-7.6, 17], 2: [7.6, 17], 3: [-7.6, 33], 4: [7.6, 33], 5: [0, 51.6] };

// Kruispunten met een Pi-scherm: plek, en welke pijl elke zaal daar krijgt.
const KRUISPUNTEN = [
  { id: 'K0', x: 1.35, z: 4.9, pijlen: { 1: 'op', 2: 'op', 3: 'op', 4: 'op', 5: 'op' } },
  { id: 'K1', x: 1.35, z: 15.2, pijlen: { 1: 'links', 2: 'rechts', 3: 'op', 4: 'op', 5: 'op' } },
  { id: 'K2', x: 1.35, z: 31.2, pijlen: { 3: 'links', 4: 'rechts', 5: 'op' } },
  { id: 'K3', x: 1.35, z: 44.2, pijlen: { 5: 'op' } },
];

// ---------------------------------------------------------------- renderer en scène

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f4f2ee');
scene.fog = new THREE.Fog('#f4f2ee', 45, 110);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight('#ffffff', '#d9d4ca', 2.4));
const zon = new THREE.DirectionalLight('#ffffff', 1.4);
zon.position.set(-20, 40, -10);
scene.add(zon);

const wit = new THREE.MeshLambertMaterial({ color: '#fbfaf7' });
const wandMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
const vloerMat = new THREE.MeshLambertMaterial({ color: '#e7e3dc' });
const zaalVloerMat = new THREE.MeshLambertMaterial({ color: '#e2d8c6' });

function doos(b, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}
function wand(x1, z1, x2, z2) {
  const lengte = Math.hypot(x2 - x1, z2 - z1);
  const m = doos(lengte, WANDHOOGTE, 0.2, wandMat, (x1 + x2) / 2, WANDHOOGTE / 2, (z1 + z2) / 2);
  m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
}
function vloer(x1, z1, x2, z2, mat, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  scene.add(m);
}

// Vloeren
vloer(-60, -40, 60, 90, new THREE.MeshLambertMaterial({ color: '#efece6' }), -0.01);
vloer(-10, -8, 10, 6, vloerMat);
vloer(-2, 6, 2, 46, vloerMat);
for (const [x1, x2] of [[-14, -2], [2, 14]]) for (const [z1, z2] of [[12, 22], [28, 38]]) vloer(x1, z1, x2, z2, zaalVloerMat);
vloer(-8, 46, 8, 58, zaalVloerMat);

// Wanden: hal
wand(-10, -8, -2, -8); wand(2, -8, 10, -8);
wand(-10, -8, -10, 6); wand(10, -8, 10, 6);
wand(-10, 6, -2, 6); wand(2, 6, 10, 6);
// Gang, met deuren van 2 m bij z = 17 en z = 33
for (const x of [-2, 2]) { wand(x, 6, x, 16); wand(x, 18, x, 32); wand(x, 34, x, 46); }
// Zijzalen
for (const s of [-1, 1]) for (const zc of [17, 33]) {
  wand(2 * s, zc - 5, 14 * s, zc - 5); wand(2 * s, zc + 5, 14 * s, zc + 5); wand(14 * s, zc - 5, 14 * s, zc + 5);
}
// Zaal 5
wand(-8, 46, -1, 46); wand(1, 46, 8, 46); wand(-8, 46, -8, 58); wand(8, 46, 8, 58); wand(-8, 58, 8, 58);

// ---------------------------------------------------------------- tekstplaatjes en kunst

function tekstTextuur(regels, { b = 512, h = 128, achter = '#ffffff', kleur = '#1d1d1f', grootte = 44 } = {}) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = achter; g.fillRect(0, 0, b, h);
  g.fillStyle = kleur; g.textAlign = 'center'; g.textBaseline = 'middle';
  regels.forEach((r, i) => {
    g.font = `${i === 0 ? 700 : 400} ${i === 0 ? grootte : grootte * 0.62}px system-ui, sans-serif`;
    g.fillText(r, b / 2, h / 2 + (i - (regels.length - 1) / 2) * grootte * 1.05);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function bord(regels, x, y, z, rotY, b = 2.4, h = 0.6) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ map: tekstTextuur(regels) }));
  m.position.set(x, y, z); m.rotation.y = rotY;
  scene.add(m);
}
// Naamborden boven de deuren (leesbaar vanuit de gang)
bord(['Zaal 1', 'De Gouden Eeuw'], -1.88, 2.7, 17, Math.PI / 2, 1.9, 0.5);
bord(['Zaal 2', 'Zee en Schepen'], 1.88, 2.7, 17, -Math.PI / 2, 1.9, 0.5);
bord(['Zaal 3', 'Licht en Glas'], -1.88, 2.7, 33, Math.PI / 2, 1.9, 0.5);
bord(['Zaal 4', 'Moderne Tijd'], 1.88, 2.7, 33, -Math.PI / 2, 1.9, 0.5);
bord(['Zaal 5', 'De Schatkamer'], 0, 2.7, 45.88, Math.PI, 1.9, 0.5);
bord(['Museum van het Verzonnen'], 0, 2.6, -7.88, 0, 4.2, 0.7);

// Schilderijen: gedempte, aardse tinten (bewust buiten het kleurenpalet van de routes)
const AARDE = ['#8a6f4e', '#5f6b5a', '#a38b6d', '#6d5a4b', '#b9a88a', '#4f5a63', '#9c7b61'];
function schilderij(x, z, rotY, zaad) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  const kies = (i) => AARDE[(zaad * 3 + i) % AARDE.length];
  g.fillStyle = kies(0); g.fillRect(0, 0, 128, 96);
  g.fillStyle = kies(1); g.beginPath(); g.ellipse(40 + zaad * 7 % 50, 50, 28, 34, 0.3, 0, 7); g.fill();
  g.fillStyle = kies(2); g.fillRect(70, 20 + zaad * 5 % 30, 40, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const lijst = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.08), new THREE.MeshLambertMaterial({ color: '#3b3228' }));
  const doek = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshLambertMaterial({ map: t }));
  doek.position.z = 0.045;
  const groep = new THREE.Group(); groep.add(lijst, doek);
  groep.position.set(x, 1.7, z); groep.rotation.y = rotY;
  scene.add(groep);
}
let zaad = 1;
for (const s of [-1, 1]) for (const zc of [17, 33]) {
  schilderij(8 * s, zc - 4.88, 0, zaad++); schilderij(8 * s, zc + 4.88, Math.PI, zaad++);
  schilderij(13.88 * s, zc, -s * Math.PI / 2, zaad++);
}
schilderij(-7.88, 52, Math.PI / 2, zaad++); schilderij(7.88, 52, -Math.PI / 2, zaad++);

// Het stuk in elke zaal: sokkel met een wit object
for (const [id, [x, z]] of Object.entries(STUK)) {
  doos(0.8, 1.0, 0.8, wit, x, 0.5, z);
  const kom = new THREE.LatheGeometry([0, 0.12, 0.26, 0.33, 0.34].map((r, i) => new THREE.Vector2(r, i * 0.07)), 32);
  const vormen = [
    new THREE.TorusKnotGeometry(0.22, 0.07, 64, 8), new THREE.ConeGeometry(0.25, 0.6, 5),
    kom, new THREE.OctahedronGeometry(0.32), new THREE.CylinderGeometry(0.34, 0.2, 0.18, 32),
  ];
  const m = new THREE.Mesh(vormen[id - 1], new THREE.MeshLambertMaterial({ color: '#d9d4c9', side: THREE.DoubleSide }));
  m.position.set(x, Number(id) === 3 ? 1.0 : 1.35, z); scene.add(m);
}

// Het scherm in de hal (in de scène neutraal: de keuze gebeurt in de kaart onderin)
doos(0.7, 1.1, 0.35, new THREE.MeshLambertMaterial({ color: '#2b2b2e' }), -3, 0.55, -3);
const halScherm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.05),
  new THREE.MeshBasicMaterial({ map: tekstTextuur(['Waar wil', 'je heen?'], { b: 256, h: 420, achter: '#1d1d1f', kleur: '#ffffff', grootte: 52 }) }));
halScherm.position.set(-3, 1.75, -3.2); halScherm.rotation.y = Math.PI;
doos(0.72, 1.12, 0.1, new THREE.MeshLambertMaterial({ color: '#2b2b2e' }), -3, 1.75, -3.1);
scene.add(halScherm);

// ---------------------------------------------------------------- symbolen

function tekenSymbool(g, soort, x, y, r, kleur) {
  g.fillStyle = kleur;
  g.beginPath();
  if (soort === 'driehoek') { g.moveTo(x, y - r); g.lineTo(x + r * 0.95, y + r * 0.75); g.lineTo(x - r * 0.95, y + r * 0.75); }
  else if (soort === 'rondje') g.arc(x, y, r * 0.85, 0, Math.PI * 2);
  else if (soort === 'vierkant') g.rect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
  else if (soort === 'ruit') { g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); }
  else if (soort === 'ster') for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); }
  else if (soort === 'plus') { const d = r * 0.32; g.rect(x - d, y - r, 2 * d, 2 * r); g.rect(x - r, y - d, 2 * r, 2 * d); }
  else if (soort === 'hart') { g.moveTo(x, y + r * 0.8); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.6, y - r * 0.2, x, y + r * 0.8); }
  g.closePath(); g.fill();
}
function svgSymbool(soort, kleur, maat = 34) {
  const c = document.createElement('canvas'); c.width = c.height = maat * 2;
  tekenSymbool(c.getContext('2d'), soort, maat, maat, maat * 0.8, kleur);
  return `<img alt="" width="${maat}" height="${maat}" src="${c.toDataURL()}">`;
}
function tekenPijl(g, richting, x, y, r, kleur) {
  g.save(); g.translate(x, y);
  g.rotate({ op: 0, rechts: Math.PI / 2, links: -Math.PI / 2 }[richting]);
  g.fillStyle = kleur; g.beginPath();
  g.moveTo(0, -r); g.lineTo(r * 0.85, -r * 0.05); g.lineTo(r * 0.35, -r * 0.05); g.lineTo(r * 0.35, r);
  g.lineTo(-r * 0.35, r); g.lineTo(-r * 0.35, -r * 0.05); g.lineTo(-r * 0.85, -r * 0.05);
  g.closePath(); g.fill(); g.restore();
}

// ---------------------------------------------------------------- lichtspoor

// Elk segment krijgt LEDs om de 0,2 m; gedeelde segmenten delen hun LEDs (één strip in de gang).
const LED_AFSTAND = 0.2;
const leds = []; // { x, z, segment, soort }
const segmentLeds = {}; // segment -> [{ index, s }] met s = afstand vanaf begin segment
for (const [naam, seg] of Object.entries(SEGMENTEN)) {
  segmentLeds[naam] = [];
  let s0 = 0;
  for (let i = 0; i < seg.punten.length - 1; i++) {
    const [x1, z1] = seg.punten[i], [x2, z2] = seg.punten[i + 1];
    const l = Math.hypot(x2 - x1, z2 - z1);
    for (let d = (i === 0 ? LED_AFSTAND / 2 : 0); d < l; d += LED_AFSTAND) {
      const f = d / l;
      segmentLeds[naam].push({ index: leds.length, s: s0 + d });
      leds.push({ x: x1 + (x2 - x1) * f, z: z1 + (z2 - z1) * f, hoek: Math.atan2(x2 - x1, z2 - z1), soort: seg.soort });
    }
    s0 += l;
  }
  seg.lengte = s0;
}
const ledMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.03, 0.19), new THREE.MeshBasicMaterial(), leds.length);
// Alleen de strip die in de gekozen variant bestaat, ligt er ook: A overal, C bij hal en deur, B nergens.
function legStrip(variant) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  leds.forEach((led, i) => {
    const maat = ledAan(led, variant) ? 1 : 0;
    q.setFromEuler(e.set(0, led.hoek, 0));
    m.compose(new THREE.Vector3(led.x, 0.02, led.z), q, new THREE.Vector3(maat, maat, maat));
    ledMesh.setMatrixAt(i, m);
    ledMesh.setColorAt(i, new THREE.Color('#bdb8ae'));
  });
  ledMesh.instanceMatrix.needsUpdate = true;
}
scene.add(ledMesh);

// Een route als polylijn met lengte, plus per LED zijn afstand s langs de route.
function bouwRoute(zaalId) {
  const punten = [];
  const ledOpRoute = [];
  let s0 = 0;
  for (const naam of ROUTES[zaalId]) {
    const seg = SEGMENTEN[naam];
    for (const p of seg.punten) {
      const laatste = punten[punten.length - 1];
      if (!laatste || laatste[0] !== p[0] || laatste[1] !== p[1]) punten.push(p);
    }
    for (const { index, s } of segmentLeds[naam]) ledOpRoute.push({ index, s: s0 + s });
    s0 += seg.lengte;
  }
  return { punten, lengte: s0, ledOpRoute, eindS: s0 - 0.9 };
}
function puntOp(route, s) {
  let rest = Math.max(0, Math.min(s, route.lengte));
  for (let i = 0; i < route.punten.length - 1; i++) {
    const [x1, z1] = route.punten[i], [x2, z2] = route.punten[i + 1];
    const l = Math.hypot(x2 - x1, z2 - z1);
    if (rest <= l || i === route.punten.length - 2) {
      const f = l ? Math.min(1, rest / l) : 0;
      return { x: x1 + (x2 - x1) * f, z: z1 + (z2 - z1) * f, hoek: Math.atan2(x2 - x1, z2 - z1) };
    }
    rest -= l;
  }
}

// ---------------------------------------------------------------- Pi-schermen

const kruispuntSchermen = KRUISPUNTEN.map((k) => {
  const c = document.createElement('canvas'); c.width = 180; c.height = 320;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const groep = new THREE.Group();
  // 7 inch staand: 8,6 × 15,5 cm scherm in een behuizing, op een paal van 1,45 m
  const paal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 12), new THREE.MeshLambertMaterial({ color: '#8e8e93' }));
  paal.position.y = 0.725;
  const kast = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.185, 0.03), new THREE.MeshLambertMaterial({ color: '#1d1d1f' }));
  kast.position.y = 1.55;
  const beeld = new THREE.Mesh(new THREE.PlaneGeometry(0.086, 0.155), new THREE.MeshBasicMaterial({ map: tex }));
  beeld.position.set(0, 1.55, -0.016); beeld.rotation.y = Math.PI;
  groep.add(paal, kast, beeld);
  groep.position.set(k.x, 0, k.z);
  scene.add(groep);
  return { ...k, canvas: c, g: c.getContext('2d'), tex, groep, beeld, sleutel: '' };
});

function tekenKruispunt(k, bezoekers) {
  const wie = bezoekers.filter((b) => b.actief && k.pijlen[b.zaal] && b.s < b.kruisS[k.id] + 0.5);
  const sleutel = wie.map((b) => b.kleur.naam + b.zaal).join('|');
  if (sleutel === k.sleutel) return;
  k.sleutel = sleutel;
  const g = k.g, B = 180, H = 320;
  g.fillStyle = '#111114'; g.fillRect(0, 0, B, H);
  if (!wie.length) {
    g.fillStyle = '#5a5a60'; g.font = '600 22px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('Volg je', B / 2, H / 2 - 12); g.fillText('kleur', B / 2, H / 2 + 16);
  } else if (wie.length === 1) {
    const b = wie[0];
    tekenPijl(g, k.pijlen[b.zaal], B / 2, 118, 78, b.kleur.hex);
    tekenSymbool(g, b.kleur.symbool, 48, 248, 26, b.kleur.hex);
    g.fillStyle = '#ffffff'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText(`Zaal ${b.zaal}`, 84, 259);
  } else {
    const rij = Math.min(96, H / wie.length);
    wie.forEach((b, i) => {
      const y = i * rij + rij / 2;
      tekenSymbool(g, b.kleur.symbool, 30, y, rij * 0.22, b.kleur.hex);
      tekenPijl(g, k.pijlen[b.zaal], 90, y, rij * 0.36, b.kleur.hex);
      g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(rij * 0.26)}px system-ui, sans-serif`; g.textAlign = 'left';
      g.fillText(`${b.zaal}`, 140, y + rij * 0.09);
    });
  }
  k.tex.needsUpdate = true;
}

// ---------------------------------------------------------------- bezoekers en blimp

const figuurMat = [new THREE.MeshLambertMaterial({ color: '#d4d1cb' }), new THREE.MeshLambertMaterial({ color: '#a9a59e' })];
function maakFiguur(mat) {
  const g = new THREE.Group();
  const lijf = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 12), mat); lijf.position.y = 0.72;
  const hoofd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat); hoofd.position.y = 1.5;
  g.add(lijf, hoofd); scene.add(g);
  return g;
}

function maakBlimp() {
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshLambertMaterial({ color: '#f2f2f4' }));
  romp.scale.set(1, 1, 2.6);
  const bandMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.22, 32, 1, true), bandMat);
  band.rotation.x = Math.PI / 2; band.scale.set(1, 1, 1);
  const gondel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.42), bandMat); gondel.position.y = -0.52;
  g.add(romp, band, gondel);
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const vin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.36), bandMat);
    const as = new THREE.Group(); as.rotation.z = r; vin.position.set(0, 0.34, -1.08); as.add(vin); g.add(as);
  }
  g.visible = false; scene.add(g);
  return { groep: g, bandMat };
}

const bezoekers = [];
function nieuweBezoeker(zaal, kleur, speler) {
  const route = bouwRoute(zaal);
  const kruisS = {};
  for (const k of KRUISPUNTEN) {
    if (!k.pijlen[zaal]) continue;
    // afstand langs de route tot het dichtstbijzijnde punt bij het kruispunt
    let beste = 0, afstand = Infinity;
    for (let s = 0; s <= route.lengte; s += 0.25) {
      const p = puntOp(route, s), d = Math.hypot(p.x - k.x, p.z - k.z);
      if (d < afstand) { afstand = d; beste = s; }
    }
    kruisS[k.id] = beste;
  }
  const b = {
    zaal, kleur, speler, route, kruisS, s: 0, actief: true, aangekomen: false, naAankomst: 0, start: tijd,
    figuur: maakFiguur(figuurMat[speler ? 0 : 1]), blimp: speler ? maakBlimp() : null,
  };
  if (b.blimp) b.blimp.bandMat.color.set(kleur.hex);
  bezoekers.push(b);
  return b;
}
function ruimOp() {
  for (const b of bezoekers) { scene.remove(b.figuur); if (b.blimp) scene.remove(b.blimp.groep); }
  bezoekers.length = 0;
  for (const k of kruispuntSchermen) k.sleutel = '#';
}

// ---------------------------------------------------------------- toestand

const toestand = { variant: 'C', droom: false, overzicht: false, stand: 'wacht', speler: null, gepland: [] };
let tijd = 0;

function ledAan(led, variant) {
  if (variant === 'A') return true;
  if (variant === 'C') return led.soort === 'hal' || led.soort === 'deur';
  return false;
}
legStrip(toestand.variant);

const UIT = new THREE.Color('#bdb8ae');
const tmp = new THREE.Color();
function werkLedsBij() {
  const beste = new Float32Array(leds.length);
  const kleurVan = new Array(leds.length).fill(null);
  const draai = Math.floor(tijd * 1.5);
  bezoekers.forEach((b, bi) => {
    if (!b.actief) return;
    const uitdoof = b.aangekomen ? Math.max(0, 1 - b.naAankomst / 4) : 1;
    if (uitdoof <= 0) return;
    const golfKop = (tijd - b.start) * GOLF.snelheid;
    for (const { index, s } of b.route.ledOpRoute) {
      if (!ledAan(leds[index], toestand.variant)) continue;
      if (s > golfKop) continue; // de eerste golf moet er nog aankomen
      const fase = ((golfKop - s) % GOLF.lengte + GOLF.lengte) % GOLF.lengte;
      let h = 0;
      if (fase < GOLF.kern) h = 1;
      else if (fase < GOLF.kern + GOLF.rand) h = 1 - (fase - GOLF.kern) / GOLF.rand;
      h *= uitdoof;
      // Twee kleuren op dezelfde LED: om beurten (de lichtregie wisselt ze af).
      const voorrang = ((bi + draai) % bezoekers.length) === 0 ? 0.001 : 0;
      if (h + voorrang > beste[index]) { beste[index] = h + voorrang; kleurVan[index] = b.kleur.hex; }
    }
  });
  for (let i = 0; i < leds.length; i++) {
    const h = Math.min(1, beste[i]);
    if (h <= 0 || !kleurVan[i]) tmp.copy(UIT);
    else tmp.copy(UIT).lerp(new THREE.Color(kleurVan[i]), h);
    ledMesh.setColorAt(i, tmp);
  }
  ledMesh.instanceColor.needsUpdate = true;
}

function stap(dt) {
  tijd += dt;
  for (const plan of [...toestand.gepland]) {
    if (tijd >= plan.op) { toestand.gepland.splice(toestand.gepland.indexOf(plan), 1); plan.doe(); }
  }
  for (const b of bezoekers) {
    if (!b.actief) continue;
    if (!b.aangekomen) {
      b.s = Math.min(b.route.eindS, b.s + LOOPTEMPO * dt);
      if (b.s >= b.route.eindS) { b.aangekomen = true; if (b.speler) aangekomen(b); }
    } else b.naAankomst += dt;
    const p = puntOp(b.route, b.s);
    const zij = b.speler ? -0.35 : 0.35; // naast de lijn lopen, zodat het licht zichtbaar blijft
    b.figuur.position.set(p.x + Math.cos(p.hoek) * zij, 0, p.z - Math.sin(p.hoek) * zij);
    b.figuur.rotation.y = p.hoek;
    if (b.blimp) {
      b.blimp.groep.visible = toestand.droom;
      // Onderweg 2,6 m voor je uit; bij aankomst zweeft hij boven het stuk.
      const v = puntOp(b.route, Math.min(b.route.lengte, b.s + 2.6));
      const doel = new THREE.Vector3(v.x, 2.35 + Math.sin(tijd * 1.3) * 0.08, v.z);
      if (b.aangekomen) {
        // Schuin boven het stuk, zodat stuk en schilderij in beeld blijven.
        const [sx, sz] = STUK[b.zaal];
        doel.set(sx + Math.sin(v.hoek) * 1.2 - Math.cos(v.hoek) * 1.1, 3.0 + Math.sin(tijd * 1.3) * 0.08,
          sz + Math.cos(v.hoek) * 1.2 + Math.sin(v.hoek) * 1.1);
      }
      if (!b.blimp.geplaatst) { b.blimp.groep.position.copy(doel); b.blimp.geplaatst = true; }
      b.blimp.groep.position.lerp(doel, Math.min(1, dt * 2.5));
      b.blimp.groep.rotation.y = v.hoek;
    }
  }
  werkLedsBij();
  for (const k of kruispuntSchermen) {
    const zichtbaar = toestand.variant !== 'A';
    k.groep.visible = zichtbaar;
    if (zichtbaar) tekenKruispunt(k, bezoekers);
  }
  werkCameraBij(dt);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- camera

const camPos = new THREE.Vector3(0, 7, -13.5), camDoel = new THREE.Vector3(-1, 1, 0);
const wilPos = new THREE.Vector3(), wilDoel = new THREE.Vector3();
let cameraModus = 'hal';
function werkCameraBij(dt) {
  const b = toestand.speler;
  let snel = 2.2;
  if (toestand.overzicht) {
    cameraModus = 'overzicht'; wilPos.set(0, 50, 8); wilDoel.set(0, 0, 24);
  } else if (!b) {
    cameraModus = 'hal'; wilPos.set(0, 7, -13.5); wilDoel.set(-1, 1, 0);
  } else {
    const p = puntOp(b.route, b.s);
    const dichtbij = toestand.variant !== 'A' && !b.aangekomen &&
      KRUISPUNTEN.find((k) => k.pijlen[b.zaal] && b.s > b.kruisS[k.id] - 3.6 && b.s < b.kruisS[k.id] - 0.3);
    if (dichtbij) {
      // Kijk mee over de schouder naar het scherm op het kruispunt.
      cameraModus = `scherm-${dichtbij.id}`; snel = 3.5;
      wilPos.set(dichtbij.x - 0.12, 1.62, dichtbij.z - 0.5); wilDoel.set(dichtbij.x, 1.55, dichtbij.z);
    } else if (b.aangekomen) {
      // Iets boven ooghoogte in de zaal, met het stuk (en in de droomlaag de blimp) in beeld.
      cameraModus = 'aankomst';
      const [sx, sz] = STUK[b.zaal];
      // Recht achter de bezoeker, binnen de zaal (niet in de deurpost).
      const terug = puntOp(b.route, b.s - 2.9);
      wilPos.set(terug.x, 2.4, terug.z);
      wilDoel.set(sx, 1.8, sz);
    } else {
      cameraModus = 'volgen';
      const vooruit = puntOp(b.route, b.s + 8);
      wilPos.set(p.x - Math.sin(p.hoek) * 8.5, 7.2, p.z - Math.cos(p.hoek) * 8.5);
      wilDoel.set(vooruit.x, 0, vooruit.z);
    }
  }
  const f = Math.min(1, dt * snel);
  camPos.lerp(wilPos, f); camDoel.lerp(wilDoel, f);
  camera.position.copy(camPos); camera.lookAt(camDoel);
}
function camNaarDoel() { werkCameraBij(1); }

function schaal() {
  const b = window.innerWidth, h = window.innerHeight;
  renderer.setSize(b, h, false);
  camera.aspect = b / h;
  camera.fov = b < h ? 62 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', schaal);
schaal();

// ---------------------------------------------------------------- bediening

const el = (id) => document.getElementById(id);
function toonVariant() {
  document.querySelectorAll('[data-variant]').forEach((k) => k.setAttribute('aria-pressed', String(k.dataset.variant === toestand.variant)));
  el('uitleg-variant').textContent = VARIANT_UITLEG[toestand.variant];
}
document.querySelectorAll('[data-variant]').forEach((k) => k.addEventListener('click', () => {
  toestand.variant = k.dataset.variant; legStrip(toestand.variant); toonVariant();
}));
el('droom').addEventListener('click', () => zetDroom(!toestand.droom));
el('overzicht').addEventListener('click', () => {
  toestand.overzicht = !toestand.overzicht;
  el('overzicht').setAttribute('aria-pressed', String(toestand.overzicht));
});
el('kies').addEventListener('click', () => { el('menu').hidden = false; el('kies').hidden = true; });
el('opnieuw').addEventListener('click', herstart);

for (const z of ZALEN) {
  const k = document.createElement('button');
  k.dataset.zaal = z.id;
  k.innerHTML = `<b>Zaal ${z.id}</b> ${z.naam}`;
  k.addEventListener('click', () => kies(z.id));
  el('zalen').append(k);
}

function zetDroom(aan) {
  toestand.droom = aan;
  el('droom').setAttribute('aria-pressed', String(aan));
  if (toestand.speler?.blimp) toestand.speler.blimp.groep.visible = aan;
  if (toestand.speler?.aangekomen) toonVerhaal(toestand.speler);
}

function kies(zaalId) {
  if (toestand.stand !== 'wacht') return;
  const kleur = KLEUREN[0];
  const speler = nieuweBezoeker(zaalId, kleur, true);
  toestand.speler = speler;
  toestand.stand = 'onderweg';
  el('menu').hidden = true;
  const zaal = ZALEN[zaalId - 1];
  el('badge').innerHTML = `${svgSymbool(kleur.symbool, kleur.hex)}<div class="tekst"><b>Volg ${kleur.naam}</b> naar Zaal ${zaal.id}<br><small>${zaal.naam} · je symbool staat op elk scherm</small></div>`;
  el('badge').hidden = false;
  // Twee andere bezoekers, elk met een eigen kleur en een andere zaal.
  const anderen = [5, 2, 4, 1, 3].filter((z) => z !== zaalId);
  toestand.gepland.push({ op: tijd + 0.4, doe: () => nieuweBezoeker(anderen[0], KLEUREN[1], false) });
  toestand.gepland.push({ op: tijd + 3.5, doe: () => nieuweBezoeker(anderen[1], KLEUREN[2], false) });
}

function aangekomen(b) {
  toestand.stand = 'aangekomen';
  el('badge').hidden = true;
  toonVerhaal(b);
  el('opnieuw').hidden = false;
}
function toonVerhaal(b) {
  const zaal = ZALEN[b.zaal - 1];
  el('verhaal').hidden = false;
  el('verhaal').innerHTML = toestand.droom
    ? `<i>Droomlaag · het verhaal bij het stuk</i><b>${zaal.stuk}</b><br>${zaal.verhaal}`
    : `<b>Je bent er: Zaal ${zaal.id}, ${zaal.naam}</b><br><span style="color:#6e6e73">Het licht dooft vanzelf. Zet ✦ Droom aan voor het verhaal bij het stuk.</span>`;
  if (toestand.droom && !handmatig && 'speechSynthesis' in window) {
    try { const u = new SpeechSynthesisUtterance(zaal.verhaal); u.lang = 'nl-NL'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* geen stem */ }
  }
}
function herstart() {
  ruimOp();
  toestand.speler = null; toestand.stand = 'wacht'; toestand.gepland = [];
  for (const id of ['menu', 'badge', 'verhaal', 'opnieuw']) el(id).hidden = true;
  el('kies').hidden = false;
}
toonVariant();

// ---------------------------------------------------------------- lus en haakjes voor toets en video

let handmatig = false, vorige = performance.now();
function lus(nu) {
  if (!handmatig) { stap(Math.min(0.1, (nu - vorige) / 1000)); vorige = nu; requestAnimationFrame(lus); }
}
camNaarDoel();
requestAnimationFrame(lus);

window.mockup = {
  klaar: true,
  get stand() { return toestand.stand; },
  get tijd() { return tijd; },
  get camera() { return cameraModus; },
  get variant() { return toestand.variant; },
  kleuren: KLEUREN,
  // Handmatige tijd: de lus stopt en stap(dt) zet de wereld precies dt seconden verder.
  handmatig(aan) {
    handmatig = aan;
    if (!aan) { vorige = performance.now(); requestAnimationFrame(lus); }
  },
  stap(dt, keer = 1) { for (let i = 0; i < keer; i++) stap(dt); },
  render() { renderer.render(scene, camera); },
  camNaarDoel,
  bijschrift(tekst, klein) {
    el('bijschrift').hidden = !tekst;
    el('bijschrift').innerHTML = tekst ? `${tekst}${klein ? `<small>${klein}</small>` : ''}` : '';
  },
  videomodus(aan) { document.body.classList.toggle('video', aan); },
  droom(aan) { zetDroom(aan); },
  overzicht(aan) { toestand.overzicht = aan; el('overzicht').setAttribute('aria-pressed', String(aan)); },
  // Telt de pixels in het WebGL-beeld die binnen `marge` van een kleur liggen.
  telKleur(hex, marge = 40) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.drawImage(canvas, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const r = parseInt(hex.slice(1, 3), 16), gr = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - gr) + Math.abs(d[i + 2] - bl) <= marge) n++;
    }
    return n;
  },
};
