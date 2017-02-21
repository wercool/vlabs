"use strict";

class Valter
{
    constructor (vlab, pos, testMode)
    {
        this.vlab = vlab;
        this.model = undefined;
        this.initialModelPosition = pos;
        this.valterJSON = "/vl/models/valter/valter.json";
        this.testMode = testMode;
        this.vlab.trace("Valter initializing...");

        var loader = new THREE.ObjectLoader();
        loader.convertUpAxis = true;
        loader.load(this.valterJSON, this.initialize.bind(this), this.sceneLoading.bind(this));
    }

    sceneLoading(bytes)
    {
        this.vlab.trace("Valter " + ((bytes.loaded / bytes.total) * 100).toFixed(2) + "% loaded");
    }

    initialize(valterScene)
    {
        valterScene.traverse(function(obj)
        {
            obj.castShadow = false;
            obj.receiveShadow = false;
            if (obj.type == "Mesh" && !obj.material.transparent)
            {
                obj.material.side = THREE.DoubleSide;
            }
            var shadowCasted = [
                                "baseFrame", "base", "rightWheel", "rightWheelDiskBack", "leftWheel", "leftWheelDiskBack",
                                "manGripperFrame", "valterBodyP1", "valterBodyP2", "bodyFrame", "bodyFrameL", "bodyFrameR",
                                "pg20RMiddle", "pg20LMiddle"
                               ];
            if (shadowCasted.indexOf(obj.name) > -1)
            {
                obj.castShadow = true;
            }
            var shadowReceive = [
                                "cap", "valterBodyP1", "valterBodyP2"
                               ];
            if (shadowReceive.indexOf(obj.name) > -1)
            {
                obj.receiveShadow = true;
            }
            // apply opacity
            switch (obj.name)
            {
                case "bodyFrameGlass":
                    obj.material.opacity = 0.35;
                break;
                case "headGlass":
                    obj.material.opacity = 0.3;
                break;
                case "valterBodyP1":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "valterBodyP2":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "bodyKinectFrame":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "neckFabrickCover":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover1":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover2":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover3":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover4":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover5":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover6":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover7":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover8":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover9":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "armCover10":
                    obj.material.side = THREE.DoubleSide;
                break;
                case "forearmCover":
                    obj.material.side = THREE.DoubleSide;
                break;
                default:
                    if (obj.material != undefined)
                    {
                        obj.material.side = THREE.FrontSide;
                    }
                break;
            }
        });

        this.model = valterScene.children[0];
        this.model.scale.set(13.25, 13.25, 13.25);
        this.model.position.copy(this.initialModelPosition);
        this.vlab.getVlabScene().add(this.model);

        if (this.testMode)
        {
            var control = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
            control.addEventListener("change", function(){console.log(this.model.position.y);}.bind(this));
            control.attach(this.model);
            control.setSize(1.0);
            this.vlab.getVlabScene().add(control);
        }
    }
}
