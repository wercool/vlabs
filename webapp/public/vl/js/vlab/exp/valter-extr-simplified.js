"use strict";

class ValterExtrSimplified
{
    constructor (vlab, pos, id, drawHelpers)
    {
        var self = this;
        this.id = id;
        this.vlab = vlab;
        this.initialized = false;
        this.model = undefined;
        this.initialModelPosition = pos;
        this.valterJSON = "/vl/models/valter/valter-extr-simplified.json";

        this.vlab.trace("Valter initializing...");

        this.baseName = "Base_" + this.id;
        this.bodyName = "Body_" + this.id;

        this.activeObjects = {};

        var loader = new THREE.ObjectLoader();
        loader.convertUpAxis = true;
        loader.load(this.valterJSON, this.initialize.bind(this), this.sceneLoading.bind(this));


        //relative to Body
        this.bodyKinectLaserOrigin = new THREE.Vector3(0.0426914, 0.2174475, 0.3071102);
        this.bodyKinectPCLOriginObject3D = undefined;

        addEventListener("simulationStep", this.simulationStep.bind(this), false);

        this.drawHelpers = drawHelpers;
    }

    sceneLoading(bytes)
    {
        this.vlab.trace("Valter " + ((bytes.loaded / bytes.total) * 100).toFixed(2) + "% loaded");
    }

