"use strict";

function ZoomHelper()
{
    var argsObj = arguments[0];
    var self = this;
    var sprite = argsObj.sprite;
    var vlab = argsObj.vlab;
    var target = argsObj.target;

    var processed = false;

    var cameraPosTween, cameraRotTween;

    self.completed = false;

    self.process = function()
    {
        if (!processed)
        {
            var targetPos = new THREE.Vector3();
            targetPos.setFromMatrixPosition(vlab.getVlabScene().getObjectByName(target).matrixWorld);
            targetPos.x += (argsObj.xOffset != undefined) ? argsObj.xOffset : 0.0;
            targetPos.y += (argsObj.yOffset != undefined) ? argsObj.yOffset : 0.0;
            targetPos.z += (argsObj.zOffset != undefined) ? argsObj.zOffset : 0.0;

            vlab.getDefaultCamera().position.copy(targetPos);
            vlab.getDefaultCamera().lookAt(targetPos);

            var cameraLookAtQuaternion = new THREE.Quaternion();
            cameraLookAtQuaternion.copy(vlab.getDefaultCamera().quaternion);

            vlab.getDefaultCamera().quaternion.copy(initialCameraQuaternion);
            vlab.getDefaultCamera().position.copy(initialCameraPosition);

            cameraPosTween = new TWEEN.Tween(vlab.getDefaultCamera().position);
            cameraPosTween.to({x:targetPos.x, y:targetPos.y, z:targetPos.z}, 500);
            cameraPosTween.onComplete(function(){
            if (typeof vlab.cameraControlsEvent === "function")
            {
                vlab.cameraControlsEvent();
            }});
            cameraPosTween.start();

            cameraRotTween = new TWEEN.Tween(vlab.getDefaultCamera().quaternion);
            cameraRotTween.to({x:cameraLookAtQuaternion.x, y:cameraLookAtQuaternion.y, z:cameraLookAtQuaternion.z}, 500);
            cameraRotTween.onComplete(function(){
            if (typeof vlab.cameraControlsEvent === "function")
            {
                vlab.cameraControlsEvent();
            }});
            cameraRotTween.start();

            processed = true;
        }
        vlab.getDefaultCamera().controls.enabled = false;
    };

    self.reset = function(event)
    {
        if (event.button == 2)
        {
            cameraPosTween.stop();
            cameraRotTween.stop();
            removeEventListener("mouseup", self.reset);

            cameraPosTween = new TWEEN.Tween(vlab.getDefaultCamera().position);
            cameraPosTween.to({x:initialCameraPosition.x, y:initialCameraPosition.y, z:initialCameraPosition.z}, 150);
            cameraPosTween.onComplete(function(){
            if (typeof vlab.cameraControlsEvent === "function")
            {
                vlab.cameraControlsEvent();
            }});
            cameraPosTween.start();

            cameraRotTween = new TWEEN.Tween(vlab.getDefaultCamera().quaternion);
            cameraRotTween.to({x:initialCameraQuaternion.x, y:initialCameraQuaternion.y, z:initialCameraQuaternion.z}, 150);
            cameraRotTween.onComplete(function(){
            if (typeof vlab.cameraControlsEvent === "function")
            {
                vlab.cameraControlsEvent();
            }});
            cameraRotTween.start();

            vlab.getDefaultCamera().controls.enabled = true;

//            vlab.getDefaultCamera().position.copy(initialCameraPosition);
//            vlab.getDefaultCamera().quaternion.copy(initialCameraQuaternion);

            if (typeof vlab.cameraControlsEvent === "function")
            {
                vlab.cameraControlsEvent();
            }

            self.completed = true;
        }
    };

    var initialCameraPosition = new THREE.Vector3();
    var initialCameraQuaternion = new THREE.Quaternion();
    initialCameraPosition.copy(vlab.getDefaultCamera().position);
    initialCameraQuaternion.copy(vlab.getDefaultCamera().quaternion);

    sprite.visible = false;

    vlab.interactionHelpersVisibility(false);

    $("#tooltipDiv").hide();

    vlab.addProcessNode(argsObj.sprite.name, self);

    addEventListener("mouseup", self.reset);

    return self;
};
