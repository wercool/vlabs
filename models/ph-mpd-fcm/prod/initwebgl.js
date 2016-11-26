var renderer;
var camera;
var clock = new THREE.Clock();

function initWebGL()
{
    if (!Detector.webgl) Detector.addGetWebGLMessage();
    renderer = new THREE.WebGLRenderer({antialias: false});
    renderer.domElement.id = 'webgl-renderer';
    renderer.setClearColor(0x393939, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);
    camera.position.set(0.0, 1.0, 3.0);

    camera.controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.controls.minDistance = 1;
    camera.controls.maxDistance = 128;
    camera.controls.autoRotate = false;
    camera.controls.noKeys = true;
    camera.controls.addEventListener('change', function() { needsUpdate = true; });

    requestAnimationFrame(render);
}

function render()
{
    requestAnimationFrame(render);
    var deltaTime = clock.getDelta();
    camera.controls.update(deltaTime);
    renderer.render(scene, camera);
}
