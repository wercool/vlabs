"use strict";

function KukaGripperExp(webGLContainer)
{
    var self = this;

    addEventListener("vlabInitialized", function (event) { initialized(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var vlabNature = {
        "title":            "Kuka Vacuum Gripper",
        "isPhysijsScene":   false,
        "showStatistics":   true,
        "showAxis":         true
    };

    // this VLab constants
    var ikTarget;
    var kukaVacuumGripper = null;

    var initialized = function()
    {
        self.getDefaultCamera().position.set(0.0, 5.0, 5.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        self.getDefaultCamera().controls.testMode = true;

        kukaVacuumGripper = new KukaVacuumGripper(self, true, null, [4, 9, 15, 21]);

        var light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(-10, 10, 10);
        self.getVlabScene().add(light);

        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {

    };

    //this VLab is ready to be initialized
    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);
}
