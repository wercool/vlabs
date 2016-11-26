var loader;
var addObjectsCallback;
var meshes = [];
var lights = [];

function loadScene(sceneURL, addObjectsFunction)
{
    loader = new THREE.ObjectLoader();
//    loader = new THREE.ColladaLoader();
    loader.load(sceneURL, sceneLoaded, sceneLoading);
//    loader.load(sceneURL, sceneLoaded);
//    loader.options.convertUpAxis = true;
    addObjectsCallback = addObjectsFunction;
}

function sceneLoading(object)
{
    console.log("Loading..." + object.loaded + " bytes");
}

function sceneLoaded(scene)
{
//    var colladaScene = scene.scene;
    scene.traverse(loadedSceneTraverse);
//    colladaScene.traverse(loadedSceneTraverse);
    console.log("sceneLoaded");
    addObjectsCallback();
}

function loadedSceneTraverse(object)
{
    if (object instanceof THREE.Mesh)
    {
//        object.name = object.parent.name;
        console.log("[Mesh] " + object.name);
        meshes.push(object);
    }
    if (object instanceof THREE.PointLight)
    {
//        object.name = object.parent.name;
        console.log("[PointLight] " + object.name);
        lights.push(object);
    }
}
