"use strict";

function ValterANNNavigation(webGLContainer)
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
    var origin = new THREE.Vector3(0.0, 1.5, 0.0);
    var initialDefaultCameraPosVectorLength;

    self.Valters = [];

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 1.5, 2.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, true, true);

        var light = new THREE.AmbientLight(0xecf5ff, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.15);
        self.getVlabScene().add(light);

        // Valters
        var num = 50;
        var x = -3.0;
        var dx = (x*-1*2) / num;
        for (var i = 0; i < num; i++)
        {
            self.Valters[i] = new ValterExtrSimplified(self, new THREE.Vector3(x, 0.0, 0.0), i, false);
            x += dx;
        }

        // self.Valters[0] = new ValterExtrSimplified(self, new THREE.Vector3(0.0, 0.0, 0.0), 0, true);

        // this VLab constants
        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();


        setTimeout(self.waitingForValterInitialization, 250);


    };

    self.waitingForValterInitialization = function()
    {
        console.log("Wainting for Valter initialization...");
        if (!self.Valters[self.Valters.length - 1].initialized)
        {
            setTimeout(self.waitingForValterInitialization, 250);
            return;
        }

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);

    }

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
    $.getJSON("/vl/valter-navigation-ann/valter-navigation-ann.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    return this;
}
