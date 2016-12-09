"use strict";

function PhMpdFcm(webGLContainer)
{
    var self = this;

    VLab.apply(self, [{title: "Friction coefficient measurement",
                       sceneFile: "scene/test.dae",
                       showAxis: true}]);

    self.initialize(webGLContainer);

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 0.0, 15.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.minDistance = 5;
        self.getDefaultCamera().controls.maxDistance = 15;
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;

        Physijs.scripts.worker = "/js/physijs_worker.js";
        Physijs.scripts.ammo = "/js/ammo.js";
        var scene = new Physijs.Scene({ fixedTimeStep: 1 / 120});
        scene.isPhysijsScene = true;
        self.setVlabScene(scene);
        self.buildScene();
    };

}
