var scene;

scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 });
scene.setGravity(new THREE.Vector3( 0, 30, 0 ));
scene.addEventListener(
    'update',
    function() 
    {
        scene.simulate( undefined, 2 );
    }
);
