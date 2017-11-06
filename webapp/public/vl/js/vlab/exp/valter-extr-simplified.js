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
        this.initialModelRotation = undefined;
        this.valterJSON = "/vl/models/valter/valter-extr-simplified.json";

        this.killed = false;

        this.successDiff = Infinity;

        this.backMovement = 0;
        this.inPlaceRotation = 0;
        this.stuckedIn = 0;
        this.prevRotDirection = 1;
        this.prevPathLength = 0.0;
        this.initialX = 0.0;
        this.initialZ = 0.0;

        this.curLinVel = 0.0;
        this.curRotVel = 0.0;


        this.BBox = undefined;
        this.BBoxHelper = undefined;

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
        this.drawPCL = true;

        self.baseMovementPresets = {
            "maxAllowedDuty": 35,
            "minAllowedDuty": 10,
            "leftMotorDuty": 10,
            "rightMotorDuty": 10,
            "maxLinVel": 0.15,
            "maxAngVel": 0.45,
            "lengthBetweenTwoWheels": 0.385,
            "speedMultiplier": 1.0,
        };

        self.navANN = {
            "inNeurons": 203,
            "layers":[
            {
                    "name":"hl1",
                    "neurons": 100,
                    "biases":[],
                    "weights":[]
            },
            // {
            //         "name":"hl2",
            //         "neurons": 20,
            //         "biases":[],
            //         "weights":[]
            // },
            // {
            //         "name":"hl3",
            //         "neurons": 4,
            //         "biases":[],
            //         "weights":[]
            // },
            {
                    "name":"outl",
                    "neurons": 2,
                    "biases":[],
                    "weights":[]
            }],
            "survived": 0,
            deepCopy: function(refNavANN)
            {
                for (var l in this.layers)
                {
                    for (var bi = 0; bi < this.layers[l].biases.length; bi++)
                    {
                        this.layers[l].biases[bi] = refNavANN.layers[l].biases[bi];
                    }
                    for (var wni = 0; wni < this.layers[l].weights.length; wni++)
                    {
                        for (var wi = 0; wi < this.layers[l].weights[wni].length; wi++)
                        {
                            this.layers[l].weights[wni][wi] = refNavANN.layers[l].weights[wni][wi];
                        }
                    }
                }
            },
            mutate: function(mutationScale=0.1, mutationStrength=0.1)
            {
                for (var l in this.layers)
                {
                    var layerBiasesMutedNum = Math.round(this.layers[l].biases.length * mutationScale);

                    for (var bm = 0; bm < layerBiasesMutedNum; bm++)
                    {
                        var randBiasId = getRandomInt(0, this.layers[l].neurons - 1);
                        this.layers[l].biases[randBiasId] = getRandomArbitrary(-1*mutationStrength, mutationStrength);
                    }

                    var layerNeuronWeightsMutatedNum = Math.round(this.layers[l].weights.length * mutationScale);
                    for (var wni = 0; wni < layerNeuronWeightsMutatedNum; wni++)
                    {
                        var randNeuronWeightsId = getRandomInt(0, this.layers[l].weights.length - 1);
                        var neuronWeightsMutatedNum = Math.round(this.layers[l].weights[randNeuronWeightsId].length * mutationScale);
                        for (var wi = 0; wi < neuronWeightsMutatedNum; wi++)
                        {
                            var randWeightId = getRandomInt(0, this.layers[l].weights[randNeuronWeightsId].length - 1);
                            this.layers[l].weights[randNeuronWeightsId][randWeightId] = getRandomArbitrary(-1*mutationStrength, mutationStrength);
                        }
                    }

                    // console.log(this.layers[l].name, layerNeuronWeightsMutatedNum);
                }
            }
        };
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
        this.model.children[0].material.color = this.model.material.color;
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/
        /**********************************************************/

        this.model.position.copy(this.initialModelPosition);
        this.initialModelRotation = this.model.rotation.z;
        this.vlab.getVlabScene().add(this.model);

        this.model.visible = false;

        this.model.updateMatrixWorld();

        this.activeObjects[this.baseName] = this.vlab.getVlabScene().getObjectByName(this.baseName);
        this.activeObjects[this.bodyName] = this.vlab.getVlabScene().getObjectByName(this.bodyName);

        if (this.drawHelpers)
        {
            var control = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
            control.addEventListener("change", function(){
                                        //console.log(this.model.position);
                                        this.model.position.y = 0.0;
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
        }


        // if (this.drawHelpers)
        // {
            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.model.matrix);
            this.valterForwardDirection = new THREE.Vector3(0, 1, 0);
            this.valterForwardDirection.applyMatrix4(matrix);
            this.activeObjects["valterForwardDirectionVector"] = new THREE.ArrowHelper(this.valterForwardDirection, this.model.position, 1.5, 0x0000ff, 0.1, 0.05);
            this.vlab.getVlabScene().add(this.activeObjects["valterForwardDirectionVector"]);
        // }


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

        this.initialX = this.model.position.x;
        this.initialZ = this.model.position.z;
    }

    simulationStep(event)
    {
        if (!this.killed)
        {
            if (this.initialized)
            {
                var valterRef = this;
                var matrix = new THREE.Matrix4();
                matrix.extractRotation(this.model.matrix);
                this.valterForwardDirection = new THREE.Vector3(0, 1, 0);
                this.valterForwardDirection.applyMatrix4(matrix);
                this.activeObjects["valterForwardDirectionVector"].setDirection(this.valterForwardDirection);
                this.activeObjects["valterForwardDirectionVector"].position.copy(this.model.position.clone());
            }
        }
    }

    addValterToTargetPoseDirectionVector()
    {
        var valterXZPos = this.model.position.clone();
        valterXZPos.y = 0.0;
        var targetPoseXZPos = this.vlab.poseTarget.position.clone();
        targetPoseXZPos.y = 0.0;
        this.valterToTargetPoseDirectionVector = targetPoseXZPos.sub(valterXZPos);
        this.valterToTargetPoseDirectionVectorLength = this.valterToTargetPoseDirectionVector.clone().length();
        this.valterToTargetPoseDirectionVector.normalize();
        this.activeObjects["valterToTargetPoseDirectionVector"] = new THREE.ArrowHelper(this.valterToTargetPoseDirectionVector, this.model.position, this.valterToTargetPoseDirectionVectorLength, this.model.material.color, 0.1, 0.05);
        this.vlab.getVlabScene().add(this.activeObjects["valterToTargetPoseDirectionVector"]);
    }

    updateValterToTargetPoseDirectionVector()
    {
        var valterXZPos = this.model.position.clone();
        valterXZPos.y = 0.0;
        var targetPoseXZPos = this.vlab.poseTarget.position.clone();
        targetPoseXZPos.y = 0.0;
        this.valterToTargetPoseDirectionVector = targetPoseXZPos.sub(valterXZPos);
        this.valterToTargetPoseDirectionVectorLength = this.valterToTargetPoseDirectionVector.clone().length();
        if (this.valterToTargetPoseDirectionVectorLength > 0.1)
        {
            this.valterToTargetPoseDirectionVector.normalize();
            this.activeObjects["valterToTargetPoseDirectionVector"].position.copy(valterXZPos);
            this.activeObjects["valterToTargetPoseDirectionVector"].setLength(this.valterToTargetPoseDirectionVectorLength, 0.1, 0.05);
            this.activeObjects["valterToTargetPoseDirectionVector"].setDirection(this.valterToTargetPoseDirectionVector);
        }

        if (this.valterToTargetPoseDirectionVectorLength < 2.0)
        {
            this.successDiff = this.valterToTargetPoseDirectionVectorLength + Math.abs(this.curLinVel) + Math.abs(this.curRotVel);
        }
        else
        {
            this.successDiff = this.valterToTargetPoseDirectionVectorLength;
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

            if (this.drawPCL)
            {
                var pclMaterial = new THREE.PointsMaterial({
                  color: this.model.material.color,
                  size: 0.05
                });
                this.activeObjects["bodyKinectItersectPCLGeometry"] = new THREE.Geometry();
                this.activeObjects["bodyKinectItersectPCL"] = new THREE.Points(this.activeObjects["bodyKinectItersectPCLGeometry"], pclMaterial);
                this.vlab.getVlabScene().add(this.activeObjects["bodyKinectItersectPCL"]);
            }

            this.bodyKinectPCL();
        }
        else
        {
            this.activeObjects[this.bodyName].updateMatrixWorld();
            var bodyKinectPCLOrigin = new THREE.Vector3().setFromMatrixPosition(this.bodyKinectPCLOriginObject3D.matrixWorld);
 
            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.activeObjects[this.bodyName].matrixWorld);

            if (this.drawPCL)
            {
                this.activeObjects["bodyKinectItersectPCLGeometry"].dispose();
                this.activeObjects["bodyKinectItersectPCLGeometry"] = new THREE.Geometry();
            }

            this.activeObjects["bodyKinectPCLPointsDistances"] = [];

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

                            if (this.drawPCL)
                            {
                                this.activeObjects["bodyKinectItersectPCLGeometry"].vertices.push(intersects[0].point);
                            }
                        }
                        else
                        {
                            if (this.drawHelpers)
                            {
                                this.activeObjects["bodyKinectPCLLines"][i].setLength(intersects[0].distance, 0.0001, 0.0001);
                                this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xbdbdbd));
                            }
                        }

                        this.activeObjects["bodyKinectPCLPointsDistances"][i] = intersects[0].distance;
                    }
                    else
                    {
                        if (this.drawHelpers)
                        {
                            this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                            this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                        }

                        this.activeObjects["bodyKinectPCLPointsDistances"][i] = 4.0;
                    }
                }
                else
                {
                    if (this.drawHelpers)
                    {
                        this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                        this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                    }

                    this.activeObjects["bodyKinectPCLPointsDistances"][i] = 4.0;
                }
            }

            if (this.drawPCL)
            {
                this.activeObjects["bodyKinectItersectPCL"].geometry = this.activeObjects["bodyKinectItersectPCLGeometry"];
            }
        }
    }

    setCmdVel(linVel, angVel)
    {
        this.curLinVel = linVel;
        this.curRotVel = angVel;

        var angVelDuty = (angVel * this.baseMovementPresets.maxAllowedDuty) / this.baseMovementPresets.maxAngVel;
        var linVelDuty = (linVel * this.baseMovementPresets.maxAllowedDuty) / this.baseMovementPresets.maxLinVel;

        var leftMotorDuty  = linVelDuty - angVelDuty;
        var rightMotorDuty = linVelDuty + angVelDuty;

        var vz  = ((rightMotorDuty + leftMotorDuty) / 2) * this.baseMovementPresets.speedMultiplier;
        var vx  = 0;
        var vth = ((rightMotorDuty - leftMotorDuty) / this.baseMovementPresets.lengthBetweenTwoWheels) * this.baseMovementPresets.speedMultiplier;

        var curPos = this.model.position.clone();
        var curRot = this.model.rotation.clone();

        var curPositionX = curPos.x;
        var curPositionZ = curPos.z;
        var curTh = curRot.z;

        var delta_z = (vz * Math.cos(curTh));
        var delta_x = (vz * Math.sin(curTh));
        var delta_th = vth;

        curPositionZ    -= delta_z;
        curPositionX    -= delta_x;
        curTh           += delta_th;

        this.model.position.z = curPositionZ;
        this.model.position.x = curPositionX;
        this.model.rotation.z = curTh;
    }

    initNavANN()
    {
        var randRange = 0.01;

        for (var l = 0; l < this.navANN.layers.length; l++)
        {
            for (var b = 0; b < this.navANN.layers[l].neurons; b++)
            {
                this.navANN.layers[l].biases[b] = getRandomArbitrary(-1*randRange, randRange);
            }


            if (this.navANN.layers[l].name == "hl1")
            {
                for (var i = 0; i < this.navANN.inNeurons; i++)
                {
                    this.navANN.layers[l].weights[i] = [];
                    for (var b = 0; b < this.navANN.layers[l].neurons; b++)
                    {
                        this.navANN.layers[l].weights[i][b] = getRandomArbitrary(-1*randRange, randRange);
                    }
                }
            }
            else
            {
                for (var i = 0; i < this.navANN.layers[l - 1].neurons; i++)
                {
                    this.navANN.layers[l].weights[i] = [];
                    for (var b = 0; b < this.navANN.layers[l].neurons; b++)
                    {
                        this.navANN.layers[l].weights[i][b] = getRandomArbitrary(-1*randRange, randRange);
                    }
                }
            }
        }
        // console.log(this.navANN);
    }

    navANNFeedForward(input)
    {
        var output = [];

        var net = this.navANN;

        // http://harthur.github.io/brain/
        for (var l = 0; l < net.layers.length; l++)
        {
            output = [];
            for (var bi = 0; bi < net.layers[l].biases.length; bi++)
            {
                var sum = net.layers[l].biases[bi];
                for (var i = 0; i < input.length; i++)
                {
                    sum += net.layers[l].weights[i][bi] * input[i];
                }
                if (net.layers[l].name != "outl")
                {
                    output[bi] = (1 / (1 + Math.exp(-sum)));
                }
                else
                {
                    output[bi] = sum;
                }
            }
            input = output;
        }

        return output;
    }
}
