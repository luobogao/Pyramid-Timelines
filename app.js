import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// -----------------------------
// Geodetic reference points (pyramid base centers)
// Lat/Lon from commonly published pyramid coordinates; lon is east-positive.
// -----------------------------
const ORIGIN_SITES = {
  khufu: {
    label: "Khufu",
    lat: 29 + 58/60 + 45/3600,   // 29°58′45″N
    lon: 31 + 8/60 + 3/3600,     // 31°08′03″E
    offset: new THREE.Vector3(0.000, 0.000, 0.000)
  },
  sphinx: {
    label: "Sphinx",
    lat: 29 + 58/60 + 31/3600,   // 29°58′31″N (430m south of Khufu)
    lon: 31 + 8/60 + 15/3600,    // 31°08′15″E (320m east of Khufu)
    offset: new THREE.Vector3(320.0, -430.0, 0.0)
  }
};

let currentOriginKey = "khufu";
let REF_LAT_DEG = ORIGIN_SITES[currentOriginKey].lat;
let REF_LON_DEG = ORIGIN_SITES[currentOriginKey].lon;

// -----------------------------
// Egyptian dynasties for timeline visualization
// Dates in astronomical year numbering (negative = BCE)
// -----------------------------
const DYNASTIES = [
  { name: "Predynastic", start: -5000, end: -3150, color: "#556B2F" },
  { name: "Early Dynastic", start: -3150, end: -2686, color: "#8B4513" },
  { name: "Old Kingdom", start: -2686, end: -2181, color: "#DAA520" },
  { name: "1st Intermediate", start: -2181, end: -2055, color: "#A0522D" },
  { name: "Middle Kingdom", start: -2055, end: -1650, color: "#CD853F" },
  { name: "2nd Intermediate", start: -1650, end: -1550, color: "#D2691E" },
  { name: "New Kingdom", start: -1550, end: -1069, color: "#B8860B" },
  { name: "3rd Intermediate", start: -1069, end: -664, color: "#8B7355" },
  { name: "Late Period", start: -664, end: -332, color: "#6B4423" },
  { name: "Ptolemaic", start: -332, end: -30, color: "#4682B4" },
];

function updateCoordDisplay() {
  const el = document.getElementById('coordDec');
  if (el) el.textContent = `${REF_LAT_DEG.toFixed(7)}°, ${REF_LON_DEG.toFixed(7)}°`;
}
updateCoordDisplay();

const deg2rad = (d) => d * Math.PI / 180.0;
const rad2deg = (r) => r * 180.0 / Math.PI;

// -----------------------------
// Renderer / scene / camera
// -----------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const sceneMain = new THREE.Scene();
const sceneSky  = new THREE.Scene();
renderer.setClearColor(0xffffff, 1);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.up.set(0, 0, 1);  // adopt Z-up in Three.js for this scene
camera.position.set(350, 250, 500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 60);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 20;
controls.maxDistance = 12000;
controls.update();

// -----------------------------
// Helpers
// -----------------------------

sceneMain.add(new THREE.AmbientLight(0xffffff, 0.25));

const world = new THREE.Group();
sceneMain.add(world);


// -----------------------------
// Wireframe pyramids (meters)
// Coordinate convention here: [X=East, Y=North, Z=Up]
// Vertex order: NW, NE, SE, SW, APEX
// -----------------------------
const edges = [
  [0,1],[1,2],[2,3],[3,0],
  [0,4],[1,4],[2,4],[3,4]
];

const pyramids = [
  {
    name: "Khufu (Great Pyramid)",
    vertices: [
      [-115.165,  115.165,   0.000],
      [ 115.165,  115.165,   0.000],
      [ 115.165, -115.165,   0.000],
      [-115.165, -115.165,   0.000],
      [   0.000,    0.000, 146.600]
    ]
  },
  {
    name: "Khafre",
    vertices: [
      [-429.313, -231.090,   0.000],
      [-214.063, -231.090,   0.000],
      [-214.063, -446.340,   0.000],
      [-429.313, -446.340,   0.000],
      [-321.688, -338.715, 143.500]
    ]
  },
  {
    name: "Menkaure",
    // Rectangular base: 102.2 × 104.6 (E-W × N-S) centered at (-562.954, -739.014)
    vertices: [
      [-615.254, -687.914,   0.000],
      [-510.654, -687.914,   0.000],
      [-510.654, -790.114,   0.000],
      [-615.254, -790.114,   0.000],
      [-562.954, -739.014,  65.000]
    ]
  }
];

function makeWire(vertices, material) {
  const positions = [];
  for (const [a, b] of edges) {
    const va = vertices[a];
    const vb = vertices[b];
    positions.push(va[0], va[1], va[2], vb[0], vb[1], vb[2]);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geom, material);
}

function makePyramidMesh(vertices, material) {
  // vertices: [NW, NE, SE, SW, APEX] - 5 points
  // Create 4 triangular faces (sides) + 2 triangles for base
  const positions = [];
  const v = vertices.map(arr => new THREE.Vector3(arr[0], arr[1], arr[2]));

  // 4 side faces (each connects 2 base vertices to apex)
  // Face 0: NW-NE-APEX
  positions.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[4].x, v[4].y, v[4].z);
  // Face 1: NE-SE-APEX
  positions.push(v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z, v[4].x, v[4].y, v[4].z);
  // Face 2: SE-SW-APEX
  positions.push(v[2].x, v[2].y, v[2].z, v[3].x, v[3].y, v[3].z, v[4].x, v[4].y, v[4].z);
  // Face 3: SW-NW-APEX
  positions.push(v[3].x, v[3].y, v[3].z, v[0].x, v[0].y, v[0].z, v[4].x, v[4].y, v[4].z);

  // Base (2 triangles): NW-NE-SE and NW-SE-SW
  positions.push(v[0].x, v[0].y, v[0].z, v[2].x, v[2].y, v[2].z, v[1].x, v[1].y, v[1].z);
  positions.push(v[0].x, v[0].y, v[0].z, v[3].x, v[3].y, v[3].z, v[2].x, v[2].y, v[2].z);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, material);
}

const pyramidMat = new THREE.MeshBasicMaterial({
  color: 0x8B7355,  // Sandy brown (same as Sphinx)
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide
});
const pyramidWireMat = new THREE.LineBasicMaterial({ color: 0x000000 });

pyramids.forEach((p) => {
  // Filled mesh
  const mesh = makePyramidMesh(p.vertices, pyramidMat);
  mesh.name = p.name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 9;
  world.add(mesh);

  // Wireframe overlay
  const wire = makeWire(p.vertices, pyramidWireMat);
  wire.name = p.name + " (wire)";
  wire.frustumCulled = false;
  wire.renderOrder = 10;
  world.add(wire);
});

// -----------------------------
// Great Sphinx - simplified box geometry
// Location: ~320m east, ~430m south of Khufu (based on GPS coordinates)
// Facing due East
// -----------------------------
const SPHINX_X = 320;   // meters east of Khufu
const SPHINX_Y = -430;  // meters south of Khufu

const sphinxGroup = new THREE.Group();
sphinxGroup.name = "Sphinx";

const sphinxMat = new THREE.MeshBasicMaterial({
  color: 0x8B7355,  // Sandy brown
  transparent: true,
  opacity: 0.85
});
const sphinxWireMat = new THREE.LineBasicMaterial({ color: 0x000000 });

