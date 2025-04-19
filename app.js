// Basic Three.js + Web Audio API music visualizer

// Audio setup
let audioContext;
let analyser;
let dataArray;
let source = null;
let audioElement;

// Three.js setup
let scene, camera, renderer;
let visualizerMesh;

function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  
  // Get audio element reference
  audioElement = document.getElementById('audio-element');
}

function loadAudio(audioFile) {
  // Disconnect previous source if it exists
  if (source) {
    source.disconnect();
    source = null;
  }
  
  // Create a new object URL and set it to the audio element
  const objectUrl = URL.createObjectURL(audioFile);
  
  // Reset the audio element by cloning and replacing it
  const newAudio = audioElement.cloneNode(true);
  audioElement.parentNode.replaceChild(newAudio, audioElement);
  audioElement = newAudio;
  
  // Set the new source
  audioElement.src = objectUrl;
  
  // Wait for audio to be loaded before playing
  audioElement.onloadeddata = function() {
    // Create a new media element source
    source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Resume audio context (needed for Chrome's autoplay policy)
    audioContext.resume().then(() => {
      audioElement.play().catch(err => console.error("Play error:", err));
    });
  };
  
  // Handle errors
  audioElement.onerror = function() {
    console.error("Error loading audio file");
  };
}

// Add fluid simulation variables
let particles = [];
let fluidVelocity = new THREE.Vector3(0, 0, 0);
let fluidAttractor = new THREE.Vector3(0, 0, 0);
let fluidIntensity = 0;

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;
  camera.position.y = 20;
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000022); // Darker blue background
  document.body.appendChild(renderer.domElement);
  
  // Make renderer canvas fill the screen
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.zIndex = '-1';
  
  // Create a fluid of spheres
  const spheres = [];
  const sphereCount = 3000; // 增加到3000个球体
  
  // 长方体尺寸
  const boxWidth = 80;  // x轴方向（横向）
  const boxHeight = 30; // y轴方向（垂直）
  const boxDepth = 30;  // z轴方向（深度）
  
  // 计算每个维度的粒子数量，使总数接近sphereCount
  // 修改分布比例，使x轴方向的粒子更多，形成横向排列
  const particlesPerDimension = Math.cbrt(sphereCount);
  const xCount = Math.floor(particlesPerDimension * 2.5); // 增加x轴方向的粒子数量
  const yCount = Math.floor(particlesPerDimension * 0.6); // 减少y轴方向的粒子数量
  const zCount = Math.floor(particlesPerDimension * 0.6); // 减少z轴方向的粒子数量
  
  // 创建长方体中的球体 - 按照x轴优先的顺序创建
  for (let x = 0; x < xCount; x++) {
    // 计算x轴位置 - 均匀分布在x轴上
    const xPos = (x / (xCount - 1)) * boxWidth - boxWidth / 2;
    
    for (let y = 0; y < yCount; y++) {
      for (let z = 0; z < zCount; z++) {
        // 计算在长方体中的位置
        const yPos = (y / (yCount - 1)) * boxHeight - boxHeight / 2;
        const zPos = (z / (zCount - 1)) * boxDepth - boxDepth / 2;
        
        // 添加一些随机偏移，使排列不那么规则，但x轴方向的偏移减小以保持横向排列感
        const xOffset = (Math.random() - 0.5) * 0.3; // x轴偏移减小
        const yOffset = (Math.random() - 0.5) * 0.8;
        const zOffset = (Math.random() - 0.5) * 0.8;
        
        // 创建球体，尺寸变化范围扩大
        const radius = 0.1 + Math.random() * 0.6;
        const geometry = new THREE.SphereGeometry(radius, 6, 6); // 降低多边形数量以提高性能
        
        // 创建材质，使用彩虹色范围
        const randomHue = Math.random(); // 0-1范围内的随机色相值
        const material = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color().setHSL(randomHue, 0.8, 0.75), // 随机色相，高饱和度和亮度
          specular: 0xffffff,
          shininess: 120,
          transparent: true,
          opacity: 0.7
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        
        // 设置位置 - 强调x轴的有序排列
        sphere.position.x = xPos + xOffset;
        sphere.position.y = yPos + yOffset;
        sphere.position.z = zPos + zOffset;
        
        // 添加流体粒子属性
        const particle = {
          mesh: sphere,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.01, // 减小x轴方向的初始速度，使横向排列更稳定
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
          ),
          mass: radius * 2,
          frequencyIndex: Math.floor(Math.random() * 512),
          originalColor: new THREE.Color().setHSL(randomHue, 0.7, 0.5), // 保存原始彩虹色
          boxPosition: {
            x: xPos,
            y: yPos,
            z: zPos
          }
        };
        
        scene.add(sphere);
        spheres.push(sphere);
        particles.push(particle);
      }
    }
  }
  
  // Add lights
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(1, 1, 1);
  scene.add(light);
  
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
  
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  // Store spheres for animation
  visualizerMesh = spheres;
}

