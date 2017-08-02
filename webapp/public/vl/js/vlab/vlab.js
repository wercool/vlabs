"use strict";

function VLab(vlabNature)
{
    var self = this;
    var logging = true;

    self.vlabNature = vlabNature;

    // DOM container element
    var webglContainerDOM = null;
    // JQuery container object
    var webglContainer = null;

    var webglContainerWidth = null;
    var webglContainerHeight = null;

    var webGLStatistics = null;
    var physijsStatistics = null;

    self.WebGLRenderer = null;
    var sceneRenderPause = true;
    var physijsScenePause = true;

    self.initialCameraPos = null;

    var pointerLockControls = false;
    var orbitControls = false;
    var initialOrbitControlTarget = undefined;
    var initialOrbitControlCameraPos = undefined;

    var vlabInitializedEvent = new Event("vlabInitialized");
    var sceneLoadedEvent     = new Event("sceneLoaded");
    var sceneBuiltEvent      = new Event("sceneBuilt");
    var simulationStepEvent  = new Event("simulationStep");

    var vlabScene = null;
    var vlabPhysijsSceneReady = false;

    var defaultCamera = null;

    var meshObjects = {};
    var lights = [];
    var maps = {};

    var mouseCoords = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var mouseDownEvent = null;
    var mouseUpEvent = null;

    self.pressedKey = null;

    self.clickResponsiveObjects = [];
    self.hoverResponsiveObjects = [];

    var intersectedObject     = null;
    var intersectedObjectName = "";
    var objectsToBeReleasedNotStrictly = {};

    var tooltipDiv = null;

    var processNodes = {};

    var collidableMeshList = [];

    self.interactionHelpers = {};

    self.trace = function(error)
    {
        if (logging)
        {
            console.log.apply(console, arguments);
        }
    };

    self.error = function()
    {
        if (logging)
        {
            console.error.apply(console, arguments);
        }
    };

    self.initialize = function(webglContainerId)
    {
        webglContainerDOM = document.getElementById(webglContainerId);
        if (webglContainerDOM == null)
        {
            UNotification("No WebGL container DOM element is defined!");
            return;
        }
        var webGlDetection = UDetectWebGL(self);
        if(!webGlDetection[0])
        {
            UNotification(webGlDetection[1]);
            return;
        }

        webglContainer = $("#" + webglContainerDOM.id);

        self.WebGLRenderer = new THREE.WebGLRenderer({
                                                      alpha: (self.vlabNature.canvasAlphaBuffer != undefined) ? self.vlabNature.canvasAlphaBuffer : false,
                                                      antialias: (self.vlabNature.antialias != undefined) ? self.vlabNature.antialias : false
                                                     });
//        self.WebGLRenderer.setClearColor(0xbababa);
        self.WebGLRenderer.setClearColor(0x000000);
        self.WebGLRenderer.setFaceCulling(THREE.CullFaceNone);
        self.WebGLRenderer.setPixelRatio(window.devicePixelRatio);
        self.WebGLRenderer.setSize(webglContainer.width(), webglContainer.height() );
        if (self.vlabNature.shadows)
        {
            self.WebGLRenderer.shadowMap.enabled                = true;
            self.WebGLRenderer.shadowMapSoft                    = true;
            self.WebGLRenderer.shadowMap.type                   = THREE.PCFSoftShadowMap;
        }


        // self.WebGLRenderer.gammaInput = true;
        // self.WebGLRenderer.gammaOutput = true;

        webglContainer.append(self.WebGLRenderer.domElement);

        if (self.vlabNature.showStatistics)
        {
            webGLStatistics = new Stats();
            webglContainer.append(webGLStatistics.domElement);
            webGLStatistics.domElement.style.zIndex = 100;
            $(webGLStatistics.domElement).css("top", webglContainer.offset().top);
            $(webGLStatistics.domElement).css("left", webglContainer.offset().left);

            if (self.vlabNature.isPhysijsScene)
            {
                physijsStatistics = new Stats();
                physijsStatistics.domElement.style.zIndex = 100;
                webglContainer.append(physijsStatistics.domElement);
                $(physijsStatistics.domElement).css("top", webglContainer.offset().top + 50);
                $(physijsStatistics.domElement).css("left", webglContainer.offset().left);
            }
        }

        var webGlCanvasContextCheck = UCheckWebGLCanvasContext(self);
        if(!webGlCanvasContextCheck[0])
        {
            UNotification(webGlCanvasContextCheck[1]);
            return;
        }

        defaultCamera = new THREE.PerspectiveCamera(70, webglContainer.width() / webglContainer.height(), 0.1, 200);

        webglContainerDOM.addEventListener("mousemove", mouseMove, false);
        webglContainerDOM.addEventListener("mousedown", mouseDown, false);
        webglContainerDOM.addEventListener("mouseup", mouseUp, false);

        $(window).on("resize", webglContainerResized);
        $(window).keydown(onKeyDown);
        $(window).keyup(onKeyUp);

        self.webglContainerWidth  = webglContainer.width() - webglContainer.offset().left;
        self.webglContainerHeight = webglContainer.height() - webglContainer.offset().top;

        if (self.vlabNature.isPhysijsScene)
        {
            Physijs.scripts.worker = "/vl/js/physijs_worker.js";
            Physijs.scripts.ammo = "ammo.js";
            vlabScene = new Physijs.Scene({fixedTimeStep: 1 / 120});
            vlabScene.setGravity(new THREE.Vector3( 0, -30, 0 ));

            if (self.vlabNature.isPhysijsScene)
            {
                vlabScene.addEventListener(
                    "update",
                    function()
                    {
                        self.vlabPhysijsSceneReady = true;
                    }
                );
            }
        }
        else
        {
            vlabScene = new THREE.Scene();
        }


        if (self.vlabNature.showAxis)
        {
            var axisHelper = new THREE.AxisHelper(100.0);
            vlabScene.add(axisHelper);
        }

        if (self.vlabNature.showTooltips)
        {
            // tooltip
            tooltipDiv = $("<div id='tooltipDiv' class='tooltip'></div>");
            webglContainer.append(tooltipDiv);
            tooltipDiv.hide();
        }

        render();

        dispatchEvent(vlabInitializedEvent);

        if (self.vlabNature.sceneFile != undefined)
        {
            loadScene(self.vlabNature.sceneFile);
        }
        else
        {
            dispatchEvent(sceneBuiltEvent);
        }
    };

    var loadScene = function(sceneFile)
    {
        var loader = new THREE.ColladaLoader();
        loader.options.convertUpAxis = true;
        loader.load(sceneFile, onSceneLoaded, onSceneLoadProgress);
    };

    self.appendScene = function(appendSceneFile, callback)
    {
        var loader = new THREE.ColladaLoader();
        loader.options.convertUpAxis = true;
        var seneAppendedHandler = function(collada){
            var appendedMeshObjects = onSceneAppended(collada);
            callback(appendedMeshObjects);
        };
        loader.load(appendSceneFile, seneAppendedHandler, onSceneLoadProgress);
    };

    var onSceneLoaded = function(collada)
    {
        // fix transparent materials
        for (var effectName in collada.dae.effects)
        {
            if(collada.dae.effects[effectName].shader.transparent != undefined)
            {
                collada.dae.effects[effectName].shader.material.transparent = true;
                collada.dae.effects[effectName].shader.material.opacity = collada.dae.effects[effectName].shader.transparent.color.a;
            }
        }

        var sceneObject = collada.scene;
        sceneObject.traverse(function(object){
            if(object.type == "Object3D")
            {
                var position = new THREE.Vector3();
                position.copy(object.position);

                if (object.children[0].type == "Mesh")
                {
                    colladaObject3DToMeshObject(meshObjects, object);
                }
                else if (object.children[0].type == "PointLight")
                {
                    var light = object.children[0];

                    light.name = object.name;
                    light.position.copy(position);

                    lights.push(light);
                }
            }
        });

        if(self.vlabNature.maps != undefined)
        {
            if (self.vlabNature.maps.length > 0)
            {
                loadMaps();
                return;
            }
        }
        dispatchEvent(sceneLoadedEvent);
    };

    var onSceneAppended = function(collada)
    {
        var appendedMeshObjects = {};
        var sceneObject = collada.scene;
        sceneObject.traverse(function(object){
            if(object.type == "Object3D")
            {
                colladaObject3DToMeshObject(appendedMeshObjects, object);
            }
        });
        prepareRootObjects(appendedMeshObjects);
        return appendedMeshObjects;
    };

    var onSceneLoadProgress = function(request)
    {
        self.trace(Math.round(request.loaded/request.total) * 100 + "%", "[" + request.loaded + "/" + request.total + "]");
    };

    var loadMaps = function()
    {
        var mapObj = self.vlabNature.maps.pop();
        var loader = new THREE.TextureLoader();
        loader.load(
                    mapObj.url,
                    function(texture)
                    {
                        maps[mapObj.name] = texture;
                        if (self.vlabNature.maps.length > 0)
                        {
                            loadMaps();
                        }
                        else
                        {
                            dispatchEvent(sceneLoadedEvent);
                        }
                    }
        );
    }

    this.buildScene = function()
    {
        prepareRootObjects(meshObjects);

        // add root meshes to the scene
        for (var meshObjectName in meshObjects)
        {
            if(meshObjects[meshObjectName].isRoot)
            {
                if (self.vlabNature.physijs != undefined)
                {
                    if (self.vlabNature.physijs[meshObjectName] != undefined)
                    {
                        var physijsMesh;
                        var position = new THREE.Vector3();
                        var quaternion = new THREE.Quaternion();
                        quaternion.copy(meshObjects[meshObjectName].mesh.quaternion);
                        position.copy(meshObjects[meshObjectName].mesh.position);

                        var physijsMaterial = Physijs.createMaterial(
                            meshObjects[meshObjectName].mesh.material,
                            self.vlabNature.physijs[meshObjectName].friction,
                            self.vlabNature.physijs[meshObjectName].restitution
                        );

                        switch (self.vlabNature.physijs[meshObjectName].shape)
                        {
                            case "BoxMesh":
                                physijsMesh = new Physijs.BoxMesh(
                                                        meshObjects[meshObjectName].mesh.geometry,
                                                        physijsMaterial
                                                    );
                            break;
                            case "ConvexMesh":
                                physijsMesh = new Physijs.ConvexMesh(
                                                        meshObjects[meshObjectName].mesh.geometry,
                                                        physijsMaterial
                                                    );
                            break;
                            case "ConcaveMesh":
                                physijsMesh = new Physijs.ConcaveMesh(
                                                        meshObjects[meshObjectName].mesh.geometry,
                                                        physijsMaterial
                                                    );
                            break;
                        }
                        physijsMesh.quaternion.copy(quaternion);
                        physijsMesh.position.copy(position);
                        physijsMesh.name = meshObjectName;
                        physijsMesh.mass = self.vlabNature.physijs[meshObjectName].mass;

                        // add child meshesh to newly created Physijs Mesh
                        if(meshObjects[meshObjectName].childMeshes.length > 0)
                        {
                            for (var childMeshName in meshObjects[meshObjectName].childMeshes)
                            {
                                physijsMesh.add(meshObjects[meshObjects[meshObjectName].childMeshes[childMeshName]].mesh);
                            }
                        }
                        if (self.vlabNature.physijs[meshObjectName].collision != undefined)
                        {
                            var collisionCallback = eval("self." + self.vlabNature.physijs[meshObjectName].collision);
                            if (typeof collisionCallback === "function")
                            {
                                physijsMesh.addEventListener("collision", collisionCallback);
                            }
                            else
                            {
                                self.error("Collision callback [" +
                                            self.vlabNature.physijs[meshObjectName].collision +
                                            "] for the [" + meshObjectName + "] mesh is defined in VLab nature, but not implemented in VLab");
                            }
                        }

                        vlabScene.add(physijsMesh);
                    }
                    else
                    {
                        vlabScene.add(meshObjects[meshObjectName].mesh);
                    }
                }
                else
                {
                    vlabScene.add(meshObjects[meshObjectName].mesh);
                }
            }
        }
        // add lights
        for (var i = 0; i < lights.length; i++)
        {
            if (self.vlabNature.shadows)
            {
                if (self.vlabNature.castShadows.indexOf(lights[i].name) > -1)
                {
                    lights[i].castShadow = true;
                    lights[i].shadow.bias = 0.0001;
                    lights[i].shadow.mapSize.width  = self.vlabNature.shadowsMapSize;
                    lights[i].shadow.mapSize.height = self.vlabNature.shadowsMapSize;
                }
            }
            vlabScene.add(lights[i]);
        }

        vlabScene.traverse (function (object)
        {
            if (object.type == "Mesh")
            {
                // manage shadows
                if (self.vlabNature.shadows)
                {
                    if (!self.vlabNature.forceShadows)
                    {
                        if (self.vlabNature.castShadows.indexOf(object.name) > -1)
                        {
                            object.castShadow = true;
                        }
                        if (self.vlabNature.receiveShadows.indexOf(object.name) > -1)
                        {
                            object.receiveShadow = true;
                        }
                    }
                    else
                    {
                        object.castShadow = true;
                        object.receiveShadow = true;
                        if (self.vlabNature.castShadowsExecptions.indexOf(object.name) > -1)
                        {
                            object.castShadow = false;
                        }
                        if (self.vlabNature.receiveShadowsExecptions.indexOf(object.name) > -1)
                        {
                            object.receiveShadow = false;
                        }
                    }
                }
                //manage double side
                if (typeof self.vlabNature.doubleSide !== "undefined")
                {
                    if (self.vlabNature.doubleSide.indexOf(object.name) > -1)
                    {
                        object.material.side = THREE.DoubleSide;
                    }
                }
                // add interactors to objects
                if (self.vlabNature.interactors != undefined)
                {
                    if (self.vlabNature.interactors[object.name] != undefined)
                    {
                        addInteractorToObject(object);
                    }
                }
            }
        });

        // interaction helpers
        if (self.vlabNature.interactionHelpers != undefined)
        {
            for (var interactionHelperName in self.vlabNature.interactionHelpers)
            {
                if (vlabScene.getObjectByName(self.vlabNature.interactionHelpers[interactionHelperName].parent) != undefined) // check parent for helpers existence
                {
                    var spriteMaterial = new THREE.SpriteMaterial(
                    {
                        map: maps[self.vlabNature.interactionHelpers[interactionHelperName].map],
                        color: ((self.vlabNature.interactionHelpers[interactionHelperName].color != undefined) ? parseInt(self.vlabNature.interactionHelpers[interactionHelperName].color) : 0xffffff),
                        blending: THREE.AdditiveBlending
                    });

                    if (self.vlabNature.interactionHelpers[interactionHelperName].opacity != undefined)
                    {
                        spriteMaterial.transparent = true;
                        spriteMaterial.opacity = self.vlabNature.interactionHelpers[interactionHelperName].opacity;
                        spriteMaterial.blending = THREE.NormalBlending;
                    }

                    var sprite = new THREE.Sprite(spriteMaterial);

                    if (self.vlabNature.interactionHelpers[interactionHelperName].scale != undefined)
                    {
                        sprite.scale.set(self.vlabNature.interactionHelpers[interactionHelperName].scale.x,
                                         self.vlabNature.interactionHelpers[interactionHelperName].scale.y, 1.0);
                    }
                    if (self.vlabNature.interactionHelpers[interactionHelperName].offset != undefined)
                    {
                        sprite.position.set(self.vlabNature.interactionHelpers[interactionHelperName].offset.x,
                                            self.vlabNature.interactionHelpers[interactionHelperName].offset.y,
                                            self.vlabNature.interactionHelpers[interactionHelperName].offset.z);
                    }
                    sprite.name = interactionHelperName;
                    sprite.visible = self.vlabNature.interactionHelpers[interactionHelperName].visible;
                    addInteractorToObject(sprite);
                    vlabScene.getObjectByName(self.vlabNature.interactionHelpers[interactionHelperName].parent).add(sprite);

                    self.interactionHelpers[interactionHelperName] = sprite;
                }
                else
                {
                    self.error("Non-existing parent object [" + self.vlabNature.interactionHelpers[interactionHelperName].parent + "] is defined in VLab nature for " + interactionHelperName + " interaction helper");
                }
            }
        }

        dispatchEvent(sceneBuiltEvent);
    }

    var colladaObject3DToMeshObject = function(meshObjectsRef, object3D)
    {
        var position = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();
        quaternion.copy(object3D.quaternion);
        position.copy(object3D.position);

        if (object3D.children[0].type == "Mesh")
        {
            var mesh = object3D.children[0];
            mesh.name = object3D.name;
            if (mesh.material.bumpMap != null && mesh.material.bumpMap != undefined)
            {
                var nameWithParameters = mesh.material.name.split("_");
                var bumpScale = parseFloat(nameWithParameters[2] + '.' + nameWithParameters[3]);
                mesh.material.bumpScale = bumpScale;
            }
            mesh.quaternion.copy(quaternion);
            mesh.position.copy(position);

            if (meshObjectsRef[mesh.name] == undefined)
            {
                meshObjectsRef[mesh.name] = new Object();
                meshObjectsRef[mesh.name].isRoot = true;
            }

            meshObjectsRef[mesh.name].mesh = mesh;
            meshObjectsRef[mesh.name].childMeshes = [];

            for (var i = 1; i < object3D.children.length; i++)
            {
                if (meshObjectsRef[object3D.children[i].name] == undefined)
                {
                    meshObjectsRef[object3D.children[i].name] = new Object();
                    meshObjectsRef[object3D.children[i].name].isRoot = false;
                }
                meshObjectsRef[mesh.name].childMeshes.push(object3D.children[i].name);
            }
        }
    };

    var prepareRootObjects = function(meshObjects)
    {
        // add children meshes to root meshes
        for (var meshObjectName in meshObjects)
        {
            if(meshObjects[meshObjectName].childMeshes.length > 0)
            {
                for (var childMeshName in meshObjects[meshObjectName].childMeshes)
                {
                    meshObjects[meshObjectName].mesh.add(meshObjects[meshObjects[meshObjectName].childMeshes[childMeshName]].mesh);
                }
            }
        }
    };

    var render = function(time)
    {
        if (!sceneRenderPause)
        {
            self.WebGLRenderer.clear();
            self.WebGLRenderer.render(vlabScene, defaultCamera);
            requestAnimationFrame(render);
            if (webGLStatistics != null)
            {
                webGLStatistics.update();
            }
            if ((self.vlabNature.isPhysijsScene && self.vlabPhysijsSceneReady) || !self.vlabNature.isPhysijsScene)
            {
                process();
                if (self.vlabNature.isPhysijsScene)
                {
                    if (!physijsScenePause)
                    {
                        vlabScene.simulate(undefined, 1);
                        self.vlabPhysijsSceneReady = false;
                        if (physijsStatistics != null)
                        {
                            physijsStatistics.update();
                        }
                    }
                }
            }

            TWEEN.update(time);

            if (pointerLockControls === true)
            {
                self.getDefaultCamera().controls.update();
            }
        }
        else
        {
            setTimeout(function(){ render(); }, 100);
        }
    };

    var process = function()
    {
        if (mouseDownEvent != null)
        {
            processMouseDown();
        }
        if (mouseUpEvent != null)
        {
            processMouseUp();
        }
        if ((self.vlabNature.isPhysijsScene && self.vlabPhysijsSceneReady) || !self.vlabNature.isPhysijsScene)
        {
            dispatchEvent(simulationStepEvent);
            for (var processNodeName in processNodes)
            {
                if (processNodes[processNodeName].completed)
                {
                    delete processNodes[processNodeName];
                }
                else
                {
                    processNodes[processNodeName].process();
                }
            }
        }
    }

    self.setVlabScene = function(scene)
    {
        vlabScene = scene;
        if (self.vlabNature.isPhysijsScene)
        {
            vlabScene.addEventListener(
                "update",
                function()
                {
                    self.vlabPhysijsSceneReady = true;
                }
            );
        }
    };

    var webglContainerResized = function(event)
    {
        if (self.webglContainerWidth != (webglContainer.width() - webglContainer.offset().left)
            ||
            self.webglContainerHeight != (webglContainer.height() - webglContainer.offset().top))
        {
            defaultCamera.aspect = webglContainer.width() / webglContainer.height();
            defaultCamera.updateProjectionMatrix();
            self.WebGLRenderer.setSize(webglContainer.width(), webglContainer.height());
        }
        self.webglContainerWidth  = webglContainer.width() - webglContainer.offset().left;
        self.webglContainerHeight = webglContainer.height() - webglContainer.offset().top;
        if (self.vlabNature.showStatistics)
        {
            $(webGLStatistics.domElement).css("top", webglContainer.offset().top);
            $(webGLStatistics.domElement).css("left", webglContainer.offset().left);
            if (self.vlabNature.isPhysijsScene)
            {
                $(physijsStatistics.domElement).css("top", webglContainer.offset().top + 50);
                $(physijsStatistics.domElement).css("left", webglContainer.offset().left);
            }
        }
    };

    var mouseMove = function(event)
    {
        event.preventDefault();
        mouseCoords.set(((event.clientX - webglContainer.offset().left) / webglContainer.width()) * 2 - 1,
                        1 -((event.clientY - webglContainer.offset().top) / webglContainer.height()) * 2);
        raycaster.setFromCamera(mouseCoords, defaultCamera);
        var intersects = raycaster.intersectObjects(self.hoverResponsiveObjects);

        if (intersects.length > 0)
        {
            if (self.intersectedObjectName != intersects[0].object.name)
            {
                self.intersectedObject = intersects[0].object;
                self.intersectedObjectName = self.intersectedObject.name;
                if (self.intersectedObject.active)
                {
                    webglContainerDOM.style.cursor = 'pointer';
                }

                if (self.vlabNature.showTooltips)
                {
                    if (self.intersectedObject.tooltip != undefined)
                    {
                        var tooltipPosition = toScreenPosition(self.intersectedObject);
                        tooltipDiv.text(self.intersectedObject.tooltip);
                        tooltipDiv.show();
                        tooltipDiv.css({left: tooltipPosition.x + 10, top: tooltipPosition.y - 30});
                    }
                }
            }
        }
        else
        {
            webglContainerDOM.style.cursor = 'auto';

            if (self.intersectedObjectName != null)
            {
                self.intersectedObject = null;
                self.intersectedObjectName = null;

                if (self.vlabNature.showTooltips)
                {
                    tooltipDiv.text("");
                    tooltipDiv.hide();
                }
            }

            for (var objectName in objectsToBeReleasedNotStrictly)
            {
                objectsToBeReleasedNotStrictly[objectName].releasedOutside = true;
                objectsToBeReleasedNotStrictly[objectName].release();
                delete objectsToBeReleasedNotStrictly[objectName];
            }
        }
    };

    var mouseDown = function(event)
    {
        event.preventDefault();
        mouseCoords.set(((event.clientX - webglContainer.offset().left) / webglContainer.width()) * 2 - 1,
                        1 -((event.clientY - webglContainer.offset().top) / webglContainer.height()) * 2);
        mouseDownEvent = event;
    };

    var mouseUp = function(event)
    {
        event.preventDefault();
        mouseCoords.set(((event.clientX - webglContainer.offset().left) / webglContainer.width()) * 2 - 1,
                        1 -((event.clientY - webglContainer.offset().top) / webglContainer.height()) * 2);
        mouseUpEvent = event;
        self.getDefaultCamera().controls.enabled = true;
    };

    var onKeyDown = function(event)
    {
        self.pressedKey = event.keyCode;
    };

    var onKeyUp = function(event)
    {
        self.pressedKey = null;
    };

    var processMouseDown = function()
    {
        if (mouseDownEvent != null)
        {
            raycaster.setFromCamera(mouseCoords, defaultCamera);
            var intersects = raycaster.intersectObjects(self.clickResponsiveObjects);
            if (intersects.length > 0)
            {
                var pressedObject = intersects[0].object;

                if (typeof pressedObject.press === "function")
                {
                    pressedObject.press(mouseDownEvent);
                }
                if (typeof pressedObject.release === "function" && !pressedObject.strictRelease)
                {
                    objectsToBeReleasedNotStrictly[pressedObject.name] = pressedObject;
                }
                self.getDefaultCamera().controls.enabled = false;
            }
            mouseDownEvent = null;
        }
    };

    var processMouseUp = function()
    {
        if (mouseUpEvent != null)
        {
            raycaster.setFromCamera(mouseCoords, defaultCamera);
            var intersects = raycaster.intersectObjects(self.clickResponsiveObjects);
            if (intersects.length > 0)
            {
                var releasedObject = intersects[0].object;

                if (typeof releasedObject.release === "function")
                {
                    releasedObject.release(mouseUpEvent);
                    delete objectsToBeReleasedNotStrictly[releasedObject.name];
                }
            }
            mouseUpEvent = null;
        }
    };

    var addInteractorToObject = function(object)
    {
        if (self.vlabNature.interactors[object.name] == undefined)
        {
            return;
        }
        object.active = self.vlabNature.interactors[object.name].active;
        if (self.vlabNature.interactors[object.name].tooltip != undefined)
        {
            object.tooltip = self.vlabNature.interactors[object.name].tooltip;
        }
        self.hoverResponsiveObjects.push(object);
        if (object.active)
        {
            self.clickResponsiveObjects.push(object);
            if (self.vlabNature.interactors[object.name].press != undefined)
            {
                var objectMousePressCallback = eval("self." + self.vlabNature.interactors[object.name].press.callback);
                if (typeof objectMousePressCallback === "function")
                {
                    if (self.vlabNature.interactors[object.name].press.arguments != undefined)
                    {
                        object.press = partial(objectMousePressCallback, self.vlabNature.interactors[object.name].press.arguments);
                    }
                    else
                    {
                        object.press = objectMousePressCallback;
                    }
                }
                else
                {
                    self.error("MousePress callback [" +
                                self.vlabNature.interactors[object.name].press.callback +
                                "] for [" + object.name + "] object is defined in VLab nature, but not implemented in VLab");
                }
            }
            if (self.vlabNature.interactors[object.name].release != undefined)
            {
                var objectMouseReleaseCallback = eval("self." + self.vlabNature.interactors[object.name].release.callback);
                if (typeof objectMouseReleaseCallback === "function")
                {
                    if (self.vlabNature.interactors[object.name].release.arguments != undefined)
                    {
                        object.release = partial(objectMouseReleaseCallback, self.vlabNature.interactors[object.name].release.arguments);
                    }
                    else
                    {
                        object.release = objectMouseReleaseCallback;
                    }
                    if (self.vlabNature.interactors[object.name].release.strict != undefined)
                    {
                        object.strictRelease = self.vlabNature.interactors[object.name].release.strict;
                    }
                    else
                    {
                        object.strictRelease = false;
                    }
                }
                else
                {
                    self.error("MouseRelease callback [" +
                                self.vlabNature.interactors[object.name].release.callback +
                                "] for [" + object.name + "] object is defined in VLab nature, but not implemented in VLab");
                }
            }
        }
    };

    self.pointerLockControlsEnable = function(initialPosition, autoActivate)
    {
        orbitControls = false;
        self.getDefaultCamera().controls.dispose();
        self.getDefaultCamera().controls = null;

        var curCameraPos  = self.getDefaultCameraPosition().clone();
        var curCameraQuat = self.getDefaultCameraQuaternion().clone();

        self.getDefaultCamera().controls = new THREE.PointerLockControls(self, self.getDefaultCamera());
        if (autoActivate === true)
        {
            self.getDefaultCamera().controls.pointerLock();
        }

        self.getDefaultCamera().controls.getObject().position.copy(self.initialCameraPos);
        self.getDefaultCamera().controls.getObstacleAvoidanceObject().position.copy(self.initialCameraPos);
        self.getVlabScene().add(self.getDefaultCamera().controls.getObject());
        self.getVlabScene().add(self.getDefaultCamera().controls.getObstacleAvoidanceObject());

        self.getDefaultCamera().controls.getYawObject().position.x = curCameraPos.x;
        self.getDefaultCamera().controls.getYawObject().position.z = curCameraPos.z;

        self.getDefaultCamera().controls.getYawObject().quaternion.y = curCameraQuat.y;
        self.getDefaultCamera().controls.getPitchObject().quaternion.x = curCameraQuat.x;

        pointerLockControls = true;
    };

    self.orbitControlsEnable = function(cameraPos, targetPos, initOnly, test, keepPoiterLockLastPosition)
    {
        if(self.orbitControlsEnable.testMode == undefined)
        {
            self.orbitControlsEnable.testMode = test;
        }
        if(self.orbitControlsEnable.keepPoiterLockLastPosition == undefined)
        {
            self.orbitControlsEnable.keepPoiterLockLastPosition = keepPoiterLockLastPosition;
        }

        if (initialOrbitControlTarget == undefined && targetPos != undefined)
        {
            initialOrbitControlTarget = targetPos;
        }

        if (initialOrbitControlCameraPos == undefined && cameraPos != undefined)
        {
            initialOrbitControlCameraPos = cameraPos;
        }
        if (initOnly === true)
        {
            return;
        }

        var lastCameraPositionInPointerLockMode = undefined;
        if (pointerLockControls === true)
        {
            pointerLockControls = false;
            self.getDefaultCamera().controls.dispose();
            self.getDefaultCamera().controls = null;
            self.getDefaultCamera().parent = null;
            lastCameraPositionInPointerLockMode = self.getVlabScene().getObjectByName("pointerControlYawObject").position.clone();
            self.getVlabScene().remove(self.getVlabScene().getObjectByName("obstacleAvoidanceGizmo"));
            self.getVlabScene().remove(self.getVlabScene().getObjectByName("pointerControlPitchObject"));
            self.getVlabScene().remove(self.getVlabScene().getObjectByName("pointerControlYawObject"));
        }

        if (self.orbitControlsEnable.keepPoiterLockLastPosition === true)
        {
            if (typeof lastCameraPositionInPointerLockMode !== "undefined")
            {
                self.setDefaultCameraPosition(lastCameraPositionInPointerLockMode);
            }
            else
            {
                self.setDefaultCameraPosition(initialOrbitControlCameraPos);
            }
        }
        else
        {
            self.setDefaultCameraPosition(initialOrbitControlCameraPos);
        }

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM(), self);
        if (initialOrbitControlTarget != undefined)
        {
            if (self.orbitControlsEnable.keepPoiterLockLastPosition === true)
            {
                if (typeof lastCameraPositionInPointerLockMode !== "undefined")
                {
                    self.getDefaultCamera().controls.setTarget(lastCameraPositionInPointerLockMode);
                }
                else
                {
                    self.getDefaultCamera().controls.setTarget(initialOrbitControlTarget);
                }
            }
            else
            {
                self.getDefaultCamera().controls.setTarget(initialOrbitControlTarget);
            }
        }

        self.getDefaultCamera().controls.addEventListener("change", self.cameraControlsEvent);
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        if (self.orbitControlsEnable.testMode === true)
        {
            console.log("Camera Orbit Controls is in test mode");
            self.getDefaultCamera().controls.testMode = true;
        }
        // user mode
        if (self.orbitControlsEnable.testMode === true)
        {
            self.getDefaultCamera().controls.minDistance = 0.5;
            self.getDefaultCamera().controls.maxDistance = 50;
            self.getDefaultCamera().controls.maxPolarAngle = Math.PI * 2;
            self.getDefaultCamera().controls.minPolarAngle = 0.0;
            self.getDefaultCamera().controls.maxXPan    = 50;
            self.getDefaultCamera().controls.minXPan    = 0.5;
            self.getDefaultCamera().controls.maxYPan    = 50;
            self.getDefaultCamera().controls.minYPan    = 0.5;
        }
        else
        {
            self.getDefaultCamera().controls.minDistance = 5;
            self.getDefaultCamera().controls.maxDistance = 15;
            self.getDefaultCamera().controls.maxPolarAngle = Math.PI / 2 - 0.2;
            self.getDefaultCamera().controls.minPolarAngle = 0.75;
            self.getDefaultCamera().controls.maxXPan    = initialOrbitControlTarget.x + 3;
            self.getDefaultCamera().controls.minXPan    = initialOrbitControlTarget.x - 3;
            self.getDefaultCamera().controls.maxYPan    = initialOrbitControlTarget.y + 2;
            self.getDefaultCamera().controls.minYPan    = initialOrbitControlTarget.y;
        }
        self.getDefaultCamera().controls.update();

        orbitControls = true;
    };

    var toScreenPosition = function(obj)
    {
        var vector = new THREE.Vector3();

        var widthHalf = 0.5 * (self.webglContainerWidth + webglContainer.offset().left);
        var heightHalf = 0.5 * (self.webglContainerHeight + webglContainer.offset().top);

        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.project(defaultCamera);

        vector.x = (vector.x * widthHalf) + widthHalf + webglContainer.offset().left;
        vector.y = - (vector.y * heightHalf) + heightHalf + webglContainer.offset().top;

        return {
            x: vector.x,
            y: vector.y
        };
    };

    self.getWebglContainerDOM = function(){return webglContainerDOM};
    self.getWebglContainer = function(){return webglContainer};
    self.getVlabScene = function(){return vlabScene};
    self.getDefaultCamera = function(){return defaultCamera};
    self.getDefaultCameraObject = function()
    {
        if (self.getDefaultCamera().parent === null)
        {
            return self.getDefaultCamera();
        }
        if (self.getDefaultCamera().parent.parent.type == "Object3D")
        {
            return self.getDefaultCamera().parent.parent;
        }
    };
    self.getDefaultCameraPosition = function()
    {
        if (self.getDefaultCamera().parent === null)
        {
            return self.getDefaultCamera().position;
        }
        if (self.getDefaultCamera().parent.parent.type == "Object3D")
        {
            return self.getDefaultCamera().parent.parent.position;
        }
    };
    self.getDefaultCameraQuaternion = function()
    {
        if (self.getDefaultCamera().parent === null)
        {
            return self.getDefaultCamera().quaternion;
        }
        if (self.getDefaultCamera().parent.parent.type == "Object3D")
        {
            return self.getDefaultCamera().parent.parent.quaternion;
        }
    };
    self.setDefaultCameraPosition = function(pos)
    {
        if (self.getDefaultCamera().parent === null)
        {
            self.getDefaultCamera().position.copy(pos);
        }
        else if (self.getDefaultCamera().parent.parent.type == "Object3D")
        {
            self.getDefaultCamera().parent.parent.position.copy(pos);
        }
    };
    self.setDefaultCameraQuaternion = function(quaternion)
    {
        if (self.getDefaultCamera().parent === null)
        {
            self.getDefaultCamera().quaternion.copy(quaternion);
        }
        else if (self.getDefaultCamera().parent.parent.type == "Object3D")
        {
            self.getDefaultCamera().parent.parent.quaternion.copy(quaternion);
        }
    };
    self.setSceneRenderPause = function(pause)
    {
        sceneRenderPause = pause;
        if (self.vlabNature.isPhysijsScene)
        {
            vlabScene.simulate();
        }
    };
    self.getSceneRenderPause = function(){return sceneRenderPause};
    self.setPhysijsScenePause = function(state){physijsScenePause = state};
    self.getPhysijsScenePause = function(){return physijsScenePause};
    self.addProcessNode = function(nodeName, node){processNodes[nodeName] = node};
    self.setProcessNodeCompleted = function(nodeName){if (processNodes[nodeName] != undefined) processNodes[nodeName].completed = true};
    self.interactionHelpersVisibility = function(visibility)
    {
        for (var interactionHelperName in self.interactionHelpers)
        {
            self.interactionHelpers[interactionHelperName].visible = visibility;
        }
    };
    self.addMeshToCollidableMeshList = function(collidableMesh)
    {
        collidableMeshList.push(collidableMesh);
    }
    self.getMeshToCollidableMeshList = function()
    {
        return collidableMeshList;
    }
};
