"use strict";

function VLab(argsObj)
{
    var self = this;
    var logging = true;

    var title            = argsObj.title;
    var colladaSceneFile = argsObj.colladaSceneFile;

    // DOM container element
    var webglContainerDOM = null;
    // JQuery container object
    var webglContainer = null;

    var webglContainerWidth = null;
    var webglContainerHeight = null;

    self.WebGLRenderer = null;

    var vlabScene = null;
    var vlabPhysijsSceneReady = false;

    var defaultCamera = null;

    self.clickResponsiveObjects = [];
    self.hoverResponsiveObjects = [];

    self.clickedObjects = [];
    self.hoveredObjects = [];

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

        webglContainerDOM.addEventListener('mousemove', mouseMove, false);
        webglContainerDOM.addEventListener('mousedown', mouseDown, false);
        webglContainerDOM.addEventListener('mouseup', mouseUp, false);
        webglContainerDOM.addEventListener('mousewheel', mouseWheel, false);

        $(window).on('resize', webglContainerResized);

        loadColladaScene(colladaSceneFile);
    };

    self.trace = function()
    {
        if (logging)
        {
            console.log.apply(console, arguments);
        }
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

    var mouseWheel = function(event)
    {
        self.trace("mouseWheel");
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

    var loadColladaScene = function(colladaFile)
    {
        var loader = new THREE.ColladaLoader();
        loader.options.convertUpAxis = true;
        loader.load(colladaFile, onColladaSceneLoaded, onColladaSceneProgress);
    };

    var onColladaSceneLoaded = function(collada)
    {
        var colladaScene = collada.scene;
        colladaScene.traverse(function (object){
            console.log(object);
        });
/*
        colladaScene.traverse(function (object){
            if (object instanceof THREE.Mesh)
            {
                object.name = object.parent.name;
                object.position.x = object.parent.position.x;
                object.position.y = object.parent.position.y;
                object.position.z = object.parent.position.z;

                object.rotation.x = object.parent.rotation.x;
                object.rotation.y = object.parent.rotation.y;
                object.rotation.z = object.parent.rotation.z;
            }
            if (object instanceof THREE.SpotLight || object instanceof THREE.PointLight)
            {
                object.name = object.parent.name;
                object.position.x = object.parent.position.x;
                object.position.y = object.parent.position.y;
                object.position.z = object.parent.position.z;
            }
        });
*/

    }

    var onColladaSceneProgress = function(collada)
    {
        console.log("onColladaSceneProgress");
    }

    var render = function()
    {
    };

    self.getWebglContainerDOM = function(){return webglContainerDOM};
    self.getWebglContainer = function(){return webglContainer};

    self.setVlabScene = function(scene)
    {
        vlabScene = scene;
        if (vlabScene.isPhysijsScene)
        {
            vlabScene.addEventListener(
                'update',
                function() 
                {
                    self.vlabPhysijsSceneReady = true;
                }
            );
        }
    };
    self.getVlabScene = function(){return vlabScene};
};