// Main body (reclining lion body) - 45m x 15m x 8m
const sphinxBodyGeom = new THREE.BoxGeometry(45, 15, 8);
const sphinxBody = new THREE.Mesh(sphinxBodyGeom, sphinxMat);
sphinxBody.position.set(0, 0, 4);
sphinxGroup.add(sphinxBody);
const sphinxBodyWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(sphinxBodyGeom), sphinxWireMat
);
sphinxBodyWire.position.set(0, 0, 4);
sphinxGroup.add(sphinxBodyWire);

// Front paws - two boxes extending east (20m x 4m x 3m each)
const pawGeom = new THREE.BoxGeometry(20, 4, 3);

const leftPaw = new THREE.Mesh(pawGeom, sphinxMat);
leftPaw.position.set(32, 5, 1.5);
sphinxGroup.add(leftPaw);
const leftPawWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(pawGeom), sphinxWireMat
);
leftPawWire.position.set(32, 5, 1.5);
sphinxGroup.add(leftPawWire);

const rightPaw = new THREE.Mesh(pawGeom, sphinxMat);
rightPaw.position.set(32, -5, 1.5);
sphinxGroup.add(rightPaw);
const rightPawWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(pawGeom), sphinxWireMat
);
rightPawWire.position.set(32, -5, 1.5);
sphinxGroup.add(rightPawWire);

// Head (elevated above body) - 10m x 8m x 12m
const sphinxHeadGeom = new THREE.BoxGeometry(10, 8, 12);
const sphinxHead = new THREE.Mesh(sphinxHeadGeom, sphinxMat);
sphinxHead.position.set(15, 0, 14);
sphinxGroup.add(sphinxHead);
const sphinxHeadWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(sphinxHeadGeom), sphinxWireMat
);
sphinxHeadWire.position.set(15, 0, 14);
sphinxGroup.add(sphinxHeadWire);

// Position entire sphinx group
sphinxGroup.position.set(SPHINX_X, SPHINX_Y, 0);
world.add(sphinxGroup);


// -----------------------------
// Orion's Belt "center star": Alnilam (ε Orionis) - J2000 coordinates
// RA = 05h 36m 12.8s, Dec = -01° 12' 07" (J2000)
// -----------------------------
const ALNILAM_RA_RAD  = deg2rad((5 + 36/60 + 12.8/3600) * 15.0); // hours -> degrees -> radians
const ALNILAM_DEC_RAD = deg2rad(-(1 + 12/60 + 7/3600));

const angleEl = document.getElementById('angleReadout');

// Sky sphere radius - all directional lines extend to this distance
const SKY_RADIUS = 3500;

// Red beam from Khufu center (0,0,0) toward Alnilam direction on the sky sphere.
// Implemented as a thin cylinder so it remains visible at a wide range of zoom levels.
const BEAM_RADIUS = 3.0; // meters (visual thickness)
const beamGeom = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
const beamMat  = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false });
const alnilamBeam = new THREE.Mesh(beamGeom, beamMat);
alnilamBeam.frustumCulled = false;
alnilamBeam.renderOrder = 9999;
sceneMain.add(alnilamBeam);
// -----------------------------
// Great Pyramid "star shaft" (fixed physical alignment)
// Using the King's Chamber SOUTH shaft inclination ~45° (Gantenbrink survey / common references),
// and an idealized azimuth of due South (180°). Real shafts include slight curvature and
// published horizontal azimuths are less consistently reported than slopes.
// -----------------------------
const SHAFT_AZ_RAD  = deg2rad(180.0); // 0°=North (+Y), 90°=East (+X), 180°=South (-Y)
const SHAFT_ALT_RAD = deg2rad(45.0);  // inclination above horizontal
const shaftDir = new THREE.Vector3(
  Math.sin(SHAFT_AZ_RAD) * Math.cos(SHAFT_ALT_RAD), // x (East)
  Math.cos(SHAFT_AZ_RAD) * Math.cos(SHAFT_ALT_RAD), // y (North)
  Math.sin(SHAFT_ALT_RAD)                            // z (Up)
).normalize();

const SHAFT_RADIUS = 2.6; // meters (visual thickness)
const shaftGeom = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
const shaftMat  = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false });
const shaftLine = new THREE.Mesh(shaftGeom, shaftMat);
shaftLine.frustumCulled = false;
shaftLine.renderOrder = 9998;
sceneMain.add(shaftLine);

// Set once: constant orientation and position (from Khufu center outward)
const SHAFT_LENGTH = SKY_RADIUS; // extend to sky sphere
shaftLine.scale.set(SHAFT_RADIUS, SHAFT_LENGTH, SHAFT_RADIUS);
shaftLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftDir);
shaftLine.position.copy(shaftDir.clone().multiplyScalar(SHAFT_LENGTH / 2));

// -----------------------------
// Sphinx sight line - pointing due East, angled 15° upward
// The Sphinx faces east toward the rising sun on the equinox
// -----------------------------
const SPHINX_SIGHT_AZ_RAD  = deg2rad(90.0);  // Due East (+X)
const SPHINX_SIGHT_ALT_RAD = deg2rad(15.0);  // 15° above horizontal
const sphinxSightDir = new THREE.Vector3(
  Math.sin(SPHINX_SIGHT_AZ_RAD) * Math.cos(SPHINX_SIGHT_ALT_RAD),
  Math.cos(SPHINX_SIGHT_AZ_RAD) * Math.cos(SPHINX_SIGHT_ALT_RAD),
  Math.sin(SPHINX_SIGHT_ALT_RAD)
).normalize();

const SPHINX_SIGHT_LENGTH = SKY_RADIUS;  // extend to sky sphere
const SPHINX_SIGHT_RADIUS = 2.0;
const sphinxSightGeom = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
const sphinxSightMat = new THREE.MeshBasicMaterial({ color: 0x0055aa, depthTest: false, depthWrite: false });
const sphinxSightLine = new THREE.Mesh(sphinxSightGeom, sphinxSightMat);
sphinxSightLine.frustumCulled = false;
sphinxSightLine.renderOrder = 9997;
sphinxSightLine.scale.set(SPHINX_SIGHT_RADIUS, SPHINX_SIGHT_LENGTH, SPHINX_SIGHT_RADIUS);
sphinxSightLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sphinxSightDir);
// Position at Sphinx center, offset so line extends outward from Sphinx head
sphinxSightLine.position.set(
  SPHINX_X + sphinxSightDir.x * (SPHINX_SIGHT_LENGTH / 2),
  SPHINX_Y + sphinxSightDir.y * (SPHINX_SIGHT_LENGTH / 2),
  10 + sphinxSightDir.z * (SPHINX_SIGHT_LENGTH / 2)  // Start at Sphinx head height (~10m)
);
sphinxSightLine.visible = false;  // Hidden by default (Khufu is default origin)
world.add(sphinxSightLine);


