"use strict";

function VLab(title)
{
    // public
    this.title = title;

    // private
    var self = this;

    var logging = true;

    // DOM container element
    var webglContainerDOM = null;
    // JQuery container object
    var webglContainer = null;

    this.WebGLRenderer = null;
    var defaultCamera = null;

    this.clickResponsiveObjects = [];
    this.hoverResponsiveObjects = [];

    this.clickedObjects = [];
    this.hoveredObjects = [];

    this.initialize = function(webglContainerId)
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

        this.WebGLRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.WebGLRenderer.setClearColor(0xbfd1e5);
        this.WebGLRenderer.setPixelRatio( window.devicePixelRatio );
        this.WebGLRenderer.setSize(webglContainer.width(), webglContainer.height() );
        this.WebGLRenderer.shadowMap.enabled = true;
        this.WebGLRenderer.shadowMapSoft = true;
        this.WebGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        webglContainer.append(this.WebGLRenderer.domElement);

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
    };

    var trace = function()
    {
        if (logging)
        {
            console.log.apply(console, arguments);
        }
    };

    var mouseMove = function(event)
    {
        trace("mouseMove");
    };

    var mouseDown = function(event)
    {
        trace("mouseDown");
    };

    var mouseUp = function(event)
    {
        trace("mouseUp");
    };

    var mouseWheel = function(event)
    {
        trace("mouseWheel");
    };

    this.getWebglContainerDOM = function(){return webglContainerDOM};
    this.getWebglContainer = function(){return webglContainer};
};
