"use strict";

function PhMpdFcm(webGLContainer)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    $.getJSON("ph-mpd-fcm.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 4.0, 14.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.addEventListener("change", self.cameraControlsEvent);
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode

        self.getDefaultCamera().controls.minDistance = 5;
        self.getDefaultCamera().controls.maxDistance = 15;
        self.getDefaultCamera().controls.maxPolarAngle = Math.PI/2 - 0.2; 
        self.getDefaultCamera().controls.minPolarAngle = 0.85;

//        self.getDefaultCamera().controls.testMode = true;

        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var origin = new THREE.Vector3(0, 0, 0);
    var pulleyPos;
    var ropeLineWidth = 3.0;
    var initialDefaultCameraPosVectorLength;
    var labSwitchState = 1;
    var stopButtonTopState = true;
    var stopButtonLowerState = false;

    var scenePostBuilt = function()
    {
        activeObjects["slopingSurface"] = self.getVlabScene().getObjectByName("slopingSurface");
        activeObjects["slopingBody"] = self.getVlabScene().getObjectByName("slopingBody");
        activeObjects["plumb"] = self.getVlabScene().getObjectByName("plumb");
        activeObjects["frame"] = self.getVlabScene().getObjectByName("frame");
        activeObjects["framePivot"] = self.getVlabScene().getObjectByName("framePivot");
        activeObjects["pulley"] = self.getVlabScene().getObjectByName("pulley");
        activeObjects["pulleyMotor"] = self.getVlabScene().getObjectByName("pulleyMotor");
        activeObjects["pusher"] = self.getVlabScene().getObjectByName("pusher");
        activeObjects["stopButton1Lever"] = self.getVlabScene().getObjectByName("stopButton1Lever");
        activeObjects["stopButton1Pin"] = self.getVlabScene().getObjectByName("stopButton1Pin");
        activeObjects["stopButton2Lever"] = self.getVlabScene().getObjectByName("stopButton2Lever");
        activeObjects["stopButton2Pin"] = self.getVlabScene().getObjectByName("stopButton2Pin");
        activeObjects["stopButton3Lever"] = self.getVlabScene().getObjectByName("stopButton3Lever");
        activeObjects["stopButton3Pin"] = self.getVlabScene().getObjectByName("stopButton3Pin");
        activeObjects["stopButton4Lever"] = self.getVlabScene().getObjectByName("stopButton4Lever");
        activeObjects["stopButton4Pin"] = self.getVlabScene().getObjectByName("stopButton4Pin");
        activeObjects["labSwitchHandlerBase"] = self.getVlabScene().getObjectByName("labSwitchHandlerBase");

        // this VLab constants
        pulleyPos = activeObjects["pulley"].position.clone();
        pulleyPos.y += 0.25;
        initialDefaultCameraPosVectorLength = self.getDefaultCamera().position.length();

        // position frame
        new slopingSurfaceFrameAnimaiton().process();

        // add rope
        var framePivotPos = new THREE.Vector3();
        activeObjects["slopingSurface"].updateMatrixWorld();
        framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);
        var pulleyPos1 = pulleyPos.clone();
        pulleyPos1.x += 0.1;
        var pulleyPos2 = pulleyPos1.clone();
        pulleyPos2.x += 0.1;
        var pulleyMotorPos = activeObjects["pulleyMotor"].position.clone();
        pulleyMotorPos.y += 0.3;
        pulleyMotorPos.x += 0.3;
        var ropeGeometry = new THREE.Geometry();
        ropeGeometry.vertices.push(framePivotPos);
        ropeGeometry.vertices.push(pulleyPos);
        ropeGeometry.vertices.push(pulleyPos1);
        ropeGeometry.vertices.push(pulleyPos2);
        ropeGeometry.vertices.push(pulleyMotorPos);
        var ropeMaterial = new THREE.LineBasicMaterial({
                                     color:     0x1c2123,
                                     opacity:   1.0,
                                     linewidth: ropeLineWidth
        });
        activeObjects["rope"] = new THREE.Line(ropeGeometry, ropeMaterial);
        activeObjects["rope"].castShadow = true;
        self.getVlabScene().add(activeObjects["rope"]);

        // position pusher
        activeObjects["pusher"].geometry.rotateX(Math.PI / 2);
        activeObjects["pusher"].position.copy(pulleyPos2);
/*
        activeObjects["arrowHelper"] = new THREE.ArrowHelper(pulleyMotorPosDirection.clone().normalize(), pulleyPos2, pulleyMotorPosDirection.length(), 0xffffff, 1.0, 0.25);
        self.getVlabScene().add(activeObjects["arrowHelper"]);
*/
        activeObjects["pusher"].lookAt(pulleyMotorPos);
        activeObjects["pusher"].translateZ(4.0);

        // lower stop button off-state
        activeObjects["stopButton3Lever"].rotation.z = activeObjects["stopButton4Lever"].rotation.z = 0.15;
        activeObjects["stopButton3Pin"].scale.y = activeObjects["stopButton4Pin"].scale.y = 1.8;

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {
        
    };

    self.cameraControlsEvent = function()
    {
        var cameraRelativeDistance = initialDefaultCameraPosVectorLength / self.getDefaultCamera().position.length();
        if (3 * cameraRelativeDistance < 5)
        {
            ropeLineWidth = activeObjects["rope"].material.linewidth = 3 * cameraRelativeDistance;
        }

        if (self.getDefaultCamera().controls.enabled)
        {
            if (self.getDefaultCamera().quaternion.y < -0.7 || self.getDefaultCamera().quaternion.y > 0.7)
            {
                self.interactionHelpersVisibility(false);
            }
            else
            {
                self.interactionHelpersVisibility(true);
            }
        }
    };

    var ropeAnimation = function()
    {
        this.completed = false;

        this.process = function()
        {
            if (
                   ((!stopButtonTopState && !stopButtonLowerState) || 
                   (stopButtonTopState && labSwitchState == 1)     || 
                   (stopButtonLowerState && labSwitchState == -1)) &&
                   labSwitchState != 0
               )
            {
                activeObjects["slopingSurface"].updateMatrixWorld();
                var framePivotPos = new THREE.Vector3();
                framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);

                activeObjects["rope"].geometry.vertices[0].copy(framePivotPos);
                activeObjects["rope"].geometry.verticesNeedUpdate = true;

                var ropeTrembling = Math.random() * 0.5;
                activeObjects["rope"].material.linewidth = ropeLineWidth + ((ropeTrembling > 0.25) ? ropeTrembling : -ropeTrembling);
            }
        }

        return this;
    };

    var slopingSurfaceFrameAnimaiton = function()
    {
        this.completed = false;
        var framePos, framePosY, frameAngle;

        this.process = function()
        {
            if (
                   ((!stopButtonTopState && !stopButtonLowerState) || 
                   (stopButtonTopState && labSwitchState == 1)     || 
                   (stopButtonLowerState && labSwitchState == -1)) &&
                   labSwitchState != 0
               )
            {
                activeObjects["slopingBody"].__dirtyPosition = true;
                activeObjects["slopingBody"].__dirtyRotation = true;
                activeObjects["slopingSurface"].__dirtyRotation = true;
                activeObjects["slopingSurface"].rotation.z -= 0.001 * labSwitchState;

                framePos = new THREE.Vector3();
                activeObjects["slopingSurface"].updateMatrixWorld();
                framePos.setFromMatrixPosition(activeObjects["frame"].matrixWorld);

                framePosY = new THREE.Vector3();
                framePosY.y = framePos.y;

                frameAngle = Math.asin( ( pulleyPos.length() * Math.sin( pulleyPos.angleTo(framePos) ) ) / pulleyPos.distanceTo(framePos));
                frameAngle += (Math.PI / 2) - framePosY.angleTo(framePos);
     
                activeObjects["frame"].rotation.z = -(Math.PI / 2 + activeObjects["slopingSurface"].rotation.z - frameAngle);
                activeObjects["plumb"].rotation.z = -activeObjects["slopingSurface"].rotation.z;

                activeObjects["pulleyMotor"].rotateZ(0.01 * -labSwitchState);
                activeObjects["pulley"].rotateZ(0.01 * -labSwitchState);
            }
        }

        return this;
    };

    var pusherAnimation = function()
    {
        this.completed = false;

        var prevPulleyFramePivotVector;

        this.process = function()
        {
            if (
                   ((!stopButtonTopState && !stopButtonLowerState) || 
                   (stopButtonTopState && labSwitchState == 1)     || 
                   (stopButtonLowerState && labSwitchState == -1)) &&
                   labSwitchState != 0
               )
            {
                activeObjects["slopingSurface"].updateMatrixWorld();
                var framePivotPos = new THREE.Vector3();
                framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);
                var pulleyFramePivotVector = framePivotPos.clone().sub(pulleyPos);
                if (prevPulleyFramePivotVector != undefined)
                {
                    var dZpusher = Math.abs(prevPulleyFramePivotVector - pulleyFramePivotVector.length());
                    activeObjects["pusher"].translateZ(labSwitchState * dZpusher);
                }
                prevPulleyFramePivotVector = pulleyFramePivotVector.length();
            }

            // upper contact
            if (activeObjects["pusher"].position.y >= 0.276)
            {
                stopButtonTopState = true;
            }
            if (labSwitchState == 1 && activeObjects["pusher"].position.y <= 0.136)
            {
                stopButtonTopState = false;
            }

            if (activeObjects["pusher"].position.y > 0.136 && activeObjects["pusher"].position.y < 0.276)
            {
                activeObjects["stopButton1Lever"].rotateZ(0.007 * labSwitchState);
                activeObjects["stopButton2Lever"].rotateZ(0.007 * labSwitchState);
                activeObjects["stopButton1Pin"].scale.y = activeObjects["stopButton2Pin"].scale.y += 0.02 * labSwitchState;
            }

            // lower contact
            if (activeObjects["pusher"].position.y <= -3.670)
            {
                stopButtonLowerState = true;
            }
            if (labSwitchState == -1 && activeObjects["pusher"].position.y >= -3.525)
            {
                stopButtonLowerState = false;
            }

            if (activeObjects["pusher"].position.y < -3.525 && activeObjects["pusher"].position.y > -3.670)
            {
                activeObjects["stopButton3Lever"].rotateZ(-0.0125 * labSwitchState);
                activeObjects["stopButton4Lever"].rotateZ(-0.0125 * labSwitchState);
                activeObjects["stopButton3Pin"].scale.y = activeObjects["stopButton4Pin"].scale.y -= 0.03 * labSwitchState;
            }

        }

        return this;
    };

    self.button1Pressed = function()
    {
        self.addProcessNode("ropeAnimation", new ropeAnimation());
        self.addProcessNode("slopingSurfaceFrameAnimaiton", new slopingSurfaceFrameAnimaiton());
        self.addProcessNode("pusherAnimation", new pusherAnimation());
    };

    self.labSwitchHandler = function()
    {
        var mouseEvent = arguments[0];
        var rotation = activeObjects["labSwitchHandlerBase"].rotation.y;
        var labSwitchStateChangeTween = new TWEEN.Tween(activeObjects["labSwitchHandlerBase"].rotation);
            labSwitchStateChangeTween.easing(TWEEN.Easing.Circular.In);
            labSwitchStateChangeTween.onComplete(function(){
                if (activeObjects["labSwitchHandlerBase"].rotation.y == 0)
                {
                    labSwitchState = 0;
                }
                else if (activeObjects["labSwitchHandlerBase"].rotation.y > 0)
                {
                    labSwitchState = 1;
                }
                else if (activeObjects["labSwitchHandlerBase"].rotation.y < 0)
                {
                    labSwitchState = -1;
                }
            });
        if (mouseEvent.ctrlKey)
        {
            if(activeObjects["labSwitchHandlerBase"].rotation.y > -Math.PI / 2)
            {
                labSwitchStateChangeTween.to({y: (rotation - Math.PI / 2)}, 150);
            }
        }
        else
        {
            if(activeObjects["labSwitchHandlerBase"].rotation.y < Math.PI / 2)
            {
                labSwitchStateChangeTween.to({y: (rotation + Math.PI / 2)}, 150);
            }
        }
        labSwitchStateChangeTween.start();
    };

    self.button1Released = function()
    {
        self.setProcessNodeCompleted("ropeAnimation");
        self.setProcessNodeCompleted("slopingSurfaceFrameAnimaiton");
        self.setProcessNodeCompleted("pusherAnimation");
    };

    self.physijsCollision = function(other_object, linear_velocity, angular_velocity)
    {
        self.trace(this.name + " [collided with] " + other_object.name);
    };

    // helpers
    self.helperZoom = function()
    {
        var zoomArgs = Object.assign({"sprite": this, "vlab":self}, arguments[0][0]);
        if (zoomArgs.target.indexOf("stopbutton") > -1)
        {
            ropeLineWidth = activeObjects["rope"].material.linewidth = 6;
        }
        new ZoomHelper(zoomArgs);
    }

}
