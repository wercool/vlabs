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

    var scenePostBuilt = function()
    {
        activeObjects["kukaBase"] = self.getVlabScene().getObjectByName("kukaBase");
        activeObjects["link1"] = self.getVlabScene().getObjectByName("link1");
        activeObjects["link2"] = self.getVlabScene().getObjectByName("link2");
        activeObjects["link3"] = self.getVlabScene().getObjectByName("link3");
        activeObjects["link4"] = self.getVlabScene().getObjectByName("link4");
        activeObjects["link5"] = self.getVlabScene().getObjectByName("link5");

//        activeObjects["link2"].rotation.z = (-90 * Math.PI / 180);

        link1MaxAngle = -Math.PI;
        link2MaxAngle = (-90 * Math.PI / 180);
        link3MaxAngle = (-90 * Math.PI / 180);
        link4MaxAngle = (-90 * Math.PI / 180);

        self.setSceneRenderPause(false);

        process();
    };

    var da = (Math.PI * 2) / 60;
    var dal1 = (Math.PI * 2) / 180;
    var l1cnt = 0;

    var process = function()
    {
        var efPos = getEndEffectorPos();
        //console.log(efPos.x, efPos.y, efPos.z);

        $.ajax({
            url: "http://127.0.0.1:11111/ikxyz", 
            type: 'POST', 
            contentType: "application/json", 
            data: JSON.stringify({
                                    x:efPos.x, 
                                    y:efPos.y, 
                                    z:efPos.z, 
                                    l1:activeObjects["link1"].rotation.y.toFixed(2), 
                                    l2:activeObjects["link2"].rotation.z.toFixed(2), 
                                    l3:activeObjects["link3"].rotation.z.toFixed(2), 
                                    l4:activeObjects["link4"].rotation.z.toFixed(2)})
        });


        if (activeObjects["link4"].rotation.z > link4MaxAngle && efPos.y > 0)
        {
            activeObjects["link4"].rotateZ(-da * 2);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link4"].rotation.z = 0;
        }

        if (activeObjects["link3"].rotation.z > link3MaxAngle && efPos.y > 0)
        {
            activeObjects["link3"].rotateZ(-da);

            setTimeout(function(){ process(); }, 1);
            return;
        }
        else
        {
            activeObjects["link3"].rotation.z = 0;
        }

        if (activeObjects["link2"].rotation.z > link2MaxAngle && efPos.y > 0)
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
        var endEffectorPos = new THREE.Vector3().setFromMatrixPosition(activeObjects["link5"].matrixWorld);
        endEffectorPos.x = endEffectorPos.x.toFixed(2);
        endEffectorPos.y = endEffectorPos.y.toFixed(2);
        endEffectorPos.z = endEffectorPos.z.toFixed(2);
        return endEffectorPos;
    }

    var simulationStep = function()
    {
    };

}
