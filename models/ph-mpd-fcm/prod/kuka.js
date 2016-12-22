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

    VLab.apply(self, [vlabNature]);
    self.initialize(webGLContainer);

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

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["kukaLink1"] = self.getVlabScene().getObjectByName("kukaLink1");
        activeObjects["kukaLink2"] = self.getVlabScene().getObjectByName("kukaLink2");
        activeObjects["kukaLink3"] = self.getVlabScene().getObjectByName("kukaLink3");
        activeObjects["kukaLink4"] = self.getVlabScene().getObjectByName("kukaLink4");
        activeObjects["kukaLink5"] = self.getVlabScene().getObjectByName("kukaLink5");

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

        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({color:0xFF0000, wireframe:true }) ),
            control : new THREE.TransformControls(self.getDefaultCamera(), self.WebGLRenderer.domElement)
        };
        self.getVlabScene().add(ikTarget.mesh);
        ikTarget.control.addEventListener("change", function(){});
        var endEffectorInitialPosition = new THREE.Vector3(5,0,5);
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        self.getVlabScene().add(ikTarget.control);

        self.setSceneRenderPause(false);

        window.addEventListener('keydown', function (event){
            if ( event.keyCode == 81 )
            {
                setKuka();
            }
        });


        activeObjects["kukaLink1"].rotation.y = (-90 * Math.PI / 180);
        activeObjects["kukaLink2"].rotation.z = (45 * Math.PI / 180);
        activeObjects["kukaLink3"].rotation.z = (-138 * Math.PI / 180);
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
    };

    var setKuka = function()
    {
        var l4l5Height = 2.0;

        var endEffectorPos = ikTarget.control.position.clone();
        var requestForEEFPos = endEffectorPos.clone();
        requestForEEFPos.x = (endEffectorPos.x - activeObjects["kukaBase"].position.x).toFixed(2);
        requestForEEFPos.y = (endEffectorPos.y - activeObjects["kukaBase"].position.y + l4l5Height).toFixed(2);
        requestForEEFPos.z = (endEffectorPos.z - activeObjects["kukaBase"].position.z).toFixed(2);

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

                activeObjects["kukaLink1"].rotation.y = ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1;
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
                kukaLink1.to({y: ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1}, 3000);
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
            }
            else
            {
                console.log("Solution not found");
            }
        });
    };

    var da = (Math.PI * 2) / 60;
    var dal1 = (Math.PI * 2) / 180;
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
        }

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
    };

}