function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const pad = 10;
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = 28;
  canvas.width = w;
  canvas.height = h;

  const c = canvas.getContext('2d');
  c.font = ctx.font;
  c.fillStyle = 'rgba(10,14,20,0.72)';
  c.strokeStyle = 'rgba(255,255,255,0.20)';
  roundRect(c, 0.5, 0.5, w - 1, h - 1, 8);
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textBaseline = 'middle';
  c.fillText(text, pad, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);

  const scale = 0.9;
  sprite.scale.set((w / 10) * scale, (h / 10) * scale, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  const min = Math.min(w, h);
  if (r > min / 2) r = min / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// -----------------------------
// Sky sphere + stars + constellation lines
// Data from d3-celestial (J2000) hosted via jsDelivr.
// -----------------------------

// -----------------------------
// Ground plane centered on Khafre pyramid, sized to cover all objects
// -----------------------------
const KHAFRE_X = -321.688;
const KHAFRE_Y = -338.715;

// Calculate farthest point from Khafre (check all pyramid vertices and Sphinx)
let maxDistFromKhafre = 0;
pyramids.forEach(p => {
  p.vertices.forEach(v => {
    const dx = v[0] - KHAFRE_X;
    const dy = v[1] - KHAFRE_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDistFromKhafre) maxDistFromKhafre = dist;
  });
});
// Check Sphinx corners (body ~45m E-W, head extends to ~42m east of center)
const sphinxPoints = [
  [SPHINX_X + 42, SPHINX_Y],      // Front of head
  [SPHINX_X - 22, SPHINX_Y + 7],  // Back left
  [SPHINX_X - 22, SPHINX_Y - 7],  // Back right
];
sphinxPoints.forEach(pt => {
  const dx = pt[0] - KHAFRE_X;
  const dy = pt[1] - KHAFRE_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxDistFromKhafre) maxDistFromKhafre = dist;
});

const GROUND_RADIUS = maxDistFromKhafre * 1.5;
const groundGeom = new THREE.CircleGeometry(GROUND_RADIUS, 64);
const groundMat = new THREE.MeshBasicMaterial({
  color: 0x808080,
  transparent: true,
  opacity: 0.2,
  side: THREE.DoubleSide
});
const groundPlane = new THREE.Mesh(groundGeom, groundMat);
// CircleGeometry is in XY plane by default, which is horizontal in our Z-up system
groundPlane.position.set(KHAFRE_X, KHAFRE_Y, -0.5);
world.add(groundPlane);

// -----------------------------
// Sky below horizon (darker hemisphere)
// -----------------------------
// SphereGeometry with phiStart/phiLength to create bottom hemisphere
// In Three.js default orientation, phi goes from top (0) to bottom (PI)
// We want the bottom half, so phiStart = PI/2, phiLength = PI/2
const belowHorizonGeom = new THREE.SphereGeometry(
  SKY_RADIUS - 1,  // slightly smaller to avoid z-fighting
  48, 24,
  0, Math.PI * 2,  // full theta (around Y axis)
  Math.PI / 2, Math.PI / 2  // phi from equator to bottom
);
const belowHorizonMat = new THREE.MeshBasicMaterial({
  color: 0x606060,  // slightly darker grey
  transparent: true,
  opacity: 0.25,
  side: THREE.BackSide  // render inside of sphere
});
const belowHorizon = new THREE.Mesh(belowHorizonGeom, belowHorizonMat);
// Rotate to align with Z-up coordinate system (Three.js spheres are Y-up by default)
belowHorizon.rotation.x = Math.PI / 2;
sceneMain.add(belowHorizon);

// -----------------------------
// Error arc between Alnilam beam and shaft line
// Blue curved arc at half sky radius, only visible when angle < 90°
// -----------------------------
const ERROR_ARC_RADIUS = SKY_RADIUS;  // arc at sky sphere
const ERROR_ARC_SEGMENTS = 64;
const errorArcGeom = new THREE.BufferGeometry();
const errorArcPositions = new Float32Array(ERROR_ARC_SEGMENTS * 3);
errorArcGeom.setAttribute('position', new THREE.BufferAttribute(errorArcPositions, 3));
const errorArcMat = new THREE.LineBasicMaterial({
  color: 0x0066ff,
  linewidth: 2,
  depthTest: false,
  depthWrite: false
});
const errorArc = new THREE.Line(errorArcGeom, errorArcMat);
errorArc.frustumCulled = false;
errorArc.renderOrder = 9997;
errorArc.visible = false;
sceneMain.add(errorArc);

// Element to display error angle
const errorAngleEl = document.createElement('div');
errorAngleEl.id = 'errorReadout';
errorAngleEl.style.cssText = `
  position: fixed;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  z-index: 20;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-weight: 900;
  font-size: 36px;
  color: #0066ff;
  text-align: center;
  pointer-events: none;
`;
document.body.appendChild(errorAngleEl);

function updateErrorArc(alnilamDir) {
  // Only show error arc when Khufu is selected (shaft alignment)
  if (currentOriginKey !== 'khufu') {
    errorArc.visible = false;
    errorAngleEl.textContent = '';
    return;
  }

  // Calculate angle between Alnilam direction and shaft direction
  const dotProduct = alnilamDir.dot(shaftDir);
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
  const angleDeg = rad2deg(angle);

  // Only show if angle < 90 degrees
  if (angleDeg >= 90) {
    errorArc.visible = false;
    errorAngleEl.textContent = '';
    return;
  }

  errorArc.visible = true;
  errorAngleEl.textContent = `Δ ${angleDeg.toFixed(1)}°`;

  // Create arc from shaft direction to Alnilam direction
  // Use spherical interpolation (slerp) along the great circle
  const posAttr = errorArc.geometry.getAttribute('position');

  for (let i = 0; i < ERROR_ARC_SEGMENTS; i++) {
    const t = i / (ERROR_ARC_SEGMENTS - 1);

    // For proper great circle interpolation (slerp)
    const sinAngle = Math.sin(angle);
    let p;
    if (sinAngle > 0.001) {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      p = new THREE.Vector3(
        a * shaftDir.x + b * alnilamDir.x,
        a * shaftDir.y + b * alnilamDir.y,
        a * shaftDir.z + b * alnilamDir.z
      ).normalize();
    } else {
      p = new THREE.Vector3().copy(shaftDir);
    }

    posAttr.array[i * 3 + 0] = p.x * ERROR_ARC_RADIUS;
    posAttr.array[i * 3 + 1] = p.y * ERROR_ARC_RADIUS;
    posAttr.array[i * 3 + 2] = p.z * ERROR_ARC_RADIUS;
  }

  posAttr.needsUpdate = true;
}

const skyGroup = new THREE.Group();
skyGroup.name = "SkyGroup";
sceneSky.add(skyGroup);

// Sphere shell (purely for subtle depth / reference)
const skyShell = new THREE.Mesh(
  new THREE.SphereGeometry(SKY_RADIUS, 48, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0.02 })
);
skyGroup.add(skyShell);

let starPoints = null;
let constLines = null;

const statusEl = document.getElementById('loadStatus');

// Utilities: Julian Date + sidereal time
function julianDateFromUTC(date) {
  // date is a JS Date in UTC (we use Date.UTC for construction)
  return (date.getTime() / 86400000.0) + 2440587.5;
}

function gmstRadians(jd) {
  // IAU 1982-ish expression; sufficient for visualization.
  const T = (jd - 2451545.0) / 36525.0;
  let gmstDeg = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T*T
    - (T*T*T) / 38710000.0;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  return deg2rad(gmstDeg);
}


