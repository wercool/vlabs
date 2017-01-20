"use strict";

function KukaVacuumGripper(vlab, kuka, test, contactObjectName, contactSurfaceFaces)
{
    var self = this;
    self.initialized = false;

    self.gripperMesh = null;
    self.gripperPlug = null;

    var gripperTipVerticesIdx = [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255]
    var testVertices = [176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191];
    var gripperTipVertices = [];

    var contactObject;
    var arrowHelperFaceNormal
    var arrowHelpers = {};

    var contactSurfaceNormal = new THREE.Vector3();
    var contactSurfaceCentroid = new THREE.Vector3();

    var sceneAppendedCallBack = function(kukaVacuumGripperMeshObjects)
    {
        for (var meshObjectName in kukaVacuumGripperMeshObjects)
        {
            if (vlab.vlabNature.shadows)
            {
                kukaVacuumGripperMeshObjects[meshObjectName].mesh.castShadow = true;
                kukaVacuumGripperMeshObjects[meshObjectName].mesh.receiveShadow = true;
            }
            if(kukaVacuumGripperMeshObjects[meshObjectName].isRoot)
            {
                if (meshObjectName == "kukaVacuumGripper")
                {
                    self.gripperMesh = kukaVacuumGripperMeshObjects[meshObjectName].mesh;
                    if (kuka === null)
                    {
                        vlab.getVlabScene().add(self.gripperMesh);
                    }
                    else
                    {
                        kuka.kukaLink5.add(self.gripperMesh);
                        kuka.kukaLink5.updateMatrixWorld();
                    }
                }
            }
        }
        setTimeout(function(){ initialize(); }, 250);
    };

    var initialize = function()
    {
        if (kuka !== null)
        {
            kuka.gripper = self;
            self.gripperPlug = vlab.getVlabScene().getObjectByName("gripperPlug");
            kuka.kukaLink5.updateMatrixWorld();
        }

        contactObject = vlab.getVlabScene().getObjectByName(contactObjectName);
/*
        self.gripperMesh.material.wireframe = false;
        contactObject.material.wireframe = false;
*/
        contactObject.geometry.computeBoundingSphere();
        self.updateContactSurfaceCentroidAndNormal();

        // gripper contacting vertices
        for (var i in gripperTipVerticesIdx)
        {
            var vertexId = gripperTipVerticesIdx[i];
            var localVertextPos = self.gripperMesh.geometry.vertices[vertexId].clone();
            if (test && testVertices.indexOf(vertexId) > -1)
            {
                var gripperContactVertextPos = gripperPos().add(localVertextPos.clone());
                var arrowHelperDir = gripperContactVertextPos.clone().sub(contactSurfaceCentroid);
                var arrowHelperDirLength = arrowHelperDir.length();
                var arrowHelper = new THREE.ArrowHelper(arrowHelperDir.normalize(), contactSurfaceCentroid, arrowHelperDirLength, ((vertexId == testVertices[0]) ? 0xff0000 : 0xffffff), 0.05, 0.01);
                arrowHelpers[vertexId] = arrowHelper;
                vlab.getVlabScene().add(arrowHelper);
            }
            gripperTipVertices.push({id:vertexId, pos:localVertextPos});
        }

        self.update();

        vlab.trace("Kuka Vacuum Gripper initialized");
        self.initialized = true;
        if (test && kuka === null)
        {
            setTestControls();
        }
    }

    self.update = function()
    {
        self.updateContactSurfaceCentroidAndNormal();
        self.processContact();
    };

    self.updateContactSurfaceCentroidAndNormal = function()
    {
        if (contactObject == undefined) return;

        // contactObject contact surface normal
        contactObject.geometry.computeFaceNormals();
        contactObject.geometry.computeVertexNormals();
        contactObject.updateMatrixWorld();

        contactSurfaceNormal = new THREE.Vector3();
        contactSurfaceCentroid = new THREE.Vector3();

        for (var i in contactSurfaceFaces)
        {
            var faceID = contactSurfaceFaces[i];
            var face = contactObject.geometry.faces[faceID].clone();
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.a].clone()));
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.b].clone()));
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.c].clone()));
            contactSurfaceNormal.add(face.normal.clone());
        }
        contactSurfaceNormal.divideScalar(contactSurfaceFaces.length).normalize();
        contactSurfaceCentroid.divideScalar(contactSurfaceFaces.length * 3);

        var normalMatrix = new THREE.Matrix3().getNormalMatrix(contactObject.matrixWorld);
        contactSurfaceNormal.applyMatrix3(normalMatrix);

        if (test)
        {
            if (arrowHelperFaceNormal == undefined)
            {
                arrowHelperFaceNormal = new THREE.ArrowHelper(contactSurfaceNormal.normalize(), contactSurfaceCentroid, 2, 0x00ffff, 0.1, 0.02);
                vlab.getVlabScene().add(arrowHelperFaceNormal);
            }
            else
            {
                arrowHelperFaceNormal.position.copy(contactSurfaceCentroid);
                arrowHelperFaceNormal.setDirection(contactSurfaceNormal);
            }
        }
    };

    self.processContact = function()
    {
        if (contactObject == undefined) return;

        var updateGeom = false;
        if (contactObject.position.distanceTo(gripperPos()) < contactObject.geometry.boundingSphere.radius * 2 || test)
        {
            self.gripperMesh.updateMatrixWorld();
            for (var i in gripperTipVertices)
            {
                var vertexID  = gripperTipVertices[i].id;
                var gripperContactVertextPos = self.gripperMesh.localToWorld(gripperTipVertices[i].pos.clone());
                var gripperVertexContactSurfaceCentroidDir = gripperContactVertextPos.sub(contactSurfaceCentroid);
                var gripperVertexContactSurfaceCentroidDirLength = gripperVertexContactSurfaceCentroidDir.length();

                var angle = gripperVertexContactSurfaceCentroidDir.angleTo(contactSurfaceNormal) + 0.02;

                if (test)
                {
                    if (arrowHelpers[vertexID] != undefined)
                    {
                        if (vertexID == testVertices[0])
                        {
//                            console.log(angle * 180 / Math.PI);
                        }
                        arrowHelpers[vertexID].visible = true;
                        arrowHelpers[vertexID].position.copy(contactSurfaceCentroid);
                        arrowHelpers[vertexID].setDirection(gripperVertexContactSurfaceCentroidDir.normalize());
                        arrowHelpers[vertexID].setLength(gripperVertexContactSurfaceCentroidDirLength, 0.025, 0.005);
                    }
                }
                if (angle > Math.PI / 2)
                {
                    var vertexDy = gripperVertexContactSurfaceCentroidDirLength * Math.sin(Math.PI / 2 - angle);
                    var updatedVertexPos = self.gripperMesh.geometry.vertices[vertexID];
                    updatedVertexPos.y = gripperTipVertices[i].pos.y + vertexDy;
                    updateGeom = true;
                }
            }
        }
        else
        {
            if (test)
            {
                for (var i in testVertices)
                {
                    arrowHelpers[testVertices[i]].visible = false;
                }
            }
        }
        self.gripperMesh.geometry.verticesNeedUpdate = updateGeom;
    }

    var setTestControls = function()
    {
        var control = new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement);
        control.addEventListener("change", function(){self.processContact();});
        control.attach(self.gripperMesh);
        control.setSize(1.0);
        vlab.getVlabScene().add(control);

        var control1 = new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement);
        control1.addEventListener("change", function(){self.updateContactSurfaceCentroidAndNormal();});
        control1.attach(contactObject);
        control1.setSize(1.0);
        vlab.getVlabScene().add(control1);

        window.addEventListener('keydown', function (event){
            if (event.keyCode == 84) // t
            {
                control.setMode("translate");
                control1.setMode("translate");
            }
            if (event.keyCode == 82) // r
            {
                control.setMode("rotate");
                control1.setMode("rotate");
            }
        });
    }

    var gripperPos = function()
    {
        if (kuka === null)
        {
            return self.gripperMesh.position;
        }
        else
        {
            return new THREE.Vector3().setFromMatrixPosition(self.gripperMesh.matrixWorld);
        }
    };

    // append Kuka Vacuum Gripper model to VLab scene
    vlab.appendScene("/vl/models/kuka/kuka-vacuum-gripper.dae", sceneAppendedCallBack);
};
