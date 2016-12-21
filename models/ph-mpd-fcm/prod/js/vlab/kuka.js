function Kuka(vlab, test, basePosition, initialLinksAngles)
{
    var self = this;
    if (test)
    {
        var ikTarget;
        ikTarget = {
            mesh : new THREE.Mesh( new THREE.SphereBufferGeometry(0.2),  new THREE.MeshStandardMaterial({wireframe:true, emissive:0xFFFFFF }) ),
            control : new THREE.TransformControls(vlab.getDefaultCamera(), vlab.WebGLRenderer.domElement)
        };
        vlab.getVlabScene().add(ikTarget.mesh);
        ikTarget.control.addEventListener("change", function(){});
        var endEffectorInitialPosition = new THREE.Vector3(0,0,0);
        ikTarget.mesh.position.copy(endEffectorInitialPosition);
        ikTarget.control.attach(ikTarget.mesh);
        ikTarget.control.setSize(1.0);
        vlab.getVlabScene().add(ikTarget.control);

        window.addEventListener('keydown', function (event){
            if ( event.keyCode == 81 )
            {
                setKuka();
            }
        });
    }

    self.kukaBase = null;
    self.kukaLink1 = null;
    self.kukaLink2 = null;
    self.kukaLink3 = null;
    self.kukaLink4 = null;
    self.kukaLink5 = null;

    var sceneAppendedCallBack = function(kukaMeshObjects)
    {
        self.kukaBase    = kukaMeshObjects["kukaBase"].mesh;
        self.kukaLink1   = kukaMeshObjects["kukaLink1"].mesh;
        self.kukaLink2   = kukaMeshObjects["kukaLink2"].mesh;
        self.kukaLink3   = kukaMeshObjects["kukaLink3"].mesh;
        self.kukaLink4   = kukaMeshObjects["kukaLink4"].mesh;
        self.kukaLink5   = kukaMeshObjects["kukaLink5"].mesh;

        for (var meshObjectName in kukaMeshObjects)
        {
            if (vlab.vlabNature.shadows)
            {
                kukaMeshObjects[meshObjectName].mesh.castShadow = true;
                kukaMeshObjects[meshObjectName].mesh.receiveShadow = true;
            }
            if(kukaMeshObjects[meshObjectName].isRoot)
            {
                vlab.getVlabScene().add(kukaMeshObjects[meshObjectName].mesh);
            }
        }

        initialize();
    };

    var initialize = function()
    {
        if (basePosition != undefined)
        {
            self.kukaBase.position.copy(basePosition);
        }
        if (initialLinksAngles != undefined)
        {
        }
        else
        {
            self.kukaLink1.rotation.y = (-90 * Math.PI / 180);
            self.kukaLink2.rotation.z = (45 * Math.PI / 180);
            self.kukaLink3.rotation.z = (-138 * Math.PI / 180);
            self.kukaLink4.rotation.z = (-75 * Math.PI / 180);
        }
    }

    vlab.appendScene("scene/kuka.dae", sceneAppendedCallBack);

    var setKuka = function(endEffectorPos)
    {
        var l4l5Height = 2.0;

        if (test)
        {
            var endEffectorPos = ikTarget.control.position.clone();
        }

        var requestForEEFPos = endEffectorPos.clone();
        requestForEEFPos.x = (endEffectorPos.x - self.kukaBase.position.x).toFixed(2);
        requestForEEFPos.y = (endEffectorPos.y - self.kukaBase.position.y + l4l5Height).toFixed(2);
        requestForEEFPos.z = (endEffectorPos.z - self.kukaBase.position.z).toFixed(2);

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
                var kukaLink1Cur = self.kukaLink1.rotation.y;
                var kukaLink2Cur = self.kukaLink2.rotation.z;
                var kukaLink3Cur = self.kukaLink3.rotation.z;
                var kukaLink4Cur = self.kukaLink4.rotation.z;
                self.kukaLink1.rotation.y = ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1;
                self.kukaLink2.rotation.z = kukaIK.l2;
                self.kukaLink3.rotation.z = kukaIK.l3;
                self.kukaLink4.rotation.z = 0;

                self.kukaBase.updateMatrixWorld();
                var l4Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink4.matrixWorld);
                var l5Pos = new THREE.Vector3().setFromMatrixPosition(self.kukaLink5.matrixWorld);
                var l4EEFDir = l4Pos.clone().sub(endEffectorPos); 
                var l4l5Dir  = l4Pos.clone().sub(l5Pos); 

/*
                self.getVlabScene().remove(activeObjects["arrowHelper1"]);
                self.getVlabScene().remove(activeObjects["arrowHelper2"]);

                activeObjects["arrowHelper1"] = new THREE.ArrowHelper(l4EEFDir.clone().normalize().negate(), l4Pos, l4EEFDir.length(), 0xffffff, 0.1, 0.1);
                activeObjects["arrowHelper2"] = new THREE.ArrowHelper(l4l5Dir.clone().normalize().negate(), l4Pos, l4l5Dir.length(), 0xffffff, 0.1, 0.1);
                self.getVlabScene().add(activeObjects["arrowHelper1"]);
                self.getVlabScene().add(activeObjects["arrowHelper2"]);
*/
                var l4 = l4EEFDir.angleTo(l4l5Dir);

                self.kukaLink1.rotation.y = kukaLink1Cur;
                self.kukaLink2.rotation.z = kukaLink2Cur;
                self.kukaLink3.rotation.z = kukaLink3Cur;
                self.kukaLink4.rotation.z = kukaLink4Cur;


                // set links
                var kukaLink1 = new TWEEN.Tween(self.kukaLink1.rotation);
                kukaLink1.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink1.to({y: ((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1}, 3000);
                kukaLink1.start();
                var kukaLink2 = new TWEEN.Tween(self.kukaLink2.rotation);
                kukaLink2.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink2.to({z: kukaIK.l2}, 3000);
                kukaLink2.start();
                var kukaLink3 = new TWEEN.Tween(self.kukaLink3.rotation);
                kukaLink3.easing(TWEEN.Easing.Cubic.InOut);
                kukaLink3.to({z: kukaIK.l3}, 3000);
                kukaLink3.start();
                var kukaLink4 = new TWEEN.Tween(self.kukaLink4.rotation);
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
}