// -----------------------------------------
// Long-term precession (Vondrák et al. 2011 + erratum 2012)
// Supports multi-millennial deep-time visualization (tens of millennia).
// This computes a rotation from J2000 mean equator/equinox to the mean equator/equinox of epoch EPJ.
// -----------------------------------------
const TAU = 6.283185307179586476925287;
const AS2R = 4.848136811095359935899141e-6;      // arcsec -> rad
const EPS0 = 84381.406 * AS2R;                    // J2000 obliquity (rad)

function vDot(a,b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function vCross(a,b){
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}
function vNorm(a){ return Math.sqrt(Math.max(vDot(a,a), 0)); }
function vUnit(a){
  const n = vNorm(a);
  if (n === 0) return [0,0,0];
  return [a[0]/n, a[1]/n, a[2]/n];
}
function matVec(rp, v){
  // rp is 3x3 with ROW vectors; returns rp * v
  return [
    rp[0][0]*v[0] + rp[0][1]*v[1] + rp[0][2]*v[2],
    rp[1][0]*v[0] + rp[1][1]*v[1] + rp[1][2]*v[2],
    rp[2][0]*v[0] + rp[2][1]*v[1] + rp[2][2]*v[2],
  ];
}
function raDecToVec(ra, dec){
  const cosd = Math.cos(dec);
  return [cosd*Math.cos(ra), cosd*Math.sin(ra), Math.sin(dec)];
}
function vecToRaDec(v){
  const r = vNorm(v);
  if (r === 0) return { ra: 0, dec: 0 };
  const x = v[0]/r, y = v[1]/r, z = v[2]/r;
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += TAU;
  const dec = Math.asin(Math.max(-1, Math.min(1, z)));
  return { ra, dec };
}

function ltp_PECL(epj){
  // Long-term precession of the ecliptic pole (returns vector in J2000 frame)
  const pqpol = [
    [ +5851.607687, -1600.886300 ],
    [ -0.1189000,  +1.1689818   ],
    [ -0.00028913, -0.00000020  ],
    [ +0.000000101, -0.000000437],
  ];

  // Periodic terms: [period (centuries), Pc, Qc, Ps, Qs] in arcsec
  const pqper = [
    [ 708.15,  -5486.751211,  -684.661560,   667.666730,  -5523.863691 ],
    [ 2309.00,   -17.127623,  2446.283880, -2354.886252,   -549.747450 ],
    [ 1620.00,  -617.517403,   399.671049,  -428.152441,   -310.998056 ],
    [ 492.20,    413.442940,  -356.652376,   376.202861,    421.535876 ],
    [ 1183.00,    78.614193,  -186.387003,   184.778874,    -36.776172 ],
    [ 622.00,   -180.732815,  -316.800070,   335.321713,   -145.278396 ],
    [ 882.00,    -87.676083,   198.296701,  -185.138669,    -34.744450 ], // corrected per 2012 erratum
    [ 547.00,     46.140315,   101.135679,  -120.972830,     22.885731 ],
  ];

  const T = (epj - 2000.0) / 100.0; // centuries since J2000
  let P = 0.0, Q = 0.0;

  for (let i = 0; i < pqper.length; i++){
    const A = (TAU * T) / pqper[i][0];
    const S = Math.sin(A), C = Math.cos(A);
    P += C*pqper[i][1] + S*pqper[i][3];
    Q += C*pqper[i][2] + S*pqper[i][4];
  }

  let W = 1.0;
  for (let i = 0; i < pqpol.length; i++){
    P += pqpol[i][0] * W;
    Q += pqpol[i][1] * W;
    W *= T;
  }

  P *= AS2R;
  Q *= AS2R;

  const Z = Math.sqrt(Math.max(1.0 - P*P - Q*Q, 0.0));
  const S = Math.sin(EPS0);
  const C = Math.cos(EPS0);

  return [
    P,
    -Q*C - Z*S,
    -Q*S + Z*C
  ];
}

function ltp_PEQU(epj){
  // Long-term precession of the equator pole (returns vector in J2000 frame)
  const xypol = [
    [ +5453.282155, -73750.930350 ],
    [ +0.4252841,   -0.7675452   ],
    [ -0.00037173,  -0.00018725  ],
    [ -0.000000152, +0.000000231 ],
  ];

  // Periodic terms: [period (centuries), Xc, Yc, Xs, Ys] in arcsec
  const xyper = [
    [ 256.75,  -819.940624,  75004.344875, 81491.287984,  1558.515853 ],
    [ 708.15, -8444.676815,    624.033993,   787.163481,  7774.939698 ],
    [ 274.20,  2600.009459,   1251.136893,  1251.296102, -2219.534038 ],
    [ 241.45,  2755.175630,  -1102.212834, -1257.950837, -2523.969396 ],
    [ 2309.00,  -167.659835,  -2660.664980, -2966.799730,  247.850422 ],
    [ 492.20,    871.855056,    699.291817,   639.744522, -846.485643 ],
    [ 396.10,     44.769698,    153.167220,   131.600209, -1393.124055 ],
    [ 288.90,   -512.313065,   -950.865637,  -445.040117,  368.526116 ],
    [ 231.10,   -819.415595,    499.754645,   584.522874,  749.045012 ],
    [ 1610.00,  -538.071099,   -145.188210,   -89.756563,  444.704518 ],
    [ 620.00,   -189.793622,    558.116553,   524.429630,  235.934465 ],
    [ 157.87,   -402.922932,    -23.923029,   -13.549067,  374.049623 ],
    [ 220.30,    179.516345,   -165.405086,  -210.157124, -171.330180 ],
    [ 1200.00,    -9.814756,      9.344131,   -44.919798,  -22.899655 ],
  ];

  const T = (epj - 2000.0) / 100.0;
  let X = 0.0, Y = 0.0;

  for (let i = 0; i < xyper.length; i++){
    const A = (TAU * T) / xyper[i][0];
    const S = Math.sin(A), C = Math.cos(A);
    X += C*xyper[i][1] + S*xyper[i][3];
    Y += C*xyper[i][2] + S*xyper[i][4];
  }

  let W = 1.0;
  for (let i = 0; i < xypol.length; i++){
    X += xypol[i][0] * W;
    Y += xypol[i][1] * W;
    W *= T;
  }

  X *= AS2R;
  Y *= AS2R;

  const Wxy = X*X + Y*Y;
  const Z = (Wxy < 1.0) ? Math.sqrt(1.0 - Wxy) : 0.0;
  return [ X, Y, Z ];
}

function ltp_PMAT(epj){
  // Long-term precession matrix: J2000 -> mean equator/equinox of date EPJ.
  const peqr = ltp_PEQU(epj);          // equator pole (row 3)
  const pecl = ltp_PECL(epj);          // ecliptic pole
  const eqx  = vUnit(vCross(peqr, pecl));     // equinox direction (row 1)
  const yrow = vCross(peqr, eqx);             // row 2

  return [ eqx, yrow, peqr ];
}

function equatorialJ2000ToHorizontalUnit(raJ2000, decJ2000, jd, latRad, lonRad, rp){
  // Precess J2000 direction into date frame, then compute horizontal direction for the observer.
  const v0 = raDecToVec(raJ2000, decJ2000);
  const vD = matVec(rp, v0);
  const { ra, dec } = vecToRaDec(vD);
  return equatorialToHorizontalUnit(ra, dec, jd, latRad, lonRad);
}

function equatorialToHorizontalUnit(raRad, decRad, jd, latRad, lonRad) {
  // lonRad: east-positive
  const lst = gmstRadians(jd) + lonRad;
  const H = lst - raRad; // hour angle

  const sinDec = Math.sin(decRad), cosDec = Math.cos(decRad);
  const sinLat = Math.sin(latRad), cosLat = Math.cos(latRad);

  const sinAlt = sinDec*sinLat + cosDec*cosLat*Math.cos(H);
  const alt = Math.asin(sinAlt);

  // Azimuth measured from North towards East
  const cosAlt = Math.cos(alt);
  const sinAz = -cosDec * Math.sin(H) / Math.max(1e-12, cosAlt);
  const cosAz = (sinDec - sinAlt*sinLat) / Math.max(1e-12, (cosAlt*cosLat));
  let az = Math.atan2(sinAz, cosAz);
  if (az < 0) az += Math.PI * 2;

  // Convert to local ENU -> our world axes (X=E, Y=N, Z=Up)
  const x = cosAlt * Math.sin(az);
  const y = cosAlt * Math.cos(az);
  const z = Math.sin(alt);
  return { x, y, z };
}

function magToIntensity(mag) {
  // simple and stable mapping (not photometrically exact)
  // mag range approx [-1..6] -> intensity [1..0.08]
  const m = Math.max(-1, Math.min(6, mag));
  const t = (m + 1) / 7;         // 0..1
  const intensity = Math.pow(1.0 - t, 2.2) * 0.95 + 0.05;
  return intensity;
}

// Parse d3-celestial stars.6.json (format can vary; handle common cases)
function parseStars(data) {
  const stars = [];
  if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    for (const f of data.features) {
      if (!f || !f.geometry || !Array.isArray(f.geometry.coordinates)) continue;
      const [lon, lat] = f.geometry.coordinates; // lon ~ RA in degrees (often -180..180), lat ~ Dec in degrees
      const raDeg = ((lon % 360) + 360) % 360;
      const decDeg = lat;
      const mag = (f.properties && (f.properties.mag ?? f.properties.magnitude)) ?? 6.0;
      stars.push({ raRad: deg2rad(raDeg), decRad: deg2rad(decDeg), mag: Number(mag) });
    }
  } else if (Array.isArray(data)) {
    // often array of [lon, lat, mag, ...]
    for (const row of data) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const lon = row[0], lat = row[1], mag = row[2];
      const raDeg = ((lon % 360) + 360) % 360;
      stars.push({ raRad: deg2rad(raDeg), decRad: deg2rad(lat), mag: Number(mag) });
    }
  }
  return stars;
}

