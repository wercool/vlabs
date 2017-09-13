"use strict";

function ValterANNNavigation(webGLContainer)
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
    var origin = new THREE.Vector3(0.0, -5.0, 0.0);

    self.Valters = [];

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 10.0, 10.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, true, true);

        var light = new THREE.AmbientLight(0xecf5ff, 0.1); // soft white light
        light.position.z = -0.0;
        light.position.y = 10.0;
        self.getVlabScene().add(light);

        // Valters
        var num = 20;
        var x = 0.0;
        var dx = (x*-1*2) / num;
        for (var i = 0; i < num; i++)
        {
            self.Valters[i] = new ValterExtrSimplified(self, new THREE.Vector3(x + getRandomArbitrary(-1.0, 1.0), 0.0, -3.5 + getRandomArbitrary(-0.1, 1.0)), i, false);
            x += dx;
        }

        self.collisionObjectsBBoxes = [];

        for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
        {
            var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);

            var intersectObjBBox = new THREE.Box3();
            intersectObjBBox.setFromObject(intersectObj);
            self.collisionObjectsBBoxes.push(intersectObjBBox);

            var intersectObjBBoxHelper = new THREE.BoxHelper(intersectObj, 0xffffff);
            self.getVlabScene().add(intersectObjBBoxHelper);

            intersectObj.BBox = intersectObjBBox;
            intersectObj.BBoxHelper = intersectObjBBoxHelper;
        }

        setTimeout(self.waitingForValterInitialization, 250);
    };

    self.waitingForValterInitialization = function()
    {
        console.log("Wainting for Valter initialization...");
        if (!self.Valters[self.Valters.length - 1].initialized)
        {
            setTimeout(self.waitingForValterInitialization, 250);
            return;
        }

        var poseTarget = new THREE.Object3D();
        var poseTargetGeometry1 = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
        var poseTargetGeometry2 = new THREE.CylinderGeometry(0.0, 0.08, 0.2, 6);
        var poseTargetMaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        var poseTargetMesh1 = new THREE.Mesh(poseTargetGeometry1, poseTargetMaterial);
        var poseTargetMesh2 = new THREE.Mesh(poseTargetGeometry2, poseTargetMaterial);
        poseTargetMesh1.rotation.x = THREE.Math.degToRad(90);
        poseTargetMesh1.position.z = 0.5;
        poseTargetMesh2.rotation.x = THREE.Math.degToRad(90);
        poseTargetMesh2.position.z = 1.05;
        poseTarget.add(poseTargetMesh1);
        poseTarget.add(poseTargetMesh2);
        self.getVlabScene().add(poseTarget);
        self.poseTarget = poseTarget;

        self.poseTargetControl = new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement);
        self.poseTargetControl.addEventListener("change", function(){

                                                        self.poseTarget.position.y = 0.1;

                                                        if (self.pressedKey != null)
                                                        {
                                                            if (self.pressedKey == 82) //r
                                                            {
                                                                if (self.poseTargetControl.getMode() != "rotate")
                                                                {
                                                                    self.poseTargetControl.setMode("rotate");
                                                                }
                                                            }
                                                            if (self.pressedKey == 84) //t
                                                            {
                                                                if (self.poseTargetControl.getMode() != "translate")
                                                                {
                                                                    self.poseTargetControl.setMode("translate");
                                                                }
                                                            }
                                                            if (self.pressedKey == 17) //ctrlKey
                                                            {
                                                                console.log(self.poseTarget.position.x.toFixed(5),
                                                                            self.poseTarget.position.y.toFixed(5),
                                                                            self.poseTarget.position.z.toFixed(5),
                                                                            self.poseTarget.rotation.y.toFixed(5));
                                                            }
                                                        }
                                                    }.bind(self));
        self.poseTargetControl.attach(self.poseTarget);
        self.poseTargetControl.setSize(1.0);
        self.getVlabScene().add(self.poseTargetControl);

        self.poseTarget.position.copy(new THREE.Vector3(0.0, 0.1, 10.0));
        self.poseTarget.rotation.y = THREE.Math.degToRad(0.0);
        self.poseTargetControl.update();

        self.epochFinished = false;
        self.epoch = 0;

        for (var valterRef of self.Valters)
        {
            valterRef.baseMovementPresets.speedMultiplier = 0.001;

            valterRef.initNavANN();

            valterRef.BBoxHelper = new THREE.BoxHelper(valterRef.model, valterRef.model.material.color);
            self.getVlabScene().add(valterRef.BBoxHelper);

            valterRef.BBox = new THREE.Box3();
            valterRef.BBox.setFromObject(valterRef.model);

            valterRef.addValterToTargetPoseDirectionVector();
        }

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);
    }

    var sortByDistance = function(a,b)
    {
      if (a.valterToTargetPoseDirectionVectorLength < b.valterToTargetPoseDirectionVectorLength)
        return -1;
      if (a.valterToTargetPoseDirectionVectorLength > b.valterToTargetPoseDirectionVectorLength)
        return 1;
      return 0;
    }

    var consoleClearCnt = 0;

    var simulationStep = function()
    {
        if (!self.epochFinished)
        {
            var survivedNum = 0;
            for (var valterRef of self.Valters)
            {
                if (!valterRef.killed)
                {
                    valterRef.BBox.setFromObject(valterRef.model);
                    valterRef.BBoxHelper.update();
                    for (var collisionObjBBox of self.collisionObjectsBBoxes)
                    {
                        if (valterRef.BBox.intersectsBox(collisionObjBBox))
                        {
                            valterRef.killed = true;
                            valterRef.BBoxHelper.material.color = new THREE.Color(0x000000);
                            valterRef.activeObjects["bodyKinectItersectPCL"].visible = false;
                        }
                    }

                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();

                    var navANNInput = valterRef.activeObjects["bodyKinectPCLPointsDistances"];
                    navANNInput.push(valterRef.valterToTargetPoseDirectionVectorLength);
                    navANNInput.push(valterRef.model.position.z);
                    navANNInput.push(valterRef.model.position.x);
                    navANNInput.push(valterRef.model.rotation.z);
                    navANNInput.push(self.poseTarget.position.z);
                    navANNInput.push(self.poseTarget.position.x);
                    var cmdVel = valterRef.navANNFeedForward(navANNInput);

                    var linVel = cmdVel[0];// + getRandomArbitrary(-0.01, 0.01);
                    var rotVel = cmdVel[1];// + getRandomArbitrary(-0.01, 0.01);

// console.log(linVel, rotVel);
// consoleClearCnt++;
// if (consoleClearCnt > 500)
// {
//     console.clear();
//     consoleClearCnt = 0;
// }

                    if (Math.abs(linVel) > valterRef.baseMovementPresets.maxLinVel 
                     || Math.abs(rotVel) > valterRef.baseMovementPresets.maxAngVel)
                    {
                        valterRef.killed = true;
                        // console.log("Killed MAX SPEED");
                    }

                    // if (Math.abs(linVel) < 0.001 || Math.abs(rotVel) < 0.001)
                    // {
                    //     valterRef.killed = true;
                    //     console.log("Killed STUCKED");
                    // }

                    if (linVel < 0)
                    {
                        valterRef.backMovement += 1;
                    }
                    if (valterRef.backMovement > 100)
                    {
                        valterRef.killed = true;
                        // console.log("Killed on Back Movement");
                    }

                    var curRotDir = (rotVel > 0) ? 1 : 0;
                    if (curRotDir != valterRef.prevRotDirection)
                    {
                        valterRef.inPlaceRotation = 0;
                    }
                    else
                    {
                        valterRef.inPlaceRotation += 1;
                    }
                    if (valterRef.inPlaceRotation > 500)
                    {
                        valterRef.killed = true;
                        // console.log("Killed on In Place Rotation");
                    }
                    valterRef.prevRotDirection = curRotDir;

                    if (valterRef.killed) 
                    {
                        valterRef.BBoxHelper.material.color = new THREE.Color(0x000000);
                        continue;
                    }

                    if (valterRef.model.position.z > self.poseTarget.position.z) 
                    {
                        continue;
                    }

                    valterRef.setCmdVel(linVel, rotVel);

                    survivedNum++;
                }
            }

            if ((survivedNum <= Math.round(self.Valters.length * 0.25)))
            {
                self.epochFinished = true;
                self.epoch++;
                // console.log("Epoch :" + self.epoch);

                self.Valters.sort(sortByDistance);

                var selectedNum = Math.round(self.Valters.length * 0.1);

                for (var valterRef of self.Valters)
                {
                    if (survivedNum > 0)
                    {
                        // console.log("Survived: " + survivedNum);
                        var randParentId = getRandomInt(0, selectedNum- 1);
                        valterRef.navANN.deepCopy(self.Valters[randParentId].navANN);
                        valterRef.navANN.mutate(0.01, 0.01);
                    }
                    else
                    {
                        valterRef.navANN.mutate(0.1, 0.1);
                        // valterRef.initNavANN();
                    }


                    valterRef.killed = false;
                    valterRef.backMovement = 0;
                    valterRef.inPlaceRotation = 0;
                    valterRef.model.position.copy(valterRef.initialModelPosition);
                    valterRef.model.rotation.z = valterRef.initialModelRotation;
                    // valterRef.model.rotation.z = getRandomArbitrary(-3.14, 0);

                    valterRef.BBoxHelper.material.color = valterRef.model.material.color;
                    valterRef.activeObjects["bodyKinectItersectPCL"].visible = true;

                    valterRef.BBox.setFromObject(valterRef.model);
                    valterRef.BBoxHelper.update();

                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();
                }

                for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
                {
                    if(intersectObjName.indexOf("Cube") > -1)
                    {
                        var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);

                        intersectObj.position.x = getRandomArbitrary(-2.5, 2.5);
                        // intersectObj.position.z += getRandomArbitrary(-0.1, 0.1);

                        intersectObj.BBox.setFromObject(intersectObj);;
                        intersectObj.BBoxHelper.update();
                    }
                }

                self.poseTarget.position.x = getRandomArbitrary(-1.8, 1.8);
                self.poseTargetControl.update();

                self.epochFinished = false;
            }
        }
    };


    self.cameraControlsEvent = function()
    {
        if (!self.getSceneRenderPause())
        {
        }
    };

    //this VLab is ready to be initialized
    $.getJSON("/vl/valter-navigation-ann/valter-navigation-ann.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    return this;
}
