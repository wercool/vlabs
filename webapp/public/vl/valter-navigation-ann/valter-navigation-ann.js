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
            self.Valters[i] = new ValterExtrSimplified(self, new THREE.Vector3(x, 0.0, -3.5), i, false);
            // self.Valters[i] = new ValterExtrSimplified(self, new THREE.Vector3(getRandomArbitrary(-1.0, 1.0), 0.0, getRandomArbitrary(-3.5, -3.0)), i, false);
            x += dx;
        }

        self.collisionObjectsBBoxes = [];

        for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
        {
            var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);

            if (false)//(intersectObjName.indexOf("Cube") > -1)
            {
                intersectObj.visible = false;
            }
            else
            {
                var intersectObjBBox = new THREE.Box3();
                intersectObjBBox.setFromObject(intersectObj);
                self.collisionObjectsBBoxes.push(intersectObjBBox);

                var intersectObjBBoxHelper = new THREE.BoxHelper(intersectObj, 0xffffff);
                self.getVlabScene().add(intersectObjBBoxHelper);

                intersectObj.BBox = intersectObjBBox;
                intersectObj.BBoxHelper = intersectObjBBoxHelper;
            }
        }

        for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
        {
            if(intersectObjName.indexOf("Cube") > -1)
            {
                var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);

                if (!intersectObj.visible)
                {
                    continue;
                }
                intersectObj.position.x = getRandomArbitrary(-2.5, 2.5);
                intersectObj.position.z += getRandomArbitrary(-0.1, 0.1);

                // intersectObj.position.x += getRandomArbitrary(-0.1, 0.1);
                // intersectObj.position.z += getRandomArbitrary(-0.1, 0.1);

                intersectObj.BBox.setFromObject(intersectObj);;
                intersectObj.BBoxHelper.update();
            }
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

        //big room
        // self.poseTarget.position.copy(new THREE.Vector3(15.0, 0.1, 10.0));
        // //small room
        self.poseTarget.position.copy(new THREE.Vector3(-10.0, 0.1, -3.8));
        // //end of long room
        // self.poseTarget.position.copy(new THREE.Vector3(0.54, 0.1, 9.5));

        self.poseTarget.rotation.y = THREE.Math.degToRad(0.0);
        self.poseTargetControl.update();

        self.epochFinished = false;
        self.epochStep = 0;
        self.epoch = 0;

        self.restoredFromStorage = false;

        var storedLength = 0;
        for(var i =0; i < localStorage.length; i++)
        {
            if (localStorage.key(i).indexOf("navANN") > -1)
            {
                storedLength++;
            }
        }

        for (var valterRef of self.Valters)
        {
            valterRef.baseMovementPresets.speedMultiplier = 0.01;

            if (storedLength > 0)
            {
                valterRef.initNavANN();
                var savedNavANN = JSON.parse(localStorage.getItem("navANN-" + getRandomInt(0, storedLength- 1)))
                valterRef.navANN.deepCopy(savedNavANN);
                self.restoredFromStorage = true;
            }
            else
            {
                valterRef.initNavANN();
            }

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

    var sortBySurvived = function(a,b)
    {
      if (a.navANN.survived < b.navANN.survived)
        return 1;
      if (a.navANN.survived > b.navANN.survived)
        return -1;
      return 0;
    }

    var sortBySurvivedByDistance = function(a, b)
    {
      if ((a.valterToTargetPoseDirectionVectorLength > b.valterToTargetPoseDirectionVectorLength) && (a.navANN.survived < b.navANN.survived))
        return 1;
      if ((a.valterToTargetPoseDirectionVectorLength < b.valterToTargetPoseDirectionVectorLength) && (a.navANN.survived > b.navANN.survived))
        return -1;
      return 0;
    }

    var sortByAliveByDistance = function(a, b)
    {
      if (a.killed > b.killed)
        return 1;
      if (a.killed < b.killed)
        return -1;
      if (a.valterToTargetPoseDirectionVectorLength > b.valterToTargetPoseDirectionVectorLength)
        return 1;
      if (a.valterToTargetPoseDirectionVectorLength < b.valterToTargetPoseDirectionVectorLength)
        return -1;
      return 0;
    }

    var sortBySuccessDiff = function(a,b)
    {
      if (a.successDiff > b.successDiff)
        return 1;
      if (a.successDiff < b.successDiff)
        return -1;
      return 0;
    }

    var sortByAliveBySuccessDiff = function(a, b)
    {
      if (a.killed > b.killed)
        return 1;
      if (a.killed < b.killed)
        return -1;
      if (a.successDiff > b.successDiff)
        return 1;
      if (a.successDiff < b.successDiff)
        return -1;
      return 0;
    }

    var consoleClearCnt = 0;

    var killedOnHit = 0;
    var killedOnSpeedLimit = 0;
    var killedOnInplaceRotation = 0;
    var killedOnBackMovement = 0;
    var killedOnStuckedIn = 0;

    var simulationStep = function()
    {
        if (!self.epochFinished)
        {
            self.epochStep++;
            var survivedNum = 0;

            for (var valterRef of self.Valters)
            {
                if (!valterRef.killed)
                {
                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();

                    var distances = valterRef.activeObjects["bodyKinectPCLPointsDistances"];
                    // var normalizedDistances = [];
                    // for (var distance of distances)
                    // {
                    //     normalizedDistances.push(distance / 4.0);
                    // }
                    var navANNInput = distances;
                    navANNInput.push(valterRef.valterToTargetPoseDirectionVectorLength);
                    // navANNInput.push(valterRef.valterToTargetPoseDirectionVector.angleTo(valterRef.valterForwardDirection));
                    // navANNInput.push(valterRef.model.position.z);
                    // navANNInput.push(valterRef.model.position.x);
                    // navANNInput.push(valterRef.model.rotation.z);
                    navANNInput.push(self.poseTarget.position.z);
                    navANNInput.push(self.poseTarget.position.x);

                    var cmdVel = valterRef.navANNFeedForward(navANNInput);

                    // var linVel = cmdVel[0] + getRandomArbitrary(-0.01, 0.01);
                    // var rotVel = cmdVel[1] + getRandomArbitrary(-0.01, 0.01);

                    var linVel = cmdVel[0];
                    var rotVel = cmdVel[1];

// console.log(linVel, rotVel);
// consoleClearCnt++;
// if (consoleClearCnt > 500)
// {
//     console.clear();
//     consoleClearCnt = 0;
// }

                    valterRef.BBox.setFromObject(valterRef.model);
                    valterRef.BBoxHelper.update();
                    for (var collisionObjBBox of self.collisionObjectsBBoxes)
                    {
                        if (valterRef.BBox.intersectsBox(collisionObjBBox))
                        {
                            if (!valterRef.killed)
                            {
                                valterRef.killed = true;
                                killedOnHit++;
                            }
                        }
                    }

                    if (Math.abs(linVel) > valterRef.baseMovementPresets.maxLinVel || Math.abs(rotVel) > valterRef.baseMovementPresets.maxAngVel)
                    {
                        valterRef.killed = true;
                        killedOnSpeedLimit++;
                    }

                    if (linVel < -0.1)
                    {
                        valterRef.backMovement += 1;
                    }
                    if (valterRef.backMovement > 50)
                    {
                        valterRef.killed = true;
                        killedOnBackMovement++;
                    }

                    if (Math.abs(rotVel) > 0.01)
                    {
                        var curRotDir = (rotVel > 0) ? 1 : 0;
                        if (curRotDir != valterRef.prevRotDirection)
                        {
                            valterRef.inPlaceRotation = 0;
                        }
                        else
                        {
                            valterRef.inPlaceRotation += 1 - Math.abs(linVel / 2);
                        }
                        if (valterRef.inPlaceRotation > 5)
                        {
                            if (valterRef.prevPathLength < 1.5)
                            {
                                valterRef.killed = true;
                            }
                            else
                            {
                                valterRef.inPlaceRotation = 0;
                            }
                        }
                        valterRef.prevRotDirection = curRotDir;
                    }

                    if (Math.abs(linVel) < 0.01 && valterRef.valterToTargetPoseDirectionVectorLength > 2.0)
                    {
                        valterRef.stuckedIn += 1;
                        if (valterRef.stuckedIn > 50)
                        {
                            valterRef.killed = true;
                            killedOnStuckedIn++;
                        }
                    }

                    // if (valterRef.model.position.z > self.poseTarget.position.z + 2.0)
                    // {
                    //     valterRef.killed = true;
                    // }

                    if (valterRef.killed) 
                    {
                        valterRef.BBoxHelper.material.color = new THREE.Color(0x000000);
                        valterRef.activeObjects["valterToTargetPoseDirectionVector"].setColor(new THREE.Color(0x000000));
                    }
                    else
                    {
                        valterRef.setCmdVel(linVel, rotVel);

                        survivedNum++;
                    }
                }
            }

            var survivedHistory = 0;
            for (var valterRef of self.Valters)
            {
                if (valterRef.navANN.survived > 1)
                survivedHistory += 1;

                var pathLength = Math.sqrt(Math.pow((valterRef.model.position.x - valterRef.initialX), 2) + Math.pow((valterRef.model.position.z - valterRef.initialZ), 2));

                valterRef.prevPathLength = pathLength;
            }






            // if ((survivedNum <= Math.round(self.Valters.length * 0.01)) || self.epochStep > 1000)
            if (self.epochStep > 4 / valterRef.baseMovementPresets.speedMultiplier || survivedNum == 0)
            {
                console.clear();

                self.epochFinished = true;
                self.epoch++;
                console.log("Epoch:" + self.epoch);
                console.log("Survived: ", survivedNum, " / ", self.Valters.length);
                console.log("Killed on Hit             : ", killedOnHit, " / ", self.Valters.length);
                console.log("Killed on Speed Limit     : ", killedOnSpeedLimit, " / ", self.Valters.length);
                console.log("Killed on Inplace Rotation: ", killedOnInplaceRotation, " / ", self.Valters.length);
                console.log("Killed on Back Movement: ", killedOnBackMovement, " / ", self.Valters.length);
                console.log("Killed on Stucked In: ", killedOnStuckedIn, " / ", self.Valters.length);
                console.log("---------------------");
                console.log("Survived threshold: ", survivedNum, " / ", Math.round(self.Valters.length * 0.1));
                console.log("Survived history threshold: ", survivedHistory, " / ", Math.round(self.Valters.length * 0.1));


                for (var valterRef of self.Valters)
                {
                    if (valterRef.valterToTargetPoseDirectionVectorLength > 1.0)
                    {
                        valterRef.killed = true;
                        survivedNum--;
                    }
                }


                var selectedNum = Math.round(self.Valters.length * 0.15);
                // var selectedNum = 2;

                if (survivedHistory > Math.round(self.Valters.length * 0.1) && survivedNum > Math.round(self.Valters.length * 0.1))
                {
                    // self.Valters.sort(sortBySurvivedByDistance);
                    // self.Valters.sort(sortByAliveByDistance);
                     self.Valters.sort(sortByAliveBySuccessDiff);

                    for (var si = 0; si < selectedNum; si++)
                    {
                        var valterRefToStore = self.Valters[si];
                        localStorage.setItem("navANN-" + si, JSON.stringify(valterRefToStore.navANN));
                    }
                    // for (var valterRef of self.Valters)
                    // {
                    //     valterRef.navANN.survived = 0;
                    // }
                    self.epoch = 0;
                }
                else
                {
                    if (self.epoch < 100 && !self.restoredFromStorage)
                    {
                        self.Valters.sort(sortByDistance);
                    }
                    else
                    {
                        if (survivedNum > 0)
                        {
                            // self.Valters.sort(sortByAliveByDistance);
                            self.Valters.sort(sortByAliveBySuccessDiff);
                        }
                        else
                        {
                            // self.Valters.sort(sortByDistance);
                            self.Valters.sort(sortBySuccessDiff);
                        }
                    }
                }


                for (var v_id in self.Valters)
                {
                    var valterRef = self.Valters[v_id];

                    console.log("%c" + pad("   ", valterRef.id, true) 
                               + " " + pad("     ", !valterRef.killed, true) 
                               + " " + valterRef.navANN.survived
                               +" d:" + valterRef.valterToTargetPoseDirectionVectorLength.toFixed(5)
                               +" sd:" + valterRef.successDiff.toFixed(5),
                               "color: #" + valterRef.model.material.color.getHexString());

                    var goodHistory = (valterRef.navANN.survived > 0 && survivedNum != self.Valters.length) ? valterRef.navANN.survived : 1;

                    if (survivedNum > 0)
                    {
                        if (v_id > selectedNum - 1)
                        {
                            var randParentId = getRandomInt(0, selectedNum - 1);

                            //child navANNs
                            valterRef.navANN.deepCopy(self.Valters[randParentId].navANN);
                            valterRef.navANN.mutate(0.01, 0.01 / goodHistory);
                        }
                        else
                        {
                            //parent navANNs
                            valterRef.navANN.mutate(0.001, 0.01 / goodHistory);
                        }
                    }
                    else
                    {
                        var randParentId = getRandomInt(0, 1);
                        valterRef.navANN.deepCopy(self.Valters[randParentId].navANN);
                        valterRef.navANN.mutate(0.02, 1,0 / goodHistory);
                    }

                    if (!valterRef.killed)
                    {
                        valterRef.navANN.survived++;
                    }
                    else
                    {
                        valterRef.navANN.survived -= (valterRef.navANN.survived > 0) ? 1 : 0;
                    }

                    valterRef.killed = false;
                    valterRef.model.position.copy(valterRef.initialModelPosition);
                    valterRef.model.rotation.z = valterRef.initialModelRotation;


                    valterRef.model.position.x += getRandomArbitrary(-0.25, 0.25); 
                    valterRef.model.position.z += getRandomArbitrary(-0.25, 0.25); 
                    valterRef.model.rotation.z += getRandomArbitrary(-0.1, 0.1);



                    valterRef.activeObjects["valterToTargetPoseDirectionVector"].setColor(new THREE.Color(valterRef.model.material.color));

                    valterRef.BBoxHelper.material.color = valterRef.model.material.color;
                    if (valterRef.drawPCL)
                    {
                        valterRef.activeObjects["bodyKinectItersectPCL"].visible = true;
                    }

                    valterRef.BBox.setFromObject(valterRef.model);
                    valterRef.BBoxHelper.update();

                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();
                }

                if (survivedHistory > Math.round(self.Valters.length * 0.1) && survivedNum > Math.round(self.Valters.length * 0.1))
                {
                    for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
                    {
                        if(intersectObjName.indexOf("Cube") > -1)
                        {
                            var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);
                            if (!intersectObj.visible)
                            {
                                continue;
                            }

                            intersectObj.position.x = getRandomArbitrary(-2.5, 2.5);
                            intersectObj.position.z += getRandomArbitrary(-0.1, 0.1);

                            // intersectObj.position.x += getRandomArbitrary(-0.1, 0.1);
                            // intersectObj.position.z += getRandomArbitrary(-0.1, 0.1);

                            intersectObj.BBox.setFromObject(intersectObj);;
                            intersectObj.BBoxHelper.update();
                        }
                    }

                    var posId = getRandomInt(0, 2);
                    switch (posId)
                    {
                        case 0:
                            //big room
                            self.poseTarget.position.copy(new THREE.Vector3(15.0, 0.1, 10.0));
                        break;
                        case 1:
                            //end of long room
                            self.poseTarget.position.copy(new THREE.Vector3(0.54, 0.1, 9.5));
                        break;
                        case 2:
                            //small room
                            self.poseTarget.position.copy(new THREE.Vector3(-10.0, 0.1, -3.8));
                        break;
                    }
                }

                // self.poseTarget.position.x = getRandomArbitrary(-1.8, 1.8);
                // self.poseTarget.position.z += getRandomArbitrary(-0.1, 0.1);

                // self.poseTarget.position.x += getRandomArbitrary(-0.1, 0.1);
                // self.poseTarget.position.z += getRandomArbitrary(-0.1, 0.1);


                // var posId = getRandomInt(0, 1);
                // switch (posId)
                // {
                //     case 0:
                //         //big room
                //         self.poseTarget.position.copy(new THREE.Vector3(15.0, 0.1, 10.0));
                //     break;
                //     case 1:
                //         //end of long room
                //         self.poseTarget.position.copy(new THREE.Vector3(0.54, 0.1, 9.5));
                //     break;
                //     case 2:
                //         //small room
                //         self.poseTarget.position.copy(new THREE.Vector3(-10.0, 0.1, -3.8));
                //     break;
                // }

                // self.poseTarget.position.copy(new THREE.Vector3(0.54, 0.1, 9.5));

                // self.poseTarget.position.x += getRandomArbitrary(-0.4, 0.4);
                // self.poseTarget.position.z += getRandomArbitrary(-0.4, 0.4);

                self.poseTargetControl.update();

                self.epochStep = 0;
                killedOnHit = 0;
                killedOnSpeedLimit = 0;
                killedOnInplaceRotation = 0;
                killedOnBackMovement = 0;
                killedOnStuckedIn = 0;

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
