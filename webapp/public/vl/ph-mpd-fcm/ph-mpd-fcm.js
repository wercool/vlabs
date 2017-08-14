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

    self.Valter = null;

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(-0.25, 20.0, 14.0);

        var tableTopPos = self.getVlabScene().getObjectByName("tableTop").position.clone();

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, tableTopPos, false, false);

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
        activeObjects["aktakomPowerSupplyScreen"] = self.getVlabScene().getObjectByName("aktakomPowerSupplyScreen");
        activeObjects["aktakomPowerSupplyScreenBack"] = self.getVlabScene().getObjectByName("aktakomPowerSupplyScreenBack");
        activeObjects["lampGlass"] = self.getVlabScene().getObjectByName("lampGlass");

        var light = new THREE.AmbientLight(0xecf5ff, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.15);
        self.getVlabScene().add(light);

        if (self.vlabNature.advanceLighting)
        {
            var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 55.0, 2.5);
            rectLight.matrixAutoUpdate = true;
            rectLight.intensity = 120.0;
            rectLight.position.set(0.0, 39.0, -19.0);
            rectLight.rotation.set(-0.5, 0.0, 0.0);
            // var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
            // rectLight.add(rectLightHelper);
            self.getVlabScene().add(rectLight);

            if (!self.vlabNature.advanceLighting1src)
            {
                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(-27.5, 40, 14.0);
                rectLight.rotation.set(0.0, 1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);

                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(27.5, 40, 14.0);
                rectLight.rotation.set(0.0, -1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);
            }
        }

        // lens flares
        var textureLoader = new THREE.TextureLoader();
        var textureFlare0 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare0.png");
        var textureFlare1 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare1.png");
        var textureFlare2 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare2.png");

        var flareColor = new THREE.Color(0xffffff);
        flareColor.setHSL(0.55, 0.9, 1.0);
        var lensFlare = new THREE.LensFlare(textureFlare0, 1000.0, 0.0, THREE.AdditiveBlending, flareColor);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 60, 0.6, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 70, 0.7, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 120, 0.9, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 70, 1.0, THREE.AdditiveBlending);

        // lensFlare.customUpdateCallback = function(object)
        // {
        //     var f, fl = object.lensFlares.length;
        //     var flare;
        //     var vecX = -object.positionScreen.x * 2;
        //     var vecY = -object.positionScreen.y * 2;
        //     for( f = 0; f < fl; f++ )
        //     {
        //         flare = object.lensFlares[ f ];
        //         flare.x = object.positionScreen.x + vecX * flare.distance;
        //         flare.y = object.positionScreen.y + vecY * flare.distance;
        //         flare.rotation = 0;
        //     }
        //     object.lensFlares[2].y += 0.025;
        //     object.lensFlares[3].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad(45);
        // };

        lensFlare.position.copy(activeObjects["lampGlass"].position);
        lensFlare.position.y -= 1.35;

        self.getVlabScene().add(lensFlare);

/*
        var spotLight = new THREE.SpotLight(0xecf5ff, 0.8, 250, 45, 1.0, 10);
        spotLight.target = self.getVlabScene().getObjectByName("frontWall");
        spotLight.position.set(0, 30, 0);
        self.getVlabScene().add(spotLight);
*/
        initialSlopingBodyPosition = activeObjects["slopingBody"].position.clone();

        // kuka
        kuka = new Kuka(self,
                        false,
                        self.getVlabScene().getObjectByName("kukabasePlate").position,
                        null,
                        KukaVacuumGripper,
                        [self, null, false, "slopingBody", [2, 28]]);

// Valter
// self.Valter = new Valter(self, new THREE.Vector3(0, 2.57, 20), true);

        // this VLab constants
        pulleyPos = activeObjects["pulley"].position.clone();
        pulleyPos.y += 0.25;

        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();

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
        activeObjects["rope"].castShadow = false;
        activeObjects["ropeShadow"] = new THREE.Line(ropeGeometry, new THREE.LineBasicMaterial({
                                     color:     0x000000,
                                     opacity:   0.0,
                                     linewidth: 0.1
        }));
        activeObjects["ropeShadow"].castShadow = true;
        self.getVlabScene().add(activeObjects["rope"]);
        self.getVlabScene().add(activeObjects["ropeShadow"]);

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

var powerSupply = new AktakomPowerSupply(self);


        // Aktakom Power Supply screen
        // create a canvas element
        var canvases = $("#canvases");
        var aktakomPowerSupplyScreenCanvas  = document.createElement("canvas");
        aktakomPowerSupplyScreenCanvas.width = 256;
        aktakomPowerSupplyScreenCanvas.height = 256;
        canvases.append(aktakomPowerSupplyScreenCanvas);
        var aktakomPowerSupplyScreenCanvas2D = aktakomPowerSupplyScreenCanvas.getContext("2d");
        aktakomPowerSupplyScreenCanvas2D.font = "55px AktakomPowerSupplyScreenFont";
        aktakomPowerSupplyScreenCanvas2D.fillStyle = "rgba(0, 0, 0, 0.7)";
        aktakomPowerSupplyScreenCanvas2D.textBaseline = "top";
        aktakomPowerSupplyScreenCanvas2D.fillText("12.02", 70, 155);
        aktakomPowerSupplyScreenCanvas2D.fillText("0.00",  70, 205);
        aktakomPowerSupplyScreenCanvas2D.font = "30px AktakomPowerSupplyScreenFont";
        aktakomPowerSupplyScreenCanvas2D.fillText("V", 190, 172);
        aktakomPowerSupplyScreenCanvas2D.fillText("A", 190, 222);
        // canvas contents will be used for a texture
        var aktakomPowerSupplyScreenTexture = new THREE.Texture(aktakomPowerSupplyScreenCanvas)
        aktakomPowerSupplyScreenTexture.needsUpdate = true;
        var aktakomPowerSupplyScreenMaterial = new THREE.MeshBasicMaterial({map:aktakomPowerSupplyScreenTexture, side:THREE.FrontSide});
        aktakomPowerSupplyScreenMaterial.transparent = true;
        activeObjects["aktakomPowerSupplyScreen"].material = aktakomPowerSupplyScreenMaterial;
        var aktakomPowerSupplyScreenBackMaterial = new THREE.MeshLambertMaterial({emissive:0xcfedff, emissiveIntensity:0.65, side:THREE.FrontSide});
        activeObjects["aktakomPowerSupplyScreenBack"].material = aktakomPowerSupplyScreenBackMaterial;

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
        if (!self.getSceneRenderPause())
        {
            var cameraRelativeDistance = initialDefaultCameraPosVectorLength / self.getDefaultCameraPosition().length();
            ropeLineWidth = activeObjects["rope"].material.linewidth = 3 * cameraRelativeDistance;

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
                activeObjects["ropeShadow"].geometry.vertices[0].copy(framePivotPos);
                activeObjects["rope"].geometry.verticesNeedUpdate = true;
                activeObjects["ropeShadow"].geometry.verticesNeedUpdate = true;

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
                    activeObjects["stopButton3Pin"].scale.y = activeObjects["stopButton4Pin"].scale.y -= 0.037 * labSwitchState;
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

    $.getJSON("/vl/ph-mpd-fcm/ph-mpd-fcm.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });
}
