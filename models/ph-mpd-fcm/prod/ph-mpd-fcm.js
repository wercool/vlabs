"use strict";

function PhMpdFcm(webGLContainer)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

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

        // position frame
        new slopingSurfaceFrameAnimaiton().process();

        // add rope
        var framePivotPos = new THREE.Vector3();
        activeObjects["slopingSurface"].updateMatrixWorld();
        framePivotPos.setFromMatrixPosition(activeObjects["framePivot"].matrixWorld);
        var pulleyPos = new THREE.Vector3().copy(activeObjects["pulley"].position);
        pulleyPos.y += 0.25;
        var pulleyPos1 = new THREE.Vector3().copy(pulleyPos);
        pulleyPos1.x += 0.1;
        var pulleyPos2 = new THREE.Vector3().copy(pulleyPos1);
        pulleyPos2.x += 0.1;
        var pulleyMotorPos = new THREE.Vector3().copy(activeObjects["pulleyMotor"].position);
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

        // position magnet
//        activeObjects["magnet"].position.copy(pulleyPos2);
        activeObjects["magnet"].lookAt(pulleyMotorPos);
//        activeObjects["magnet"].translateY(-0.5);

        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {

    }

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

        var origin = new THREE.Vector3(0, 0, 0);
        var pulleyPos, framePos, framePosY, frameAngle;
/*
        var frameDirection = framePos.clone().sub(origin);
        var frameVectorlength = frameDirection.length();
        
        var pulleyDirection = pulleyPos.clone().sub(origin);
        var pulleyVectorlength = pulleyDirection.length();


        var frameYDirection = framePosY.clone().sub(origin);
        var frameYVectorLength = frameYDirection.length();

        var frameYFrameDirection = framePos.clone().sub(framePosY);

        if (activeObjects["framePosArrowHelper"] == undefined)
        {
            activeObjects["framePosArrowHelper"] = new THREE.ArrowHelper(frameDirection.normalize(), origin, frameVectorlength, 0xffffff, 1.0, 0.25);
            self.getVlabScene().add(activeObjects["framePosArrowHelper"]);
            activeObjects["pulleyPosArrowHelper"] = new THREE.ArrowHelper(pulleyDirection.normalize(), origin, pulleyVectorlength, 0xffffff, 1.0, 0.25);
            self.getVlabScene().add(activeObjects["pulleyPosArrowHelper"]);
            activeObjects["pulleyToframeArrowHelper"] = new THREE.ArrowHelper(frameDirection.normalize(), pulleyPos, pulleyPos.distanceTo(framePos), 0xffff00, 1.0, 0.25);
            self.getVlabScene().add(activeObjects["pulleyToframeArrowHelper"]);
            activeObjects["frameYArrowHelper"] = new THREE.ArrowHelper(frameYDirection.normalize(), origin, frameYVectorLength, 0xffffff, 1.0, 0.25);
            self.getVlabScene().add(activeObjects["frameYArrowHelper"]);
            activeObjects["frameYToframeArrowHelper"] = new THREE.ArrowHelper(frameYFrameDirection.normalize(), framePosY, framePosY.distanceTo(framePos), 0xffff00, 1.0, 0.25);
            self.getVlabScene().add(activeObjects["frameYToframeArrowHelper"]);
        }
*/
        this.process = function()
        {
/*
            activeObjects["slopingSurface"].updateMatrixWorld();
            framePos.setFromMatrixPosition(activeObjects["frame"].matrixWorld);

            var frameDirection = framePos.clone().sub(origin);
            var frameVectorlength = frameDirection.length();

            var frameDirectionFromPulley = framePos.clone().sub(pulleyPos);
            var framePulleyVectorlength = frameDirectionFromPulley.length();

            var framePosY = new THREE.Vector3(0, 0, 0);
            framePosY.y = framePos.y;
            var frameYDirection = framePosY.clone().sub(origin);
            var frameYVectorLength = frameYDirection.length();

            var frameYFrameDirection = framePos.clone().sub(framePosY);

            activeObjects["framePosArrowHelper"].setDirection(frameDirection.normalize());
            activeObjects["framePosArrowHelper"].setLength(frameVectorlength, 1.0, 0.25);

            activeObjects["pulleyToframeArrowHelper"].setDirection(frameDirectionFromPulley.normalize());
            activeObjects["pulleyToframeArrowHelper"].setLength(pulleyPos.distanceTo(framePos), 1.0, 0.25);

            activeObjects["frameYArrowHelper"].setDirection(frameYDirection.normalize());
            activeObjects["frameYArrowHelper"].setLength(frameYVectorLength, 1.0, 0.25);

            activeObjects["frameYToframeArrowHelper"].position.copy(framePosY);
            activeObjects["frameYToframeArrowHelper"].setDirection(frameYFrameDirection.normalize());
            activeObjects["frameYToframeArrowHelper"].setLength(framePosY.distanceTo(framePos), 1.0, 0.25);
*/

            activeObjects["slopingBody"].__dirtyPosition = true;
            activeObjects["slopingBody"].__dirtyRotation = true;
            activeObjects["slopingSurface"].__dirtyRotation = true;
            activeObjects["slopingSurface"].rotation.z -= 0.001;

            pulleyPos = new THREE.Vector3();
            pulleyPos.copy(activeObjects["pulley"].position);
            pulleyPos.y += 0.25;

            framePos = new THREE.Vector3();
            activeObjects["slopingSurface"].updateMatrixWorld();
            framePos.setFromMatrixPosition(activeObjects["frame"].matrixWorld);

            framePosY = new THREE.Vector3(0, 0, 0);
            framePosY.y = framePos.y;

            frameAngle = Math.asin( ( pulleyPos.length() * Math.sin( pulleyPos.angleTo(framePos) ) ) / pulleyPos.distanceTo(framePos));
            frameAngle += (Math.PI / 2) - framePosY.angleTo(framePos);
 
            activeObjects["frame"].rotation.z = -(Math.PI / 2 + activeObjects["slopingSurface"].rotation.z - frameAngle);
            activeObjects["plumb"].rotation.z = -activeObjects["slopingSurface"].rotation.z;
        }

        return this;
    };

    self.plumbScaleZoom = function()
    {
       new ZoomHelper({"sprite": this, "vlab":self, "target":"scale", "zOffset":1.2});
    }

    self.aktakomPowerSupplyZoom = function()
    {
        new ZoomHelper({"sprite": this, "vlab":self, "target":"aktakomPowerSupplyScreen", "zOffset":2.5, "yOffset":-1.0});
    }

    self.button1Pressed = function()
    {
        self.addProcessNode("ropeAnimation", new ropeAnimation());
        self.addProcessNode("slopingSurfaceFrameAnimaiton", new slopingSurfaceFrameAnimaiton());
    };

    self.button1Released = function()
    {
        self.setProcessNodeCompleted("ropeAnimation");
        self.setProcessNodeCompleted("slopingSurfaceFrameAnimaiton");
    };

    self.physijsCollision = function(other_object, linear_velocity, angular_velocity)
    {
        self.trace(this.name + " [collided with] " + other_object.name);
    };

}
