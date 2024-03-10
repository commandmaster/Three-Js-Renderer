import * as THREE from 'three'
import { OrbitControls } from './jsm/controls/OrbitControls.js'
import Stats from './jsm/libs/stats.module.js'
import { GUI } from './jsm/libs/lil-gui.module.min.js'



class MultiplayerHandler {
  constructor(serverAdress = "http://localhost:3000") {
    this.socket = io.connect(serverAdress);
    this.world = new BasicWorld("sceneView");
    this.world.init();

    this.clientType = "spectator";

    this.socket.on('reloadGame', () => {
      location.reload();
    });

    this.socket.on('becomePlayer', (data) => {
      const actors = data.actors;
      if (data.gameState.state === "lobby") {
        this.world.setupLobby(actors);
        this.clientType = "player";
      }
    });

    this.socket.on('becomeHost', (data) => {
      const actors = data.actors;
      if (data.gameState.state === "lobby") {
        this.world.setupLobby(actors);
        this.clientType = "host";
      }
    });

    this.socket.on('becomeSpectator', () => {
      const actors = data.actors;
      this.world.setupLobby(actors);
      this.clientType = "spectator";
    });
    
    this.socket.on('startGame', (data) => {
      if (data.gameState.state === "playing") {
        if (this.clientType === "player") {
          const actors = data.actors;
          delete actors[socket.id];
          this.world.setupGame(actors, data.players[socket.id]);
        }
        else if (this.clientType === "host") {
          this.world.setupGame(data.actors, null);
        }

        else if (this.clientType === "spectator") {
          this.world.setupGame(data.actors, null);
        }
        
      }
    });
  }

}

class Actor {
  constructor(gameWorld, name, color, mass, pos, rot, size) {
    this.gameWorld = gameWorld;
    this.name = name;
    this.color = color;
    this.mass = mass;
    this.pos = pos;
    this.rot = rot;
    this.size = size;


    this.initRigidBody();
    this.initMesh();

  }

  initRigidBody(){
    this.rigidBody = this.gameWorld.physicsSystem.addBoxRigidBody(this.mass, this.pos, this.rot, this.size);
  }

  initMesh(){
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z), new THREE.MeshStandardMaterial({color: this.color}));
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.quaternion.set(this.rot.x, this.rot.y, this.rot.z, this.rot.w);
    this.gameWorld.scene.add(this.mesh);
  }

  update(){

    const tempTransform = new Ammo.btTransform();

    this.rigidBody.motionState.getWorldTransform(tempTransform);
    const origin = tempTransform.getOrigin();
    const rotation = tempTransform.getRotation();

    const pos3 = new THREE.Vector3(origin.x(), origin.y(), origin.z());
    const rot4 = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());

    this.mesh.position.copy(pos3);
    this.mesh.quaternion.copy(rot4);
  }
}

class Player {
  constructor(gameWorld, color, mass, pos, rot, size, spawnPos) {
    this.gameWorld = gameWorld;
    this.color = color;
    this.mass = mass;
    this.pos = pos;
    this.rot = rot;
    this.size = size;
    this.spawnPos = spawnPos;

    this.initRigidBody();
    this.initMesh();

  }

  initRigidBody(){
    this.rigidBody = this.gameWorld.physicsSystem.addBoxRigidBody(this.mass, this.pos, this.rot, this.size);
  }

  initMesh(){
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z), new THREE.MeshStandardMaterial({color: this.color}));
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.quaternion.set(this.rot.x, this.rot.y, this.rot.z, this.rot.w);
    this.gameWorld.scene.add(this.mesh);
  }

  update(){

    const tempTransform = new Ammo.btTransform();

    this.rigidBody.motionState.getWorldTransform(tempTransform);
    const origin = tempTransform.getOrigin();
    const rotation = tempTransform.getRotation();

    const pos3 = new THREE.Vector3(origin.x(), origin.y(), origin.z());
    const rot4 = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());

    this.mesh.position.copy(pos3);
    this.mesh.quaternion.copy(rot4);
  }
}



class ObjectManager{
  constructor(gameWorld) {
    this.actors = {};
    this.player = null;
    this.gameWorld = gameWorld;
  }