// Add rotation variables
let cameraRotation = 0;
let cameraHeight = 20;
let cameraDirection = 1;
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  
  // Get frequency data
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate overall energy for global effects
  let totalEnergy = 0;
  let bassEnergy = 0;
  let midEnergy = 0;
  let trebleEnergy = 0;
  
  // Split frequency bands
  for (let i = 0; i < dataArray.length; i++) {
    totalEnergy += dataArray[i];
    
    if (i < dataArray.length * 0.1) { // Bass (low frequencies)
      bassEnergy += dataArray[i];
    } else if (i < dataArray.length * 0.5) { // Mids
      midEnergy += dataArray[i];
    } else { // Treble (high frequencies)
      trebleEnergy += dataArray[i];
    }
  }
  
  // Normalize energies to 0-1
  totalEnergy = totalEnergy / (dataArray.length * 256);
  bassEnergy = bassEnergy / (dataArray.length * 0.1 * 256);
  midEnergy = midEnergy / (dataArray.length * 0.4 * 256);
  trebleEnergy = trebleEnergy / (dataArray.length * 0.5 * 256);
  
  // Update fluid attractor based on bass
  fluidAttractor.x = Math.sin(time * 0.5) * 10 * bassEnergy;
  fluidAttractor.y = Math.cos(time * 0.3) * 10 * midEnergy;
  fluidAttractor.z = Math.sin(time * 0.7) * 10 * trebleEnergy;
  
  // Fluid intensity based on overall energy
  fluidIntensity = 0.2 + totalEnergy * 2;
  
  // Fixed camera position instead of rotating
  camera.position.x = 0;
  camera.position.z = 80; // Further back to see the whole fluid
  camera.position.y = 20;
  camera.lookAt(0, 0, 0);
  
  // Update fluid simulation
  updateFluidParticles(bassEnergy, midEnergy, trebleEnergy, totalEnergy);
  
  renderer.render(scene, camera);
}

