"use strict";

function KukaVacuumGripper(vlab, test, contactObject, contactSurfaceVertices)
{
    var self = this;
    self.initialized = false;

    var gripper = null;

    var gripperTipVertices = [];

    var surfaceContactCentroid = new THREE.Vector3();

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
// test!!!!!!!!!!!!!

    var arrowHelperFaceNormal
    var arrowHelper1;
    var arrowHelpers = [];

    var initialize = function()
    {
// test!!!!!!!!!!!!!
        contactObject = vlab.getVlabScene().getObjectByName("slopingBody");
//        contactObject.rotateX(0.25);
        contactObject.rotateZ(0.25);
//        contactObject.rotateY(0.5);
//        contactObject.translateZ(0.5);

        if (test)
        {
            gripper.material.wireframe = true;
            contactObject.material.wireframe = true;
        }

        // contactObject contact surface normal
        contactObject.updateMatrixWorld();
        for (var surfaceContactVertexIDn in contactSurfaceVertices)
        {
            var surfaceContactVertexID = contactSurfaceVertices[surfaceContactVertexIDn];
            var surfaceContactVertexPos = contactObject.localToWorld(contactObject.geometry.vertices[surfaceContactVertexID].clone());
            surfaceContactCentroid.add(surfaceContactVertexPos);
        }
        surfaceContactCentroid.divideScalar(contactSurfaceVertices.length);
        if (test)
        {
            arrowHelperFaceNormal = new THREE.ArrowHelper(surfaceContactCentroid.clone().normalize(), surfaceContactCentroid, 3, 0xffffff, 0.1, 0.025);
            vlab.getVlabScene().add(arrowHelperFaceNormal);
        }

        // gripper contacting vertices
        gripper.updateMatrixWorld();
        var gripperTipVerticesMinVertexId = 192;
        var gripperTipVerticesLoopSize = 16;
        for (var i = 0; i < gripperTipVerticesLoopSize * 3; i++)
        {
            if (test && i == 0)
            {
                var gripperContactVertextPos = gripper.localToWorld(gripper.geometry.vertices[gripperTipVerticesMinVertexId].clone());
                var arrowHelperDir = gripperContactVertextPos.clone().sub(surfaceContactCentroid);
                var arrowHelperDirLength = arrowHelperDir.length();

                var arrowHelper = new THREE.ArrowHelper(arrowHelperDir.normalize(), surfaceContactCentroid, arrowHelperDirLength, 0xffffff, 0.1, 0.025);
                arrowHelpers.push(arrowHelper);
                vlab.getVlabScene().add(arrowHelper);

                if (i == 0)
                {
/*
                    arrowHelper1 = new THREE.ArrowHelper(new THREE.Vector3(0,0,0), gripperContactVertextPos, 0, 0xffffff, 0.1, 0.025);
                    vlab.getVlabScene().add(arrowHelper1);
*/
                }
            }

            gripperTipVertices.push(gripperTipVerticesMinVertexId++);
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
        for (var vertexIDn in gripperTipVertices)
        {
            var vertexID = gripperTipVertices[vertexIDn];
            var gripperContactVertextPos = gripper.localToWorld(gripper.geometry.vertices[vertexID].clone());
            var gripperVertexContactSurfaceCentroidDir = gripperContactVertextPos.clone().sub(surfaceContactCentroid);
            if (test && vertexIDn == 0)
            {
                var arrowHelperDirLength = gripperVertexContactSurfaceCentroidDir.length();
                arrowHelpers[vertexIDn].setDirection(gripperVertexContactSurfaceCentroidDir.normalize());
                arrowHelpers[vertexIDn].setLength(arrowHelperDirLength, 0.1, 0.025);
            }
            if (vertexIDn == 0)
            {
                var angle = gripperVertexContactSurfaceCentroidDir.angleTo(surfaceContactCentroid);
                if (angle > Math.PI / 2)
                {
                    console.log(((180 * angle) / Math.PI).toFixed(2));
                }
            }
        }

return;
        var updateGeom = false;
        for (var vertexIDn in gripperTipVertices)
        {
            var vertexID = gripperTipVertices[vertexIDn];
            var gripperContactVertextPos = gripper.localToWorld(gripper.geometry.vertices[vertexID].clone());
            var yDiff = gripperContactVertextPos.y - surfaceContactCentroid.y;
            if (yDiff < 0)
            {
                var updatedVertexPos = gripper.geometry.vertices[vertexID];
                updatedVertexPos.y += yDiff;
                updatedVertexPos.x += (updatedVertexPos.x > 0) ? 0.001 : -0.001;
                updatedVertexPos.z += (updatedVertexPos.z > 0) ? 0.001 : -0.001;
                updateGeom = true;
            }
        }
        gripper.geometry.verticesNeedUpdate = updateGeom;
    }

    var setTestControls = function()
    {
        var control = new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement);
        control.addEventListener("change", function(){self.processContact();});
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
