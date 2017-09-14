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

function partial(func /*, 0..n args */)
{
    var args = Array.prototype.slice.call(arguments, 1);
    return function() 
    {
        var allArguments = args.concat(Array.prototype.slice.call(arguments));
        return func.apply(this, allArguments);
    };
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max)
{
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') 
    return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}
