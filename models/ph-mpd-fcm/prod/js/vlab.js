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

    self.WebGLRenderer = null;

    var sceneLoadedEvent    = new Event("sceneLoaded");
    var simulationStepEvent = new Event("simulationStep");

    var vlabScene = null;
    var vlabPhysijsSceneReady = false;

    var defaultCamera = null;

    var meshObjects = new Object();
    var lights = [];

    var mouseCoords = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var mouseDownEvent = null;
    var mouseUpEvent = null;

    self.clickResponsiveObjects = [];
    self.hoverResponsiveObjects = [];

    var intersectedMesh     = null;
    var intersectedMeshName = "";
    var notStrictedReleaseCallbacks = [];

    var tooltipDiv = null;

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

        self.WebGLRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        self.WebGLRenderer.setClearColor(0xbfd1e5);
        self.WebGLRenderer.setPixelRatio(window.devicePixelRatio);
        self.WebGLRenderer.setSize(webglContainer.width(), webglContainer.height() );
        self.WebGLRenderer.shadowMap.enabled = true;
        self.WebGLRenderer.shadowMapSoft = true;
        self.WebGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        webglContainer.append(self.WebGLRenderer.domElement);

        var webGlCanvasContextCheck = UCheckWebGLCanvasContext(self);
        if(!webGlCanvasContextCheck[0])
        {
            UNotification(webGlCanvasContextCheck[1]);
            return;
        }

        defaultCamera = new THREE.PerspectiveCamera(70, webglContainer.width() / webglContainer.height(), 0.1, 2000);

        webglContainerDOM.addEventListener("mousemove", mouseMove, false);
        webglContainerDOM.addEventListener("mousedown", mouseDown, false);
        webglContainerDOM.addEventListener("mouseup", mouseUp, false);

        $(window).on("resize", webglContainerResized);

        self.webglContainerWidth  = webglContainer.width();
        self.webglContainerHeight = webglContainer.height();

        loadScene(self.vlabNature.sceneFile);
    };

    var loadScene = function(sceneFile)
    {
        var loader = new THREE.ColladaLoader();
        loader.options.convertUpAxis = true;
        loader.load(sceneFile, onSceneLoaded, onSceneLoadProgress);
    };

    var onSceneLoaded = function(collada)
    {
        var sceneObject = collada.scene;
        sceneObject.traverse(function(object){
            if(object.type == "Object3D")
            {

                var position = new THREE.Vector3();
                var quaternion = new THREE.Quaternion();
                quaternion.copy(object.quaternion);
                position.copy(object.position);

                if (object.children[0].type == "Mesh")
                {
                    var mesh = object.children[0];
                    mesh.name = object.name;
                    mesh.quaternion.copy(quaternion);
                    mesh.position.copy(position);

                    if (meshObjects[mesh.name] == undefined)
                    {
                        meshObjects[mesh.name] = new Object();
                        meshObjects[mesh.name].isRoot = true;
                    }

                    meshObjects[mesh.name].mesh = mesh;
                    meshObjects[mesh.name].childMeshes = [];

                    for (var i = 1; i < object.children.length; i++)
                    {
                        if (meshObjects[object.children[i].name] == undefined)
                        {
                            meshObjects[object.children[i].name] = new Object();
                            meshObjects[object.children[i].name].isRoot = false;
                        }
                        meshObjects[mesh.name].childMeshes.push(object.children[i].name);
                    }
                }
                else if (object.children[0].type == "PointLight")
                {
                    var light = object.children[0];
                    light.name = object.name;
                    light.quaternion.copy(quaternion);
                    light.position.copy(position);

                    lights.push(light);
                }
            }
        });

        dispatchEvent(sceneLoadedEvent);
    };

    var onSceneLoadProgress = function(request)
    {
        self.trace(Math.round(request.loaded/request.total) * 100 + "%", "[" + request.loaded + "/" + request.total + "]");
    };

    this.buildScene = function()
    {
        if (self.vlabNature.isPhysijsScene)
        {
            Physijs.scripts.worker = "/js/physijs_worker.js";
            Physijs.scripts.ammo = "/js/ammo.js";
            vlabScene = new Physijs.Scene({ fixedTimeStep: 1 / 120});
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

        // add children meshes to root meshes
        for (var meshObjectName in meshObjects)
        {
            if(meshObjects[meshObjectName].childMeshes.length > 0)
            {
                for (var key in meshObjects[meshObjectName].childMeshes)
                {
                    meshObjects[meshObjectName].mesh.add(meshObjects[meshObjects[meshObjectName].childMeshes[key]].mesh);
                }
            }
        }
        // add root meshes to the scene
        for (var meshObjectName in meshObjects)
        {
            if(meshObjects[meshObjectName].isRoot)
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
                    }
                    physijsMesh.quaternion.copy(quaternion);
                    physijsMesh.position.copy(position);
                    physijsMesh.name = meshObjectName;
                    physijsMesh.mass = self.vlabNature.physijs[meshObjectName].mass;

                    // add child meshesh to newly created Physijs Mesh
                    if(meshObjects[meshObjectName].childMeshes.length > 0)
                    {
                        for (var key in meshObjects[meshObjectName].childMeshes)
                        {
                            physijsMesh.add(meshObjects[meshObjects[meshObjectName].childMeshes[key]].mesh);
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
        }
        // add lights
        for (var i = 0; i < lights.length; i++)
        {
            vlabScene.add(lights[i]);
        }

        if (self.vlabNature.showAxis)
        {
            var axisHelper = new THREE.AxisHelper(100.0);
            vlabScene.add(axisHelper);
        }

        if (self.vlabNature.showTooltips)
        {
            //tooltip
            tooltipDiv = $("<div id='tooltipDiv' class='tooltip'></div>");
            webglContainer.append(tooltipDiv);
            tooltipDiv.hide();
        }

        vlabScene.traverse (function (object)
        {
            if (object.type == "Mesh")
            {
                if (self.vlabNature.interactors[object.name] != undefined)
                {
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
                            var objectMousePressCallback = eval("self." + self.vlabNature.interactors[object.name].press);
                            if (typeof objectMousePressCallback === "function")
                            {
                                object.press = objectMousePressCallback;
                            }
                            else
                            {
                                self.error("MousePress callback [" + 
                                            self.vlabNature.interactors[object.name].press + 
                                            "] for [" + object.name + "] mesh is defined in VLab nature, but not implemented in VLab");
                            }
                        }
                        if (self.vlabNature.interactors[object.name].release != undefined)
                        {
                            var objectMouseReleaseCallback = eval("self." + self.vlabNature.interactors[object.name].release.callbak);
                            if (typeof objectMouseReleaseCallback === "function")
                            {
                                object.release = objectMouseReleaseCallback;
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
                                            self.vlabNature.interactors[object.name].release.callbak + 
                                            "] for [" + object.name + "] mesh is defined in VLab nature, but not implemented in VLab");
                            }
                        }
                    }
                }
            }
        });

        if (self.vlabNature.isPhysijsScene)
        {
            vlabScene.simulate();
        }

        render();
    }

    var render = function()
    {
        self.WebGLRenderer.render(vlabScene, defaultCamera);
        requestAnimationFrame(render);
        if ((self.vlabNature.isPhysijsScene && self.vlabPhysijsSceneReady) || !self.vlabNature.isPhysijsScene)
        {
            process();
            if (self.vlabNature.isPhysijsScene)
            {
                vlabScene.simulate(undefined, 1);
                self.vlabPhysijsSceneReady = false;
            }
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
        dispatchEvent(simulationStepEvent);
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
        if (self.webglContainerWidth != webglContainer.width() || self.webglContainerHeight != webglContainer.height())
        {
            defaultCamera.aspect = webglContainer.width() / webglContainer.height();
            defaultCamera.updateProjectionMatrix();
            self.WebGLRenderer.setSize(webglContainer.width(), webglContainer.height());
        }
        self.webglContainerWidth  = webglContainer.width();
        self.webglContainerHeight = webglContainer.height();
    };

    var mouseMove = function(event)
    {
        event.preventDefault();
        mouseCoords.set((event.clientX / webglContainer.width()) * 2 - 1, 1 -(event.clientY / webglContainer.height()) * 2);
        raycaster.setFromCamera(mouseCoords, defaultCamera);
        var intersects = raycaster.intersectObjects(self.hoverResponsiveObjects); 

        if (intersects.length > 0) 
        {
            if (self.intersectedMeshName != intersects[0].object.name)
            {
                self.instersectedMesh = intersects[0].object;
                self.intersectedMeshName = self.instersectedMesh.name;
                if (self.instersectedMesh.active)
                {
                    webglContainerDOM.style.cursor = 'pointer';
                }

                if (self.vlabNature.showTooltips)
                {
                    if (self.instersectedMesh.tooltip != undefined)
                    {
                        var tooltipPosition = toScreenPosition(self.instersectedMesh);
                        tooltipDiv.text(self.instersectedMesh.tooltip);
                        tooltipDiv.show();
                        tooltipDiv.css({left: tooltipPosition.x + 10, top: tooltipPosition.y - 30});
                    }
                }
            }
        }
        else
        {
            webglContainerDOM.style.cursor = 'auto';

            if (self.intersectedMeshName != null)
            {
                self.intersectedMesh = null;
                self.intersectedMeshName = null;

                if (self.vlabNature.showTooltips)
                {
                    tooltipDiv.text("");
                    tooltipDiv.hide();
                }
            }
        }
    };

    var mouseDown = function(event)
    {
        event.preventDefault();
        if (mouseDownEvent == null)
        {
            mouseCoords.set((event.clientX / webglContainer.width()) * 2 - 1, 1 -(event.clientY / webglContainer.height()) * 2);
            mouseDownEvent = event;
        }
    };

    var mouseUp = function(event)
    {
        event.preventDefault();
        if (mouseUpEvent == null)
        {
            mouseCoords.set((event.clientX / webglContainer.width()) * 2 - 1, 1 -(event.clientY / webglContainer.height()) * 2);
            mouseUpEvent = event;
        }
    };

    self.getWebglContainerDOM = function(){return webglContainerDOM};
    self.getWebglContainer = function(){return webglContainer};
    self.getVlabScene = function(){return vlabScene};
    self.getDefaultCamera = function(){return defaultCamera};

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
                    pressedObject.press();
                }
                if (typeof pressedObject.release === "function" && !pressedObject.strictRelease)
                {
                    notStrictedReleaseCallbacks.push(pressedObject.release);
                }
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
                    releasedObject.release();
                }
            }
            var i = notStrictedReleaseCallbacks.length;
            while (i--)
            {
                var releaseCallback = notStrictedReleaseCallbacks.pop();
                console.log(releaseCallback);
                releaseCallback();
            }
            mouseUpEvent = null;
        }
    };

    var toScreenPosition = function(obj)
    {
        var vector = new THREE.Vector3();

        var widthHalf = 0.5 * self.webglContainerWidth;
        var heightHalf = 0.5 * self.webglContainerHeight;

        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.project(defaultCamera);

        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = - ( vector.y * heightHalf ) + heightHalf;

        return { 
            x: vector.x,
            y: vector.y
        };
    };
};
