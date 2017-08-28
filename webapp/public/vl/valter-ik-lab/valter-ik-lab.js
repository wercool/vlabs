"use strict";

function ValterLab(webGLContainer, executeScript)
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
    var origin = new THREE.Vector3(0, 20, 10);
    var initialDefaultCameraPosVectorLength;

    self.Valter = null;

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 22.0, 15.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, true, true);

        activeObjects["floor"] = self.getVlabScene().getObjectByName("floor");
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

        // Valter
        self.Valter = new Valter(self, new THREE.Vector3(0, 0.0, 0), true, executeScript);

        // this VLab constants

        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();

        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("frontWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("leftWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rightWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWallDoorBigPart"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWallDoorSmallPart"));


        // Add dev manipulation controls
        // var control = new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement);
        // control.addEventListener("change", function(){
        //                             //console.log(this.model.position);
        //                             if (self.pressedKey == 82) //r
        //                             {
        //                                 if (control.getMode() != "rotate")
        //                                 {
        //                                     control.setMode("rotate");
        //                                 }
        //                             }
        //                             if (self.pressedKey == 84) //t
        //                             {
        //                                 if (control.getMode() != "translate")
        //                                 {
        //                                     control.setMode("translate");
        //                                 }
        //                             }
        //                             console.log("Position: ", self.getVlabScene().getObjectByName("screwHead2").position);
        //                         }.bind(self));
        // control.attach(self.getVlabScene().getObjectByName("screwHead2"));
        // control.setSize(1.0);
        // self.getVlabScene().add(control);

        setTimeout(self.waitingForValterInitialization.bind(self.Valter), 250);
    };

    self.waitingForValterInitialization = function()
    {
        console.log("Wainting for Valter initialization...");
        if (!self.Valter.initialized)
        {
            setTimeout(self.waitingForValterInitialization.bind(self.Valter), 250);
            return;
        }
        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);


        //rightForearmYaw
        // self.Valter.activeObjects["rightForearmYaw"].rotation.z = -0.25;
        //rightForeArmRoll
        self.Valter.activeObjects["forearmFrameRight"].rotation.y = -1.57;
        
        //bodyYaw
        self.Valter.activeObjects["valterBodyP1"].rotation.z = 0.0;//default: -0.750;
        // //bodyTilt
        // self.Valter.activeObjects["bodyFrameAxisR"].rotation.x = 0.0;//default: 0.0;
        //rightLimb
        self.Valter.activeObjects["armRightShoulderAxis"].rotation.x = 0.0;//default: -0.4;
        // rightForearm
        self.Valter.activeObjects["rightForearmTilt"].rotation.y = 0.0;//default: 0.5;
        // //rightShoulder
        // self.Valter.activeObjects["bodyFrameR"].rotation.z = 0.0;//default: 0.0;
        // //rightArm
        // self.Valter.activeObjects["rightArm"].rotation.y = -1.22;// default: -1.22;


        // setTimeout(self.IKBruteforce.bind(self.Valter), 500);

        setTimeout(function(){
            var localPos = new THREE.Vector3(2.569, 6.02, 13.134);
            var eefPos = self.Valter.model.localToWorld(localPos);
            eefPos.multiplyScalar(1 / self.Valter.model.scale.x);
            self.Valter.manipulationObject.position.copy(eefPos);
            self.Valter.rightArmIKANN(localPos);
        }, 500);

    }

    var jointStateAndEEFPos = {
        bodyYaw: 0.0,
        bodyTilt: 0.0,
        rightLimb: 0.0,
        rightForearm: 0.0,
        rightShoulder: 0.0,
        rightArm: 0.0,
        eefX: 0.0,
        eefY: 0.0,
        eefZ: 0.0,
    };


    var dValBodyYaw = 0.01;
    var dValBodyTilt = 0.5;
    var dValRightLimb = 0.1;
    var dValRightForearm = 0.1;
    var dValRightShoulder = 0.05;
    var dValRightArm = 0.1;


    self.IKBruteforce = function()
    {
        //bodyYaw
        if (self.Valter.activeObjects["valterBodyP1"].rotation.z <= 0.75 + dValBodyYaw)
        {
            self.sendJointStateAndEEFPos();
            self.Valter.activeObjects["valterBodyP1"].rotation.z += dValBodyYaw;
            return;
        }
        else
        {
            self.Valter.activeObjects["valterBodyP1"].rotation.z = -0.750;
        }

        return;

        // //rightArm
        // if (self.Valter.activeObjects["rightArm"].rotation.y > -2.5)
        // {
            //rightForearm
            if (self.Valter.activeObjects["rightForearmTilt"].rotation.y > -0.5)
            {
                //rightLimb
                if (self.Valter.activeObjects["armRightShoulderAxis"].rotation.x < 1.0)
                {
                    //bodyYaw
                    if (self.Valter.activeObjects["valterBodyP1"].rotation.z <= 0.75)
                    {
                        self.Valter.activeObjects["valterBodyP1"].rotation.z += dValBodyYaw;
                        self.sendJointStateAndEEFPos();
                        return;
                    }
                    else if (self.Valter.activeObjects["valterBodyP1"].rotation.z >= 0.75)
                    {
                        self.Valter.activeObjects["valterBodyP1"].rotation.z = -0.750;
                    }
                    self.Valter.activeObjects["armRightShoulderAxis"].rotation.x += dValRightLimb;
                    self.sendJointStateAndEEFPos();
                    return;
                }
                else if (self.Valter.activeObjects["armRightShoulderAxis"].rotation.x >= 1.0)
                {
                    self.Valter.activeObjects["armRightShoulderAxis"].rotation.x = 0.0;
                }
                self.Valter.activeObjects["rightForearmTilt"].rotation.y -= dValRightForearm;
                self.sendJointStateAndEEFPos();
                return;
            }
            else if (self.Valter.activeObjects["rightForearmTilt"].rotation.y <= -0.5)
            {
                self.Valter.activeObjects["rightForearmTilt"].rotation.y = 0.5;
            }
        //     self.Valter.activeObjects["rightArm"].rotation.y -= dValRightArm;
        //     self.sendJointStateAndEEFPos();
        // }












        return;
        //bodyYaw
        if (self.Valter.activeObjects["valterBodyP1"].rotation.z <= 0.75)
        {
            //bodyTilt
            if (self.Valter.activeObjects["bodyFrameAxisR"].rotation.x > -0.8)
            {
                //rightLimb
                if (self.Valter.activeObjects["armRightShoulderAxis"].rotation.x < 1.0)
                {
                    //rightForearm
                    if (self.Valter.activeObjects["rightForearmTilt"].rotation.y > -0.5)
                    {
                        //rightShoulder
                        if (self.Valter.activeObjects["bodyFrameR"].rotation.z < 1.0)
                        {
                            //rightArm
                            if (self.Valter.activeObjects["rightArm"].rotation.y > -2.0)
                            {
                                //rightForearmYaw
                                // if (self.Valter.activeObjects["rightForearmYaw"].rotation.z < 0.4)
                                // {
                                //     self.Valter.activeObjects["rightForearmYaw"].rotation.z += dVal;
                                //     self.sendJointStateAndEEFPos();
                                //     return;
                                // }
                                // else if (self.Valter.activeObjects["rightForearmYaw"].rotation.z >= 0.4)
                                // {
                                //     self.Valter.activeObjects["rightForearmYaw"].rotation.z = -0.25;
                                // }

                                self.Valter.activeObjects["rightArm"].rotation.y -= dValRightArm;
                                self.sendJointStateAndEEFPos();
                                return;
                            }
                            else if (self.Valter.activeObjects["rightArm"].rotation.y <= -2.0)
                            {
                                self.Valter.activeObjects["rightArm"].rotation.y = -1.22;
                            }

                            self.Valter.activeObjects["bodyFrameR"].rotation.z += dValRightShoulder;
                            self.sendJointStateAndEEFPos();
                            return;
                        }
                        else if (self.Valter.activeObjects["bodyFrameR"].rotation.z >= 1.0)
                        {
                            self.Valter.activeObjects["bodyFrameR"].rotation.z = 0.0;
                        }

                        self.Valter.activeObjects["rightForearmTilt"].rotation.y -= dValRightForearm;
                        self.sendJointStateAndEEFPos();
                        return;
                    }
                    else if (self.Valter.activeObjects["rightForearmTilt"].rotation.y <= -0.5)
                    {
                        self.Valter.activeObjects["rightForearmTilt"].rotation.y = 1.0;
                    }

                    self.Valter.activeObjects["armRightShoulderAxis"].rotation.x += dValRightLimb;
                    self.sendJointStateAndEEFPos();
                    return;
                }
                else if (self.Valter.activeObjects["armRightShoulderAxis"].rotation.x >= 1.0)
                {
                    self.Valter.activeObjects["armRightShoulderAxis"].rotation.x = -0.4;
                }

                self.Valter.activeObjects["bodyFrameAxisR"].rotation.x -= dValBodyTilt;
                self.sendJointStateAndEEFPos();
                return;
            }
            else if (self.Valter.activeObjects["bodyFrameAxisR"].rotation.x <= -0.8)
            {
                self.Valter.activeObjects["bodyFrameAxisR"].rotation.x = 0.0;
            }

            self.Valter.activeObjects["valterBodyP1"].rotation.z += dValBodyYaw;
            self.sendJointStateAndEEFPos();
        }
    }

    self.sendJointStateAndEEFPos = function()
    {
        self.Valter.model.updateMatrix();
        self.Valter.activeObjects["rPalmPad"].updateMatrix();

        jointStateAndEEFPos.bodyYaw             = self.Valter.activeObjects["valterBodyP1"].rotation.z.toFixed(3);
        jointStateAndEEFPos.bodyTilt            = self.Valter.activeObjects["bodyFrameAxisR"].rotation.x.toFixed(3);
        jointStateAndEEFPos.rightLimb           = self.Valter.activeObjects["armRightShoulderAxis"].rotation.x.toFixed(3);
        jointStateAndEEFPos.rightForearm        = self.Valter.activeObjects["rightForearmTilt"].rotation.y.toFixed(3);
        jointStateAndEEFPos.rightShoulder       = self.Valter.activeObjects["bodyFrameR"].rotation.z.toFixed(3);
        jointStateAndEEFPos.rightArm            = self.Valter.activeObjects["rightArm"].rotation.y.toFixed(3);
        // jointStateAndEEFPos.rightForearmYaw     = self.Valter.activeObjects["rightForearmYaw"].rotation.z.toFixed(2);

        var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(self.Valter.activeObjects["rPalmPad"].matrixWorld);

// console.log("Global: ",  rPalmPadPosition);

        self.Valter.model.worldToLocal(rPalmPadPosition);

        rPalmPadPosition.multiply(self.Valter.model.scale);

        jointStateAndEEFPos.eefX = rPalmPadPosition.x.toFixed(3);
        jointStateAndEEFPos.eefY = rPalmPadPosition.y.toFixed(3);
        jointStateAndEEFPos.eefZ = rPalmPadPosition.z.toFixed(3);

// console.log("Local: ", rPalmPadPosition);

// setTimeout(self.IKBruteforce.bind(self.Valter), 100);

        $.post("/srv/savejointstatesrarm", jointStateAndEEFPos, function(result){
            // self.IKBruteforce();
            setTimeout(self.IKBruteforce.bind(self.Valter), 10);
        });
    }

    var simulationStep = function()
    {
    };

    self.cameraControlsEvent = function()
    {
        if (!self.getSceneRenderPause())
        {
        }
    };

    //this VLab is ready to be initialized
    $.getJSON("/vl/valter-ik-lab/valter-ik-lab.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    return this;
}
