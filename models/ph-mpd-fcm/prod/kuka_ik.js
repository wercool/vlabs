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
    var ikTarget, ikTargetKukaLink1;

    var link1Vec, link2Vec, link3Vec;
    var l2l3initialAngle;

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["kukaLink1"] = self.getVlabScene().getObjectByName("kukaLink1");
        activeObjects["kukaLink2"] = self.getVlabScene().getObjectByName("kukaLink2");
        activeObjects["kukaLink3"] = self.getVlabScene().getObjectByName("kukaLink3");
        activeObjects["kukaLink4"] = self.getVlabScene().getObjectByName("kukaLink4");

        activeObjects["kukaLink2"].material.wireframe = true;
        activeObjects["kukaLink3"].material.wireframe = true;
        activeObjects["kukaLink4"].material.wireframe = true;

        self.getDefaultCamera().position.set(0.0, 20.0, 15.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        self.getDefaultCamera().controls.testMode = true;

        var light = new THREE.AmbientLight(0x404040, 1.0); // soft white light
        self.getVlabScene().add(light);

        ikSolver = new Fullik.Structure(self.getVlabScene());
        ikSolver.clear();

        activeObjects["kukaBase"].updateMatrixWorld();
        var link2Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink2"].matrixWorld);
        var link3Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink3"].matrixWorld);
        var link4Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink4"].matrixWorld);

        // ik target
        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({color:0xFFFFFF, wireframe:true }) ),
            control : new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement)
        };
        self.getVlabScene().add(ikTarget.mesh);
        ikTarget.control.addEventListener( 'change', function(){updateIK();});
        var endEffectorInitialPosition = link4Pos;
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        self.getVlabScene().add(ikTarget.control);

        // kukaLink1 target
        ikTargetKukaLink1 = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({color:0xFFFFFF, wireframe:true }) ),
            control : new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement)
        };
        self.getVlabScene().add(ikTargetKukaLink1.mesh);
        ikTargetKukaLink1.control.addEventListener( 'change', function(){updateKukaLink1();});
        var endEffectorInitialPosition = new THREE.Vector3(10,0,0);
        ikTargetKukaLink1.mesh.position.copy(endEffectorInitialPosition);
        ikTargetKukaLink1.control.attach(ikTargetKukaLink1.mesh);
        ikTargetKukaLink1.control.setSize(1.0);
        self.getVlabScene().add(ikTargetKukaLink1.control);

        var eefInitialXZPosition = endEffectorInitialPosition.clone();
        eefInitialXZPosition.y = activeObjects["kukaBase"].position.y;
        var xzEEFDir = activeObjects["kukaBase"].position.clone().sub(eefInitialXZPosition);
        activeObjects["xzEEFDir"] = new THREE.ArrowHelper(xzEEFDir.clone().normalize().negate(), activeObjects["kukaBase"].position, xzEEFDir.length(), 0xffffff, 0.5, 0.1);
        self.getVlabScene().add(activeObjects["xzEEFDir"]);

        // add IK chain links
        var X_AXIS = new Fullik.V3( 1, 0, 0 );
        var Y_AXIS = new Fullik.V3( 0, 1, 0 );
        var Z_AXIS = new Fullik.V3( 0, 0, 1 );

        ikChain = new Fullik.Chain(0x999999);

        // link1
        var boneStartLoc = new Fullik.V3(link2Pos.x, link2Pos.y, link2Pos.z);
        var boneEndLoc   = new Fullik.V3(link3Pos.x, link3Pos.y, link3Pos.z);
        var bone = new Fullik.Bone(boneStartLoc, boneEndLoc);
        ikChain.addBone(bone);
        var l2l3Vec = link3Pos.clone().sub(link2Pos);
        var l3l4Vec = link4Pos.clone().sub(link3Pos);
        l2l3initialAngle = l2l3Vec.angleTo(l3l4Vec);
        var l3l4DirLength = l3l4Vec.length();
        l3l4Vec.normalize();
        var l3l4Dir = new Fullik.V3(l3l4Vec.x, l3l4Vec.y, l3l4Vec.z);
        ikChain.addConsecutiveBone(l3l4Dir, l3l4DirLength);



        ikSolver.add(ikChain, link4Pos, true);

        ikSolver.update();


