"use strict";

function PhMpdFcm(webGLContainer)
{
    var self = this;

    VLab.apply(self, [{title: "Friction coefficient measurement",
                       colladaSceneFile: "test.dae"}]);

    self.initialize(webGLContainer);

    var scene = new Physijs.Scene({ fixedTimeStep: 1 / 120});
    scene.isPhysijsScene = true;
    self.setVlabScene(scene);

}
