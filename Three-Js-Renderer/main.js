import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';



class RigidBody {
  constructor() {

  }

  createBox(mass, pos, rot, size) {
    this.transform = new Ammo.btTransform();
    this.transform.setIdentity();
    this.transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    this.transform.setRotation(new Ammo.btQuaternion(rot.x, rot.y, rot.z, rot.w));
    this.motionState = new Ammo.btDefaultMotionState(this.transform);

    const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
    this.shape = new Ammo.btBoxShape(btSize);
    this.shape.setMargin(0.05);

    this.inertia = new Ammo.btVector3(0, 0, 0);
    if (mass > 0){
      this.shape.calculateLocalInertia(mass, this.inertia);
    }

    this.info = new Ammo.btRigidBodyConstructionInfo(mass, this.motionState, this.shape, this.inertia);
    this.body = new Ammo.btRigidBody(this.info);

  }
}
class BasicWorld{
  constructor() {
    
  }

  init() {
    this.collisonConfiguration = new Ammo.btDefaultCollisionConfiguration();
    this.dispatcher = new Ammo.btCollisionDispatcher(this.collisonConfiguration);
    this.broadphase = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher, this.broadphase, this.solver, this.collisonConfiguration);
    this.physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

    this.scene = new THREE.Scene();

    const cameraSettings = {fov: 60, aspect: window.innerWidth / window.innerHeight, near: 1, far: 1000};
    this.camera = new THREE.PerspectiveCamera(cameraSettings.fov, cameraSettings.aspect, cameraSettings.near, cameraSettings.far);
    this.camera.position.set(75, 20, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#bg'),
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);


    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.01;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = 200;
    light.shadow.camera.right = -200;
    light.shadow.camera.top = 200;
    light.shadow.camera.bottom = -200;
    this.scene.add(light);

    let ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);


    const ground = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshStandardMaterial({color: 0x808080}));
    ground.castShadow = false;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const rbGround = new RigidBody();
    rbGround.createBox(0, ground.position, ground.quaternion, new THREE.Vector3(100, 1, 100));
    this.physicsWorld.addRigidBody(rbGround.body);


    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({color: 0x00ff00}));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(0, 25, 0);
    this.scene.add(box);

    const rbBox = new RigidBody();
    rbBox.createBox(5, box.position, box.quaternion, new THREE.Vector3(10, 10, 10));
    this.physicsWorld.addRigidBody(rbBox.body);

    this.rigidBodies = [{mesh: box, rb: rbBox}, {mesh: ground, rb: rbGround}];

    this.lastUpdateTime = 0;

    this.update();
  }


  update() {
    requestAnimationFrame((t) => {
      if (this.lastUpdateTime === 0) {
        this.lastUpdateTime = t;
      }

      const deltaTime = t - this.lastUpdateTime;
      const seconds = deltaTime * 0.001;

      this.physicsWorld.stepSimulation(seconds, 10);

      for (let i = 0; i < this.rigidBodies.length; i++) {
        this.tempTransform = new Ammo.btTransform();

        this.rigidBodies[i].rb.motionState.getWorldTransform(this.tempTransform);
        const origin = this.tempTransform.getOrigin();
        const rotation = this.tempTransform.getRotation();

        const pos3 = new THREE.Vector3(origin.x(), origin.y(), origin.z());
        const rot4 = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());

        this.rigidBodies[i].mesh.position.copy(pos3);
        this.rigidBodies[i].mesh.quaternion.copy(rot4);
      }

      this.renderer.render(this.scene, this.camera);
      this.controls.update();

      this.lastUpdateTime = t;
      
      this.update();

    
    });
  }

}

let WORLD = null;
window.addEventListener("DOMContentLoaded", () => {
  Ammo().then((lib) => {
    Ammo = lib;
    WORLD = new BasicWorld();
    
    WORLD.init();
  });
});














// const game = new Game();
// game.init();
// game.createPlayer("player1", 0x00ff00, 0, 0, 0, 5, 5, 5, new THREE.Vector3(0, 0, 0));