// Parse d3-celestial constellations.lines.json (GeoJSON LineString/MultiLineString)
function parseConstellationSegments(data) {
  const segments = [];
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return segments;

  for (const f of data.features) {
    if (!f || !f.geometry) continue;
    const g = f.geometry;
    const constId = f.id || (f.properties && f.properties.id) || 'unknown';
    const coordsList = [];
    if (g.type === 'LineString') coordsList.push(g.coordinates);
    if (g.type === 'MultiLineString') coordsList.push(...g.coordinates);

    for (const line of coordsList) {
      if (!Array.isArray(line) || line.length < 2) continue;
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i+1];
        if (!a || !b) continue;
        const ra1 = deg2rad(((a[0] % 360) + 360) % 360);
        const de1 = deg2rad(a[1]);
        const ra2 = deg2rad(((b[0] % 360) + 360) % 360);
        const de2 = deg2rad(b[1]);
        segments.push({ ra1, de1, ra2, de2, constId });
      }
    }
  }
  return segments;
}


// -----------------------------
// Load sky datasets (stars + constellation lines)
// -----------------------------
async function loadSkyData() {
  statusEl.textContent = "Loading sky data…";
  const starsUrl = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/stars.6.json";
  const linesUrl = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/constellations.lines.json";

  const [starsResp, linesResp] = await Promise.all([
    fetch(starsUrl, { mode: "cors" }),
    fetch(linesUrl, { mode: "cors" })
  ]);

  if (!starsResp.ok) throw new Error(`Stars load failed: ${starsResp.status} ${starsResp.statusText}`);
  if (!linesResp.ok) throw new Error(`Constellations load failed: ${linesResp.status} ${linesResp.statusText}`);

  const [starsJson, linesJson] = await Promise.all([starsResp.json(), linesResp.json()]);

  starsData = parseStars(starsJson);
  constSegs = parseConstellationSegments(linesJson);

  if (!starsData.length) throw new Error("Stars dataset parsed to 0 points.");
  if (!constSegs.length) throw new Error("Constellation dataset parsed to 0 segments.");

  // Build scene objects once; geometry is updated per-time in updateSkyForJD().
  if (!starPoints) {
    starPoints = buildStarsObject();
    skyGroup.add(starPoints);
  }
  if (!constLines) {
    constLines = buildConstLinesObject();
    skyGroup.add(constLines);
  }

  // Make sky elements visible
  skyGroup.visible = true;
  if (starPoints) starPoints.visible = true;
  if (constLines) constLines.visible = true;

  if (statusEl) statusEl.textContent = '';
  scheduleSkyUpdate();
}

// Create Three.js objects for stars and lines; update their geometry when time changes.
let starsData = [];
let constSegs = [];

function buildStarsObject() {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(starsData.length * 3);
  const colors = new Float32Array(starsData.length * 3);

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: true  // Enable depth test so pyramids occlude stars
  });

  const pts = new THREE.Points(geom, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  return pts;
}

function buildConstLinesObject() {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(constSegs.length * 2 * 3);
  const colors = new Float32Array(constSegs.length * 2 * 3);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    depthTest: true
  });
  const lines = new THREE.LineSegments(geom, mat);
  lines.frustumCulled = false;
  lines.renderOrder = -5;
  return lines;
}

    let pendingSkyUpdate = true;
function scheduleSkyUpdate() { pendingSkyUpdate = true; }

