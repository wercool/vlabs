function UDetectWebGL(vlabScope)
{
    if (!window.WebGLRenderingContext)
    {
        // the browser doesn't even know what WebGL is
        // http://get.webgl.org;
        return [false, "No WebGLRenderingContext detected on this PC!"]
    }
    return [true, ""]
};

function UCheckWebGLCanvasContext(vlabScope)
{
    try
    {
        var canvas = vlabScope.getWebglContainer().find("canvas").get(0);
        if(!canvas.getContext("experimental-webgl") && !canvas.getContext("webgl"))
        {
            return [false, "Browser supports WebGL but initialization failed!"]
        }
    }
    catch(error)
    {
        return [false, "Browser supports WebGL but initialization failed!" + "<br/><small>" + error + "</small>"]
    }
    return [true, ""]
};

function UNotification()
{
    var html = arguments[0];
    $("#notificationPopup").html((html) ? html : "--- empty notification ---");
    $("#notificationPopup").popup("show");
}
