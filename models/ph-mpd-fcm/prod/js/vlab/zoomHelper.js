"use strict";

function ZoomHelper()
{
    var argsObj = arguments[0];
    var self = this;
    var sprite = argsObj.sprite;
    var vlab = argsObj.vlab;
    var target = argsObj.target;

    self.name = argsObj.target + "ZoomHelper";
    self.completed = false;


    self.process = function()
    {
        var targetPos = new THREE.Vector3();
        targetPos.setFromMatrixPosition(vlab.getVlabScene().getObjectByName(target).matrixWorld);
        targetPos.x += (argsObj.xOffset != undefined) ? argsObj.xOffset : 0.0;
        targetPos.y += (argsObj.yOffset != undefined) ? argsObj.yOffset : 0.0;
        targetPos.z += (argsObj.zOffset != undefined) ? argsObj.zOffset : 0.0;
        vlab.getDefaultCamera().position.copy(targetPos);
        vlab.getDefaultCamera().lookAt(targetPos);
        vlab.getDefaultCamera().controls.enabled = false;
    };

    self.reset = function(event)
    {
        if (event.button == 2)
        {
            removeEventListener("mouseup", self.reset);
            vlab.getDefaultCamera().controls.enabled = true;
            vlab.getDefaultCamera().position.copy(cameraPosition);
            vlab.getDefaultCamera().quaternion.copy(cameraPQuaternion);
            sprite.visible = true;
            self.completed = true;
        }
    };

    var cameraPosition = new THREE.Vector3();
    var cameraPQuaternion = new THREE.Quaternion();
    cameraPosition.copy(vlab.getDefaultCamera().position);
    cameraPQuaternion.copy(vlab.getDefaultCamera().quaternion);


    sprite.visible = false;
    $("#tooltipDiv").hide();

    vlab.processNodes[self.name] = self;

    addEventListener("mouseup", self.reset);

    return self;
};
