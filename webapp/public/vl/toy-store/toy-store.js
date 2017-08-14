"use strict";

function ToyStore(webGLContainer, executeScript)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var sceneLoaded = function()
    {
        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var origin = new THREE.Vector3(0.0, 18.0, 0.0);
    var initialDefaultCameraPosVectorLength;

    self.Valter = null;

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 21.0, 15.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, true, true);

        var light = new THREE.AmbientLight(0xecf5ff, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.15);
        self.getVlabScene().add(light);

        // Valter
        //self.Valter = new Valter(self, new THREE.Vector3(-20.0, 0.0, -52.0), true, executeScript);

        // this VLab constants
        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();

        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("ceeling"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("leftWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rightWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("frontWall"));

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);

    };

    var simulationStep = function()
    {
    };

    self.cameraControlsEvent = function()
    {
        if (!self.getSceneRenderPause())
        {
        }
    };

    //this VLab is ready to be initialized
    $.getJSON("/vl/toy-store/toy-store.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    return this;
}
