import * as THREE from 'three';
import gsap from 'gsap';
import { soundEngine } from './audio.js';
import { createFoldedChitMesh } from './paper-model.js';

/**
 * ThreeScene - Core 3D WebGL Manager
 * Realistic Glass Bowl, Dynamic Lighting, Folded Paper Chits,
 * Golden Particle Systems, and Smooth Cinematic Choreography.
 */
export class ThreeScene {
  constructor(containerElement, onSelectChitCallback) {
    this.container = containerElement;
    this.onSelectChit = onSelectChitCallback;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.bowlGroup = null;
    this.chits = [];
    this.chitMeshes = [];
    this.activeLevitatingChit = null;
    this.isAnimating = false;
    this.namesPool = [];

    // Interaction & Orbit
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraRotation = { theta: 0.15, phi: 0.42, radius: 7.2 };
    this.targetRotation = { theta: 0.15, phi: 0.42, radius: 7.2 };
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Golden Ambient Dust Particles
    this.dustParticles = null;
    this.sparkleSystem = null;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0f17);
    this.scene.fog = new THREE.FogExp2(0x0c0f17, 0.045);

    // 2. Camera & dimensions with safe fallbacks
    const width = this.container.clientWidth || window.innerWidth || 1200;
    const height = this.container.clientHeight || window.innerHeight || 800;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 100);
    this.updateCameraPosition();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Setup components
    this.setupLighting();
    this.setupEnvironment();
    this.setupGlassBowl();
    this.setupParticles();
    this.setupEventListeners();

    // Configure GSAP for smooth execution
    gsap.ticker.lagSmoothing(1000, 16);

    // 5. Render loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.85);
    this.scene.add(ambientLight);

    // Key directional light (soft sun/studio light casting shadows)
    this.keyLight = new THREE.DirectionalLight(0xfff8ea, 2.4);
    this.keyLight.position.set(5.5, 9.0, 5.0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -5;
    this.keyLight.shadow.camera.right = 5;
    this.keyLight.shadow.camera.top = 5;
    this.keyLight.shadow.camera.bottom = -5;
    this.keyLight.shadow.bias = -0.0003;
    this.keyLight.shadow.radius = 3;
    this.scene.add(this.keyLight);

    // Cool rim light from behind (creates glowing crystal refraction edges)
    const rimLight = new THREE.DirectionalLight(0x70c0ff, 3.2);
    rimLight.position.set(-5.0, 7.5, -6.0);
    this.scene.add(rimLight);

    // Soft warm fill light
    const fillLight = new THREE.PointLight(0xffd199, 1.8, 12, 1.5);
    fillLight.position.set(0, 4.0, 4.0);
    this.scene.add(fillLight);

    // Bottom caustics accent light under the bowl
    const bottomLight = new THREE.PointLight(0x90e0ef, 2.5, 6, 2);
    bottomLight.position.set(0, -0.6, 0);
    this.scene.add(bottomLight);
  }

  setupEnvironment() {
    // Luxury dark walnut & brass table surface
    const tableGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.4, 64);
    tableGeo.translate(0, -0.2, 0);

    // Procedural luxury tabletop texture
    const tableTexture = this.createTableTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.35,
      metalness: 0.15,
      bumpMap: tableTexture,
      bumpScale: 0.015
    });

    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Gold decorative inlay rim around the table
    const tableRimGeo = new THREE.TorusGeometry(5.22, 0.035, 16, 64);
    tableRimGeo.rotateX(Math.PI * 0.5);
    tableRimGeo.translate(0, 0.005, 0);
    const tableRimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const tableRim = new THREE.Mesh(tableRimGeo, tableRimMat);
    this.scene.add(tableRim);

    // Soft shadow contact decal under the bowl
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    shadowGeo.rotateX(-Math.PI * 0.5);
    shadowGeo.translate(0, 0.002, 0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(shadowMesh);
  }

  createTableTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Rich dark wood / marble radial gradient
    const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 600);
    grad.addColorStop(0, '#1c1b24');
    grad.addColorStop(0.5, '#14141c');
    grad.addColorStop(1, '#0b0c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Wood rings / concentric fine circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1.5;
    for (let r = 20; r < 600; r += 12 + Math.random() * 8) {
      ctx.beginPath();
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  setupGlassBowl() {
    this.bowlGroup = new THREE.Group();
    this.bowlGroup.name = 'GlassBowlGroup';
    this.bowlGroup.position.set(0, 0.02, 0);

    // Revolve spline to create a realistic curved spherical crystal glass bowl
    const points = [];
    points.push(new THREE.Vector2(0.0, 0.0));
    points.push(new THREE.Vector2(0.85, 0.02));  // Thick base bottom
    points.push(new THREE.Vector2(1.25, 0.15));  // Base bevel
    points.push(new THREE.Vector2(1.75, 0.55));  // Lower bowl curve
    points.push(new THREE.Vector2(1.95, 1.15));  // Mid belly max bulge
    points.push(new THREE.Vector2(1.78, 1.75));  // Upper taper
    points.push(new THREE.Vector2(1.48, 2.10));  // Rim exterior
    points.push(new THREE.Vector2(1.42, 2.13));  // Rounded rim top peak
    points.push(new THREE.Vector2(1.36, 2.10));  // Rim interior
    // Inner wall cavity down to inner floor
    points.push(new THREE.Vector2(1.65, 1.72));
    points.push(new THREE.Vector2(1.82, 1.15));
    points.push(new THREE.Vector2(1.62, 0.60));
    points.push(new THREE.Vector2(1.10, 0.22));  // Inner cavity base
    points.push(new THREE.Vector2(0.0, 0.18));   // Inner bottom center

    const bowlGeo = new THREE.LatheGeometry(points, 64);
    bowlGeo.computeVertexNormals();

    // Crystal Glass Material - Beautiful Specular Gloss, Clear Polish & High Performance
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf2f9ff,
      transparent: true,
      opacity: 0.34,
      roughness: 0.03,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.bowlMesh = new THREE.Mesh(bowlGeo, this.glassMaterial);
    this.bowlMesh.castShadow = true;
    this.bowlMesh.receiveShadow = true;
    this.bowlMesh.userData = { isBowl: true };
    this.bowlGroup.add(this.bowlMesh);

    // Decorative Gold Rim Accent ring
    const rimTorusGeo = new THREE.TorusGeometry(1.42, 0.02, 16, 64);
    rimTorusGeo.rotateX(Math.PI * 0.5);
    rimTorusGeo.translate(0, 2.12, 0);
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.2
    });
    const rimTorus = new THREE.Mesh(rimTorusGeo, goldRimMat);
    this.bowlGroup.add(rimTorus);

    // Decorative Gold Base Ring
    const baseTorusGeo = new THREE.TorusGeometry(0.88, 0.025, 16, 64);
    baseTorusGeo.rotateX(Math.PI * 0.5);
    baseTorusGeo.translate(0, 0.025, 0);
    const baseTorus = new THREE.Mesh(baseTorusGeo, goldRimMat);
    this.bowlGroup.add(baseTorus);

    this.scene.add(this.bowlGroup);
  }


  setupParticles() {
    // 1. Ambient Floating Gold Dust Motes
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      scales[i] = Math.random() * 0.06 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle canvas texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    pGrad.addColorStop(0, 'rgba(255, 225, 160, 1)');
    pGrad.addColorStop(0.4, 'rgba(212, 175, 55, 0.6)');
    pGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const pMat = new THREE.PointsMaterial({
      size: 0.22,
      map: pTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustParticles = new THREE.Points(geometry, pMat);
    this.scene.add(this.dustParticles);
  }

  /**
   * Populates the glass bowl with folded paper chits corresponding to the name list.
   */
  setNames(names) {
    this.namesPool = [...names];

    // Remove existing chit meshes
    this.chitMeshes.forEach(mesh => {
      this.bowlGroup.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.chitMeshes = [];

    // Calculate natural stacked positions inside the bowl's curved bottom cavity
    const count = names.length;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    names.forEach((name, idx) => {
      const chitMesh = createFoldedChitMesh(name, idx);

      // Distribute in a natural bowl spiral heap
      const phi = (idx * goldenRatio * Math.PI * 2);
      const radius = 0.35 + (idx / Math.max(1, count)) * 0.65;
      const x = Math.cos(phi) * radius + (Math.random() - 0.5) * 0.15;
      const z = Math.sin(phi) * radius + (Math.random() - 0.5) * 0.15;

      // Resting height follows the bowl's bottom curvature
      const rDist = Math.sqrt(x * x + z * z);
      const layerOffset = (idx % 3) * 0.12;
      const y = 0.28 + (rDist * rDist * 0.38) + layerOffset;

      chitMesh.position.set(x, y, z);

      // Random realistic resting tilts
      chitMesh.rotation.set(
        (Math.random() - 0.5) * 0.45,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.45
      );

      chitMesh.userData.origPos = chitMesh.position.clone();
      chitMesh.userData.origRot = chitMesh.rotation.clone();

      this.bowlGroup.add(chitMesh);
      this.chitMeshes.push(chitMesh);
    });
  }

  /**
   * Shuffles / agitates the chits in the bowl with physics animation
   */
  shuffleChits() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    soundEngine.playPaperRustle(0.6, 0.9);
    soundEngine.playGlassClink(0.7);

    // Shake the bowl gently
    gsap.to(this.bowlGroup.rotation, {
      y: '+=0.25',
      duration: 0.15,
      yoyo: true,
      repeat: 3,
      ease: 'power1.inOut'
    });

    // Agitate and re-scatter chits
    this.chitMeshes.forEach((chit) => {
      const orig = chit.userData.origPos;
      const jumpY = orig.y + 0.35 + Math.random() * 0.4;
      const newX = orig.x + (Math.random() - 0.5) * 0.4;
      const newZ = orig.z + (Math.random() - 0.5) * 0.4;

      gsap.timeline()
        .to(chit.position, {
          x: newX,
          y: jumpY,
          z: newZ,
          duration: 0.25 + Math.random() * 0.15,
          ease: 'power2.out'
        })
        .to(chit.position, {
          x: orig.x + (Math.random() - 0.5) * 0.15,
          y: orig.y,
          z: orig.z + (Math.random() - 0.5) * 0.15,
          duration: 0.35 + Math.random() * 0.15,
          ease: 'bounce.out'
        });

      gsap.to(chit.rotation, {
        x: (Math.random() - 0.5) * 0.5,
        y: `+=${Math.PI * (1 + Math.random())}`,
        z: (Math.random() - 0.5) * 0.5,
        duration: 0.6,
        ease: 'power1.out'
      });
    });

    setTimeout(() => {
      this.isAnimating = false;
    }, 700);
  }

  /**
   * MAGICAL CHIT LEVITATION (HAND REMOVED):
   * 1. Selected chit inside the glass bowl vibrates with golden aura.
   * 2. The chit levitates smoothly up out of the bowl cavity into the air.
   * 3. It spins gracefully while floating.
   * 4. It accelerates directly towards the camera/screen with a soaring whoosh.
   * 5. Smoothly transitions to the On-Screen Chit Opening sequence!
   */
  playPickAnimation(targetIndex, targetName) {
    if (this.isAnimating) return null;
    this.isAnimating = true;

    // Pick target chit mesh
    let targetChit = this.chitMeshes[targetIndex];
    if (!targetChit && this.chitMeshes.length > 0) {
      targetChit = this.chitMeshes[Math.floor(Math.random() * this.chitMeshes.length)];
    }

    this.activeLevitatingChit = targetChit;

    // Initial audio cue
    soundEngine.playPaperRustle(0.4, 0.8);
    soundEngine.playGlassClink(0.5);

    // Camera dynamic focus
    gsap.to(this.targetRotation, {
      radius: 6.0,
      phi: 0.48,
      duration: 1.0,
      ease: 'power2.out'
    });

    const tl = gsap.timeline({
      onComplete: () => {
        if (targetChit) {
          targetChit.visible = false;
        }
        this.isAnimating = false;

        // Trigger on-screen chit opening!
        if (this.onSelectChit) {
          this.onSelectChit(targetName, targetIndex);
        }
      }
    });

    if (targetChit) {
      // Phase 1: Vibration & Levitation start
      tl.to(targetChit.scale, {
        x: 1.18,
        y: 1.18,
        z: 1.18,
        duration: 0.25,
        ease: 'power1.out'
      });

      // Phase 2: Levitate straight up out of the bowl opening
      tl.to(targetChit.position, {
        x: 0,
        y: 2.6,
        z: 0.2,
        duration: 0.65,
        ease: 'power2.out',
        onStart: () => {
          soundEngine.playHandWhoosh(0.5, 260);
        }
      }, '-=0.05');

      tl.to(targetChit.rotation, {
        x: 0.1,
        y: '+=3.14',
        z: 0.05,
        duration: 0.65,
        ease: 'power2.out'
      }, '<');

      // Phase 3: Soar directly towards the screen / camera!
      tl.to(targetChit.position, {
        x: 0,
        y: 1.6,
        z: 4.8,
        duration: 0.45,
        ease: 'power1.in',
        onStart: () => {
          soundEngine.playHandWhoosh(0.4, 380);
        }
      });

      tl.to(targetChit.scale, {
        x: 2.2,
        y: 2.2,
        z: 2.2,
        duration: 0.45,
        ease: 'power1.in'
      }, '<');
    } else {
      // Fallback if no meshes
      tl.to({}, { duration: 0.8 });
    }

    this.currentTimeline = tl;
    return tl;
  }

  /**
   * Resets the levitated chit back into the bowl
   */
  resetRevealedPaper() {
    if (this.activeLevitatingChit) {
      const chit = this.activeLevitatingChit;
      chit.visible = true;
      chit.scale.set(1, 1, 1);
      if (chit.userData.origPos) {
        chit.position.copy(chit.userData.origPos);
      }
      if (chit.userData.origRot) {
        chit.rotation.copy(chit.userData.origRot);
      }
      this.activeLevitatingChit = null;
    }

    // Reset camera to default orbit
    gsap.to(this.targetRotation, {
      theta: 0.15,
      phi: 0.42,
      radius: 7.2,
      duration: 0.8,
      ease: 'power2.out'
    });
  }

  setCameraPreset(preset) {
    switch (preset) {
      case 'top':
        gsap.to(this.targetRotation, { theta: 0, phi: 0.05, radius: 6.5, duration: 1.0, ease: 'power2.out' });
        break;
      case 'closeup':
        gsap.to(this.targetRotation, { theta: 0.2, phi: 0.55, radius: 4.8, duration: 1.0, ease: 'power2.out' });
        break;
      case 'cinematic':
      default:
        gsap.to(this.targetRotation, { theta: 0.15, phi: 0.42, radius: 7.2, duration: 1.0, ease: 'power2.out' });
        break;
    }
  }

  setupEventListeners() {
    const dom = this.renderer.domElement;

    // Mouse / Touch Drag Orbit
    const onDown = (clientX, clientY) => {
      this.isDragging = true;
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMove = (clientX, clientY) => {
      // Raycasting for hover
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (!this.isAnimating) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([this.bowlMesh, ...this.chitMeshes], true);
        dom.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
      }

      if (!this.isDragging) return;

      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      this.targetRotation.theta -= deltaX * 0.0055;
      this.targetRotation.phi = Math.max(0.04, Math.min(Math.PI * 0.48, this.targetRotation.phi - deltaY * 0.0055));

      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onUp = () => {
      this.isDragging = false;
    };

    // Click on bowl to trigger draw!
    const onClick = (e) => {
      if (this.isAnimating) return;
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects([this.bowlMesh, ...this.chitMeshes], true);

      if (intersects.length > 0) {
        // User clicked the bowl or a chit!
        const drawBtn = document.getElementById('draw-btn');
        if (drawBtn) drawBtn.click();
      }
    };

    // DOM events
    dom.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', onUp);
    dom.addEventListener('click', onClick);

    // Zoom on wheel
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetRotation.radius = Math.max(3.5, Math.min(12.0, this.targetRotation.radius + e.deltaY * 0.005));
    }, { passive: false });

    // Resize
    window.addEventListener('resize', () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  updateCameraPosition() {
    // Smooth camera damping
    this.cameraRotation.theta += (this.targetRotation.theta - this.cameraRotation.theta) * 0.08;
    this.cameraRotation.phi   += (this.targetRotation.phi   - this.cameraRotation.phi)   * 0.08;
    this.cameraRotation.radius+= (this.targetRotation.radius- this.cameraRotation.radius)* 0.08;

    const r = this.cameraRotation.radius;
    const phi = this.cameraRotation.phi;
    const theta = this.cameraRotation.theta;

    this.camera.position.x = r * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = r * Math.cos(phi) + 0.4;
    this.camera.position.z = r * Math.sin(phi) * Math.cos(theta);

    this.camera.lookAt(0, 0.9, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateCameraPosition();

    // Subtle idle floating motion of dust particles
    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + Math.sin(time * 0.5 + i) * 0.003;
        if (y > 8) y = 0;
        pos.setY(i, y);
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
      this.dustParticles.rotation.y = time * 0.015;
    }

    // Subtle gentle breathing glow on glass bowl when idle
    if (this.bowlGroup && !this.isAnimating) {
      this.bowlGroup.rotation.y = Math.sin(time * 0.25) * 0.04;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
