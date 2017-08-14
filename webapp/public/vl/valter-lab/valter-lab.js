"use strict";

function ValterLab(webGLContainer, executeScript)
{
    var self = this;

    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var sceneLoaded = function()
    {
        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var origin = new THREE.Vector3(0, 20, 10);
    var initialDefaultCameraPosVectorLength;

    self.Valter = null;

    var scenePostBuilt = function()
    {
        self.initialCameraPos = new THREE.Vector3(0.0, 22.0, 15.0);

        // PointerLockControls
        // self.pointerLockControlsEnable(self.initialCameraPos);
        // OrbitControls
        self.orbitControlsEnable(self.initialCameraPos, origin, false, true, true);

        activeObjects["floor"] = self.getVlabScene().getObjectByName("floor");
        activeObjects["lampGlass"] = self.getVlabScene().getObjectByName("lampGlass");

        var light = new THREE.AmbientLight(0xecf5ff, 0.05); // soft white light
        self.getVlabScene().add(light);

        var light = new THREE.HemisphereLight(0xecf5ff, 0x000000, 0.15);
        self.getVlabScene().add(light);

        if (self.vlabNature.advanceLighting)
        {
            var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 55.0, 2.5);
            rectLight.matrixAutoUpdate = true;
            rectLight.intensity = 120.0;
            rectLight.position.set(0.0, 39.0, -19.0);
            rectLight.rotation.set(-0.5, 0.0, 0.0);
            // var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
            // rectLight.add(rectLightHelper);
            self.getVlabScene().add(rectLight);

            if (!self.vlabNature.advanceLighting1src)
            {
                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(-27.5, 40, 14.0);
                rectLight.rotation.set(0.0, 1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);

                var rectLight = new THREE.RectAreaLight(0xFFFFFF, undefined, 68.0, 0.4);
                rectLight.matrixAutoUpdate = true;
                rectLight.intensity = 150.0;
                rectLight.position.set(27.5, 40, 14.0);
                rectLight.rotation.set(0.0, -1.57, 0.0);
                var rectLightHelper = new THREE.RectAreaLightHelper(rectLight);
                rectLight.add(rectLightHelper);
                self.getVlabScene().add(rectLight);
            }
        }

        // lens flares
        var textureLoader = new THREE.TextureLoader();
        var textureFlare0 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare0.png");
        var textureFlare1 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare1.png");
        var textureFlare2 = textureLoader.load("/vl/ph-mpd-fcm/scene/textures/lensflares/lensflare2.png");

        var flareColor = new THREE.Color(0xffffff);
        flareColor.setHSL(0.55, 0.9, 1.0);
        var lensFlare = new THREE.LensFlare(textureFlare0, 1000.0, 0.0, THREE.AdditiveBlending, flareColor);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare1, 512, 0.0, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 60, 0.6, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 70, 0.7, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 120, 0.9, THREE.AdditiveBlending);
        lensFlare.add(textureFlare2, 70, 1.0, THREE.AdditiveBlending);

        // lensFlare.customUpdateCallback = function(object)
        // {
        //     var f, fl = object.lensFlares.length;
        //     var flare;
        //     var vecX = -object.positionScreen.x * 2;
        //     var vecY = -object.positionScreen.y * 2;
        //     for( f = 0; f < fl; f++ )
        //     {
        //         flare = object.lensFlares[ f ];
        //         flare.x = object.positionScreen.x + vecX * flare.distance;
        //         flare.y = object.positionScreen.y + vecY * flare.distance;
        //         flare.rotation = 0;
        //     }
        //     object.lensFlares[2].y += 0.025;
        //     object.lensFlares[3].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad(45);
        // };

        lensFlare.position.copy(activeObjects["lampGlass"].position);
        lensFlare.position.y -= 1.35;

        self.getVlabScene().add(lensFlare);

        // Valter
        self.Valter = new Valter(self, new THREE.Vector3(0, 0, 5), true, executeScript);

        // this VLab constants

        initialDefaultCameraPosVectorLength = self.getDefaultCameraPosition().length();

        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("frontWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("leftWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rightWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWall"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWallDoorBigPart"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("rearWallDoorSmallPart"));
        self.addMeshToCollidableMeshList(self.getVlabScene().getObjectByName("standPanel"));

        // actually start VLab
        self.setPhysijsScenePause(false);
        self.setSceneRenderPause(false);

        self.getVlabScene().getObjectByName("screwHead1").visible = false;
        self.getVlabScene().getObjectByName("screwHead2").visible = false;

        // Add dev manipulation controls
        // var control = new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement);
        // control.addEventListener("change", function(){
        //                             //console.log(this.model.position);
        //                             if (self.pressedKey == 82) //r
        //                             {
        //                                 if (control.getMode() != "rotate")
        //                                 {
        //                                     control.setMode("rotate");
        //                                 }
        //                             }
        //                             if (self.pressedKey == 84) //t
        //                             {
        //                                 if (control.getMode() != "translate")
        //                                 {
        //                                     control.setMode("translate");
        //                                 }
        //                             }
        //                             console.log("Position: ", self.getVlabScene().getObjectByName("screwHead2").position);
        //                         }.bind(self));
        // control.attach(self.getVlabScene().getObjectByName("screwHead2"));
        // control.setSize(1.0);
        // self.getVlabScene().add(control);
    };

    var simulationStep = function()
    {
    };

    self.cameraControlsEvent = function()
    {
        if (!self.getSceneRenderPause())
        {
        }
    };

    //this VLab is ready to be initialized
    $.getJSON("/vl/valter-lab/valter-lab.json", function(jsonObj) {
        VLab.apply(self, [jsonObj]);
        self.initialize(webGLContainer);
    });

    return this;
}
