"use strict";

function Kuka(webGLContainer)
{
    var self = this;

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
    var link1MaxAngle, link2MaxAngle, link3MaxAngle, link4MaxAngle;
    var ikTarget;

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["link1"] = self.getVlabScene().getObjectByName("link1");
        activeObjects["link2"] = self.getVlabScene().getObjectByName("link2");
        activeObjects["link3"] = self.getVlabScene().getObjectByName("link3");
        activeObjects["link4"] = self.getVlabScene().getObjectByName("link4");
        activeObjects["link5"] = self.getVlabScene().getObjectByName("link5");

        activeObjects["link1"].visible = true;
        activeObjects["link2"].visible = true;
        activeObjects["link3"].visible = true;
        activeObjects["link4"].visible = true;
        activeObjects["link5"].visible = true;

        activeObjects["link1"].rotation.y = (-45 * Math.PI / 180);
        activeObjects["link2"].rotation.z = (45 * Math.PI / 180);
        activeObjects["link3"].rotation.z = (-135 * Math.PI / 180);

        link1MaxAngle = -Math.PI;
        link2MaxAngle = (-90 * Math.PI / 180);
        link3MaxAngle = (-130 * Math.PI / 180);
        link4MaxAngle = (-90 * Math.PI / 180);

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

//        process();
    };

    var setKuka = function()
    {
        var endEffectorPos = ikTarget.control.position.clone();
        var requestForEEFPos = endEffectorPos.clone();
        requestForEEFPos.x = endEffectorPos.x.toFixed(2);
        requestForEEFPos.y = (endEffectorPos.y + 2.0).toFixed(2);
        requestForEEFPos.z = endEffectorPos.z.toFixed(2);

        $.ajax({
            url: "http://127.0.0.1:11111/ikxyz", 
            type: 'POST', 
            contentType: "application/json", 
            data: JSON.stringify(requestForEEFPos)
        }).done(function(res){
            if (res.length)
            {
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

                var kukaIKEEFPos = new THREE.Vector3(kukaIK.x, kukaIK.y, kukaIK.z);
                activeObjects["kukaBase"].updateMatrixWorld();
                var l4Pos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link4"].matrixWorld);
                var l4Dir = kukaIKEEFPos.clone().sub(endEffectorPos);
                var l4 = -Math.PI / 2 + l4Dir.angleTo(l4Pos);

                var link1 = new TWEEN.Tween(activeObjects["link1"].rotation);
                link1.easing(TWEEN.Easing.Cubic.InOut);
                link1.to({y: ((endEffectorPos.x < 0) ? -Math.PI : 0.0) + ((endEffectorPos.x < 0) ? -1 : 1) * kukaIK.l1}, 3000);
                link1.start();
                var link2 = new TWEEN.Tween(activeObjects["link2"].rotation);
                link2.easing(TWEEN.Easing.Cubic.InOut);
                link2.to({z: kukaIK.l2}, 3000);
                link2.start();
                var link3 = new TWEEN.Tween(activeObjects["link3"].rotation);
                link3.easing(TWEEN.Easing.Cubic.InOut);
                link3.to({z: kukaIK.l3}, 3000);
                link3.start();
                var link4 = new TWEEN.Tween(activeObjects["link4"].rotation);
                link4.easing(TWEEN.Easing.Cubic.InOut);
                link4.to({z: l4}, 3000);
                link4.start();
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
//        console.log(efPos.x, efPos.y, efPos.z);

        dataArr.push([efPos.x, 
                      efPos.y, 
                      efPos.z, 
                      activeObjects["link1"].rotation.y.toFixed(2), 
                      activeObjects["link2"].rotation.z.toFixed(2), 
                      activeObjects["link3"].rotation.z.toFixed(2), 
                      activeObjects["link4"].rotation.z.toFixed(2)]);

        if (dataArr.length > 1000)
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
        if (activeObjects["link4"].rotation.z > link4MaxAngle)
        {
            activeObjects["link4"].rotateZ(-da * 2);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link4"].rotation.z = 0;
        }
*/
        if (activeObjects["link3"].rotation.z > link3MaxAngle)
        {
            activeObjects["link3"].rotateZ(-da);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link3"].rotation.z = 0;
        }

        if (activeObjects["link2"].rotation.z > link2MaxAngle)
        {
            activeObjects["link2"].rotateZ(-da);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link2"].rotation.z = 0;
        }

        if (l1cnt < 90)
        {
            activeObjects["link1"].rotateY(-dal1);
            l1cnt++;
            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link1"].rotation.y = 0;
        }
    };

    var getEndEffectorPos = function()
    {
        activeObjects["kukaBase"].updateMatrixWorld();
        var endEffectorPos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link4"].matrixWorld);
        endEffectorPos.x = endEffectorPos.x.toFixed(2);
        endEffectorPos.y = endEffectorPos.y.toFixed(2);
        endEffectorPos.z = endEffectorPos.z.toFixed(2);
        return endEffectorPos;
    }

    var simulationStep = function()
    {
    };

}
