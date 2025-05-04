let scene, camera, renderer;
let particles, particlesInner; // Outer and inner particle systems
let stars; // Background starfield
let energyField; // Energy field particles
let hoverHeight = 0;
let hoverSpeed = 0.01;
let hoverRange = 0.5;

let time = 0;
// Store original positions for noise calculation
let originalPositions;
// No need to store originalColors anymore
const noiseSpeed = 0.1;
const noiseScale = 0.2; // Controls the intensity of the displacement

// Mouse interaction variables
const mouse = new THREE.Vector2(0, 0);
const repulsionRadius = 1.0; // How close the mouse needs to be to affect particles
const repulsionStrength = 0.5; // How strongly particles are pushed away
const starInteractionRadius = 0.5; // How close mouse needs to be for star interaction
const starInteractionStrength = 0.1; // How much stars react
// Removed interactionColor and colorLerpSpeed

// Add these new constants at the top with other constants
// const energyInteractionRadius = 0.9;
// const energyInteractionStrength = 0.25;

init();
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Ensure black background

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 0;
    camera.position.x = 0;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false // Ensure no transparency
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1); // Set clear color to black
    document.getElementById('container').appendChild(renderer.domElement);

    // Create particle system (Outer)
    const particleCountOuter = 7000;
    const positionsOuter = new Float32Array(particleCountOuter * 3);
    const colorsOuter = new Float32Array(particleCountOuter * 3);
    const radiusOuter = 1.5;

    for (let i = 0; i < particleCountOuter; i++) {
        const i3 = i * 3;

        // Spherical coordinates
        const phi = Math.acos(-1 + (2 * i) / particleCountOuter);
        const theta = Math.sqrt(particleCountOuter * Math.PI) * phi;

        // Convert spherical to Cartesian
        const x = radiusOuter * Math.sin(phi) * Math.cos(theta);
        const y = radiusOuter * Math.sin(phi) * Math.sin(theta);
        const z = radiusOuter * Math.cos(phi);

        // Add some random displacement for irregularity
        positionsOuter[i3] = x + (Math.random() - 0.5 ) * 0.5;
        positionsOuter[i3 + 1] = y + (Math.random() - 0.5 ) * 0.5;
        positionsOuter[i3 + 2] = z + (Math.random() - 0.5 ) * 0.5;

        // Color based on position
        const color = new THREE.Color();
        const distance = Math.sqrt(x*x + y*y + z*z);
        const mixRatio = Math.min(distance / (radiusOuter * 0.8), 1.0);
        const innerColor = new THREE.Color(0xffaa00); // Orange/Yellow
        const outerColor1 = new THREE.Color(0x00ffff); // Cyan
        const outerColor2 = new THREE.Color(0xff00ff); // Magenta
        const angleRatio = (theta % (2 * Math.PI)) / (2 * Math.PI);
        const outerColor = angleRatio < 0.5 ? outerColor1.lerp(outerColor2, angleRatio * 2) : outerColor2.lerp(outerColor1, (angleRatio - 0.5) * 2);
        color.lerpColors(innerColor, outerColor, mixRatio);

        colorsOuter[i3] = color.r;
        colorsOuter[i3 + 1] = color.g;
        colorsOuter[i3 + 2] = color.b;
    }

    // Store original positions
    originalPositions = positionsOuter.slice();
    // Don't need originalColors anymore

    const geometryOuter = new THREE.BufferGeometry();
    geometryOuter.setAttribute('position', new THREE.BufferAttribute(positionsOuter, 3));
    geometryOuter.setAttribute('color', new THREE.BufferAttribute(colorsOuter, 3)); // Use the calculated colors

    const materialOuter = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    particles = new THREE.Points(geometryOuter, materialOuter);
    scene.add(particles);

    // Create Inner Particle System (Core)
    const particleCountInner = 1000;
    const positionsInner = new Float32Array(particleCountInner * 3);
    const colorsInner = new Float32Array(particleCountInner * 3);
    const radiusInner = 0.5;
    const coreColor = new THREE.Color(0xffff00); // Bright Yellow core

    for (let i = 0; i < particleCountInner; i++) {
        const i3 = i * 3;
        // Simpler spherical distribution for core
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radiusInner * Math.cbrt(Math.random());

        positionsInner[i3] = r * Math.sin(phi) * Math.cos(theta);
        positionsInner[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positionsInner[i3 + 2] = r * Math.cos(phi);

        colorsInner[i3] = coreColor.r;
        colorsInner[i3 + 1] = coreColor.g;
        colorsInner[i3 + 2] = coreColor.b;
    }

    const geometryInner = new THREE.BufferGeometry();
    geometryInner.setAttribute('position', new THREE.BufferAttribute(positionsInner, 3));
    geometryInner.setAttribute('color', new THREE.BufferAttribute(colorsInner, 3));

    const materialInner = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    particlesInner = new THREE.Points(geometryInner, materialInner);
    scene.add(particlesInner);

    // Create Starfield Background
    const starCount = 10000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSize = 0.02;
    const starRange = 50; // How far out the stars extend

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        starPositions[i3] = (Math.random() - 0.5) * starRange * 2;
        starPositions[i3 + 1] = (Math.random() - 0.5) * starRange * 2;
        starPositions[i3 + 2] = (Math.random() - 0.5) * starRange * 2;

        const color = new THREE.Color(0xffffff); // Start with white
        // Add slight blue tint randomly
        if (Math.random() > 0.8) {
            color.setRGB(0.8, 0.9, 1.0);
        }
        starColors[i3] = color.r;
        starColors[i3 + 1] = color.g;
        starColors[i3 + 2] = color.b;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: starSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false, // Render behind everything
        blending: THREE.AdditiveBlending
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Create energy field with spherical distribution
    const energyCount = 5000;
    const energyPositions = new Float32Array(energyCount * 3);
    const energyColors = new Float32Array(energyCount * 3);

    for (let i = 0; i < energyCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 1.0 + Math.random() * 0.6;

        // Spherical distribution
        energyPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        energyPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        energyPositions[i3 + 2] = radius * Math.cos(phi);

        const energyColor = new THREE.Color();
        energyColor.setHSL(0.5 + Math.random() * 0.3, 1, 0.6);
        energyColors[i3] = energyColor.r;
        energyColors[i3 + 1] = energyColor.g;
        energyColors[i3 + 2] = energyColor.b;
    }

    const energyGeometry = new THREE.BufferGeometry();
    energyGeometry.setAttribute('position', new THREE.BufferAttribute(energyPositions, 3));
    energyGeometry.setAttribute('color', new THREE.BufferAttribute(energyColors, 3));

    const energyMaterial = new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });

    energyField = new THREE.Points(energyGeometry, energyMaterial);
    scene.add(energyField);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    // Add mouse move listener
    document.addEventListener('mousemove', onMouseMove, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function to handle mouse movement
function onMouseMove(event) {
    // Normalize mouse coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
    requestAnimationFrame(animate);

    time += 0.005;

    // Hover animation only for central model
    hoverHeight += hoverSpeed;
    const groupY = Math.sin(hoverHeight) * hoverRange;
    particles.position.y = groupY;
    particlesInner.position.y = groupY;

    // Rotation
    particles.rotation.y += 0.005;
    particlesInner.rotation.y -= 0.01;
    particlesInner.rotation.x += 0.008;

    // Animate particle positions (OUTER PARTICLES ONLY)
    const currentPositions = particles.geometry.attributes.position.array;
    // No need for currentColors here
    const particleCount = originalPositions.length / 3;
    // Removed closestParticleIndex and minDistanceSq

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const ox = originalPositions[i3];
        const oy = originalPositions[i3 + 1];
        const oz = originalPositions[i3 + 2];

        // --- Noise Calculation ---
        let noiseValueX = 0, noiseValueY = 0, noiseValueZ = 0;
        if (typeof Noise !== 'undefined' && typeof Noise.perlin3D === 'function') {
            noiseValueX = Noise.perlin3D(ox * 0.5, oy * 0.5, oz * 0.5 + time * noiseSpeed) * noiseScale;
            noiseValueY = Noise.perlin3D(ox * 0.5 + 100, oy * 0.5 + 100, oz * 0.5 + time * noiseSpeed) * noiseScale;
            noiseValueZ = Noise.perlin3D(ox * 0.5 - 100, oy * 0.5 - 100, oz * 0.5 + time * noiseSpeed) * noiseScale;
        } else {
             noiseValueX = (Math.random() - 0.5) * noiseScale * 0.1;
             noiseValueY = (Math.random() - 0.5) * noiseScale * 0.1;
             noiseValueZ = (Math.random() - 0.5) * noiseScale * 0.1;
        }
        // -------------------------

        let targetX = ox + noiseValueX;
        let targetY = oy + noiseValueY;
        let targetZ = oz + noiseValueZ;

        // --- Mouse Repulsion (No Color Change) ---
        const particleScreenX = currentPositions[i3] / camera.position.z;
        const particleScreenY = currentPositions[i3+1] / camera.position.z;
        const dx = particleScreenX - mouse.x;
        const dy = particleScreenY - mouse.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < repulsionRadius * repulsionRadius) { // Check against squared radius
            const distance = Math.sqrt(distanceSq);
            // Apply repulsion force only if distance > 0 to avoid division by zero
            if (distance > 0) { 
                const force = (repulsionRadius - distance) / repulsionRadius * repulsionStrength;
                const forceX = (dx / distance) * force;
                const forceY = (dy / distance) * force;
                targetX += forceX * camera.position.z * 0.5;
                targetY += forceY * camera.position.z * 0.5;
            }
        }
        // --- End Mouse Repulsion ---

        // Apply final target position
        currentPositions[i3] = targetX;
        currentPositions[i3 + 1] = targetY;
        currentPositions[i3 + 2] = targetZ;
    }

    // Tell Three.js to update the positions
    particles.geometry.attributes.position.needsUpdate = true;
    // No need to update colors anymore
    // particles.geometry.attributes.color.needsUpdate = true;

    // Animate Starfield Background
    // Slow rotation
    stars.rotation.y += 0.0001;
    stars.rotation.x += 0.00005;

    // Star subtle movement/twinkle
    const starPositions = stars.geometry.attributes.position.array;
    const starCount = starPositions.length / 3;
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        // Optional: Add subtle twinkle or drift
        starPositions[i3+2] += Math.sin(time * 0.1 + i) * 0.001; // Slow z-drift
    }
    stars.geometry.attributes.position.needsUpdate = true;

    // Animate energy field without hover
    const energyPositions = energyField.geometry.attributes.position.array;
    for (let i = 0; i < energyPositions.length; i += 3) {
        const x = energyPositions[i];
        const y = energyPositions[i + 1];
        const z = energyPositions[i + 2];
        
        // Create spherical swirling motion
        const distance = Math.sqrt(x * x + y * y + z * z);
        const angleXY = Math.atan2(y, x) + (0.2 / distance);
        const angleXZ = Math.atan2(z, x) + (0.2 / distance);
        const angleYZ = Math.atan2(z, y) + (0.2 / distance);
        
        // Maintain spherical shape while rotating
        energyPositions[i] = distance * Math.cos(angleXY) * Math.cos(angleXZ);
        energyPositions[i + 1] = distance * Math.sin(angleXY) * Math.cos(angleYZ);
        energyPositions[i + 2] = distance * Math.sin(angleXZ) * Math.sin(angleYZ);
    }
    energyField.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
} 