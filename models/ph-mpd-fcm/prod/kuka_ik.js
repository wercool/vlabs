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

    var link1Vec, link2Vec, link3Vec;

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["link1"] = self.getVlabScene().getObjectByName("link1");
        activeObjects["link2"] = self.getVlabScene().getObjectByName("link2");
        activeObjects["link3"] = self.getVlabScene().getObjectByName("link3");
        activeObjects["link4"] = self.getVlabScene().getObjectByName("link4");
        activeObjects["link5"] = self.getVlabScene().getObjectByName("link5");

        activeObjects["kukaBase"].material.wireframe = false;
        activeObjects["link1"].material.wireframe = true;
        activeObjects["link2"].material.wireframe = true;
        activeObjects["link3"].material.wireframe = false;
        activeObjects["link4"].material.wireframe = false;
        activeObjects["link5"].material.wireframe = false;

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
//        var endEffectorInitialPosition = new THREE.Vector3().copy(activeObjects["link5"].position);
        var endEffectorInitialPosition = new THREE.Vector3(10,0,0);
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
        var boneStartLoc = new Fullik.V3(0, 0, 0);
        var boneEndLoc   = new Fullik.V3(0, 10, 0);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        ikChain.addBone(bone);
        ikChain.setHingeBaseboneConstraint("global", Y_AXIS, 180, 180, Y_AXIS);
/*
        ikChain.addConsecutiveHingedBone(Y_AXIS, 7, "global", Z_AXIS, 90, 90, X_AXIS);
        ikChain.addConsecutiveHingedBone(Y_AXIS, 3, "global", Z_AXIS, 90, 90, X_AXIS);
*/
        ikSolver.add(ikChain, ikTarget.control.position, true);

        var link2Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link2"].matrixWorld);
        var link3Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link3"].matrixWorld);
        var chain1 = new Fullik.Chain();
        var boneStartLoc = new Fullik.V3(0, link2Pos.y, 0);
        var boneEndLoc   = new Fullik.V3(0, link3Pos.y, 0);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        chain1.addBone(bone);
        chain1.setHingeBaseboneConstraint("global", Z_AXIS, 0, 90, X_AXIS);
        chain1.addConsecutiveHingedBone(Y_AXIS, 5, "global", Z_AXIS, 90, 0, X_AXIS);
        chain1.addConsecutiveHingedBone(Y_AXIS, 3, "global", Z_AXIS, 90, 90, X_AXIS);

        ikSolver.add(chain1, ikTarget.control.position, true);


        ikSolver.update();

        link1Vec = new THREE.ArrowHelper(ikSolver.chains[0].bones[0].getDirectionUV(), ikSolver.chains[0].bones[0].mStartLocation, ikSolver.chains[0].bones[0].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link1Vec);

        link2Vec = new THREE.ArrowHelper(ikSolver.chains[1].bones[0].getDirectionUV(), ikSolver.chains[1].bones[0].mStartLocation, ikSolver.chains[1].bones[0].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link2Vec);
        link3Vec = new THREE.ArrowHelper(ikSolver.chains[1].bones[1].getDirectionUV(), ikSolver.chains[1].bones[1].mStartLocation, ikSolver.chains[1].bones[1].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link3Vec);

        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {
    };

    var updateIK = function()
    {

        if (link1Vec != undefined)
        {
            var line1VecDir = ikSolver.chains[0].bones[0].getDirectionUV();
            link1Vec.position.copy(ikSolver.chains[0].bones[0].mStartLocation);
            link1Vec.setDirection(line1VecDir);

            var line2VecDir = ikSolver.chains[1].bones[0].getDirectionUV();
            link2Vec.position.copy(ikSolver.chains[1].bones[0].mStartLocation);
            link2Vec.setDirection(ikSolver.chains[1].bones[0].getDirectionUV());

            var line3VecDir = ikSolver.chains[1].bones[1].getDirectionUV();
            link3Vec.position.copy(ikSolver.chains[1].bones[1].mStartLocation);
            link3Vec.setDirection(ikSolver.chains[1].bones[1].getDirectionUV());

            var line1Vec3 = new THREE.Vector3(line1VecDir.x, line1VecDir.y, line1VecDir.z);
            var line2Vec3 = new THREE.Vector3(line2VecDir.x, line2VecDir.y, line2VecDir.z);
            var line3Vec3 = new THREE.Vector3(line3VecDir.x, line3VecDir.y, line3VecDir.z);

            activeObjects["link1"].rotation.y = -line1Vec3.angleTo(new THREE.Vector3(1,0,0));
            activeObjects["link2"].rotation.z = -line3Vec3.angleTo(new THREE.Vector3(0,1,0));
        }

        ikSolver.update();
    };
}