//        link1Vec = new THREE.ArrowHelper(ikSolver.chains[0].bones[0].getDirectionUV(), ikSolver.chains[0].bones[0].mStartLocation, ikSolver.chains[0].bones[0].getLength(), 0xff00ff, 0.2, 0.2);
//        self.getVlabScene().add(link1Vec);

//        link2Vec = new THREE.ArrowHelper(ikSolver.chains[0].bones[1].getDirectionUV(), ikSolver.chains[0].bones[1].mStartLocation, ikSolver.chains[0].bones[1].getLength(), 0xff00ff, 0.2, 0.2);
//        self.getVlabScene().add(link2Vec);

        self.WebGLRenderer.setClearColor(0xbababa);
        self.setSceneRenderPause(false);
    };
/*
    var scenePostBuilt_notused = function()
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

//        ikChain.addConsecutiveHingedBone(Y_AXIS, 7, "global", Z_AXIS, 90, 90, X_AXIS);
//        ikChain.addConsecutiveHingedBone(Y_AXIS, 3, "global", Z_AXIS, 90, 90, X_AXIS);

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

        ikSolver.add(chain1, null, true);


        ikSolver.update();

        link1Vec = new THREE.ArrowHelper(ikSolver.chains[0].bones[0].getDirectionUV(), ikSolver.chains[0].bones[0].mStartLocation, ikSolver.chains[0].bones[0].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link1Vec);

        link2Vec = new THREE.ArrowHelper(ikSolver.chains[1].bones[0].getDirectionUV(), ikSolver.chains[1].bones[0].mStartLocation, ikSolver.chains[1].bones[0].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link2Vec);
        link3Vec = new THREE.ArrowHelper(ikSolver.chains[1].bones[1].getDirectionUV(), ikSolver.chains[1].bones[1].mStartLocation, ikSolver.chains[1].bones[1].getLength(), 0xff00ff, 0.2, 0.2);
        self.getVlabScene().add(link3Vec);

        self.setSceneRenderPause(false);
    };
*/
    var simulationStep = function()
    {
    };

    var updateIK = function()
    {
/*
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
*/


        getKukaBonesBasedIK();
    };

    var updateKukaLink1 = function()
    {
        if (activeObjects["xzEEFDir"] == undefined) return;

        var eefInitialXZPosition = ikTargetKukaLink1.control.position.clone();
        eefInitialXZPosition.y = activeObjects["kukaBase"].position.y;
        var xzEEFDir = activeObjects["kukaBase"].position.clone().sub(eefInitialXZPosition);
        activeObjects["xzEEFDir"].setDirection(xzEEFDir.clone().normalize().negate());
        activeObjects["xzEEFDir"].setLength(xzEEFDir.length(), 0.5, 0.1);
        var xDir = new THREE.Vector3(1,0,0);
        var l1 = -Math.PI + xDir.angleTo(xzEEFDir.clone());
        activeObjects["kukaLink1"].rotation.y = l1;
    };

    var getKukaBonesBasedIK = function()
    {
        if (ikChain != undefined)
        {
            ikChain.updateTarget(ikTarget.control.position.clone());
            ikSolver.update();
            var l1l2Dir = ikSolver.chains[0].bones[0].getDirectionUV().clone();
            var l2l3Dir = ikSolver.chains[0].bones[1].getDirectionUV().clone();

            activeObjects["kukaLink2"].rotation.z = -l1l2Dir.angleTo(new THREE.Vector3(0,1,0));
            activeObjects["kukaLink3"].rotation.z = -l2l3initialAngle - l2l3Dir.angleTo(l1l2Dir);
        }
    };

    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);
}