function updateFluidParticles(bassEnergy, midEnergy, trebleEnergy, totalEnergy) {
  // 长方体尺寸，可以随音乐变化
  const boxWidth = 80 + bassEnergy * 20;
  const boxHeight = 30 + midEnergy * 15;
  const boxDepth = 30 + trebleEnergy * 15;
  
  // Create fluid flow fields
  const flowFieldX = time * 0.2;
  const flowFieldY = time * 0.15;
  const flowFieldZ = time * 0.1;
  
  // 更新每个粒子
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const sphere = particle.mesh;
    const freqIndex = particle.frequencyIndex;
    const value = dataArray[freqIndex % dataArray.length] / 256.0;
    
    // 应用流体力
    
    // 1. 流体流动力 - 使用Perlin噪声模拟流体流动
    const noiseScale = 0.05;
    const noiseX = Math.sin((sphere.position.x * noiseScale + flowFieldX) * 2) * 
                   Math.cos((sphere.position.y * noiseScale + flowFieldY) * 2);
    const noiseY = Math.sin((sphere.position.y * noiseScale + flowFieldY) * 2) * 
                   Math.cos((sphere.position.z * noiseScale + flowFieldZ) * 2);
    const noiseZ = Math.sin((sphere.position.z * noiseScale + flowFieldZ) * 2) * 
                   Math.cos((sphere.position.x * noiseScale + flowFieldX) * 2);
    
    const fluidForce = new THREE.Vector3(
      noiseX * 0.05 * (1 + bassEnergy),
      noiseY * 0.05 * (1 + midEnergy),
      noiseZ * 0.05 * (1 + trebleEnergy)
    );
    
    // 2. 吸引力 - 减弱以增强流体感
    const attractorForce = new THREE.Vector3().subVectors(fluidAttractor, sphere.position);
    attractorForce.normalize().multiplyScalar(0.002 * fluidIntensity * bassEnergy);
    
    // 3. 长方体约束力
    const boxForce = new THREE.Vector3();
    
    // x轴约束
    if (sphere.position.x < -boxWidth/2) {
      boxForce.x = 0.1 * (-boxWidth/2 - sphere.position.x);
    } else if (sphere.position.x > boxWidth/2) {
      boxForce.x = 0.1 * (boxWidth/2 - sphere.position.x);
    }
    
    // y轴约束
    if (sphere.position.y < -boxHeight/2) {
      boxForce.y = 0.1 * (-boxHeight/2 - sphere.position.y);
    } else if (sphere.position.y > boxHeight/2) {
      boxForce.y = 0.1 * (boxHeight/2 - sphere.position.y);
    }
    
    // z轴约束
    if (sphere.position.z < -boxDepth/2) {
      boxForce.z = 0.1 * (-boxDepth/2 - sphere.position.z);
    } else if (sphere.position.z > boxDepth/2) {
      boxForce.z = 0.1 * (boxDepth/2 - sphere.position.z);
    }
    
    // 4. 轻微的回归原位置的力 - 减弱以增强流体感
    const homeForce = new THREE.Vector3();
    if (particle.boxPosition) {
      homeForce.x = (particle.boxPosition.x - sphere.position.x) * 0.0005; // 减弱回归力
      homeForce.y = (particle.boxPosition.y - sphere.position.y) * 0.0005;
      homeForce.z = (particle.boxPosition.z - sphere.position.z) * 0.0005;
    }
    
    // 5. 粒子间相互作用力 - 模拟流体粒子间的相互作用
    const interactionForce = new THREE.Vector3();
    // 只与附近的10个粒子计算相互作用，以提高性能
    for (let j = 0; j < 10; j++) {
      const otherIndex = (i + j * 97) % particles.length; // 使用质数97来获取分散的粒子
      const otherSphere = particles[otherIndex].mesh;
      const distance = sphere.position.distanceTo(otherSphere.position);
      
      if (distance > 0 && distance < 3) {
        // 太近时排斥，适当距离时吸引
        const strength = (distance < 1.5) ? -0.01 / distance : 0.005 / distance;
        const direction = new THREE.Vector3().subVectors(otherSphere.position, sphere.position).normalize();
        interactionForce.add(direction.multiplyScalar(strength * value));
      }
    }
    
    // 应用所有力
    particle.velocity.add(fluidForce);
    particle.velocity.add(attractorForce);
    particle.velocity.add(boxForce);
    particle.velocity.add(homeForce);
    particle.velocity.add(interactionForce);
    
    // 阻尼（流体阻力）- 增加阻尼使运动更像流体
    particle.velocity.multiplyScalar(0.92);
    
    // 应用速度到位置
    sphere.position.add(particle.velocity);
    
    // 根据频率数据和能量调整大小，增加变化范围
    const scale = 0.5 + value * 4 * (1 + bassEnergy);
    sphere.scale.set(scale, scale, scale);
    
    // 根据频率、位置和能量调整颜色，使用彩虹色范围
    // 保持原始色相，但根据音频数据轻微变化
    const originalHue = particle.originalColor.getHSL({}).h;
    const hueVariation = value * 0.2; // 根据音频值变化色相
    const hue = (originalHue + hueVariation) % 1.0; // 保持在0-1范围内
    const saturation = 0.7 + midEnergy * 0.3;
    const lightness = 0.6 + value * 0.6;
    sphere.material.color.setHSL(hue, saturation, lightness);
    
    // 根据能量和位置调整透明度
    sphere.material.opacity = 0.3 + value * 0.7;
  }
}

function init() {
  initAudio();
  initThree();
  animate();
  
  // Setup file input for audio
  const fileInput = document.getElementById('audio-file');
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      loadAudio(e.target.files[0]);
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Add CSS to ensure the page has no margins or scrollbars
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  
  // Move controls to a better position for fullscreen
  const controls = document.getElementById('controls');
  if (controls) {
    controls.style.position = 'fixed';
    controls.style.top = '20px';
    controls.style.left = '20px';
    controls.style.zIndex = '100';
    controls.style.background = 'rgba(0,0,0,0.5)';
    controls.style.padding = '10px';
    controls.style.borderRadius = '5px';
    controls.style.color = 'white';
  }
}

window.onload = init;
