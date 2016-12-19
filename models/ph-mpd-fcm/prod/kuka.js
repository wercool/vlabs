"use strict";

function Kuka(webGLContainer)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var vlabNature = {
        "title":            "Kuka",
        "sceneFile":        "scene/kuka.dae",
        "isPhysijsScene":   false,
        "showStatistics":   true,
        "showAxis":         true
    };

    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 20.0, 15.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        self.getDefaultCamera().controls.testMode = true;

        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var ikSolver;
    var ikChain;
    var ikTarget;

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["link1"] = self.getVlabScene().getObjectByName("link1");
        activeObjects["link2"] = self.getVlabScene().getObjectByName("link2");
        activeObjects["link3"] = self.getVlabScene().getObjectByName("link3");
        activeObjects["link4"] = self.getVlabScene().getObjectByName("link4");
        activeObjects["link5"] = self.getVlabScene().getObjectByName("link5");

        activeObjects["kukaBase"].material.wireframe = false;
        activeObjects["link1"].material.wireframe = false;
        activeObjects["link2"].material.wireframe = true;
        activeObjects["link3"].material.wireframe = true;
        activeObjects["link4"].material.wireframe = true;
        activeObjects["link5"].material.wireframe = true;

        activeObjects["kukaBase"].visible = true;
        activeObjects["link1"].visible = true;
        activeObjects["link2"].visible = true;
        activeObjects["link3"].visible = false;
        activeObjects["link4"].visible = false;
        activeObjects["link5"].visible = false;

        ikSolver = new Fullik.Structure(self.getVlabScene());
        ikSolver.clear();

        // ik target
        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({color:0xFF0000, wireframe:true }) ),
            control : new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement)
        };
        self.getVlabScene().add(ikTarget.mesh);
        ikTarget.control.addEventListener( 'change', function(){updateIK();});
        activeObjects["kukaBase"].updateMatrixWorld();
        var endEffectorInitialPosition = new THREE.Vector3().copy(activeObjects["link5"].position);
        endEffectorInitialPosition.y += 0.5;
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        self.getVlabScene().add(ikTarget.control);

        // add IK chain links
        var X_AXIS = new Fullik.V3( 1, 0, 0 );
        var Y_AXIS = new Fullik.V3( 0, 1, 0 );
        var Z_AXIS = new Fullik.V3( 0, 0, 1 );

        var ikChain = new Fullik.Chain(0x999999);
        var boneMeshes = [];

        // link1
        var boneStartLoc = new Fullik.V3(0, activeObjects["link1"].position.y, 0);
        var boneEndLoc   = new Fullik.V3(0, activeObjects["link2"].position.y, 0);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        ikChain.addBone(bone);
        ikChain.setHingeBaseboneConstraint("global", Y_AXIS, 180, 180, Y_AXIS);
        activeObjects["link1"].geometry.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI * 0.5));
        boneMeshes.push(activeObjects["link1"]);


        // link2
        var boneStartLoc = new Fullik.V3(0, activeObjects["link2"].position.y, 0);
        var boneEndLoc   = new Fullik.V3(0, activeObjects["link3"].position.y, 0);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        ikChain.addConsecutiveBone(bone.getDirectionUV(), bone.getLength());
/*
//addConsecutiveHingedBone: function( directionUV, length, type, hingeRotationAxis, clockwiseDegs, anticlockwiseDegs, hingeReferenceAxis )
        ikChain.addConsecutiveHingedBone(bone.getDirectionUV(), bone.getLength(), "local", X_AXIS, 90, 90, X_AXIS);
//        activeObjects["link2"].geometry.applyMatrix( new THREE.Matrix4().makeRotationX(Math.PI * 0.5));
        activeObjects["link2"].geometry.applyMatrix( new THREE.Matrix4().makeRotationY(Math.PI * 0.5));

        activeObjects["link2"].geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, bone.mLength * 0.5 ) );
        activeObjects["link2"].geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 1.5, 0, 0 ) );
*/
        boneMeshes.push(activeObjects["link2"]);



        ikSolver.isWithMesh = true;
        ikSolver.meshChains.push(boneMeshes);

        ikSolver.add(ikChain, ikTarget.control.position, false);
        ikSolver.setFixedBaseMode(true);
        ikSolver.update();

        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {
    };

    var updateIK = function()
    {
        ikSolver.update();
    };
}