function updateSkyForJD(jd, epj) {
  const latRad = deg2rad(REF_LAT_DEG);
  const lonRad = deg2rad(REF_LON_DEG);
  const rp = ltp_PMAT(epj);

  // Stars
  if (starPoints) {
    const posAttr = starPoints.geometry.getAttribute('position');
    const colAttr = starPoints.geometry.getAttribute('color');

    for (let i = 0; i < starsData.length; i++) {
      const s = starsData[i];
      const v = equatorialJ2000ToHorizontalUnit(s.raRad, s.decRad, jd, latRad, lonRad, rp);
      const idx = i * 3;
      posAttr.array[idx+0] = v.x * SKY_RADIUS;
      posAttr.array[idx+1] = v.y * SKY_RADIUS;
      posAttr.array[idx+2] = v.z * SKY_RADIUS;

      const inten = magToIntensity(s.mag);
      const ink = 0.10 + (1.0 - inten) * 0.55; // 0.10 (black-ish) .. 0.65 (mid-gray)
      colAttr.array[idx+0] = ink;
      colAttr.array[idx+1] = ink;
      colAttr.array[idx+2] = ink;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  // Constellation lines
  if (constLines) {
    const posAttr = constLines.geometry.getAttribute('position');
    const colAttr = constLines.geometry.getAttribute('color');

    // Zodiac constellation IDs (IAU abbreviations)
    const ZODIAC = new Set(['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc']);

    // First pass: calculate positions and find nearest ZODIAC constellation to Sphinx sight line
    let nearestConstId = null;
    let nearestDist = Infinity;

    // Sphinx sight direction (where the blue line points)
    const sphinxTarget = new THREE.Vector3(
      sphinxSightDir.x * SKY_RADIUS,
      sphinxSightDir.y * SKY_RADIUS,
      sphinxSightDir.z * SKY_RADIUS
    );

    const segPositions = [];
    for (const seg of constSegs) {
      const v1 = equatorialJ2000ToHorizontalUnit(seg.ra1, seg.de1, jd, latRad, lonRad, rp);
      const v2 = equatorialJ2000ToHorizontalUnit(seg.ra2, seg.de2, jd, latRad, lonRad, rp);

      const p1 = new THREE.Vector3(v1.x * SKY_RADIUS, v1.y * SKY_RADIUS, v1.z * SKY_RADIUS);
      const p2 = new THREE.Vector3(v2.x * SKY_RADIUS, v2.y * SKY_RADIUS, v2.z * SKY_RADIUS);
      segPositions.push({ p1, p2, constId: seg.constId });

      // Find distance from segment midpoint to sphinx target (only for zodiac constellations)
      if (currentOriginKey === 'sphinx' && ZODIAC.has(seg.constId)) {
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dist = mid.distanceTo(sphinxTarget);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestConstId = seg.constId;
        }
      }
    }

    // Second pass: write positions and colors
    let w = 0;
    let c = 0;
    for (let i = 0; i < constSegs.length; i++) {
      const { p1, p2, constId } = segPositions[i];

      posAttr.array[w++] = p1.x;
      posAttr.array[w++] = p1.y;
      posAttr.array[w++] = p1.z;
      posAttr.array[w++] = p2.x;
      posAttr.array[w++] = p2.y;
      posAttr.array[w++] = p2.z;

      // Color: red if nearest constellation in Sphinx mode, else black
      const isHighlighted = (currentOriginKey === 'sphinx' && constId === nearestConstId);
      const r = isHighlighted ? 0.85 : 0.0;
      const g = 0.0;
      const b = 0.0;

      // Both vertices of the segment get same color
      colAttr.array[c++] = r; colAttr.array[c++] = g; colAttr.array[c++] = b;
      colAttr.array[c++] = r; colAttr.array[c++] = g; colAttr.array[c++] = b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  // Alnilam beam + angle readout
  {
    const vA = equatorialJ2000ToHorizontalUnit(ALNILAM_RA_RAD, ALNILAM_DEC_RAD, jd, latRad, lonRad, rp);
    const dir = new THREE.Vector3(vA.x, vA.y, vA.z).normalize();

    const length = SKY_RADIUS;  // extend to sky sphere
    alnilamBeam.scale.set(BEAM_RADIUS, length, BEAM_RADIUS);
    alnilamBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    alnilamBeam.position.copy(dir.clone().multiplyScalar(length / 2));

    // Azimuth from North towards East; Altitude above horizon
    let az = Math.atan2(dir.x, dir.y);
    if (az < 0) az += Math.PI * 2;
    const alt = Math.asin(Math.max(-1, Math.min(1, dir.z)));

    angleEl.innerHTML = `AZ ${rad2deg(az).toFixed(1)}°<div class="sub">ALT ${rad2deg(alt).toFixed(1)}°</div>`;

    // Update error arc between Alnilam and shaft
    updateErrorArc(dir);
  }
}

// -----------------------------

// -----------------------------
// Time UI (supports deep-time years)
// -----------------------------
const yearSlider = document.getElementById('yearSlider');
const yearInput  = document.getElementById('yearInput');
const yearBig    = document.getElementById('yearBig');
const doySlider  = document.getElementById('doySlider');
const doyLabel   = document.getElementById('doyLabel');
const timeSlider = document.getElementById('timeSlider');
const timeLabel  = document.getElementById('timeLabel');

// -----------------------------
// Origin selection (which pyramid base center is treated as (0,0,0))
// -----------------------------
const originRadios = Array.from(document.querySelectorAll('input[name="origin"]'));
function applyOrigin() {
  // Translate all geometry so that the selected pyramid center becomes the world origin.
  const off = ORIGIN_SITES[currentOriginKey].offset;
  world.position.copy(off.clone().multiplyScalar(-1));

  // Update observer coordinates for sky math
  REF_LAT_DEG = ORIGIN_SITES[currentOriginKey].lat;
  REF_LON_DEG = ORIGIN_SITES[currentOriginKey].lon;
  updateCoordDisplay();

  // Show/hide directional lines based on selected origin
  shaftLine.visible = (currentOriginKey === 'khufu');
  alnilamBeam.visible = (currentOriginKey === 'khufu');
  errorArc.visible = (currentOriginKey === 'khufu');
  sphinxSightLine.visible = (currentOriginKey === 'sphinx');

  scheduleSkyUpdate();
}

originRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (!r.checked) return;
    currentOriginKey = r.value;
    applyOrigin();
  });
});

// -----------------------------
// Quick time buttons
// -----------------------------
const btnMidnight = document.getElementById('btnMidnight');
const btnDawn     = document.getElementById('btnDawn');

function setTimeHours(hours) {
  const h = Math.max(0, Math.min(24, hours));
  timeSlider.value = h.toFixed(2);
  updateTimeLabels();
  scheduleSkyUpdate();
}

// Civil dawn definition: Sun's center at -6° altitude (start of morning civil twilight).
// We compute an approximate UTC time by searching across the day.
function sunRaDecApprox(jd) {
  // Low-precision solar position (sufficient for dawn button visualization).
  // Mean longitude / anomaly referenced to J2000.
  const n = jd - 2451545.0;
  const L = deg2rad((280.460 + 0.9856474 * n) % 360);
  const g = deg2rad((357.528 + 0.9856003 * n) % 360);
  const lambda = L + deg2rad(1.915) * Math.sin(g) + deg2rad(0.020) * Math.sin(2*g);
  const eps = deg2rad(23.439 - 0.0000004 * n);

  const sinLam = Math.sin(lambda), cosLam = Math.cos(lambda);
  const ra  = Math.atan2(Math.cos(eps) * sinLam, cosLam);
  const dec = Math.asin(Math.sin(eps) * sinLam);

  return { ra: (ra < 0 ? ra + Math.PI*2 : ra), dec };
}

function azAltFromRaDec(raRad, decRad, jd, latRad, lonRad) {
  const lst = gmstRadians(jd) + lonRad;
  const H = lst - raRad;

  const sinDec = Math.sin(decRad), cosDec = Math.cos(decRad);
  const sinLat = Math.sin(latRad), cosLat = Math.cos(latRad);

  const sinAlt = sinDec*sinLat + cosDec*cosLat*Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAlt = Math.cos(alt);
  const sinAz = -cosDec * Math.sin(H) / Math.max(1e-12, cosAlt);
  const cosAz = (sinDec - sinAlt*sinLat) / Math.max(1e-12, (cosAlt*cosLat));
  let az = Math.atan2(sinAz, cosAz);
  if (az < 0) az += Math.PI * 2;

  return { az, alt };
}

