THREE.PointerLockControls = function (vlab, camera)
{
    var scope = this;

    scope.vlab = vlab;

    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 0, 0);

    var pitchObject = new THREE.Object3D();
    pitchObject.name = "pointerControlPitchObject";
    pitchObject.add(camera);

    var yawObject = new THREE.Object3D();
    yawObject.name = "pointerControlYawObject";
    yawObject.add(pitchObject);

    var PI_2 = Math.PI / 2;

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;

    var velocity = new THREE.Vector3();
    var prevTime = performance.now();

    scope.activated = false;

    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    if (havePointerLock)
    {
        var element = document.body;
        var pointerlockchange = function(event)
        {
            if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element)
            {
                scope.activated = true;
            }
            else
            {
                scope.activated = false;
                scope.vlab.orbitControlsEnable(scope.vlab.getDefaultCameraPosition());
            }
        };

        var pointerLockRequest = function(event)
        {
            event.preventDefault();
            if((event.button == 1 || event.button == 0) && event.ctrlKey === true)
            {
                // Ask the browser to lock the pointer
                element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
                element.requestPointerLock();
            }
        };
        scope.vlab.getWebglContainerDOM().addEventListener('click', pointerLockRequest, false);
    }

    this.pointerLock = function()
    {
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
        element.requestPointerLock();
    };

    var onMouseMove = function (event)
    {
        if (scope.activated === false) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y   -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max(-PI_2, Math.min( PI_2, pitchObject.rotation.x));
    };

    var onKeyDown = function (event)
    {
        switch (event.keyCode)
        {
            case 38: // up
            case 87: // w
                moveForward = true;
                break;
            case 37: // left
            case 65: // a
                moveLeft = true;
                break;
            case 40: // down
            case 83: // s
                moveBackward = true;
                break;
            case 39: // right
            case 68: // d
                moveRight = true;
                break;
        }
    };

    var onKeyUp = function (event)
    {
        switch( event.keyCode )
        {
            case 38: // up
            case 87: // w
                moveForward = false;
                break;
            case 37: // left
            case 65: // a
                moveLeft = false;
                break;
            case 40: // down
            case 83: // s
                moveBackward = false;
                break;
            case 39: // right
            case 68: // d
                moveRight = false;
                break;
        }
    };

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    this.dispose = function()
    {
        scope.activated = false;
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('keydown', onKeyDown, false);
        document.removeEventListener('keyup', onKeyUp, false);
        document.removeEventListener('pointerlockchange', pointerlockchange, false);
        document.removeEventListener('mozpointerlockchange', pointerlockchange, false);
        document.removeEventListener('webkitpointerlockchange', pointerlockchange, false);
        scope.vlab.getWebglContainerDOM().removeEventListener('click', pointerLockRequest, false);
    };

    this.getYawObject = function ()
    {
        return yawObject;
    };

    this.getPitchObject = function ()
    {
        return pitchObject;
    };

    this.getObject = function ()
    {
        return yawObject;
    };

    this.getDirection = function()
    {
        // assumes the camera itself is not rotated
        var direction = new THREE.Vector3(0, 0, - 1);
        var rotation = new THREE.Euler(0, 0, 0, "YXZ");
        return function( v )
        {
            rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );
            v.copy(direction).applyEuler(rotation);
            return v;
        };
    }();

    this.update = function()
    {
        if (scope.activated === true)
        {
            scope.vlab.cameraControlsEvent();

            var time = performance.now();
            var delta = (time - prevTime) / 1000;

            velocity.x -= velocity.x * 10 * delta;
            velocity.z -= velocity.z * 10 * delta;

            if ( moveForward )  velocity.z -= 4 * delta;
            if ( moveBackward ) velocity.z += 4 * delta;
            if ( moveLeft )     velocity.x -= 4 * delta;
            if ( moveRight )    velocity.x += 4 * delta;

            this.getObject().translateX(velocity.x);
            this.getObject().translateZ(velocity.z);

            prevTime = time;
        }
    };
};
