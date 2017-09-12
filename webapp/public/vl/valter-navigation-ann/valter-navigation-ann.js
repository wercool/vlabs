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
            x += dx;
        }

        self.collisionObjectsBBoxes = [];

        for (var intersectObjName of self.vlabNature.bodyKinectItersectObjects)
        {
            var intersectObj = self.getVlabScene().getObjectByName(intersectObjName);

            var intersectObjBBox = new THREE.Box3();
            intersectObjBBox.setFromObject(intersectObj);
            self.collisionObjectsBBoxes.push(intersectObjBBox);

            var intersectObjBBox = new THREE.BoxHelper(intersectObj, 0xffffff);
            self.getVlabScene().add(intersectObjBBox);
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

        self.poseTarget.position.copy(new THREE.Vector3(0.0, 0.1, 9.0));
        self.poseTarget.rotation.y = THREE.Math.degToRad(0.0);
        self.poseTargetControl.update();

        self.epochFinished = false;
        self.epochStep = 0;

        for (var valterRef of self.Valters)
        {
            valterRef.baseMovementPresets.speedMultiplier = 0.0001;

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

    var simulationStep = function()
    {
        if (!self.epochFinished)
        {
            var survived = [];
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
                        }
                    }

                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();

                    var navANNInput = valterRef.activeObjects["bodyKinectPCLPointsDistances"];
                    navANNInput.push(valterRef.valterToTargetPoseDirectionVectorLength);
                    var cmdVel = valterRef.navANNFeedForward(navANNInput);

                    var linVel = cmdVel[0] + getRandomArbitrary(-0.01, 0.01)
                    var rotVel = cmdVel[1] + getRandomArbitrary(-0.01, 0.01)

                    valterRef.setCmdVel(linVel, rotVel);
                    // valterRef.setCmdVel(0.01, getRandomArbitrary(-0.02, 0.02));
                    // valterRef.setCmdVel(0.01, 0.0);

                    survived.push(valterRef);
                }
            }

            self.epochStep++;

            if ((survived.length <= Math.round(self.Valters.length * 0.1) + 1) || self.epochStep > 100)
            {
                self.epochStep = 0;
                self.epochFinished = true;

                console.log(survived.length + " left");
                for (var survivedValterRef of survived)
                {
                    // console.log(valterRef.navANN);
                    // console.log(survivedValterRef.valterToTargetPoseDirectionVectorLength);
                    
                    survivedValterRef.navANN.mutate();
                }

                for (var valterRef of self.Valters)
                {
                    var randSurvivedId = getRandomInt(0, survived.length - 1);

                    valterRef.navANN = survived[randSurvivedId].navANN;


                    valterRef.killed = false;
                    valterRef.model.position.copy(valterRef.initialModelPosition);
                    valterRef.model.rotation.z = valterRef.initialModelRotation;

                    valterRef.BBoxHelper.material.color = valterRef.model.material.color;

                    valterRef.BBox.setFromObject(valterRef.model);
                    valterRef.BBoxHelper.update();

                    valterRef.updateValterToTargetPoseDirectionVector();
                    valterRef.bodyKinectPCL();
                }

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
