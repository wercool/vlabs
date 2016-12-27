"use strict";

function Kuka(webGLContainer)
{
    var self = this;

    addEventListener("vlabInitialized", function (event) { vlabInitialized(); }, false);
    addEventListener("sceneLoaded", function (event) { sceneLoaded(); }, false);
    addEventListener("sceneBuilt", function (event) { scenePostBuilt(); }, false);
    addEventListener("simulationStep", function (event) { simulationStep(); }, false);

    var vlabNature = {
        "title":            "Kuka",
        "sceneFile":        "scene/kuka.dae",
        "isPhysijsScene":   false,
        "showStatistics":   true,
        "showAxis":         true
    };

    var vlabInitialized = function()
    {
        console.log("vlabInitialized");
    };

    var sceneLoaded = function()
    {
        self.getDefaultCamera().position.set(0.0, 20.0, 15.0);

        self.getDefaultCamera().controls = new THREE.OrbitControls(self.getDefaultCamera(), self.getWebglContainerDOM());
        self.getDefaultCamera().controls.autoRotate = false;
        self.getDefaultCamera().controls.enableKeys = false;
        // test mode
        self.getDefaultCamera().controls.testMode = true;

        self.buildScene();
    };

    var activeObjects = {};
    var activeProperties = {};

    // this VLab constants
    var kukaLink1MaxAngle, kukaLink2MaxAngle, kukaLink3MaxAngle, kukaLink4MaxAngle;
    var ikTarget;
    var cableSleeve, cableSleeveArmature, skeletonHelper;

    var skeleton;

    var circleShape, geometry;

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"]  = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["kukaLink1"] = self.getVlabScene().getObjectByName("kukaLink1");
        activeObjects["kukaLink2"] = self.getVlabScene().getObjectByName("kukaLink2");
        activeObjects["kukaLink3"] = self.getVlabScene().getObjectByName("kukaLink3");
        activeObjects["kukaLink4"] = self.getVlabScene().getObjectByName("kukaLink4");
        activeObjects["kukaLink5"] = self.getVlabScene().getObjectByName("kukaLink5");
        activeObjects["kukaSleeveFixture1"] = self.getVlabScene().getObjectByName("kukaSleeveFixture1");
        activeObjects["kukaSleeveFixture2"] = self.getVlabScene().getObjectByName("kukaSleeveFixture2");
        activeObjects["kukaSleeveFixture3"] = self.getVlabScene().getObjectByName("kukaSleeveFixture3");
        activeObjects["kukaSleeveFixture4"] = self.getVlabScene().getObjectByName("kukaSleeveFixture4");
        activeObjects["kukaSleeveFixture5"] = self.getVlabScene().getObjectByName("kukaSleeveFixture5");

        activeObjects["kukaLink1"].material.wireframe = false;
        activeObjects["kukaLink2"].material.wireframe = false;
        activeObjects["kukaLink3"].material.wireframe = false;
        activeObjects["kukaLink4"].material.wireframe = false;
        activeObjects["kukaLink5"].material.wireframe = false;

        activeObjects["kukaLink1"].visible = true;
        activeObjects["kukaLink2"].visible = true;
        activeObjects["kukaLink3"].visible = true;
        activeObjects["kukaLink4"].visible = true;
        activeObjects["kukaLink5"].visible = true;
/*
        activeObjects["kukaBase"].position.x -= 2.0;
        activeObjects["kukaBase"].position.y += 2.0;
        activeObjects["kukaBase"].position.z -= 2.0;
*/


        // dynamic tube
/*
        initBones();
        cableSleeve.position.x -= 1.7;
        cableSleeveArmature[1].rotation.z -= 0.7;
*/
/*
        var dae;

        var loader = new THREE.ColladaLoader();
        loader.options.convertUpAxis = true;
        loader.load('bones.dae', function ( collada ){
            dae = collada.scene;
            dae.traverse( function ( child ) {
                if ( child instanceof THREE.SkinnedMesh ) {
                    skeleton = child.skeleton;
                    activeObjects["kukaLink1"].add(child);
                    //skeleton.bones[1].rotation.y = -0.75;
                    //child.geometry.verticesNeedUpdate = false;
                }
            } );
        } );
*/

        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({color:0xFF0000, wireframe:true }) ),
            control : new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement)
        };
        self.getVlabScene().add(ikTarget.mesh);
        ikTarget.control.addEventListener("change", function(){self.setEEFInitialXZPosition(true);});
        var endEffectorInitialPosition = new THREE.Vector3(5,0,0);
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        self.getVlabScene().add(ikTarget.control);

        var eefInitialXZPosition = endEffectorInitialPosition.clone();
        eefInitialXZPosition.y = activeObjects["kukaBase"].position.y;
        var xzEEFDir = activeObjects["kukaBase"].position.clone().sub(eefInitialXZPosition);
        activeObjects["xzEEFDir"] = new THREE.ArrowHelper(xzEEFDir.clone().normalize().negate(), activeObjects["kukaBase"].position, xzEEFDir.length(), 0xffffff, 0.5, 0.1);
        self.getVlabScene().add(activeObjects["xzEEFDir"]);
        self.setEEFInitialXZPosition(true);

        self.setSceneRenderPause(false);

        window.addEventListener('keydown', function (event){
            if ( event.keyCode == 81 )
            {
                self.setEEFInitialXZPosition(false);
            }
        });


