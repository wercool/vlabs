THREE.PointerLockControls = function (vlab, camera)
{
    var scope = this;

    scope.vlab = vlab;

    camera.rotation.set(0, 0, 0);

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 10;
    yawObject.add( pitchObject );

    var PI_2 = Math.PI / 2;

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;
    var canJump = false;

    var velocity = new THREE.Vector3();
    var prevTime = performance.now();

    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    if (havePointerLock)
    {
        var element = document.body;
        var pointerlockchange = function(event)
        {
            if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element)
            {
                scope.enabled = true;
            }
            else
            {
                scope.enabled = false;
            }
        };

        var pointerLockRequest = function(event)
        {
            // Ask the browser to lock the pointer
            element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
            element.requestPointerLock();
        };

        scope.vlab.getWebglContainerDOM().addEventListener('click', pointerLockRequest, false);
    }

    var onMouseMove = function (event)
    {
        if (scope.enabled === false) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );
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

    this.dispose = function()
    {
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('keydown', onKeyDown, false);
        document.removeEventListener('keyup', onKeyUp, false);
        self.getWebglContainerDOM.removeEventListener('click', pointerLockRequest, false);
    };

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    this.enabled = false;

    this.getObject = function ()
    {
        return yawObject;
    };

    this.getDirection = function()
    {
        // assumes the camera itself is not rotated

        var direction = new THREE.Vector3( 0, 0, - 1 );
        var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );
        return function( v )
        {
            rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );
            v.copy( direction ).applyEuler( rotation );
            return v;
        };
    }();


    this.update = function()
    {
        if (scope.enabled === true)
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
