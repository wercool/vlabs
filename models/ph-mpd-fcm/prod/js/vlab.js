"use strict";

function VLab(constructorArgs)
{
    var self = this;
    var logging = true;

    var title            = constructorArgs.title;
    var sceneFile        = constructorArgs.sceneFile;
    var showAxis         = constructorArgs.showAxis;

    // DOM container element
    var webglContainerDOM = null;
    // JQuery container object
    var webglContainer = null;

    var webglContainerWidth = null;
    var webglContainerHeight = null;

    self.WebGLRenderer = null;

    var sceneLoadedEvent = new Event("sceneLoaded");
    var vlabScene = null;
    var vlabPhysijsSceneReady = false;

    var defaultCamera = null;

    var meshObjects = new Object();
    var lights = [];

    self.clickResponsiveObjects = [];
    self.hoverResponsiveObjects = [];

    self.clickedObjects = [];
    self.hoveredObjects = [];

    self.trace = function()
    {
        if (logging)
        {
            console.log.apply(console, arguments);
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

        loadScene(sceneFile);
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

                    lights.push(object);
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
        for (var meshObjectName in meshObjects)
        {
            if(meshObjects[meshObjectName].childMeshes.length > 0)
            {
                for (var key in meshObjects[meshObjectName].childMeshes)
                {
                    console.log(meshObjects[meshObjectName].mesh, meshObjects[meshObjectName].childMeshes[key]);
                }
            }
        }
/*
vlabScene.add(meshes[1]);
vlabScene.add(lights[0]);
*/
        if (showAxis)
        {
            var axisHelper = new THREE.AxisHelper(100.0);
            vlabScene.add(axisHelper);
        }
        render();
    }

    var render = function()
    {
        self.WebGLRenderer.render(vlabScene, defaultCamera);
        requestAnimationFrame(render);
    };

    self.setVlabScene = function(scene)
    {
        vlabScene = scene;
        if (vlabScene.isPhysijsScene)
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
        self.trace("mouseMove");
    };

    var mouseDown = function(event)
    {
        self.trace("mouseDown");
    };

    var mouseUp = function(event)
    {
        self.trace("mouseUp");
    };

    self.getWebglContainerDOM = function(){return webglContainerDOM};
    self.getWebglContainer = function(){return webglContainer};
    self.getVlabScene = function(){return vlabScene};
    self.getDefaultCamera = function(){return defaultCamera};
};
