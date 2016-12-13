"use strict";

function ZoomHelper()
{
    var argsObj = arguments[0];
    var self = this;
    var sprite = argsObj.sprite;
    var vlab = argsObj.vlab;
    var target = argsObj.target;
    var direction = argsObj.direction;

    self.name = argsObj.target + "ZoomHelper";
    self.halt = false;


    self.process = function()
    {
        var targetPos = new THREE.Vector3();
        targetPos.setFromMatrixPosition(vlab.getVlabScene().getObjectByName(target).matrixWorld);
        targetPos.z += 1.0;
        vlab.getDefaultCamera().position.copy(targetPos);
        vlab.getDefaultCamera().lookAt(targetPos);
        vlab.getDefaultCamera().controls.enabled = false;
    };

    self.reset = function()
    {
        vlab.getDefaultCamera().controls.reset();
        vlab.getDefaultCamera().controls.enabled = true;
        sprite.visible = true;
        removeEventListener("mouseup", self.reset);
        self.halt = true;
    };


    sprite.visible = false;
    $("#tooltipDiv").hide();

    vlab.processNodes[self.name] = self;

    addEventListener("mouseup", self.reset);

    return self;
};