function findCivilDawnUTHours(y, doy, latDeg, lonDeg) {
  const { m, d } = monthDayFromDOY(y, doy);
  const latRad = deg2rad(latDeg);
  const lonRad = deg2rad(lonDeg);

  const targetAlt = deg2rad(-6.0); // civil dawn
  let bestT = 6.0;
  let bestErr = 1e9;

  // Coarse scan (every 5 minutes) to find a bracket near the rising crossing.
  let prevAlt = null;
  let prevT = null;
  for (let t = 0; t <= 24; t += (5/60)) {
    const hh = Math.floor(t);
    const mm = Math.round((t - hh) * 60);
    const jd = julianDayFromYMDHMS(y, m, d, hh, mm, 0);
    const { ra, dec } = sunRaDecApprox(jd);
    const { alt } = azAltFromRaDec(ra, dec, jd, latRad, lonRad);

    const err = Math.abs(alt - targetAlt);
    if (err < bestErr) { bestErr = err; bestT = t; }

    if (prevAlt !== null) {
      // rising crossing: prev below target, now above target
      if (prevAlt < targetAlt && alt >= targetAlt) {
        // refine with binary search in [prevT, t]
        let a = prevT, b = t;
        for (let i = 0; i < 28; i++) {
          const mid = (a + b) / 2;
          const hhm = Math.floor(mid);
          const mmm = Math.round((mid - hhm) * 60);
          const jdM = julianDayFromYMDHMS(y, m, d, hhm, mmm, 0);
          const s = sunRaDecApprox(jdM);
          const aa = azAltFromRaDec(s.ra, s.dec, jdM, latRad, lonRad).alt;
          if (aa < targetAlt) a = mid; else b = mid;
        }
        return (a + b) / 2;
      }
    }
    prevAlt = alt;
    prevT = t;
  }

  // Fallback: return the closest time if no crossing found.
  return bestT;
}

if (btnMidnight) btnMidnight.addEventListener('click', () => setTimeHours(0.0));
if (btnDawn) btnDawn.addEventListener('click', () => {
  const y = Number(yearSlider.value);
  const doy = Number(doySlider.value);
  const t = findCivilDawnUTHours(y, doy, REF_LAT_DEG, REF_LON_DEG);
  setTimeHours(t);
});


function pad2(n) { return String(n).padStart(2, '0'); }
function mod(a, n) { return ((a % n) + n) % n; }

function astroYearToLabel(y) {
  // Astronomical year numbering: 0 = 1 BCE, -1 = 2 BCE, etc.
  if (y > 0) return `${y} CE`;
  if (y === 0) return `1 BCE`;
  return `${1 - y} BCE`;
}

function isLeapYear(y) {
  // Proleptic Gregorian leap rule, extended to negative years.
  const y400 = mod(y, 400);
  const y100 = mod(y, 100);
  const y4   = mod(y, 4);
  return (y4 === 0) && (y100 !== 0 || y400 === 0);
}

function monthDayFromDOY(y, doy) {
  const leap = isLeapYear(y);
  const ml = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let m = 1;
  let d = doy;
  for (let i = 0; i < 12; i++) {
    if (d > ml[i]) { d -= ml[i]; m++; } else break;
  }
  // clamp
  if (m < 1) m = 1;
  if (m > 12) m = 12;
  if (d < 1) d = 1;
  if (d > ml[m-1]) d = ml[m-1];
  return { m, d };
}

function doyFromMonthDay(y, m, d) {
  const leap = isLeapYear(y);
  const ml = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = 0;
  for (let i = 0; i < m-1; i++) doy += ml[i];
  return doy + d;
}

function julianDayFromYMDHMS(y, m, d, hh, mm, ss) {
  // Proleptic Gregorian calendar, valid for negative years in astronomical numbering.
  // Algorithm follows the standard Fliegel–Van Flandern / Meeus-style JD construction.
  let Y = y;
  let M = m;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = (hh + (mm + ss / 60) / 60) / 24;
  const JD = Math.floor(365.25 * (Y + 4716))
           + Math.floor(30.6001 * (M + 1))
           + d + B - 1524.5 + dayFrac;
  return JD;
}

function getSelectedJDandEPJ() {
  const y = Number(yearInput.value);
  const doy = Number(doySlider.value);
  const hourFloat = Number(timeSlider.value);
  const hh = Math.floor(hourFloat);
  const mm = Math.round((hourFloat - hh) * 60);
  const { m, d } = monthDayFromDOY(y, doy);

  const jd = julianDayFromYMDHMS(y, m, d, hh, mm, 0);

  // Julian epoch (TT). For deep-time visualization we approximate TT ≈ UTC/UT.
  const epj = 2000.0 + (jd - 2451545.0) / 365.25;

  return { jd, epj, y, m, d, hh, mm, doy };
}

function updateTimeLabels() {
  const { y, m, d, hh, mm, doy } = getSelectedJDandEPJ();
  if (yearBig) yearBig.textContent = astroYearToLabel(y);
  doyLabel.textContent = `${pad2(m)}-${pad2(d)} (DOY ${doy})`;
  timeLabel.textContent = `${pad2(hh)}:${pad2(mm)} UTC`;
}

function setDefaults() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  yearSlider.min = String(currentYear - 40000);
  yearSlider.max = String(currentYear);
  yearSlider.value = String(currentYear);

  yearInput.value = String(currentYear);

  const doy = doyFromMonthDay(currentYear, now.getUTCMonth() + 1, now.getUTCDate());
  doySlider.value = String(doy);

  const hours = now.getUTCHours() + now.getUTCMinutes()/60;
  timeSlider.value = hours.toFixed(2);

  updateTimeLabels();
}

function renderDynastyTrack() {
  const track = document.getElementById('dynastyTrack');
  if (!track) return;

  const min = Number(yearSlider.min);
  const max = Number(yearSlider.max);
  const range = max - min;

  track.innerHTML = '';

  for (const d of DYNASTIES) {
    const left = ((d.start - min) / range) * 100;
    const width = ((d.end - d.start) / range) * 100;

    // Skip if completely outside visible range
    if (left + width < 0 || left > 100) continue;

    const el = document.createElement('div');
    el.className = 'dynasty';
    el.style.left = Math.max(0, left) + '%';
    el.style.width = Math.min(100 - Math.max(0, left), width) + '%';
    el.style.background = d.color;
    el.textContent = d.name;
    el.title = `${d.name}: ${Math.abs(d.start)} BCE – ${d.end < 0 ? Math.abs(d.end) + ' BCE' : d.end + ' CE'}`;
    track.appendChild(el);
  }
}

function syncYearFromInput() {
  let y = Number(yearInput.value);
  if (!Number.isFinite(y)) y = Number(yearSlider.value);
  y = Math.max(Number(yearSlider.min), Math.min(Number(yearSlider.max), Math.round(y)));
  yearInput.value = String(y);
  yearSlider.value = String(y);
  updateTimeLabels();
  scheduleSkyUpdate();
}

