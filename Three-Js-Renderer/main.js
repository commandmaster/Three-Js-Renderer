import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#bg'),
    });
    
    this.animate = this.animate.bind(this);

    this.keyDown = {"w": false, "a": false, "s": false, "d": false};
  }

  init() {

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.position.setZ(30);
    this.renderer.render(this.scene, this.camera);

    this.mouseX = 0;
    this.mouseY = 0;

    window.addEventListener('mousemove', (e) => {
      console.log(e);
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    this.addTorus();
    this.addLights();
    this.addStars();
    this.addSpaceTexture();
    this.setUpKeyControls();
    this.animate();
    
  }

  setUpKeyControls() {
    document.addEventListener('keydown', (e) => {
      if (e.key in this.keyDown) {
        this.keyDown[e.key] = true;
      }

    });

    document.addEventListener('keyup', (e) => {
      if (e.key in this.keyDown) {
        this.keyDown[e.key] = false;
      }
    });
  }

  addTorus() {
    const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
    const material = new THREE.MeshStandardMaterial({ color: 0xFF6347 });
    const torus = new THREE.Mesh(geometry, material);
    this.scene.add(torus);
    this.torus = torus;
  }

  addLights() {
    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(20, 20, 20);
    const ambientLight = new THREE.AmbientLight(0xffffff);
    this.scene.add(pointLight, ambientLight);
    this.lightHelper = new THREE.PointLightHelper(pointLight);
    this.scene.add(this.lightHelper);
  }

  addStars() {
    function addStar() {
      const geometry = new THREE.SphereGeometry(0.25, 24, 24);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const star = new THREE.Mesh(geometry, material);
      const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100));
      star.position.set(x, y, z);
      this.scene.add(star);
    }
    Array(200).fill().forEach(addStar.bind(this));
  }

  addSpaceTexture() {
    const spaceTexture = new THREE.TextureLoader().load('space.jpg');
    this.scene.background = spaceTexture;
  }

  animate() {
    requestAnimationFrame(this.animate);
  
    
    
    if (this.keyDown["w"]) {
      const direction = new THREE.Vector3;
      let speed = 1.0;

      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, speed);
    }

    if (this.keyDown["s"]) {
      const direction = new THREE.Vector3;
      let speed = 1.0;

      this.camera.getWorldDirection(direction);
      this.camera.position.addScaledVector(direction, -speed);
    }

    if (this.keyDown["a"]) {
      const direction = new THREE.Vector3;
      let speed = 1.0;

      this.camera.getWorldDirection(direction);
      direction.applyAxisAngle(new THREE.Vector3(0, -1, 0), Math.PI / 2);
      this.camera.position.addScaledVector(direction, -speed);
    }

    if (this.keyDown["d"]) {
      const direction = new THREE.Vector3;
      let speed = 1.0;

      this.camera.getWorldDirection(direction);
      direction.applyAxisAngle(new THREE.Vector3(0, -1, 0), Math.PI / 2);
      this.camera.position.addScaledVector(direction, speed);
    }

    this.camera.rotation.set(this.mouseY, -this.mouseX, 0);

    this.torus.rotation.x += 0.01;
    this.torus.rotation.y += 0.005;
    this.torus.rotation.z += 0.01;
    
    this.renderer.render(this.scene, this.camera);

  }
}

const game = new Game();
game.init();
