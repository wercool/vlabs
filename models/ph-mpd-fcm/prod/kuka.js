"use strict";

function Kuka(webGLContainer)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var vlabNature = {
        "title":            "Kuka",
        "sceneFile":        "scene/kuka.dae",
        "isPhysijsScene":   false,
        "showStatistics":   true,
        "showAxis":         true
    };

    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 20.0, 15.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        self.getDefaultCamera().controls.testMode = true;

        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var ikSolver;
    var ikChain;
    var ikTarget;

    var link1Pos = {};

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["link1"] = self.getVlabScene().getObjectByName("link1");
        activeObjects["link2"] = self.getVlabScene().getObjectByName("link2");
        activeObjects["link3"] = self.getVlabScene().getObjectByName("link3");
        activeObjects["link4"] = self.getVlabScene().getObjectByName("link4");
        activeObjects["link5"] = self.getVlabScene().getObjectByName("link5");

        activeObjects["link2"].rotateZ(-Math.PI / 4);
        activeObjects["link3"].rotateZ(-Math.PI / 4);
        activeObjects["link4"].rotateZ(-Math.PI / 4);

        self.setSceneRenderPause(false);

        animate();
    };

    var i = 0;
    var da = (Math.PI * 2) / 360;
    var animate = function()
    {
        if (i < 360)
        {
            //console.log(activeObjects["link1"].rotation.y);
            activeObjects["kukaBase"].updateMatrixWorld();
            var endEffectorPos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link5"].matrixWorld);
            activeObjects["link1"].rotateY(-da);
            console.log(endEffectorPos);

            i++;
            setTimeout(function(){ animate(); }, 5);
        }
    };

    var simulationStep = function()
    {
    };

}
