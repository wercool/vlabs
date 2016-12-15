"use strict";

function PhMpdFcm(webGLContainer)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);

    $.getJSON("ph-mpd-fcm.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 4.0, 14.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.minDistance = 5;
        self.getDefaultCamera().controls.maxDistance = 15;
        self.getDefaultCamera().controls.maxPolarAngle = Math.PI/2 - 0.2; 
        self.getDefaultCamera().controls.minPolarAngle = 0.85; 
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;

        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var origin = new THREE.Vector3(0, 0, 0);
    var pulleyPos;

    var scenePostBuilt = function()
    {
        activeObjects["slopingSurface"] = self.getVlabScene().getObjectByName("slopingSurface");
        activeObjects["slopingBody"] = self.getVlabScene().getObjectByName("slopingBody");
        activeObjects["plumb"] = self.getVlabScene().getObjectByName("plumb");
        activeObjects["frame"] = self.getVlabScene().getObjectByName("frame");
        activeObjects["framePivot"] = self.getVlabScene().getObjectByName("framePivot");
        activeObjects["pulley"] = self.getVlabScene().getObjectByName("pulley");
        activeObjects["pulleyMotor"] = self.getVlabScene().getObjectByName("pulleyMotor");
        activeObjects["magnet"] = self.getVlabScene().getObjectByName("magnet");

        // this VLab constants
        pulleyPos = activeObjects["pulley"].position.clone();
        pulleyPos.y += 0.25;

        // position frame
        new slopingSurfaceFrameAnimaiton().process();

        // add rope
        var framePivotPos = new THREE.Vector3();
        activeObjects["slopingSurface"].updateMatrixWorld();
        framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);
        var pulleyPos1 = pulleyPos.clone();
        pulleyPos1.x += 0.1;
        var pulleyPos2 = pulleyPos1.clone();
        pulleyPos2.x += 0.1;
        var pulleyMotorPos = activeObjects["pulleyMotor"].position.clone();
        pulleyMotorPos.y += 0.3;
        pulleyMotorPos.x += 0.3;
        var ropeGeometry = new THREE.Geometry();
        ropeGeometry.vertices.push(framePivotPos);
        ropeGeometry.vertices.push(pulleyPos);
        ropeGeometry.vertices.push(pulleyPos1);
        ropeGeometry.vertices.push(pulleyPos2);
        ropeGeometry.vertices.push(pulleyMotorPos);
        var ropeMaterial = new THREE.LineBasicMaterial({
                                     color:     0x352d2a,
                                     opacity:   1.0,
                                     linewidth: 3.0
        });
        activeObjects["rope"] = new THREE.Line(ropeGeometry, ropeMaterial);
        activeObjects["rope"].castShadow = true;
        self.getVlabScene().add(activeObjects["rope"]);
console.log(activeObjects["rope"]);

        // position magnet
        activeObjects["magnet"].geometry.rotateX(Math.PI / 2);
        activeObjects["magnet"].position.copy(pulleyPos2);
/*
        activeObjects["arrowHelper"] = new THREE.ArrowHelper(pulleyMotorPosDirection.clone().normalize(), pulleyPos2, pulleyMotorPosDirection.length(), 0xffffff, 1.0, 0.25);
        self.getVlabScene().add(activeObjects["arrowHelper"]);
*/
        activeObjects["magnet"].lookAt(pulleyMotorPos);
        activeObjects["magnet"].translateZ(4.0);

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);
    };

    var ropeAnimation = function()
    {
        this.completed = false;

        this.process = function()
        {
            activeObjects["slopingSurface"].updateMatrixWorld();
            var framePivotPos = new THREE.Vector3();
            framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);

            activeObjects["rope"].geometry.vertices[0].copy(framePivotPos);
            activeObjects["rope"].geometry.verticesNeedUpdate = true;
        }

        return this;
    };

    var slopingSurfaceFrameAnimaiton = function()
    {
        this.completed = false;
        var framePos, framePosY, frameAngle;

        this.process = function()
        {
            activeObjects["slopingBody"].__dirtyPosition = true;
            activeObjects["slopingBody"].__dirtyRotation = true;
            activeObjects["slopingSurface"].__dirtyRotation = true;
            activeObjects["slopingSurface"].rotation.z -= 0.001;

            framePos = new THREE.Vector3();
            activeObjects["slopingSurface"].updateMatrixWorld();
            framePos.setFromMatrixPosition(activeObjects["frame"].matrixWorld);

            framePosY = new THREE.Vector3();
            framePosY.y = framePos.y;

            frameAngle = Math.asin( ( pulleyPos.length() * Math.sin( pulleyPos.angleTo(framePos) ) ) / pulleyPos.distanceTo(framePos));
            frameAngle += (Math.PI / 2) - framePosY.angleTo(framePos);
 
            activeObjects["frame"].rotation.z = -(Math.PI / 2 + activeObjects["slopingSurface"].rotation.z - frameAngle);
            activeObjects["plumb"].rotation.z = -activeObjects["slopingSurface"].rotation.z;
        }

        return this;
    };

    var magnetAnimation = function()
    {
        this.completed = false;

        var prevPulleyFramePivotVector;

        this.process = function()
        {
            activeObjects["slopingSurface"].updateMatrixWorld();
            var framePivotPos = new THREE.Vector3();
            framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);
            var pulleyFramePivotVector = framePivotPos.clone().sub(pulleyPos);
            if (prevPulleyFramePivotVector != undefined)
            {
                var dZmagnet = Math.abs(prevPulleyFramePivotVector - pulleyFramePivotVector.length());
                activeObjects["magnet"].translateZ(dZmagnet);
            }
            prevPulleyFramePivotVector = pulleyFramePivotVector.length();
        }

        return this;
    };

    self.button1Pressed = function()
    {
        self.addProcessNode("ropeAnimation", new ropeAnimation());
        self.addProcessNode("slopingSurfaceFrameAnimaiton", new slopingSurfaceFrameAnimaiton());
        self.addProcessNode("magnetAnimation", new magnetAnimation());
    };

    self.button1Released = function()
    {
        self.setProcessNodeCompleted("ropeAnimation");
        self.setProcessNodeCompleted("slopingSurfaceFrameAnimaiton");
        self.setProcessNodeCompleted("magnetAnimation");
    };

    self.physijsCollision = function(other_object, linear_velocity, angular_velocity)
    {
        self.trace(this.name + " [collided with] " + other_object.name);
    };

    // helpers
    self.plumbScaleZoom = function()
    {
       new ZoomHelper({"sprite": this, "vlab":self, "target":"scale", "zOffset":1.2});
    }

    self.aktakomPowerSupplyZoom = function()
    {
        new ZoomHelper({"sprite": this, "vlab":self, "target":"aktakomPowerSupplyScreen", "zOffset":2.5, "yOffset":-1.0});
    }

}