//        activeObjects["kukaLink1"].rotation.y = (-90 * Math.PI / 180);
        activeObjects["kukaLink2"].rotation.z = (45 * Math.PI / 180);
        activeObjects["kukaLink3"].rotation.z = (-140 * Math.PI / 180);
        activeObjects["kukaLink4"].rotation.z = (-75 * Math.PI / 180);

//      activeObjects["kukaBase"].position.copy(new THREE.Vector3(-5.6, -5.75, -3.85));

/*
        kukaLink1MaxAngle = -Math.PI;
        kukaLink2MaxAngle = (-95 * Math.PI / 180);
        kukaLink3MaxAngle = (-142 * Math.PI / 180);
        kukaLink4MaxAngle = (-90 * Math.PI / 180);
        // get l1, l2, l3 IK for xyz
        process();
*/

        activeObjects["kukaBase"].updateMatrixWorld();
        var pos1 = activeObjects["kukaSleeveFixture2"].position;
        var pos2 = pos1.clone();
        pos2.y += 0.5;
        var pos1 = activeObjects["kukaBase"].localToWorld(pos1);
        var pos2 = activeObjects["kukaBase"].localToWorld(pos2);
        var pos3 = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaSleeveFixture3"].matrixWorld);
        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos2,
            pos3
        ]);
/*
        path.type = 'chordal';
        path.closed = false;
        var extrudeSettings = {
            steps        : 10,
            bevelEnabled : false,
            curveSegments: 2,
            extrudePath  : path
        };

        var circleRadius = 0.1;
        circleShape = new THREE.Shape();
        circleShape.moveTo(0, circleRadius);
        circleShape.quadraticCurveTo(circleRadius, circleRadius, circleRadius, 0);
        circleShape.quadraticCurveTo(circleRadius, -circleRadius, 0, -circleRadius);
        circleShape.quadraticCurveTo(-circleRadius, -circleRadius, -circleRadius, 0);
        circleShape.quadraticCurveTo(-circleRadius, circleRadius, 0, circleRadius);

        var geometry = new THREE.ExtrudeGeometry(circleShape, extrudeSettings);
        cableSleeve = new THREE.Mesh(geometry, material);
*/

