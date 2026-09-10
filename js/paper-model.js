import * as THREE from 'three';

/**
 * Procedural Paper Models:
 * 1. Folded Paper Chits for inside the glass bowl (with natural variations)
 * 2. Articulated 3D Unfolding Paper Mesh for the cinematic reveal
 * 3. Dynamic High-Res Canvas Texture Generator for the unfolded parchment note
 */

// Generates procedural folded chit texture with paper grain & gold foil crease
export function createChitTexture(tint = '#fbf7ee') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base parchment gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, tint);
  grad.addColorStop(0.5, '#ede4d1');
  grad.addColorStop(1, '#dfd2ba');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Paper noise / fiber grain
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Fold creases lines
  ctx.strokeStyle = 'rgba(100, 70, 40, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Highlight crease edges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(258, 0);
  ctx.lineTo(258, 512);
  ctx.moveTo(0, 258);
  ctx.lineTo(512, 258);
  ctx.stroke();

  // Subtle gold border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 488, 488);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generates the full high-res unfolded parchment note texture with the selected name
export function createUnfoldedNoteTexture(name, isWinner = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Rich parchment paper background
  const bgGrad = ctx.createRadialGradient(512, 512, 50, 512, 512, 600);
  bgGrad.addColorStop(0, '#fffdfa');
  bgGrad.addColorStop(0.6, '#f9f3e3');
  bgGrad.addColorStop(0.9, '#ebdcc1');
  bgGrad.addColorStop(1, '#d8be97');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Paper fiber noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Faint fold creases on the opened letter
  ctx.strokeStyle = 'rgba(120, 90, 60, 0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, 340);
  ctx.lineTo(924, 340);
  ctx.moveTo(100, 680);
  ctx.lineTo(924, 680);
  ctx.stroke();

  // 4. Ornate Gold Filigree Borders
  ctx.strokeStyle = '#cda250';
  ctx.lineWidth = 8;
  ctx.strokeRect(50, 50, 924, 924);

  ctx.strokeStyle = '#e8c878';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, 900, 900);

  // Corner ornaments
  const drawCorner = (x, y, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#cda250';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 0.5);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.strokeStyle = '#f5df9e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 0.5);
    ctx.stroke();
    ctx.restore();
  };

  drawCorner(50, 50, 0);
  drawCorner(974, 50, Math.PI * 0.5);
  drawCorner(974, 974, Math.PI);
  drawCorner(50, 974, Math.PI * 1.5);

  // 5. Header: "SPIN LUCK - OFFICIAL DRAW"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 36px "Cinzel", "Georgia", "Playfair Display", serif';
  ctx.fillStyle = '#8c6b2d';
  ctx.letterSpacing = '8px';
  ctx.fillText('✦ SPIN LUCK ✦', 512, 140);

  ctx.font = '500 22px "Outfit", "Inter", sans-serif';
  ctx.fillStyle = '#7a6645';
  ctx.fillText('LUCKY CHIT WINNER • भाग्यशाली पर्ची', 512, 195);

  // Divider line with diamond
  ctx.strokeStyle = '#cda250';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(260, 230);
  ctx.lineTo(764, 230);
  ctx.stroke();

  ctx.fillStyle = '#cda250';
  ctx.beginPath();
  ctx.arc(512, 230, 7, 0, Math.PI * 2);
  ctx.fill();

  // 6. Selected Name in Grand Calligraphy / Gold Emboss
  const displayName = name ? name.toUpperCase() : 'LUCKY WINNER';

  // Outer glowing shadow
  ctx.shadowColor = 'rgba(218, 165, 32, 0.45)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Name font scaling based on length
  let fontSize = 92;
  if (displayName.length > 8) fontSize = 76;
  if (displayName.length > 12) fontSize = 60;

  ctx.font = `900 ${fontSize}px "Cinzel", "Playfair Display", "Georgia", serif`;

  // Gold gradient text fill
  const nameGrad = ctx.createLinearGradient(200, 440, 800, 560);
  nameGrad.addColorStop(0, '#593808');
  nameGrad.addColorStop(0.3, '#9d7429');
  nameGrad.addColorStop(0.5, '#d4af37');
  nameGrad.addColorStop(0.7, '#f7e396');
  nameGrad.addColorStop(1, '#684511');

  ctx.fillStyle = nameGrad;
  ctx.fillText(displayName, 512, 500);

  // Reset shadow for crispness
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Gold outline stroke on name
  ctx.strokeStyle = '#3a2405';
  ctx.lineWidth = 2.5;
  ctx.strokeText(displayName, 512, 500);

  // Hindi translation or congratulations subtitle
  ctx.font = '600 32px "Outfit", "Noto Sans Devanagari", sans-serif';
  ctx.fillStyle = '#8b5a1b';
  ctx.fillText(`🎉 बधाई हो! Congratulations! 🎉`, 512, 600);

  // 7. Official Wax / Foil Seal
  ctx.save();
  ctx.translate(512, 780);

  // Seal outer rim
  ctx.fillStyle = '#a62424';
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = '#e6c875';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Seal inner star & text
  ctx.fillStyle = '#fce49f';
  ctx.font = 'bold 22px "Cinzel", serif';
  ctx.fillText('★ VERIFIED ★', 0, -10);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('WINNER', 0, 18);
  ctx.restore();

  // 8. Footer date & luck quote
  ctx.font = 'italic 18px "Georgia", serif';
  ctx.fillStyle = '#8c785c';
  ctx.fillText('“Fortune favours the bold”', 512, 920);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a single realistic 3D Folded Chit mesh to be placed inside the glass bowl.
 */
