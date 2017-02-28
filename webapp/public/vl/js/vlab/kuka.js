"use strict";

function Kuka(vlab, test, basePosition, initialLinksAngles, Gripper, gripperContructorArgs)
{
    var self = this;
    self.initialized = false;

    addEventListener("simulationStep", function (event) { self.simulationStep(); }, false);

    self.positioning = false;

    self.ikSolver = undefined;
    self.ikChain = undefined;
    self.l2l3initialAngle = 0;

    self.serverIK = false;

    self.path = [];
    self.positioningStage = 0;
    self.XYPositioning = true;
    self.L1 = 0.0;

    self.completeCallBack = undefined;

    self.kukaBase = null;
    self.kukaLink1 = null;
    self.kukaLink2 = null;
    self.kukaLink3 = null;
    self.kukaLink4 = null;
    self.kukaLink5 = null;
    self.kukaLinksItialAngles = {
                                    link1:(-90 * Math.PI / 180),
                                    link2:(45 * Math.PI / 180),
                                    link3:(-138 * Math.PI / 180),
                                    link4:(-75 * Math.PI / 180)
                                };

    self.gripper = null;

    self.cableSleeve0 = null;
    self.cableSleeve1 = null;
    self.cableSleeve2 = null;
    self.cableSleeve3 = null;
    self.kukaSleeveFixture1 = null;
    self.kukaSleeveFixture2 = null;
    self.kukaSleeveFixture3 = null;
    self.kukaSleeveFixture4 = null;
    self.kukaSleeveFixture5 = null;

    var sceneAppendedCallBack = function(kukaMeshObjects)
    {
        self.kukaBase    = kukaMeshObjects["kukaBase"].mesh;
        self.kukaLink1   = kukaMeshObjects["kukaLink1"].mesh;
        self.kukaLink2   = kukaMeshObjects["kukaLink2"].mesh;
        self.kukaLink3   = kukaMeshObjects["kukaLink3"].mesh;
        self.kukaLink4   = kukaMeshObjects["kukaLink4"].mesh;
        self.kukaLink5   = kukaMeshObjects["kukaLink5"].mesh;

        self.kukaSleeveFixture1 = kukaMeshObjects["kukaSleeveFixture1"].mesh;
        self.kukaSleeveFixture2 = kukaMeshObjects["kukaSleeveFixture2"].mesh;
        self.kukaSleeveFixture3 = kukaMeshObjects["kukaSleeveFixture3"].mesh;
        self.kukaSleeveFixture4 = kukaMeshObjects["kukaSleeveFixture4"].mesh;
        self.kukaSleeveFixture5 = kukaMeshObjects["kukaSleeveFixture5"].mesh;

        for (var meshObjectName in kukaMeshObjects)
        {
            if (vlab.vlabNature.shadows)
            {
                kukaMeshObjects[meshObjectName].mesh.castShadow = true;
                kukaMeshObjects[meshObjectName].mesh.receiveShadow = true;
            }
            if(kukaMeshObjects[meshObjectName].isRoot)
            {
                vlab.getVlabScene().add(kukaMeshObjects[meshObjectName].mesh);
            }
        }

        initialize();
    };

    var initialize = function()
    {
        if (Gripper != null)
        {
            gripperContructorArgs[1] = self; // kuka instance
            self.gripper = Gripper.apply({}, gripperContructorArgs);
        }

        self.kukaBase.updateMatrixWorld();
        var link2Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink2.matrixWorld);
        var link3Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink3.matrixWorld);
        var link4Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink4.matrixWorld);

        self.ikSolver = new Fullik.Structure(vlab.getVlabScene());
        self.ikSolver.clear();
        self.ikChain = new Fullik.Chain();

        // Fabrick IK (FullIK.js)
        var boneStartLoc = new Fullik.V3(link2Pos.x, link2Pos.y, link2Pos.z);
        var boneEndLoc   = new Fullik.V3(link3Pos.x, link3Pos.y, link3Pos.z);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        self.ikChain.addBone(bone);
        var l2l3Vec = link3Pos.clone().sub(link2Pos);
        var l3l4Vec = link4Pos.clone().sub(link3Pos);
        self.l2l3initialAngle = l2l3Vec.angleTo(l3l4Vec);
        var l3l4DirLength = l3l4Vec.length();
        l3l4Vec.normalize();
        var l3l4Dir = new Fullik.V3(l3l4Vec.x, l3l4Vec.y, l3l4Vec.z);
        self.ikChain.addConsecutiveBone(l3l4Dir, l3l4DirLength);

        self.ikSolver.add(self.ikChain, link4Pos, test);
        self.ikSolver.update();

        if (basePosition != undefined && basePosition != null)
        {
            self.kukaBase.position.copy(basePosition);
        }

        if (initialLinksAngles != null)
        {
        }
        else
        {
            self.kukaLink1.rotation.y = self.kukaLinksItialAngles.link1;
            self.kukaLink2.rotation.z = self.kukaLinksItialAngles.link2;
            self.kukaLink3.rotation.z = self.kukaLinksItialAngles.link3;
            self.kukaLink4.rotation.z = self.kukaLinksItialAngles.link4;
        }

        self.simulationStep(true);

        vlab.trace("Kuka initialized");
        self.initialized = true;
    }

    self.simulationStep = function(initialization, waitForGripper)
    {
        if (self.positioning || initialization === true || waitForGripper === true)
        {
            if (initialization === true)
            {
                if (self.cableSleeve0 == undefined)
                {
                    var loader = new THREE.TextureLoader();
                    loader.load(
                        "/vl/js/vlab/maps/kuka/cablesleeve.jpg",
                        function (texture) {
                            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                            texture.repeat.set(8, 0);
                            var cableSleeveMaterial = new THREE.MeshPhongMaterial({wireframe: false, shading:THREE.SmoothShading, map: texture});
                            cableSleeveMaterial.bumpMap = texture;
                            cableSleeveMaterial.bumpScale = 1.0;

                            self.cableSleeve0 = new THREE.Mesh(new THREE.Geometry(), cableSleeveMaterial);
                            self.cableSleeve1 = new THREE.Mesh(new THREE.Geometry(), cableSleeveMaterial);
                            self.cableSleeve2 = new THREE.Mesh(new THREE.Geometry(), cableSleeveMaterial);
                            self.cableSleeve3 = new THREE.Mesh(new THREE.Geometry(), cableSleeveMaterial);
                            self.cableSleeve0.castShadow = true;
                            self.cableSleeve1.castShadow = true;
                            self.cableSleeve2.castShadow = true;
                            self.cableSleeve3.castShadow = true;

                            var pos1 = self.kukaSleeveFixture1.position.clone();
                            var pos2 = self.kukaSleeveFixture2.position.clone();
                            var pos3 = self.kukaSleeveFixture3.position.clone();
                            var pos4 = self.kukaSleeveFixture4.position.clone();

                            var path = new THREE.CatmullRomCurve3([pos1, pos2]);
                            path.type = 'chordal';
                            path.closed = false;
                            var geometry = new THREE.TubeBufferGeometry(path, 22, 0.06, 6, false);
                            var sleeveMesh = new THREE.Mesh(geometry, cableSleeveMaterial);
                            self.kukaLink2.add(sleeveMesh);

                            var path = new THREE.CatmullRomCurve3([
                                pos3,
                                pos4
                            ]);
                            var path = new THREE.CatmullRomCurve3([pos3, pos4]);
                            path.type = 'chordal';
                            path.closed = false;
                            var geometry = new THREE.TubeBufferGeometry(path, 22, 0.06, 6, false);
                            var sleeveMesh = new THREE.Mesh(geometry, cableSleeveMaterial);
                            self.kukaLink3.add(sleeveMesh);

                            self.simulationStep(true);
                        });
                    return;
                }
            }

            // cable sleeve animation
            self.kukaBase.updateMatrixWorld();

            // self.cableSleeve1
            var pos1 = self.kukaSleeveFixture2.position.clone();
            var pos2 = pos1.clone();
            pos2.y += 1.4;
            pos2.x -= 0.4;
            var pos4 = self.kukaSleeveFixture3.position.clone();
            var pos3 = pos4.clone();
            pos3.y -= 1.1;
            pos3.x -= 0.2;

            pos1 = self.kukaLink2.localToWorld(pos1).sub(self.kukaBase.position);
            pos2 = self.kukaLink2.localToWorld(pos2).sub(self.kukaBase.position);
            pos3 = self.kukaLink3.localToWorld(pos3).sub(self.kukaBase.position);
            pos4 = self.kukaLink3.localToWorld(pos4).sub(self.kukaBase.position);
            var path = new THREE.CatmullRomCurve3([
                pos1,
                pos2,
                pos3,
                pos4
            ]);

            var path = new THREE.CatmullRomCurve3([pos1, pos2, pos3, pos4]);
            path.type = 'chordal';
            path.closed = false;
            var geometry = new THREE.TubeBufferGeometry(path, 22, 0.06, 4, false);
            self.cableSleeve1.geometry.dispose();
            self.cableSleeve1.geometry = geometry.clone();
            geometry = undefined;

            // self.cableSleeve2
            var pos1 = self.kukaSleeveFixture4.position.clone();
            var pos2 = pos1.clone();
            pos2.y += 1.0;
            pos2.x -= 0.2;
            var pos4 = self.kukaSleeveFixture5.position.clone();
            pos4.x += 0.01;
            var pos3 = pos4.clone();
            pos3.y -= 1.0;
            pos3.x -= 0.2;

            pos1 = self.kukaLink3.localToWorld(pos1).sub(self.kukaBase.position);
            pos2 = self.kukaLink3.localToWorld(pos2).sub(self.kukaBase.position);
            pos3 = self.kukaLink4.localToWorld(pos3).sub(self.kukaBase.position);
            pos4 = self.kukaLink4.localToWorld(pos4).sub(self.kukaBase.position);
            var path = new THREE.CatmullRomCurve3([
                pos1,
                pos2,
                pos3,
                pos4
            ]);
            path.type = 'chordal';
            path.closed = false;
            var geometry = new THREE.TubeBufferGeometry(path, 22, 0.06, 4, false);
            self.cableSleeve2.geometry.dispose();
            self.cableSleeve2.geometry = geometry.clone();
            geometry = undefined;

            // self.cableSleeve3 - gripperPlug
            if (self.gripper != undefined)
            {
                var pos1 = self.kukaSleeveFixture5.position.clone();
                var pos1ext = pos1.clone();
                pos1ext.y += 0.2;
                var pos2 = pos1ext.clone();
                pos2.y += 0.4 - self.kukaLink5.rotation.y / 8;
                pos2.x -= 0.5 + self.kukaLink5.rotation.y / 4;
                pos2.z += self.kukaLink5.rotation.y / 4;
                var pos4 = self.gripper.gripperPlug.position.clone();
                pos4.x += 0.05;
                var pos3_ext = pos4.clone();
                pos3_ext.x -= 0.2;
                var pos3 = pos3_ext.clone();
                pos3.x -= 0.4 + self.kukaLink5.rotation.y / 4;
                pos3.z -= self.kukaLink5.rotation.y / 4;

                pos1 = self.kukaLink4.localToWorld(pos1).sub(self.kukaBase.position);
                pos1ext = self.kukaLink4.localToWorld(pos1ext).sub(self.kukaBase.position);
                pos2 = self.kukaLink4.localToWorld(pos2).sub(self.kukaBase.position);
                pos3 = self.gripper.gripperMesh.localToWorld(pos3).sub(self.kukaBase.position);
                pos3_ext = self.gripper.gripperMesh.localToWorld(pos3_ext).sub(self.kukaBase.position);
                pos4 = self.gripper.gripperMesh.localToWorld(pos4).sub(self.kukaBase.position);
                var path = new THREE.CatmullRomCurve3([
                    pos1,
                    pos1ext,
                    pos2,
                    pos3,
                    pos4
                ]);

                var path = new THREE.CatmullRomCurve3([pos1, pos1ext, pos2, pos3, pos3_ext, pos4]);
                path.type = 'chordal';
                path.closed = false;
                var geometry = new THREE.TubeBufferGeometry(path, 22, 0.06, 4, false);
                self.cableSleeve3.geometry.dispose();
                self.cableSleeve3.geometry = geometry.clone();

                geometry = undefined;
            }
            else
            {
                // kuka gripper not ready yet
                setTimeout(function(){ self.simulationStep(null, true); }, 250);
            }

            if (initialization === true)
            {
                self.kukaBase.add(self.cableSleeve0);
                self.kukaBase.add(self.cableSleeve1);
                self.kukaBase.add(self.cableSleeve2);
                self.kukaBase.add(self.cableSleeve3);
            }
        }
    };

    self.moveByPath = function(pathNodes, callback)
    {
        if (typeof pathNodes === "object")
        {
            self.path = self.path.concat(pathNodes);
        }
        if (typeof callback === "function")
        {
            self.completeCallBack = callback;
        }
        if (self.path.length > 0)
        {
            if (self.positioningStage == 0)
            {
                var pathNode = self.path.shift();
                if (pathNode.xyz != undefined)
                {
                    self.setKuka(pathNode.xyz, true);
                }
                if (pathNode.angles != undefined)
                {
                    self.setKukaAngles(pathNode.angles);
                }
            }
            setTimeout(function(){ self.moveByPath(); }, 250);
        }
        else
        {
            if (self.positioningStage == 0)
            {
                vlab.trace("Kuka path completed");
                if (typeof self.completeCallBack === "function")
                {
                    self.completeCallBack.call();
                }
            }
            else
            {
                setTimeout(function(){ self.moveByPath(); }, 250);
            }
        }
    };


    self.setKuka = function(endEffectorPos, XY)
    {
        if (!self.initialized)
        {
            vlab.trace("Kuka initializing...");
            setTimeout(function(){ self.setKuka(endEffectorPos, XY); }, 200);
            return;
        }

        self.XYPositioning = (XY === true) ? true : false;

        var l4l5Height = 2.25;

        var requestForEEFPos = endEffectorPos.clone();

        if (self.XYPositioning)
        {
            var eefInitialXZPosition = endEffectorPos.clone();
            eefInitialXZPosition.y = self.kukaBase.position.y;
            var xzEEFDir = self.kukaBase.position.clone().sub(eefInitialXZPosition);
            var xDir = new THREE.Vector3(1,0,0);
            self.L1 = -Math.PI + xDir.angleTo(xzEEFDir.clone());

            requestForEEFPos.x = xzEEFDir.length();
            requestForEEFPos.y = (endEffectorPos.y - self.kukaBase.position.y + l4l5Height);
            requestForEEFPos.z = 0.00;
        }
        else
        {
            requestForEEFPos.x = (endEffectorPos.x - self.kukaBase.position.x).toFixed(2);
            requestForEEFPos.y = (endEffectorPos.y - self.kukaBase.position.y + l4l5Height).toFixed(2);
            requestForEEFPos.z = (endEffectorPos.z - self.kukaBase.position.z).toFixed(2);
        }

        if (self.serverIK)
        {
            $.ajax({
                url: "http://127.0.0.1:11111/ikxyz",
                type: 'POST',
                contentType: "application/json",
                data: JSON.stringify(requestForEEFPos)
            }).done(function(res){
                if (res.length)
                {
                    vlab.trace(res.length + " Kuka solutions found");
                    var kukaIKSolutionId = 0;
                    var minDistance = 0;
                    for (var i = 0; i < res.length; i++)
                    {
                        var solution = new THREE.Vector3(res[i].x, res[i].y, res[i].z);
                        var solutionDistance = solution.distanceTo(endEffectorPos);
                        if (solutionDistance < minDistance || i == 0)
                        {
                            kukaIKSolutionId = i;
                            minDistance = solutionDistance;
                        }
                    }

                    var kukaIK = res[kukaIKSolutionId];

                    kukaIK = self.estimateLink4Rotation(kukaIK, endEffectorPos, requestForEEFPos);

                    // set links
                    var angles = {
                        link1:kukaIK.l1,
                        link2:kukaIK.l2,
                        link3:kukaIK.l3,
                        link4:kukaIK.l4
                    };

                    self.setKukaAngles(angles);
                }
                else
                {
                    vlab.trace("Solution not found for Kuka EEF");
                    self.path = [];
                }
            });
        }
        else
        {
            self.ikChain.updateTarget(requestForEEFPos);
            var l2l3Dir = self.ikChain.bones[0].getDirectionUV().clone();
            var l3l4Dir = self.ikChain.bones[1].getDirectionUV().clone();

            var kukaIK = {l1:0.0, l2:0.0, l3:0.0, l4:0.0};

            kukaIK.l1 = self.L1;
            kukaIK.l2 = -l2l3Dir.angleTo(new THREE.Vector3(0,1,0));
            kukaIK.l3 = -self.l2l3initialAngle - l3l4Dir.angleTo(l2l3Dir);

            kukaIK = self.estimateLink4Rotation(kukaIK, endEffectorPos, requestForEEFPos);

            // set links
            var angles = {
                link1:kukaIK.l1,
                link2:kukaIK.l2,
                link3:kukaIK.l3,
                link4:kukaIK.l4
            };

            self.setKukaAngles(angles);
        }
    };

    self.estimateLink4Rotation = function(kukaIK, endEffectorPos, requestForEEFPos)
    {
        // get l4 angle to eef
        var kukaLink1Cur = self.kukaLink1.rotation.y;
        var kukaLink2Cur = self.kukaLink2.rotation.z;
        var kukaLink3Cur = self.kukaLink3.rotation.z;
        var kukaLink4Cur = self.kukaLink4.rotation.z;

        if (self.XYPositioning)
        {
            kukaIK.l1 = self.L1;
        }
        else
        {
            kukaIK.l1 = ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1;
        }

        self.kukaLink1.rotation.y = kukaIK.l1;
        self.kukaLink2.rotation.z = kukaIK.l2;
        self.kukaLink3.rotation.z = kukaIK.l3;
        self.kukaLink4.rotation.z = 0;

        self.kukaBase.updateMatrixWorld();
        var l4Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink4.matrixWorld);
        var l5Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink5.matrixWorld);
        var l4EEFDir = l4Pos.clone().sub(endEffectorPos);
        var l4l5Dir  = l4Pos.clone().sub(l5Pos);

        kukaIK.l4 = -l4EEFDir.angleTo(l4l5Dir);

        self.kukaLink1.rotation.y = kukaLink1Cur;
        self.kukaLink2.rotation.z = kukaLink2Cur;
        self.kukaLink3.rotation.z = kukaLink3Cur;
        self.kukaLink4.rotation.z = kukaLink4Cur;

        return kukaIK;
    };

    self.setKukaAngles = function(angles)
    {
        self.positioning = true;
        self.positioningStage = 4;

        // set links
        var kukaLink1 = new TWEEN.Tween(self.kukaLink1.rotation);
        kukaLink1.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink1.to({y: angles.link1}, 3000);
        kukaLink1.onComplete(function(){
            self.positioning = (--self.positioningStage > 0);
        });
        kukaLink1.start();

        var kukaLink2 = new TWEEN.Tween(self.kukaLink2.rotation);
        kukaLink2.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink2.to({z: angles.link2}, 3000);
        kukaLink2.onComplete(function(){
            self.positioning = (--self.positioningStage > 0);
        });
        kukaLink2.start();

        var kukaLink3 = new TWEEN.Tween(self.kukaLink3.rotation);
        kukaLink3.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink3.to({z: angles.link3}, 3000);
        kukaLink3.onComplete(function(){
            self.positioning = (--self.positioningStage > 0);
        });
        kukaLink3.start();

        var kukaLink4 = new TWEEN.Tween(self.kukaLink4.rotation);
        kukaLink4.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink4.to({z: angles.link4}, 3000);
        kukaLink4.onComplete(function(){
            self.positioning = (--self.positioningStage > 0);
        });
        kukaLink4.start();
    }

    if (test)
    {
        var ikTarget;
        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({wireframe:true, emissive:0xFFFFFF }) ),
            control : new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement)
        };
        vlab.getVlabScene().add(ikTarget.mesh);
//        ikTarget.control.addEventListener("change", function(){});
        var endEffectorInitialPosition = new THREE.Vector3(0,0,0);
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        vlab.getVlabScene().add(ikTarget.control);

        window.addEventListener('keydown', function (event){
            if (event.keyCode == 81) // q
            {
                self.setKuka(ikTarget.control.position.clone(), true);
            }
            if (event.keyCode == 69) //e
            {
                self.kukaBase.updateMatrixWorld();
                var link5Tip = new THREE.Vector3().setFromMatrixPosition(self.kukaLink5.matrixWorld);
                vlab.trace("Kuka EEF pos: ", link5Tip);
            }
        });
    }

    self.removeCallBack = function()
    {
        delete self.completeCallBack;
    };

    // append Kuka model to VLab scene
    vlab.appendScene("/vl/models/kuka/kuka.dae", sceneAppendedCallBack);
}