  createActor(name, color, mass, pos, rot, size) {
    this.actors[name] = new Actor(this.gameWorld, name, color, mass, pos, rot, size);
    console.log(this.actors);
  }

  createPlayer(color, mass, pos, rot, size) {
    this.player = new Player(this.gameWorld, color, mass, pos, rot, size);
  }

  update(){
    for (const actor in this.actors) {
      this.actors[actor].update();
    }
  }
}


class PhysicsSystem {
  constructor(gameWorld) {
    this.gameWorld = gameWorld;

    this.collisonConfiguration = new Ammo.btDefaultCollisionConfiguration();
    this.dispatcher = new Ammo.btCollisionDispatcher(this.collisonConfiguration);
    this.broadphase = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher, this.broadphase, this.solver, this.collisonConfiguration);
    this.physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

    this.rigidBodies = [];
  }

  addBoxRigidBody(mass, pos, rot, size) {
    const rb = new RigidBody();
    rb.createBox(mass, pos, rot, size);
    this.physicsWorld.addRigidBody(rb.body);

    if (this.gameWorld.gameMode === "sceneView"){
      const tempMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({color: 0x00ff00, wireframe: true}));
      this.gameWorld.scene.add(tempMesh);
      this.rigidBodies.push({rb, mesh: tempMesh});
    }

    else{
      this.rigidBodies.push({rb, mesh: null});
    }

    return rb;
    
  }

  update(deltaTime){
    this.physicsWorld.stepSimulation(deltaTime, 10);

    const updateMeshes = () => {
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
    };
    
    if (this.gameWorld.gameMode === "sceneView"){
      updateMeshes();
    }

    
  }
}


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
  constructor(gameMode = "sceneView") {
    this.gameMode = gameMode;
  }

  init() {
    this.physicsSystem = new PhysicsSystem(this);
    this.objectManager = new ObjectManager(this);

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

    this.lastUpdateTime = 0;

    this.update();
  }

  setupLobby(actors) {
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

    for (const actor in actors) {
      this.objectManager.createActor(actor, actors[actor].color, actors[actor].mass, actors[actor].pos, actors[actor].rot, actors[actor].size, actors[actor].spawnPos);
    }

    this.physicsSystem.addBoxRigidBody(0, new THREE.Vector3(0, -5, 0), new THREE.Quaternion(0, 0, 0, 1), new THREE.Vector3(100, 10, 100));
    this.physicsSystem.addBoxRigidBody(1, new THREE.Vector3(0, 10, 0), new THREE.Quaternion(0, 0, 0, 1), new THREE.Vector3(5, 5, 5));
  }

  setupGame(actors, player) {
    for(const actor in actors) {
      this.objectManager.createActor(actor, actors[actor].color, actors[actor].mass, new THREE.Vector3(actors[actor].pos.x, actors[actor].pos.y, actors[actor].pos.z), new THREE.Quaternion(actors[actor].rot.x, actors[actor].rot.y, actors[actor].rot.z, actors[actor].rot.w), new THREE.Vector3(actors[actor].size.x, actors[actor].size.y, actors[actor].size.z), actors[actor].spawnPos);
    }

    if (player !== null) {
      //this.objectManager.createPlayer(player.color, player.mass, player.pos, player.rot, player.size, player.spawnPos);
    }
  }


  update() {
    requestAnimationFrame((t) => {
      if (this.lastUpdateTime === 0) {
        this.lastUpdateTime = t;
      }

      const deltaTime = t - this.lastUpdateTime;
      const seconds = deltaTime * 0.001;

      this.physicsSystem.update(seconds);
      this.objectManager.update();

      this.renderer.render(this.scene, this.camera);
      this.controls.update();

      this.lastUpdateTime = t;
      
      this.update();

    
    });
  }

}


let multiplayerHandler = null;
window.addEventListener("DOMContentLoaded", () => {
  Ammo().then((lib) => {
    Ammo = lib;
    multiplayerHandler = new MultiplayerHandler("http://localhost:3000");
    
  });
});














// const game = new Game();
// game.init();
// game.createPlayer("player1", 0x00ff00, 0, 0, 0, 5, 5, 5, new THREE.Vector3(0, 0, 0));
