"use strict";

function ValterLab(webGLContainer)
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
    var origin = new THREE.Vector3(0, 20, 10);
    var initialDefaultCameraPosVectorLength;
    var valter = null;

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 20.0, 15.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, false);

        activeObjects["floor"] = self.getVlabScene().getObjectByName("floor");

        var light = new THREE.AmbientLight(0xecf5ff, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.15);
        self.getVlabScene().add(light);

        if (self.vlabNature.advanceLighting)
        {
            var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 55.0, 2.5);
            rectLight.matrixAutoUpdate = true;
            rectLight.intensity = 120.0;
            rectLight.position.set(0.0, 39.0, -19.0);
            rectLight.rotation.set(-0.5, 0.0, 0.0);
            // var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
            // rectLight.add(rectLightHelper);
            self.getVlabScene().add(rectLight);

            if (!self.vlabNature.advanceLighting1src)
            {
                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(-27.5, 40, 14.0);
                rectLight.rotation.set(0.0, 1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);

                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(27.5, 40, 14.0);
                rectLight.rotation.set(0.0, -1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);
            }
        }

        // Valter
        valter = new Valter(self, new THREE.Vector3(0, 2.57, 5), true);

        // this VLab constants

        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();

        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("frontWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("leftWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rightWall"));

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
    $.getJSON("/vl/valter-lab/valter-lab.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });
}