/*
        var curve = new THREE.SplineCurve3([pos1, pos2, pos3, pos4]);
        var geometry = new THREE.TubeGeometry(curve, 16, 0.1, 4, false);

        var texture = THREE.ImageUtils.loadTexture( 'texture.jpg' );
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 0);

        var material = new THREE.MeshLambertMaterial({wireframe: false, shading:THREE.SmoothShading, map: texture});
*/
        var material = new THREE.MeshLambertMaterial({wireframe: false, shading:THREE.SmoothShading});
        var curve = new THREE.SplineCurve3([pos1, pos2]);
        var geometry = new THREE.TubeBufferGeometry(curve, 16, 0.1, 4, false);
        cableSleeve = new THREE.Mesh(geometry, material);
        cableSleeve.dynamic = true;

        activeObjects["kukaBase"].add(cableSleeve);
    };

    var initBones = function ()
    {
        var segmentHeight = 2;
        var segmentCount = 5;
        var height = segmentHeight * segmentCount;
        var halfHeight = height * 0.5;

        var sizing = {
            segmentHeight : segmentHeight,
            segmentCount : segmentCount,
            height : height,
            halfHeight : halfHeight
        };

        var cableSleeveGeometry = createGeometry(sizing);
        var armatureLinks = createBones(sizing);
        cableSleeve = createMesh(cableSleeveGeometry, armatureLinks);

        activeObjects["kukaLink1"].add(cableSleeve);
    }

    var createGeometry = function(sizing)
    {
        var geometry = new THREE.CylinderGeometry(
            0.1,                       // radiusTop
            0.1,                       // radiusBottom
            sizing.height,             // height
            8,                         // radiusSegments
            sizing.segmentCount * 8,   // heightSegments
            true                       // openEnded
        );

        for ( var i = 0; i < geometry.vertices.length; i ++ )
        {
            var vertex = geometry.vertices[ i ];
            var y = ( vertex.y + sizing.halfHeight );

            var skinIndex = Math.floor(y / sizing.segmentHeight);
            var skinWeight = 0.5 * (y % sizing.segmentHeight) / sizing.segmentHeight;

            geometry.skinIndices.push(new THREE.Vector4(skinIndex, skinIndex + 1, 0, 0));
            geometry.skinWeights.push(new THREE.Vector4(1 - skinWeight, skinWeight, 0, 0));
        }

        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, sizing.height / 2, 0));
        return geometry;
    }

    function createBones(sizing)
    {
        cableSleeveArmature = [];

        var prevArmatureLink = new THREE.Bone();
        cableSleeveArmature.push(prevArmatureLink);

        for (var i = 0; i < sizing.segmentCount; i ++)
        {
            var armatureLink = new THREE.Bone();
            armatureLink.position.y = sizing.segmentHeight;
            cableSleeveArmature.push(armatureLink);
            prevArmatureLink.add(armatureLink);
            prevArmatureLink = armatureLink;
        }

        return cableSleeveArmature;
    }

    var createMesh = function(geometry, bones)
    {
        var material = new THREE.MeshPhongMaterial({
            skinning : true,
            color: 0x156289,
            emissive: 0x072534,
            side: THREE.DoubleSide,
            shading: THREE.SmoothShading
        });

        var mesh = new THREE.SkinnedMesh(geometry, material);
        var skeleton = new THREE.Skeleton(bones);

        mesh.add(cableSleeveArmature[0]);

        mesh.bind(skeleton);

        skeletonHelper = new THREE.SkeletonHelper(mesh);
        skeletonHelper.material.linewidth = 2;
        self.getVlabScene().add(skeletonHelper);

        return mesh;
    }

    self.setEEFInitialXZPosition = function(demo)
    {
        if (activeObjects["xzEEFDir"] == undefined) return;

        var eefInitialXZPosition = ikTarget.control.position.clone();
        eefInitialXZPosition.y = activeObjects["kukaBase"].position.y;
        var xzEEFDir = activeObjects["kukaBase"].position.clone().sub(eefInitialXZPosition);
        activeObjects["xzEEFDir"].setDirection(xzEEFDir.clone().normalize().negate());
        activeObjects["xzEEFDir"].setLength(xzEEFDir.length(), 0.5, 0.1);
        var xDir = new THREE.Vector3(1,0,0);
        var l1 = -Math.PI + xDir.angleTo(xzEEFDir.clone());
        if (demo)
        {
            activeObjects["kukaLink1"].rotation.y = l1;
        }
        else
        {
            self.l1 = l1;
            setKuka(xzEEFDir.length());
        }
    };

    self.l1 = null;

    var setKuka = function(eefX)
    {
        var l4l5Height = 2.0;

        if (self.l1 == null)
        {
            var endEffectorPos = ikTarget.control.position.clone();
            var requestForEEFPos = endEffectorPos.clone();
            requestForEEFPos.x = (endEffectorPos.x - activeObjects["kukaBase"].position.x).toFixed(2);
            requestForEEFPos.y = (endEffectorPos.y - activeObjects["kukaBase"].position.y + l4l5Height).toFixed(2);
            requestForEEFPos.z = (endEffectorPos.z - activeObjects["kukaBase"].position.z).toFixed(2);
        }
        else
        {
            var endEffectorPos = ikTarget.control.position.clone();
            var requestForEEFPos = new THREE.Vector3();
            requestForEEFPos.x = eefX.toFixed(2);
            requestForEEFPos.y = (endEffectorPos.y - activeObjects["kukaBase"].position.y + l4l5Height).toFixed(2);
            requestForEEFPos.z = 0;
        }

        $.ajax({
            url: "http://127.0.0.1:11111/ikxyz", 
            type: 'POST', 
            contentType: "application/json", 
            data: JSON.stringify(requestForEEFPos)
        }).done(function(res){
            if (res.length)
            {
                console.log(res.length + " solutions found");
                var kukaIKSolutionId = 0;
                var minDistance = 0;
                for (var i = 0; i < res.length; i++)
                {
                    var solution = new THREE.Vector3(res[i].x, res[i].y, res[i].z);
                    var solutionDistance = solution.distanceTo(endEffectorPos);
                    if (solutionDistance < minDistance || i == 0)
                    {
                        kukaIKSolutionId = i;
                        minDistance = solutionDistance;
                    }
                }

                var kukaIK = res[kukaIKSolutionId];

                // get l4 angle to eef
                var kukaLink1Cur = activeObjects["kukaLink1"].rotation.y;
                var kukaLink2Cur = activeObjects["kukaLink2"].rotation.z;
                var kukaLink3Cur = activeObjects["kukaLink3"].rotation.z;
                var kukaLink4Cur = activeObjects["kukaLink4"].rotation.z;


                if (kukaIK.l1 == null)
                {
                    kukaIK.l1 = ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1;
                    activeObjects["kukaLink1"].rotation.y = kukaIK.l1;
                }
                else
                {
                    activeObjects["kukaLink1"].rotation.y = self.l1;
                    kukaIK.l1 = self.l1;
                }
                activeObjects["kukaLink2"].rotation.z = kukaIK.l2;
                activeObjects["kukaLink3"].rotation.z = kukaIK.l3;
                activeObjects["kukaLink4"].rotation.z = 0;

                activeObjects["kukaBase"].updateMatrixWorld();
                var l4Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink4"].matrixWorld);
                var l5Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink5"].matrixWorld);
                var l4EEFDir = l4Pos.clone().sub(endEffectorPos); 
                var l4l5Dir  = l4Pos.clone().sub(l5Pos); 

                self.getVlabScene().remove(activeObjects["arrowHelper1"]);
                self.getVlabScene().remove(activeObjects["arrowHelper2"]);
/*
                activeObjects["arrowHelper1"] = new THREE.ArrowHelper(l4EEFDir.clone().normalize().negate(), l4Pos, l4EEFDir.length(), 0xffffff, 0.1, 0.1);
                activeObjects["arrowHelper2"] = new THREE.ArrowHelper(l4l5Dir.clone().normalize().negate(), l4Pos, l4l5Dir.length(), 0xffffff, 0.1, 0.1);
                self.getVlabScene().add(activeObjects["arrowHelper1"]);
                self.getVlabScene().add(activeObjects["arrowHelper2"]);
*/
                var l4 = l4EEFDir.angleTo(l4l5Dir);

                activeObjects["kukaLink1"].rotation.y = kukaLink1Cur;
                activeObjects["kukaLink2"].rotation.z = kukaLink2Cur;
                activeObjects["kukaLink3"].rotation.z = kukaLink3Cur;
                activeObjects["kukaLink4"].rotation.z = kukaLink4Cur;

                // set links
                var kukaLink1 = new TWEEN.Tween(activeObjects["kukaLink1"].rotation);
                kukaLink1.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink1.to({y: kukaIK.l1}, 3000);
                kukaLink1.start();
                var kukaLink2 = new TWEEN.Tween(activeObjects["kukaLink2"].rotation);
                kukaLink2.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink2.to({z: kukaIK.l2}, 3000);
                kukaLink2.start();
                var kukaLink3 = new TWEEN.Tween(activeObjects["kukaLink3"].rotation);
                kukaLink3.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink3.to({z: kukaIK.l3}, 3000);
                kukaLink3.start();
                var kukaLink4 = new TWEEN.Tween(activeObjects["kukaLink4"].rotation);
                kukaLink4.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink4.to({z: -l4}, 3000);
                kukaLink4.start();
/*
                var bone1 = new TWEEN.Tween(cableSleeveArmature[3].rotation);
                bone1.easing(TWEEN.Easing.Cubic.InOut);
                bone1.to({z: kukaIK.l2}, 3000);
                bone1.start();
*/
            }
            else
            {
                console.log("Solution not found");
            }
        });
    };

    var da = (Math.PI * 2) / 720;
    var dal1 = (Math.PI * 2) / 360;
    var l1cnt = 0;

    var dataArr = [];

    var process = function()
    {
        var efPos = getEndEffectorPos();

        dataArr.push([efPos.x, 
                      efPos.y, 
                      efPos.z, 
                      activeObjects["kukaLink1"].rotation.y.toFixed(2), 
                      activeObjects["kukaLink2"].rotation.z.toFixed(2), 
                      activeObjects["kukaLink3"].rotation.z.toFixed(2), 
                      activeObjects["kukaLink4"].rotation.z.toFixed(2)]);

        if (dataArr.length > 999)
        {
            $.ajax({
                url: "http://127.0.0.1:11111/xyz", 
                type: 'POST', 
                contentType: "application/json", 
                data: JSON.stringify(dataArr)
            });
            dataArr = [];
        }

/*
        if (activeObjects["kukaLink4"].rotation.z > kukaLink4MaxAngle)
        {
            activeObjects["kukaLink4"].rotateZ(-da * 2);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["kukaLink4"].rotation.z = 0;
        }
*/
        if (activeObjects["kukaLink3"].rotation.z > kukaLink3MaxAngle)
        {
            activeObjects["kukaLink3"].rotateZ(-da);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["kukaLink3"].rotation.z = 0;
        }

        if (activeObjects["kukaLink2"].rotation.z > kukaLink2MaxAngle)
        {
            activeObjects["kukaLink2"].rotateZ(-da);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["kukaLink2"].rotation.z = 0;
            activeObjects["kukaLink1"].rotation.y = 0;
            $.ajax({
                url: "http://127.0.0.1:11111/xyz", 
                type: 'POST', 
                contentType: "application/json", 
                data: JSON.stringify(dataArr)
            });
        }
/*
        if (l1cnt < 90)
        {
            activeObjects["kukaLink1"].rotateY(-dal1);
            l1cnt++;
            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["kukaLink1"].rotation.y = 0;
            $.ajax({
                url: "http://127.0.0.1:11111/xyz", 
                type: 'POST', 
                contentType: "application/json", 
                data: JSON.stringify(dataArr)
            });
        }
*/
    };

    var getEndEffectorPos = function()
    {
        activeObjects["kukaBase"].updateMatrixWorld();
        var endEffectorPos = new THREE.Vector3().setFromMatrixPosition(activeObjects["kukaLink4"].matrixWorld);
        endEffectorPos.x = endEffectorPos.x.toFixed(2);
        endEffectorPos.y = endEffectorPos.y.toFixed(2);
        endEffectorPos.z = endEffectorPos.z.toFixed(2);
        return endEffectorPos;
    }

    var simulationStep = function()
    {

        activeObjects["kukaBase"].updateMatrixWorld();

        var pos1 = activeObjects["kukaSleeveFixture2"].position.clone();
        var pos2 = pos1.clone();
        pos2.y += 1.4;
        pos2.x -= 0.4;
        var pos4 = activeObjects["kukaSleeveFixture3"].position.clone();
        var pos3 = pos4.clone();
        pos3.y -= 1.1;
        pos3.x -= 0.2;


        pos1 = activeObjects["kukaLink2"].localToWorld(pos1);
        pos2 = activeObjects["kukaLink2"].localToWorld(pos2);
        pos3 = activeObjects["kukaLink3"].localToWorld(pos3);
        pos4 = activeObjects["kukaLink3"].localToWorld(pos4);

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos2,
            pos3,
            pos4
        ]);

        var path = new THREE.CatmullRomCurve3([pos1, pos2, pos3, pos4]);
        //path.type = 'chordal';
        path.closed = false;
        geometry = new THREE.TubeBufferGeometry(path, 18, 0.06, 4, false);
        cableSleeve.geometry = geometry;
        geometry = null;

/*
        path.type = 'chordal';
        path.closed = false;
        var extrudeSettings = {
            steps        : 8,
            bevelEnabled : false,
            curveSegments: 2,
            extrudePath  : path
        };

        var geometry = new THREE.ExtrudeGeometry(circleShape, extrudeSettings);
        cableSleeve.geometry = geometry;
        cableSleeve.geometry.computeVertexNormals();

        //skeletonHelper.update();
        if (skeleton != undefined)
        {
            skeleton.bones[1].rotation.y += -0.001;
        }
*/
    };

    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);

}
