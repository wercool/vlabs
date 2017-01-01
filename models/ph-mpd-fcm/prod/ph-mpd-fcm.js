"use strict";

function PhMpdFcm(webGLContainer)
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
    var theta = undefined;
    var thetaRandomSeed = 0.0;
    var slopingBodyPhysicallyInitialized = false;
    var slopingBodyActivated = false;

    var origin = new THREE.Vector3(0, 0, 0);
    var pulleyPos;
    var ropeLineWidth = 3.0;
    var initialDefaultCameraPosVectorLength;
    var labSwitchState = 1;
    var stopButtonTopState = true;
    var stopButtonLowerState = false;
    var kuka = null;
    var initialSlopingBodyPosition = null;
    var slopingSurfaceFixtureContact = false;
    var kukaReturnsSlopingBodyStep = 0;

    var scenePostBuilt = function()
    {
        self.getDefaultCamera().position.set(-0.25, 20.0, 14.0);

        var tableTopPos = self.getVlabScene().getObjectByName("tableTop").position.clone();

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.setTarget(tableTopPos);
        self.getDefaultCamera().controls.addEventListener("change", self.cameraControlsEvent);
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        self.getDefaultCamera().controls.minDistance = 5;
        self.getDefaultCamera().controls.maxDistance = 15;
        self.getDefaultCamera().controls.maxPolarAngle = Math.PI/2 - 0.2; 
        self.getDefaultCamera().controls.minPolarAngle = 0.85;
        self.getDefaultCamera().controls.maxXPan    = tableTopPos.x + 3;
        self.getDefaultCamera().controls.minXPan    = tableTopPos.x - 3;
        self.getDefaultCamera().controls.maxYPan    = tableTopPos.y + 2;
        self.getDefaultCamera().controls.minYPan    = tableTopPos.y;
        self.getDefaultCamera().controls.update();

//        self.getDefaultCamera().controls.testMode = true;

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

        var light = new THREE.AmbientLight(0x404040, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.2);
        self.getVlabScene().add(light);

        var spotLight = new THREE.SpotLight(0xffffff, 0.6, 120, 85, 0, 2);
        spotLight.target = self.getVlabScene().getObjectByName("frontWall");
        spotLight.position.set(0, 30, -5);
        self.getVlabScene().add(spotLight);


        initialSlopingBodyPosition = activeObjects["slopingBody"].position.clone();

        // kuka
        kuka = new Kuka(self,
                        false, 
                        self.getVlabScene().getObjectByName("kukabasePlate").position, 
                        null, 
                        KukaVacuumGripper, 
                        [self, null, true, "slopingBody", [2, 28]]);

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
                                     color:     0x000000,
                                     opacity:   0.5,
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
        if (!slopingBodyPhysicallyInitialized)
        {
            activeObjects["slopingBody"].updateMatrixWorld();
            THREE.SceneUtils.attach(activeObjects["slopingBody"], self.getVlabScene(), activeObjects["slopingSurface"]);
            self.setPhysijsScenePause(true);
            slopingBodyPhysicallyInitialized = true;
            return;
        }

        if ((-theta * 180 / Math.PI >= (self.vlabNature.presets.tetha + thetaRandomSeed)) && !slopingBodyActivated)
        {
            slopingBodyActivated = true;
            THREE.SceneUtils.detach(activeObjects["slopingBody"], activeObjects["slopingSurface"], self.getVlabScene());
            self.setPhysijsScenePause(false);
            return;
        }
        if (!slopingSurfaceFixtureContact)
        {
            return;
        }
        if (kukaReturnsSlopingBodyStep == 0)
        {
            var slopingBodyLinearVelocityX = activeObjects["slopingBody"].getLinearVelocity().x;
            if (Math.abs(slopingBodyLinearVelocityX) < 0.001)
            {
                self.setPhysijsScenePause(true);
                kukaReturnsSlopingBodyStep = 1;
                kukaReturnsSlopingBody();
            }
        }
        if ((kuka.positioning && kukaReturnsSlopingBodyStep == 1) || kukaReturnsSlopingBodyStep == 6 || kukaReturnsSlopingBodyStep == 7)
        {
            kuka.gripper.update();
        }
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
                   (!stopButtonTopState && !stopButtonLowerState && labSwitchState != 0)    || 
                   (stopButtonTopState && labSwitchState == 1)                              || 
                   (stopButtonLowerState && labSwitchState == -1)
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
                   (!stopButtonTopState && !stopButtonLowerState && labSwitchState != 0)    || 
                   (stopButtonTopState && labSwitchState == 1)                              || 
                   (stopButtonLowerState && labSwitchState == -1)
               )
            {
                if (theta === undefined)
                {
                    activeObjects["slopingSurface"].updateMatrixWorld();
                    theta = activeObjects["slopingSurface"].rotation.z;
                }
                theta -= 0.00125 * labSwitchState;

                activeObjects["slopingBody"].__dirtyPosition = true;
                activeObjects["slopingBody"].__dirtyRotation = true;
                activeObjects["slopingSurface"].__dirtyRotation = true;

                activeObjects["slopingSurface"].rotation.z = theta;

                framePos = new THREE.Vector3();
                activeObjects["slopingSurface"].updateMatrixWorld();
                framePos.setFromMatrixPosition(activeObjects["frame"].matrixWorld);

                framePosY = new THREE.Vector3();
                framePosY.y = framePos.y;

                frameAngle = Math.asin( ( pulleyPos.length() * Math.sin( pulleyPos.angleTo(framePos) ) ) / pulleyPos.distanceTo(framePos));
                frameAngle -= (Math.PI / 2) - framePosY.angleTo(framePos);
     
                activeObjects["frame"].rotation.z = -(Math.PI / 2 + activeObjects["slopingSurface"].rotation.z - frameAngle);
                activeObjects["plumb"].rotation.z = -activeObjects["slopingSurface"].rotation.z;

                activeObjects["pulleyMotor"].rotateZ(0.0125 * -labSwitchState);
                activeObjects["pulley"].rotateZ(0.0125 * -labSwitchState);
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
                   (!stopButtonTopState && !stopButtonLowerState && labSwitchState != 0)    || 
                   (stopButtonTopState && labSwitchState == 1)                              || 
                   (stopButtonLowerState && labSwitchState == -1)
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

                // upper contact
                if (activeObjects["pusher"].position.y >= 18.85)
                {
                    stopButtonTopState = true;
                    if (kukaReturnsSlopingBodyStep == 2)
                    {
                        self.nextKukaReturnsSlopingBodyStep();
                    }
                }
                if (labSwitchState == 1 && activeObjects["pusher"].position.y <= 18.75)
                {
                    stopButtonTopState = false;
                }

                if (activeObjects["pusher"].position.y < 18.85 && activeObjects["pusher"].position.y > 18.75)
                {
                    activeObjects["stopButton1Lever"].rotateZ(0.0067 * labSwitchState);
                    activeObjects["stopButton2Lever"].rotateZ(0.0067 * labSwitchState);
                    activeObjects["stopButton1Pin"].scale.y = activeObjects["stopButton2Pin"].scale.y += 0.02 * labSwitchState;
                }

                // lower contact
                if (activeObjects["pusher"].position.y <= 14.94)
                {
                    stopButtonLowerState = true;
                }
                if (labSwitchState == -1 && activeObjects["pusher"].position.y >= 15.04)
                {
                    stopButtonLowerState = false;
                }

                if (activeObjects["pusher"].position.y < 15.04 && activeObjects["pusher"].position.y > 14.94)
                {
                    activeObjects["stopButton3Lever"].rotateZ(-0.016 * labSwitchState);
                    activeObjects["stopButton4Lever"].rotateZ(-0.016 * labSwitchState);
                    activeObjects["stopButton3Pin"].scale.y = activeObjects["stopButton4Pin"].scale.y -= 0.03 * labSwitchState;
                }
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
        if (this.name == "slopingBody")
        {
            if (other_object.name == "slopingSurfaceFixture")
            {
                slopingSurfaceFixtureContact = true;
            }
            if (other_object.name == "slopingSurface")
            {
                if (kukaReturnsSlopingBodyStep == 6)
                {
                    setTimeout(function(){ self.nextKukaReturnsSlopingBodyStep(); }, 1500);
                }
            }
        }
    };

    var kukaReturnsSlopingBody = function()
    {
        self.trace("kuka step #" + kukaReturnsSlopingBodyStep);
        switch(kukaReturnsSlopingBodyStep)
        {
            case 1:
                var stepIntermediateAngles1 = Object.assign({}, kuka.kukaLinksItialAngles);
                stepIntermediateAngles1.link1 = 0.0;
                stepIntermediateAngles1.link2 = (-45 * Math.PI / 180);
                stepIntermediateAngles1.link4 = (15 * Math.PI / 180);
                var prePickPosition = activeObjects["slopingBody"].position.clone();
                prePickPosition.y += 1.0;
                var pickPosition = activeObjects["slopingBody"].position.clone();

                var position = new THREE.Vector3();
                var quaternion = new THREE.Quaternion();
                var scale = new THREE.Vector3();
                activeObjects["slopingBody"].updateMatrixWorld(true);
                activeObjects["slopingBody"].matrixWorld.decompose(position, quaternion, scale);
                pickPosition.y += 0.25;
                var kukaPath = [
                                    { angles: stepIntermediateAngles1 },
                                    { xyz: prePickPosition },
                                    { xyz: pickPosition }
                               ];
                kuka.moveByPath(kukaPath, self.nextKukaReturnsSlopingBodyStep);
            break;
            case 2:
                var stepIntermediateAngles1 = Object.assign({}, kuka.kukaLinksItialAngles);
                stepIntermediateAngles1.link1 = 0.0;
                stepIntermediateAngles1.link2 = (45 * Math.PI / 180);
                stepIntermediateAngles1.link4 = kuka.kukaLink4.rotation.z;

                var stepIntermediateAngles2 = Object.assign({}, kuka.kukaLinksItialAngles);
                stepIntermediateAngles2.link4 = (15 * Math.PI / 180);

                kuka.gripper.gripperMesh.updateMatrixWorld();
                THREE.SceneUtils.attach(activeObjects["slopingBody"], self.getVlabScene(), kuka.gripper.gripperMesh);

                var kukaPath = [
                                    { angles: stepIntermediateAngles1 },
                                    { angles: stepIntermediateAngles2 }
                               ];
                kuka.moveByPath(kukaPath, self.nextKukaReturnsSlopingBodyStep);
            break;
            case 3:
                var initialSlopingBodyDropPosition = initialSlopingBodyPosition.clone();
                initialSlopingBodyDropPosition.y += 0.6;
                var kukaPath = [
                                    { xyz: initialSlopingBodyDropPosition }
                               ];
                kuka.moveByPath(kukaPath, self.nextKukaReturnsSlopingBodyStep);
            break;
            case 4:
                var position = new THREE.Vector3();
                var quaternion = new THREE.Quaternion();
                var scale = new THREE.Vector3();
                activeObjects["slopingBody"].updateMatrixWorld(true);
                activeObjects["slopingBody"].matrixWorld.decompose(position, quaternion, scale);

                var kukaLink5 = new TWEEN.Tween(kuka.kukaLink5.rotation);
                kukaLink5.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink5.to({y: -Math.PI}, 8000);
                kukaLink5.onUpdate(function(){
                    kuka.positioning = true;
                    activeObjects["slopingBody"].updateMatrixWorld(true);
                    activeObjects["slopingBody"].matrixWorld.decompose(position, quaternion, scale);
                    if ((quaternion.y > -0.01 && quaternion.y < 0.01) || (quaternion.y > 0.999 && quaternion.y < 0.9995) || (Math.abs(kuka.kukaLink5.rotation.y) > (120 * Math.PI / 180)))
                    {
                        kukaLink5.stop();
                        self.nextKukaReturnsSlopingBodyStep();
                        kuka.positioning = false;
                        return;
                    }
                });
                kukaLink5.onComplete(function(){
                    self.nextKukaReturnsSlopingBodyStep();
                });
                kukaLink5.start();
            break;
            case 5:
                kuka.gripper.gripperMesh.updateMatrixWorld();
                THREE.SceneUtils.detach(activeObjects["slopingBody"], kuka.gripper.gripperMesh, self.getVlabScene());
                self.setPhysijsScenePause(false);
                kukaReturnsSlopingBodyStep = 6;
            break;
            case 7:
                var kukaLink5 = new TWEEN.Tween(kuka.kukaLink5.rotation);
                kukaLink5.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink5.to({y: 0}, 4000);
                kukaLink5.onUpdate(function(){
                    kuka.positioning = true;
                });
                kukaLink5.onComplete(function(){
                    kuka.positioning = false;
                });
                kukaLink5.start();

                var kukaPath = [
                                    { angles: kuka.kukaLinksItialAngles }
                               ];
                kuka.moveByPath(kukaPath, self.nextKukaReturnsSlopingBodyStep);
            break;
        }
    };

    self.nextKukaReturnsSlopingBodyStep = function()
    {
        self.trace("Callback from step#" + kukaReturnsSlopingBodyStep);
        kuka.removeCallBack();
        if (kukaReturnsSlopingBodyStep == 2 && !stopButtonTopState)
        {
            return;
        }

        if (kukaReturnsSlopingBodyStep == 6)
        {
            slopingBodyActivated = false;
            self.setPhysijsScenePause(true);
            var slopingBodyCorrectPositionTween = new TWEEN.Tween(activeObjects["slopingBody"].position);
            slopingBodyCorrectPositionTween.easing(TWEEN.Easing.Cubic.InOut);
            slopingBodyCorrectPositionTween.to({y: initialSlopingBodyPosition.y}, 2000);
            slopingBodyCorrectPositionTween.onComplete(function(){
                activeObjects["slopingBody"].updateMatrixWorld();
                THREE.SceneUtils.attach(activeObjects["slopingBody"], self.getVlabScene(), activeObjects["slopingSurface"]);
            });
            slopingBodyCorrectPositionTween.start();
        }

        if (kukaReturnsSlopingBodyStep == 7)
        {
            slopingSurfaceFixtureContact = false;
            kukaReturnsSlopingBodyStep = 0;
            thetaRandomSeed = getRandomInt(0, 2);
            thetaRandomSeed *= ((getRandomInt(0, 1) == 0) ? 1 : -1);
            return;
        }

        kukaReturnsSlopingBodyStep++;
        kukaReturnsSlopingBody();
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
    };


    //this VLab is ready to be initialized

    $.getJSON("ph-mpd-fcm.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });
}