export function createFoldedChitMesh(name, index, tintColor = 0xfcf8ee) {
  const group = new THREE.Group();
  group.name = `Chit_${name}_${index}`;
  group.userData = { name, index, isChit: true };

  const chitTexture = createChitTexture(
    ['#fffdf7', '#fdf7e7', '#fcf2db', '#fbf4e6', '#f6edd9'][index % 5]
  );

  const chitMaterial = new THREE.MeshStandardMaterial({
    map: chitTexture,
    color: tintColor,
    roughness: 0.65,
    metalness: 0.08,
    bumpMap: chitTexture,
    bumpScale: 0.02,
    side: THREE.DoubleSide
  });

  // Main folded body (thick rectangular folded packet)
  const width = 0.62;
  const height = 0.16;
  const depth = 0.44;

  const bodyGeo = new THREE.BoxGeometry(width, height, depth, 4, 2, 4);

  // Deform vertices slightly to give authentic paper crinkle & curve
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const noise = (Math.sin(x * 8) * Math.cos(z * 8)) * 0.015;
    const curve = Math.sin((x / width) * Math.PI) * 0.02;
    pos.setY(i, y + noise + curve);
  }
  bodyGeo.computeVertexNormals();

  const bodyMesh = new THREE.Mesh(bodyGeo, chitMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Top folded flap overlap
  const flapGeo = new THREE.PlaneGeometry(width * 0.96, depth * 0.52);
  flapGeo.rotateX(-Math.PI * 0.5);
  flapGeo.translate(0, height * 0.52, depth * 0.18);
  const flapMesh = new THREE.Mesh(flapGeo, chitMaterial);
  flapMesh.castShadow = true;
  group.add(flapMesh);

  // Subtle golden ribbon/seal on the folded chit
  const sealGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
  sealGeo.translate(0, height * 0.54, 0);
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.3
  });
  const sealMesh = new THREE.Mesh(sealGeo, sealMat);
  group.add(sealMesh);

  return group;
}

/**
 * 3D Articulated Multi-Flap Unfolding Paper Note Mesh
 * Used during the hand-lift and dramatic unfolding reveal!
 */
export class ArticulatedUnfoldingPaper {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ArticulatedUnfoldingPaper';
    this.currentName = '';

    this.initMeshes();
  }

  initMeshes() {
    // Note dimensions in 3D world units (unfolded aspect ratio: 1.8 x 1.8)
    const totalW = 1.8;
    const totalH = 1.8;
    const centerH = 0.7;
    const flapH = (totalH - centerH) / 2; // 0.55 each

    // Blank default texture initially
    this.texture = createUnfoldedNoteTexture('LUCKY PICK');
    this.paperMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Backside texture (plain antique paper)
    this.backMat = new THREE.MeshStandardMaterial({
      color: 0xf5ebd3,
      roughness: 0.7,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    // 1. Center Panel
    const centerGeo = new THREE.PlaneGeometry(totalW, centerH, 12, 6);
    this.centerMesh = new THREE.Mesh(centerGeo, this.paperMat);
    this.centerMesh.castShadow = true;
    this.centerMesh.receiveShadow = true;
    this.group.add(this.centerMesh);

    // 2. Top Hinge & Flap
    this.topHinge = new THREE.Group();
    this.topHinge.position.set(0, centerH / 2, 0);
    this.group.add(this.topHinge);

    const topGeo = new THREE.PlaneGeometry(totalW, flapH, 12, 4);
    topGeo.translate(0, flapH / 2, 0);
    this.topFlap = new THREE.Mesh(topGeo, this.paperMat);
    this.topFlap.castShadow = true;
    this.topHinge.add(this.topFlap);

    // 3. Bottom Hinge & Flap
    this.bottomHinge = new THREE.Group();
    this.bottomHinge.position.set(0, -centerH / 2, 0);
    this.group.add(this.bottomHinge);

    const bottomGeo = new THREE.PlaneGeometry(totalW, flapH, 12, 4);
    bottomGeo.translate(0, -flapH / 2, 0);
    this.bottomFlap = new THREE.Mesh(bottomGeo, this.paperMat);
    this.bottomFlap.castShadow = true;
    this.bottomHinge.add(this.bottomFlap);

    // Initial state: Fully folded
    this.setFoldProgress(0);
  }

  updateName(name) {
    this.currentName = name;
    if (this.texture) this.texture.dispose();
    this.texture = createUnfoldedNoteTexture(name);
    this.paperMat.map = this.texture;
    this.paperMat.needsUpdate = true;
  }

  /**
   * Sets folding progress from 0 (tightly folded chit) to 1 (fully flat open letter)
   */
  setFoldProgress(progress) {
    // Clamp [0, 1]
    const p = Math.max(0, Math.min(1, progress));

    // Top flap unfolds from PI (180° folded backwards) to 0 (flat)
    const topAngle = (1 - p) * Math.PI;
    this.topHinge.rotation.x = -topAngle;

    // Bottom flap unfolds from -PI to 0
    const bottomAngle = (1 - p) * Math.PI;
    this.bottomHinge.rotation.x = bottomAngle;

    // Slight paper curvature/springiness when halfway open
    const springBend = Math.sin(p * Math.PI) * 0.12;
    this.centerMesh.position.z = springBend;
  }
}
