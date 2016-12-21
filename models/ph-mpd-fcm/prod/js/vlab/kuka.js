function Kuka(vlab, test, basePosition, initialLinksAngles)
{
    var self = this;
    self.initialized = false;

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
            if (event.keyCode == 81) // q
            {
                self.setKuka(ikTarget.control.position.clone());
            }
            if (event.keyCode == 69) //e
            {
                self.kukaBase.updateMatrixWorld();
                var link5Tip = new THREE.Vector3().setFromMatrixPosition(self.kukaLink5.matrixWorld);
                vlab.trace("Kuka EEF pos: ", link5Tip);
            }
        });
    }

    self.kukaBase = null;
    self.kukaLink1 = null;
    self.kukaLink2 = null;
    self.kukaLink3 = null;
    self.kukaLink4 = null;
    self.kukaLink5 = null;
    self.kukaLinksItialAngles = {
                                    link1:(-90 * Math.PI / 180), 
                                    link2:(45 * Math.PI / 180), 
                                    link3:(-138 * Math.PI / 180), 
                                    link4:(-75 * Math.PI / 180)
                                };

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
            self.kukaLink1.rotation.y = self.kukaLinksItialAngles.link1;
            self.kukaLink2.rotation.z = self.kukaLinksItialAngles.link2;
            self.kukaLink3.rotation.z = self.kukaLinksItialAngles.link3;
            self.kukaLink4.rotation.z = self.kukaLinksItialAngles.link4;
        }
        vlab.trace("Kuka initialized");
        self.initialized = true;
    }

    vlab.appendScene("scene/kuka.dae", sceneAppendedCallBack);

    self.path = [];
    self.positioningStage = 0;

    self.moveByPath = function(pathNodes)
    {
        if (pathNodes != undefined)
        {
            self.path = self.path.concat(pathNodes);
        }
        if (!self.initialized)
        {
            vlab.trace("Kuka initializing...");
            setTimeout(function(){ self.moveByPath(); }, 500);
            return;
        }
        if (self.path.length > 0)
        {
            if (self.positioningStage == 0)
            {
                var pathNode = self.path.shift();
                self.positioningStage = 4;
                if (pathNode.xyz != undefined)
                {
                    self.setKuka(pathNode.xyz);
                }
                if (pathNode.angles != undefined)
                {
                    self.setKukaAngles(pathNode.angles);
                }
            }
            setTimeout(function(){ self.moveByPath(); }, 250);
        }
        else
        {
            vlab.trace("Kuka path completed");
        }
    };

    self.setKuka = function(endEffectorPos)
    {
        if (!self.initialized)
        {
            vlab.trace("Kuka initializing...");
            setTimeout(function(){ self.setKuka(endEffectorPos); }, 200);
            return;
        }

        var l4l5Height = 2.0;

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
                vlab.trace(res.length + " Kuka solutions found");
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
                var link4 = l4EEFDir.angleTo(l4l5Dir);

                self.kukaLink1.rotation.y = kukaLink1Cur;
                self.kukaLink2.rotation.z = kukaLink2Cur;
                self.kukaLink3.rotation.z = kukaLink3Cur;
                self.kukaLink4.rotation.z = kukaLink4Cur;


                // set links
                var angles = {
                    link1:((requestForEEFPos.x < 0) ? -Math.PI : 0.0) + ((requestForEEFPos.x < 0) ? -1 : 1) * kukaIK.l1, 
                    link2:kukaIK.l2, 
                    link3:kukaIK.l3, 
                    link4:-link4
                };
                self.setKukaAngles(angles);
            }
            else
            {
                vlab.trace("Solution not found for Kuka EEF");
                self.path = [];
            }
        });
    };

    self.setKukaAngles = function(angles)
    {
        // set links
        var kukaLink1 = new TWEEN.Tween(self.kukaLink1.rotation);
        kukaLink1.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink1.to({y: angles.link1}, 3000);
        kukaLink1.onComplete(function(){
            self.positioningStage--;
        });
        kukaLink1.start();

        var kukaLink2 = new TWEEN.Tween(self.kukaLink2.rotation);
        kukaLink2.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink2.to({z: angles.link2}, 3000);
        kukaLink2.onComplete(function(){
            self.positioningStage--;
        });
        kukaLink2.start();

        var kukaLink3 = new TWEEN.Tween(self.kukaLink3.rotation);
        kukaLink3.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink3.to({z: angles.link3}, 3000);
        kukaLink3.onComplete(function(){
            self.positioningStage--;
        });
        kukaLink3.start();

        var kukaLink4 = new TWEEN.Tween(self.kukaLink4.rotation);
        kukaLink4.easing(TWEEN.Easing.Cubic.InOut);
        kukaLink4.to({z: angles.link4}, 3000);
        kukaLink4.onComplete(function(){
            self.positioningStage--;
        });
        kukaLink4.start();
    }
}
