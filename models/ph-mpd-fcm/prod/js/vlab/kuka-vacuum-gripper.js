"use strict";

function KukaVacuumGripper(vlab, test, contactObject, contactSurfaceFaces)
{
    var self = this;
    self.initialized = false;

    var gripper = null;

    var gripperTipVerticesIdx = [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255]
    var testVertices = [176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191];
    var gripperTipVertices = [];

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
                    gripper = kukaVacuumGripperMeshObjects[meshObjectName].mesh;
                }
                vlab.getVlabScene().add(kukaVacuumGripperMeshObjects[meshObjectName].mesh);
            }
        }

        initialize();
    };

    var initialize = function()
    {
// test!!!!!!!!!!!!!
        contactObject = vlab.getVlabScene().getObjectByName("slopingBody");


//        contactObject.rotation.x += 0.25;
//        contactObject.rotation.y += 0.5;
//        contactObject.rotation.z += -0.25;
        contactObject.position.x += 2.5;
//        contactObject.position.y += 2.5;
//        contactObject.position.z += 3.0;

        if (test)
        {
            gripper.material.wireframe = false;
            contactObject.material.wireframe = false;
        }

        // contactObject contact surface normal
        contactObject.geometry.computeFaceNormals();
        contactObject.geometry.computeVertexNormals(true);
        contactObject.updateMatrixWorld();

        for (i in contactSurfaceFaces)
        {
            var faceID = contactSurfaceFaces[i];
            var face = contactObject.geometry.faces[faceID].clone();
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.a].clone()));
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.b].clone()));
            contactSurfaceCentroid.add(contactObject.localToWorld(contactObject.geometry.vertices[face.c].clone()));
            contactSurfaceNormal.add(contactObject.localToWorld(face.normal.clone()));
        }
        contactSurfaceNormal.divideScalar(contactSurfaceFaces.length).sub(contactObject.position);
        contactSurfaceCentroid.divideScalar(contactSurfaceFaces.length * 3);

        if (test)
        {
            arrowHelperFaceNormal = new THREE.ArrowHelper(contactSurfaceNormal, contactSurfaceCentroid, 2, 0x00ffff, 0.1, 0.02);
            vlab.getVlabScene().add(arrowHelperFaceNormal);
        }

        // gripper contacting vertices
        for (var i in gripperTipVerticesIdx)
        {
            var vertexId = gripperTipVerticesIdx[i];
            var localVertextPos = gripper.geometry.vertices[vertexId].clone();
            if (test && testVertices.indexOf(vertexId) > -1)
            {
                var gripperContactVertextPos = gripper.localToWorld(localVertextPos);
                var arrowHelperDir = gripperContactVertextPos.clone().sub(contactSurfaceCentroid);
                var arrowHelperDirLength = arrowHelperDir.length();

                var arrowHelper = new THREE.ArrowHelper(arrowHelperDir.normalize(), contactSurfaceCentroid, arrowHelperDirLength, 0xffffff, 0.05, 0.01);
                arrowHelpers[vertexId] = arrowHelper;
                vlab.getVlabScene().add(arrowHelper);
            }
            gripperTipVertices.push({id:vertexId, pos:localVertextPos});
        }
        vlab.trace("Kuka Vacuum Gripper initialized");
        self.initialized = true;
        if (test)
        {
            setTestControls();
        }
    }

    self.processContact = function()
    {
        var updateGeom = false;
        for (var i in gripperTipVertices)
        {
            var vertexID  = gripperTipVertices[i].id;
            var vertexPos = gripperTipVertices[i].pos;
            var gripperContactVertextPos = gripper.localToWorld(vertexPos.clone());
            var gripperVertexContactSurfaceCentroidDir = gripperContactVertextPos.sub(contactSurfaceCentroid);
            var gripperVertexContactSurfaceCentroidDirLength = gripperVertexContactSurfaceCentroidDir.length();
            var angle = gripperVertexContactSurfaceCentroidDir.angleTo(contactSurfaceCentroid) + 0.05;

            if (test)
            {
                if (arrowHelpers[vertexID] != undefined)
                {
                    arrowHelpers[vertexID].setDirection(gripperVertexContactSurfaceCentroidDir.normalize());
                    arrowHelpers[vertexID].setLength(gripperVertexContactSurfaceCentroidDirLength, 0.05, 0.01);
                }
            }

            if (angle > Math.PI / 2)
            {
                var vertexDy = gripperVertexContactSurfaceCentroidDirLength * Math.sin(Math.PI / 2 - angle);
                var updatedVertexPos = gripper.geometry.vertices[vertexID];
                var vertexDxz = vertexDy / 5;
                updatedVertexPos.y = vertexPos.y + vertexDy;
/*
                updatedVertexPos.x = vertexPos.x + ((vertexPos.x > 0) ? -vertexDxz : vertexDxz);
                updatedVertexPos.z = vertexPos.z + ((vertexPos.z > 0) ? -vertexDxz : vertexDxz);
*/
                updateGeom = true;
            }

        }
        gripper.geometry.verticesNeedUpdate = updateGeom;
    }

    var setTestControls = function()
    {
        var control = new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement);
//        control.addEventListener("change", function(){self.processContact();});
        control.attach(gripper);
        control.setSize(1.0);
        vlab.getVlabScene().add(control);

        window.addEventListener('keydown', function (event){
            if (event.keyCode == 84) // t
            {
                control.setMode("translate");
            }
            if (event.keyCode == 82) // r
            {
                control.setMode("rotate");
            }
        });
    }

    // append Kuka Vacuum Gripper model to VLab scene 
    vlab.appendScene("scene/kuka-vacuum-gripper.dae", sceneAppendedCallBack);
};