    initialize(valterScene)
    {
        var ValterRef = this;

        this.model = valterScene.children[0];

        /**********************************************************/
        /**********************************************************/
        /***********************SPECIFIC***************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        this.model.name += "_" + ValterRef.id;
        this.model.children[0].name += "_" + ValterRef.id;
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/

        this.model.position.copy(this.initialModelPosition);
        this.vlab.getVlabScene().add(this.model);

        this.model.updateMatrixWorld();

        this.activeObjects[this.baseName] = this.vlab.getVlabScene().getObjectByName(this.baseName);
        this.activeObjects[this.bodyName] = this.vlab.getVlabScene().getObjectByName(this.bodyName);


        var manipulationObjectGeometry = new THREE.SphereGeometry(0.025, 24, 24);
        var manipulationObjectMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
        this.manipulationObject = new THREE.Mesh(manipulationObjectGeometry, manipulationObjectMaterial);
        this.manipulationObject.name = "manipulationObject";
        this.manipulationObject.position.copy(new THREE.Vector3(0.0, 0.0, 0.0));


        if (this.drawHelpers)
        {
            var control = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
            control.addEventListener("change", function(){
                                        //console.log(this.model.position);
                                        if (this.vlab.pressedKey == 82) //r
                                        {
                                            if (control.getMode() != "rotate")
                                            {
                                                control.setMode("rotate");
                                            }
                                        }
                                        if (this.vlab.pressedKey == 84) //t
                                        {
                                            if (control.getMode() != "translate")
                                            {
                                                control.setMode("translate");
                                            }
                                        }
    //                                            console.log("Position: ", this.model.position);
                                    }.bind(this));
            control.attach(this.model);
            control.setSize(1.0);
            this.vlab.getVlabScene().add(control);

            //dummy manipulation object

            this.vlab.getVlabScene().add(this.manipulationObject);

            this.manipulationObjectControl = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
            this.manipulationObjectControl.addEventListener("change", function(){
                                                            if (this.vlab.pressedKey != null)
                                                            {
                                                                if (this.vlab.pressedKey == 17) //ctrlKey
                                                                {
                                                                    console.log(this.manipulationObject.position.x.toFixed(5),
                                                                                this.manipulationObject.position.y.toFixed(5),
                                                                                this.manipulationObject.position.z.toFixed(5));
                                                                }
                                                            }
                                                        }.bind(this));
            this.manipulationObjectControl.attach(this.manipulationObject);
            this.manipulationObjectControl.setSize(1.0);
            this.vlab.getVlabScene().add(this.manipulationObjectControl);
        }


        if (this.drawHelpers)
        {
            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.model.matrix);
            var valterForwardDirection = new THREE.Vector3(0, 1, 0);
            valterForwardDirection.applyMatrix4(matrix);
            this.activeObjects["valterForwardDirectionVector"] = new THREE.ArrowHelper(valterForwardDirection, this.model.position, 1.5, 0x0000ff, 0.1, 0.05);
            this.vlab.getVlabScene().add(this.activeObjects["valterForwardDirectionVector"]);
        }


        this.jointLimits = {
            baseYawMin: -6.28,
            baseYawMax: 0.0,
            bodyYawMin: -1.57,
            bodyYawMax: 1.57,
        };


        if (this.drawHelpers)
        {
            var GUIcontrols1 = new dat.GUI();
            GUIcontrols1.add(this.model.rotation, 'z', this.jointLimits.baseYawMin, this.jointLimits.baseYawMax).name("Base Yaw").step(0.01);
            GUIcontrols1.add(this.activeObjects[this.bodyName].rotation, 'z', this.jointLimits.bodyYawMin, this.jointLimits.bodyYawMax).name("Body Yaw").step(0.01);
        }

        var self = this;

        this.initialized = true;
    }

    simulationStep(event)
    {
        if (this.initialized)
        {
            var valterRef = this;

            if (this.drawHelpers)
            {
                var matrix = new THREE.Matrix4();
                matrix.extractRotation(this.model.matrix);
                var valterForwardDirection = new THREE.Vector3(0, 1, 0);
                valterForwardDirection.applyMatrix4(matrix);
                this.activeObjects["valterForwardDirectionVector"].setDirection(valterForwardDirection);
                this.activeObjects["valterForwardDirectionVector"].position.copy(this.model.position.clone());
            }


            valterRef.bodyKinectPCL();
        }
    }

    bodyKinectPCL()
    {
        if (this.bodyKinectPCLOriginObject3D == undefined)
        {
            this.bodyKinectPCLOriginObject3D = new THREE.Object3D();
            this.bodyKinectPCLOriginObject3D.position.copy(this.bodyKinectLaserOrigin);
            this.activeObjects[this.bodyName].add(this.bodyKinectPCLOriginObject3D);

            this.activeObjects[this.bodyName].updateMatrixWorld();

            var bodyKinectPCLOrigin = new THREE.Vector3().setFromMatrixPosition(this.bodyKinectPCLOriginObject3D.matrixWorld);

            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.activeObjects[this.bodyName].matrixWorld);

            if (this.drawHelpers)
            {
                this.activeObjects["bodyKinectPCLLines"] = [];
            }

            this.activeObjects["bodyKinectPCLRaycasters"] = [];
            var dx = -1.0;
            for (var i = 0; i < 200; i++)
            {
                var bodyKinectPCLBaseDirection = new THREE.Vector3(dx, 1.0, 0);
                bodyKinectPCLBaseDirection.applyMatrix4(matrix);
                dx += 0.01;

                if (this.drawHelpers)
                {
                    this.activeObjects["bodyKinectPCLLines"][i] = new THREE.ArrowHelper(bodyKinectPCLBaseDirection, bodyKinectPCLOrigin, 3.0, 0xffffff, 0.0001, 0.0001);
                    this.vlab.getVlabScene().add(this.activeObjects["bodyKinectPCLLines"][i]);
                }

                this.activeObjects["bodyKinectPCLRaycasters"][i] = new THREE.Raycaster();
                this.activeObjects["bodyKinectPCLRaycasters"][i].set(bodyKinectPCLOrigin, bodyKinectPCLBaseDirection);
            }

            this.activeObjects["bodyKinectItersectObjects"] = [];
            for (var objId in this.vlab.vlabNature.bodyKinectItersectObjects)
            {
                this.activeObjects["bodyKinectItersectObjects"][objId] = this.vlab.getVlabScene().getObjectByName(this.vlab.vlabNature.bodyKinectItersectObjects[objId])
            }

            var pclMaterial = new THREE.PointsMaterial({
              color: 0x00ff00,
              size: 0.05
            });
            this.activeObjects["bodyKinectItersectPCLGeometry"] = new THREE.Geometry();
            this.activeObjects["bodyKinectItersectPCL"] = new THREE.Points(this.activeObjects["bodyKinectItersectPCLGeometry"], pclMaterial);
            this.vlab.getVlabScene().add(this.activeObjects["bodyKinectItersectPCL"]);
        }
        else
        {
            this.activeObjects[this.bodyName].updateMatrixWorld();
            var bodyKinectPCLOrigin = new THREE.Vector3().setFromMatrixPosition(this.bodyKinectPCLOriginObject3D.matrixWorld);
 
            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.activeObjects[this.bodyName].matrixWorld);

            this.activeObjects["bodyKinectItersectPCLGeometry"].dispose();
            this.activeObjects["bodyKinectItersectPCLGeometry"] = new THREE.Geometry();

            var dx = -1.0;
            for (var i = 0; i < 200; i++)
            {
                var bodyKinectPCLBaseDirection = new THREE.Vector3(dx, 1.0, 0);
                bodyKinectPCLBaseDirection.applyMatrix4(matrix).normalize();
                dx += 0.01;

                if (this.drawHelpers)
                {
                    this.activeObjects["bodyKinectPCLLines"][i].position.copy(bodyKinectPCLOrigin);
                    this.activeObjects["bodyKinectPCLLines"][i].setDirection(bodyKinectPCLBaseDirection);
                }

                this.activeObjects["bodyKinectPCLRaycasters"][i].set(bodyKinectPCLOrigin, bodyKinectPCLBaseDirection);

                var intersects = this.activeObjects["bodyKinectPCLRaycasters"][i].intersectObjects(this.activeObjects["bodyKinectItersectObjects"]);
                if (intersects.length > 0)
                {
                    if (intersects[0].distance < 4.0)
                    {
                        if (intersects[0].distance > 0.8)
                        {
                            if (this.drawHelpers)
                            {
                                this.activeObjects["bodyKinectPCLLines"][i].setLength(intersects[0].distance, 0.0001, 0.0001);
                                this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xffffff));
                            }

                            this.activeObjects["bodyKinectItersectPCLGeometry"].vertices.push(intersects[0].point);
                        }
                        else
                        {
                            if (this.drawHelpers)
                            {
                                this.activeObjects["bodyKinectPCLLines"][i].setLength(intersects[0].distance, 0.0001, 0.0001);
                                this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xbdbdbd));
                            }
                        }
                    }
                    else
                    {
                        if (this.drawHelpers)
                        {
                            this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                            this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                        }
                    }
                }
                else
                {
                    if (this.drawHelpers)
                    {
                        this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                        this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                    }
                }
            }
            this.activeObjects["bodyKinectItersectPCL"].geometry = this.activeObjects["bodyKinectItersectPCLGeometry"];
        }
    }
}
