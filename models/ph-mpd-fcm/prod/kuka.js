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

        activeObjects["kukaBase"].material.wireframe = true;
        activeObjects["link1"].material.wireframe = true;
        activeObjects["link2"].material.wireframe = true;
        activeObjects["link3"].material.wireframe = true;
        activeObjects["link4"].material.wireframe = true;
        activeObjects["link5"].material.wireframe = true;

        var links = [activeObjects["link1"], 
                     activeObjects["link2"],
                     activeObjects["link3"],
                     activeObjects["link4"],
                     activeObjects["link5"]];

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

        // add links
        var defaultBoneDirection = new Fullik.V3(0, 1, 0);
        var defaultBoneLength = 3;
        var startLoc = new Fullik.V3(0, 0, 0);
        var endLoc = startLoc.plus(defaultBoneDirection.times(defaultBoneLength));
        var basebone = new Fullik.Bone(startLoc, endLoc);
        var ikChain = new Fullik.Chain(0x999999);
        ikChain.addBone(basebone);
        ikChain.addConsecutiveBone(defaultBoneDirection, defaultBoneLength);
        ikChain.addConsecutiveBone(defaultBoneDirection, defaultBoneLength);
        ikSolver.add(ikChain, ikTarget.control.position, true);
        ikSolver.update();
        ikSolver.addMeshLinks(links);

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
