import * as THREE from 'three';

/**
 * Procedural Articulated 3D Human Hand and Arm Model
 * Complete with multi-segment fingers, realistic skin shading,
 * smooth joints, fingernails, elegant suit cuff, and expressive pose controllers.
 */
export class RealisticHandModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RealisticHand';

    // Materials
    this.skinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe6b99d,
      emissive: 0x220e06,
      roughness: 0.48,
      metalness: 0.05,
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xffaa88),
      sheenRoughness: 0.5
    });

    this.palmMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeca797,
      emissive: 0x1d0b05,
      roughness: 0.55,
      clearcoat: 0.1,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xff8877)
    });

    this.nailMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5ded4,
      roughness: 0.2,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15
    });

    this.cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x182030,
      roughness: 0.7,
      metalness: 0.1
    });

    this.goldLinkMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfb15b,
      metalness: 0.9,
      roughness: 0.25
    });

    this.fingers = {};
    this.joints = [];

    this.buildArmAndHand();
  }

  buildArmAndHand() {
    // 1. Forearm (Arm)
    const armGroup = new THREE.Group();
    armGroup.name = 'Forearm';

    // Arm geometry - tapered cylinder
    const armGeo = new THREE.CylinderGeometry(0.38, 0.48, 2.4, 24);
    armGeo.translate(0, 1.2, 0);
    const armMesh = new THREE.Mesh(armGeo, this.skinMaterial);
    armMesh.castShadow = true;
    armMesh.receiveShadow = true;
    armGroup.add(armMesh);

    // Elegant shirt cuff and jacket sleeve
    const cuffGeo = new THREE.CylinderGeometry(0.49, 0.52, 0.6, 24);
    cuffGeo.translate(0, 1.8, 0);
    const cuffMesh = new THREE.Mesh(cuffGeo, this.cuffMaterial);
    cuffMesh.castShadow = true;
    armGroup.add(cuffMesh);

    // Inner white shirt rim
    const innerShirtGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.12, 24);
    innerShirtGeo.translate(0, 1.46, 0);
    const innerShirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const innerShirtMesh = new THREE.Mesh(innerShirtGeo, innerShirtMat);
    armGroup.add(innerShirtMesh);

    // Gold cufflink
    const linkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    linkGeo.translate(0.45, 1.75, 0);
    const linkMesh = new THREE.Mesh(linkGeo, this.goldLinkMaterial);
    armGroup.add(linkMesh);

    // 2. Wrist Joint
    this.wrist = new THREE.Group();
    this.wrist.name = 'Wrist';
    this.wrist.position.set(0, 0, 0);
    armGroup.add(this.wrist);

    // Wrist flesh bridge
    const wristGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.35, 18);
    wristGeo.translate(0, -0.12, 0);
    const wristMesh = new THREE.Mesh(wristGeo, this.skinMaterial);
    wristMesh.castShadow = true;
    this.wrist.add(wristMesh);

    // 3. Palm
    this.palm = new THREE.Group();
    this.palm.name = 'Palm';
    this.palm.position.set(0, -0.28, 0);
    this.wrist.add(this.palm);

    // Main palm body
    const palmGeo = new THREE.BoxGeometry(0.72, 0.76, 0.28);
    palmGeo.translate(0, -0.38, 0);
    const palmMesh = new THREE.Mesh(palmGeo, this.palmMaterial);
    palmMesh.castShadow = true;
    palmMesh.receiveShadow = true;
    this.palm.add(palmMesh);

    // Rounded palm heel (thenar cushion)
    const thenarGeo = new THREE.SphereGeometry(0.24, 16, 16);
    thenarGeo.scale(1.2, 1.4, 0.9);
    thenarGeo.translate(-0.16, -0.38, 0.06);
    const thenarMesh = new THREE.Mesh(thenarGeo, this.skinMaterial);
    this.palm.add(thenarMesh);

    // 4. Build Articulated Fingers
    // [fingerKey, xOffset, yOffset, zOffset, lengthScale, widthScale]
    const fingerConfigs = [
      { key: 'thumb',  pos: [-0.34, -0.22,  0.10], rot: [0.35, 0.4, -0.75], len: 0.72, width: 0.11, isThumb: true },
      { key: 'index',  pos: [-0.24, -0.74,  0.02], rot: [0.05, 0, -0.05],  len: 0.88, width: 0.098 },
      { key: 'middle', pos: [-0.02, -0.76,  0.02], rot: [0.0, 0, 0],       len: 0.96, width: 0.102 },
      { key: 'ring',   pos: [ 0.20, -0.74,  0.01], rot: [-0.04, 0, 0.04],  len: 0.86, width: 0.094 },
      { key: 'pinky',  pos: [ 0.38, -0.68, -0.01], rot: [-0.08, 0, 0.12],  len: 0.70, width: 0.085 }
    ];

    fingerConfigs.forEach(cfg => {
      const finger = this.createFinger(cfg);
      this.palm.add(finger.root);
      this.fingers[cfg.key] = finger;
    });

    this.group.add(armGroup);

    // Default relaxed pose
    this.setPose('relaxed');
  }

  createFinger(cfg) {
    const root = new THREE.Group();
    root.name = `Finger_${cfg.key}`;
    root.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    root.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);

    const joints = [];
    const segments = cfg.isThumb ? 2 : 3;
    const segLen = (cfg.len / segments);

    let parent = root;

    for (let i = 0; i < segments; i++) {
      const joint = new THREE.Group();
      joint.name = `Joint_${cfg.key}_${i}`;

      if (i > 0) {
        joint.position.set(0, -segLen, 0);
      }
      parent.add(joint);
      joints.push(joint);
      this.joints.push(joint);

      // Phalanx bone / flesh
      const radius = cfg.width * (1.0 - i * 0.12);
      const phalanxGeo = new THREE.CylinderGeometry(radius * 0.9, radius * 1.05, segLen, 14);
      phalanxGeo.translate(0, -segLen / 2, 0);
      const phalanxMesh = new THREE.Mesh(phalanxGeo, this.skinMaterial);
      phalanxMesh.castShadow = true;
      phalanxMesh.receiveShadow = true;
      joint.add(phalanxMesh);

      // Knuckle sphere
      const knuckleGeo = new THREE.SphereGeometry(radius * 1.08, 12, 12);
      const knuckleMesh = new THREE.Mesh(knuckleGeo, this.skinMaterial);
      joint.add(knuckleMesh);

      // Add fingertip & nail on last segment
      if (i === segments - 1) {
        const tipGeo = new THREE.SphereGeometry(radius * 0.95, 12, 12);
        tipGeo.translate(0, -segLen, 0);
        const tipMesh = new THREE.Mesh(tipGeo, this.skinMaterial);
        joint.add(tipMesh);

        // Fingernail
        const nailGeo = new THREE.BoxGeometry(radius * 1.4, segLen * 0.45, 0.015);
        nailGeo.translate(0, -segLen * 0.78, radius * 0.85);
        const nailMesh = new THREE.Mesh(nailGeo, this.nailMaterial);
        nailMesh.rotation.x = -0.15;
        joint.add(nailMesh);
      }

      parent = joint;
    }

    return {
      root,
      joints,
      config: cfg
    };
  }

  // --- Dynamic Pose Engine ---
  setFingerCurl(fingerKey, curls) {
    const finger = this.fingers[fingerKey];
    if (!finger) return;

    curls.forEach((angle, idx) => {
      if (finger.joints[idx]) {
        finger.joints[idx].rotation.x = angle;
      }
    });
  }

  setPose(poseName, alpha = 1.0) {
    switch (poseName) {
      case 'relaxed':
        // Natural gentle hand resting curve
        this.wrist.rotation.set(0.1, 0, 0);
        this.setFingerCurl('thumb',  [0.35, 0.25]);
        this.setFingerCurl('index',  [0.45, 0.35, 0.25]);
        this.setFingerCurl('middle', [0.55, 0.45, 0.35]);
        this.setFingerCurl('ring',   [0.65, 0.55, 0.45]);
        this.setFingerCurl('pinky',  [0.75, 0.65, 0.55]);
        break;

      case 'reach':
        // Fingers slightly curved & tapered to fit smoothly into the bowl
        this.wrist.rotation.set(-0.15, 0, 0.05);
        this.setFingerCurl('thumb',  [0.2, 0.15]);
        this.setFingerCurl('index',  [0.25, 0.2, 0.15]);
        this.setFingerCurl('middle', [0.3, 0.25, 0.2]);
        this.setFingerCurl('ring',   [0.4, 0.3, 0.25]);
        this.setFingerCurl('pinky',  [0.45, 0.35, 0.3]);
        break;

      case 'pinch':
        // Ultra-precise pinch grip: thumb + index & middle grasping the folded chit tightly
        this.wrist.rotation.set(-0.1, 0.1, 0.05);
        this.fingers['thumb'].root.rotation.set(0.7, 0.8, -0.6);
        this.setFingerCurl('thumb',  [0.75, 0.65]);
        this.setFingerCurl('index',  [0.95, 0.9, 0.6]);
        this.setFingerCurl('middle', [0.85, 0.8, 0.55]);
        this.setFingerCurl('ring',   [1.2, 1.0, 0.7]);
        this.setFingerCurl('pinky',  [1.3, 1.1, 0.8]);
        break;

      case 'lift':
        // Tight grip maintained while pulling upward
        this.wrist.rotation.set(0.15, 0.05, 0);
        this.fingers['thumb'].root.rotation.set(0.75, 0.8, -0.6);
        this.setFingerCurl('thumb',  [0.8, 0.7]);
        this.setFingerCurl('index',  [1.0, 0.95, 0.65]);
        this.setFingerCurl('middle', [0.9, 0.85, 0.6]);
        this.setFingerCurl('ring',   [1.25, 1.05, 0.75]);
        this.setFingerCurl('pinky',  [1.35, 1.15, 0.85]);
        break;

      case 'open':
        // Hand opens gracefully to present/release the floating chit
        this.wrist.rotation.set(-0.2, -0.1, 0.1);
        this.fingers['thumb'].root.rotation.set(0.2, 0.2, -0.5);
        this.setFingerCurl('thumb',  [0.1, 0.05]);
        this.setFingerCurl('index',  [0.1, 0.05, 0.0]);
        this.setFingerCurl('middle', [0.12, 0.08, 0.02]);
        this.setFingerCurl('ring',   [0.18, 0.12, 0.05]);
        this.setFingerCurl('pinky',  [0.22, 0.15, 0.08]);
        break;
    }
  }

  // Position the hand in world space
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(rx, ry, rz) {
    this.group.rotation.set(rx, ry, rz);
  }
}