// Find when Alnilam culminates (transits) closest to midnight for best visibility
function findAlnilamCulmination(y) {
  // Get precessed RA of Alnilam for this year
  const jdMid = julianDayFromYMDHMS(y, 6, 21, 0, 0, 0);
  const epj = 2000.0 + (jdMid - 2451545.0) / 365.25;
  const rp = ltp_PMAT(epj);
  const v0 = raDecToVec(ALNILAM_RA_RAD, ALNILAM_DEC_RAD);
  const vD = matVec(rp, v0);
  const { ra } = vecToRaDec(vD);

  const lonRad = deg2rad(REF_LON_DEG);

  // Search each day of the year to find when transit is closest to midnight
  let bestDoy = 1;
  let bestTime = 0;
  let bestMidnightDist = Infinity;

  for (let doy = 1; doy <= 365; doy++) {
    const { m, d } = monthDayFromDOY(y, doy);
    const jd0 = julianDayFromYMDHMS(y, m, d, 0, 0, 0);

    // Find transit time on this day (when LST = RA)
    for (let t = 0; t < 24; t += 0.1) {
      const jd = jd0 + t / 24;
      const gmst = gmstRadians(jd);
      const lst = gmst + lonRad;
      let diff = lst - ra;
      // Normalize to [0, 2π] then find shortest angular distance
      diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      if (diff < 0.02) { // close to transit
        // Distance from midnight (0 or 24)
        const midDist = Math.min(t, 24 - t);
        if (midDist < bestMidnightDist) {
          bestMidnightDist = midDist;
          bestDoy = doy;
          bestTime = t;
        }
        break; // found transit for this day
      }
    }
  }

  return { doy: bestDoy, time: bestTime };
}


// Apply snap mode settings (used by both year slider and snap mode radio clicks)
function applySnapMode() {
  const mode = document.querySelector('input[name="snapMode"]:checked').value;
  const y = Number(yearInput.value);

  if (mode === 'solstice') {
    // Summer solstice midnight - only change what's needed
    doySlider.value = '172';
    timeSlider.value = '0';
  } else if (mode === 'dawn') {
    // Summer solstice dawn (6:00 AM)
    doySlider.value = '172';
    timeSlider.value = '6';
  } else {
    // Alnilam culmination - find when it transits closest to midnight
    const { doy, time } = findAlnilamCulmination(y);
    doySlider.value = String(doy);
    timeSlider.value = time.toFixed(2);
  }

  updateTimeLabels();
  scheduleSkyUpdate();
}

// Snap mode radio buttons - apply immediately when clicked
document.querySelectorAll('input[name="snapMode"]').forEach(radio => {
  radio.addEventListener('change', applySnapMode);
});

yearSlider.addEventListener('input', () => {
  // Snap to 95-year increments
  let y = Number(yearSlider.value);
  y = Math.round(y / 95) * 95;
  yearInput.value = String(y);

  applySnapMode();
});

yearInput.addEventListener('change', () => {
  syncYearFromInput();
  scheduleSkyUpdate();
});

doySlider.addEventListener('input', () => {
  updateTimeLabels();
  scheduleSkyUpdate();
});

timeSlider.addEventListener('input', () => {
  updateTimeLabels();
  scheduleSkyUpdate();
});


// -----------------------------
// FIND ALIGNMENT - animated search
// -----------------------------
function calculateErrorAngle(year) {
  // Find optimal day/time when Alnilam is highest for this year
  const { doy, time } = findAlnilamCulmination(year);
  const { m, d } = monthDayFromDOY(year, doy);
  const hh = Math.floor(time);
  const mm = Math.round((time - hh) * 60);

  const jd = julianDayFromYMDHMS(year, m, d, hh, mm, 0);
  const epj = 2000.0 + (jd - 2451545.0) / 365.25;
  const rp = ltp_PMAT(epj);

  const latRad = deg2rad(REF_LAT_DEG);
  const lonRad = deg2rad(REF_LON_DEG);

  const vA = equatorialJ2000ToHorizontalUnit(ALNILAM_RA_RAD, ALNILAM_DEC_RAD, jd, latRad, lonRad, rp);
  const dir = new THREE.Vector3(vA.x, vA.y, vA.z).normalize();

  const dotProduct = dir.dot(shaftDir);
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
  return rad2deg(angle);
}

let alignmentSearchActive = false;

async function findAlignment() {
  if (alignmentSearchActive) return;
  alignmentSearchActive = true;

  const btn = document.getElementById('btnFindAlignment');
  btn.disabled = true;
  btn.textContent = 'SEARCHING...';

  // Switch to "Alnilam highest" mode
  const culminationRadio = document.querySelector('input[name="snapMode"][value="culmination"]');
  if (culminationRadio) culminationRadio.checked = true;

  const minYear = Number(yearSlider.min);
  const maxYear = Number(yearSlider.max);
  const stepSize = 100; // Always 100 years
  const targetError = 0.5;

  let year = Number(yearInput.value);
  let currentError = calculateErrorAngle(year);
  let iterations = 0;
  const maxIterations = 5000;

  console.log('=== FIND ALIGNMENT START ===');
  console.log(`Starting year: ${year}, stepSize: ${stepSize}, target: ${targetError}°`);
  console.log(`Initial error: ${currentError.toFixed(2)}°`);

  while (currentError > targetError && iterations < maxIterations) {
    // Sample error in both directions
    const errorMinus = calculateErrorAngle(year - stepSize);
    const errorPlus = calculateErrorAngle(year + stepSize);

    console.log(`[${iterations}] year=${year}, err=${currentError.toFixed(2)}°, err-=${errorMinus.toFixed(2)}°, err+=${errorPlus.toFixed(2)}°`);

    // Move in the direction that reduces error
    if (errorMinus < currentError && errorMinus <= errorPlus) {
      console.log(`  -> Moving BACK ${stepSize} years`);
      year -= stepSize;
      currentError = errorMinus;
    } else if (errorPlus < currentError) {
      console.log(`  -> Moving FORWARD ${stepSize} years`);
      year += stepSize;
      currentError = errorPlus;
    } else {
      // Neither direction improves - this is the best we can do with 100-year steps
      console.log(`  -> LOCAL MINIMUM at ${year}, error ${currentError.toFixed(2)}°`);
      break;
    }

    // Clamp to valid range
    year = Math.max(minYear, Math.min(maxYear, year));

    // Update UI
    const { doy, time } = findAlnilamCulmination(year);
    doySlider.value = String(doy);
    timeSlider.value = time.toFixed(2);
    yearInput.value = String(year);
    yearSlider.value = String(year);
    updateTimeLabels();
    scheduleSkyUpdate();

    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
    iterations++;
  }

  // Done
  btn.disabled = false;
  btn.textContent = 'FIND ALIGNMENT';
  alignmentSearchActive = false;

  console.log('=== COMPLETE ===');
  console.log(`Final: year ${year}, error ${currentError.toFixed(2)}°, iterations: ${iterations}`);

  const resultYear = astroYearToLabel(year);
  alert(`Alignment found at ${resultYear}\nError: ${currentError.toFixed(2)}°`);
}

document.getElementById('btnFindAlignment').addEventListener('click', findAlignment);


// -----------------------------
// Start
// -----------------------------
setDefaults();
renderDynastyTrack();
applyOrigin();
try {
  await loadSkyData();
} catch (err) {
  console.error(err);
  statusEl.textContent = `Sky load error: ${err.message}`;
}

// -----------------------------
// Render loop
// -----------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (pendingSkyUpdate && starPoints && constLines) {
    pendingSkyUpdate = false;
    updateTimeLabels();
    const { jd, epj } = getSelectedJDandEPJ();
    updateSkyForJD(jd, epj);
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(sceneMain, camera); // Render main scene first (writes depth)
  renderer.render(sceneSky, camera);  // Render sky (stars check depth, get occluded by pyramids)
}
animate();
