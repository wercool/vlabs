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

    var scenePostBuilt = function()
    {
        activeObjects["slopingSurface"] = self.getVlabScene().getObjectByName("slopingSurface");
        activeObjects["slopingBody"] = self.getVlabScene().getObjectByName("slopingBody");
        self.setSceneRenderPause(false);
    };

    var simulationStep = function()
    {
        if (!self.getPhysijsScenePause())
        {
            activeObjects["slopingSurface"].__dirtyRotation = true;
            activeObjects["slopingSurface"].rotation.z -= 0.001;
        }

        for (var processNodeName in self.processNodes)
        {
            if (self.processNodes[processNodeName].completed)
            {
                delete self.processNodes[processNodeName];
            }
            else
            {
                self.processNodes[processNodeName].process();
            }
        }
    }

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
        self.setPhysijsScenePause(false);
        self.trace(this.name + " is pressed");
        this.released = false;
    };

    self.button1Released = function()
    {
        if (!this.released)
        {
            self.trace(this.name + " is released " + (this.releasedOutside ? "outside" : ""));
        }
        delete this.releasedOutside;
        this.released = true;
    };

    self.slopingBodyCollision = function(other_object, linear_velocity, angular_velocity)
    {
        self.trace(this.name + " [collided with] " + other_object.name);
    };

    self.slopingSurfaceCollision = function(other_object, linear_velocity, angular_velocity)
    {
        self.trace(this.name + " [collided with] " + other_object.name);
    };

}
