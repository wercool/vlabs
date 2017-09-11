"use strict";

class Valter
{
    constructor (vlab, pos, testMode, executeScriptOnStart, scale)
    {
        var self = this;
        this.vlab = vlab;
        this.initialized = false;
        this.model = undefined;
        this.initialModelPosition = pos;
        this.scale = scale;
        this.scaleFactor = 13.25;
        this.valterJSON = "/vl/models/valter/valter.json";
        this.testMode = testMode;
        if (typeof executeScriptOnStart !== "undefined")
        {
            if (executeScriptOnStart)
            {
                this.executeScriptOnStart = true;
            }
            else
            {
                this.executeScriptOnStart = false;
            }
        }

        this.vlab.trace("Valter initializing...");

        this.activeObjects = {};
        this.handGrasping = {
            right: 0.0,
            left:  0.0
        };

        var loader = new THREE.ObjectLoader();
        loader.convertUpAxis = true;
        loader.load(this.valterJSON, this.initialize.bind(this), this.sceneLoading.bind(this));

        this.prevValterBasePosition = new THREE.Vector3(0,0,0);

        //cable sleeves
        this.cableSleeveMaterial = null;
        this.headToBodyCableSleeve = null;
        this.baseToBodyRCableSleeve = null;
        this.baseToBodyLCableSleeve = null;
        this.bodyToTorsoRCableSleeve = null;
        this.bodyToTorsoLCableSleeve = null;

        this.coveringsVisibility = true;

        this.initialValuesArray = {};

        this.settings = {
            coveringsVisibility: true,
            annIK: false
        };

        this.scriptLines = [];

        this.joints = {
            baseYaw: 0.0,
            bodyYaw: 0.0,
            bodyTilt: 0.0,
            headYaw: 0.0,
            headTilt: 0.0,
            rightArm: 0.0,
            leftArm: 0.0,
            rightLimb: 0.0,
            leftLimb: 0.0,
            rightShoulder: 0.0,
            leftShoulder: 0.0,
            rightForearm: 0.0,
            leftForearm: 0.0,
            leftPalmYaw: 0.0,
            rightPalmYaw: 0.0,
            rightForearmRoll: 0.0,
            leftForearmRoll: 0.0,
        };

        this.jointLimits = {
            baseYawMin: -6.28,
            baseYawMax: 0.0,
            bodyYawMin: -1.57,
            bodyYawMax: 1.57,
            bodyTiltMin: -0.8,
            bodyTiltMax: 0.0,
            headYawMin: -4.42,
            headYawMax: -1.86,
            headTiltMin: -2.85,
            headTiltMax: -1.8,
            rightArmMin: -2.57,
            rightArmMax: -1.22,
            leftArmMin: -2.57,
            leftArmMax: -1.22,
            rightLimbMin: -0.85,
            rightLimbMax: 1.4,
            leftLimbMin: 0.0,
            leftLimbMax: 0.0,
            rightShoulderMin: 0.0,
            rightShoulderMax: 1.0,
            leftShoulderMin: -1.0,
            leftShoulderMax: 0.0,
            rightForearmMin: -0.5,
            rightForearmMax: 1.0,
            leftForearmMin: -0.5,
            leftForearmMax: 1.0,
            leftPalmYawMin: -0.5,
            leftPalmYawMax: 0.5,
            rightPalmYawMin: -0.5,
            rightPalmYawMax: 0.5,
            rightForearmRollMin: -3.14,
            rightForearmRollMax: 0.0,
            leftForearmRollMin: -3.14,
            leftForearmRollMax: 0.0,
            rightForearmYawMin: -0.25,
            rightForearmYawMax: 0.4,
            leftForearmYawMin: -0.25,
            leftForearmYawMax: 0.4
        };

        this.jointsTweens = {
            baseYaw: null,
            bodyYaw: null,
            bodyTilt: null,
            headYaw: null,
            headTilt: null,
            rightLimb: null,
            leftLimb: null,
            rightForearm: null,
            leftForearm: null,
            rightForearmRoll: null,
            leftForearmRoll: null,
            rightHandGrasp: null,
            leftHandGrasp: null,
            rightShoulder: null,
            leftShoulder: null,
            leftArm: null,
            rightArm: null,
        };

        this.navigating = false;

        this.delayedCalls = [];

        this.mouthPanelFrames = [];

        this.guiControls = {
            say:function(){
                var textToSay = prompt("Text to say", "Привет!");

                if (textToSay != null)
                {
                    self.say(textToSay);
                }
            },
            talk:function(){
                var inputMessage = prompt("Talk to Valter", "Hello!");

                if (inputMessage != null)
                {
                    self.talk(inputMessage);
                }
            },
            navigate:function(){
                self.navigate();
            },
            executeScript:function(){
                self.executeScript();
            },
            rightArmIK:function(){
                self.rightArmIK();
            }
        };

        this.sayAudio = undefined;
        this.mouthAnimationTimer = undefined;

        // initialize with argument 'true': no random choices
        this.eliza = new ElizaBot(true);

        this.bodyKinectPCLEnabled = false;
        //relative to valterBodyP1
        this.bodyKinectLaserOrigin = new THREE.Vector3(0.0426914, 0.2174475, 0.3071102);
        this.bodyKinectPCLOriginObject3D = undefined;

        addEventListener("simulationStep", this.simulationStep.bind(this), false);
    }

    sceneLoading(bytes)
    {
        this.vlab.trace("Valter " + ((bytes.loaded / bytes.total) * 100).toFixed(2) + "% loaded");
    }

    initialize(valterScene)
    {
        var ValterRef = this;
        valterScene.traverse(function(obj)
        {
            obj.castShadow = false;
            obj.receiveShadow = false;
            if (obj.type == "Mesh" && !obj.material.transparent)
            {
                obj.material.side = THREE.DoubleSide;
            }

            // alt material bump map scaling
            if (typeof ValterRef.vlab.vlabNature.altBumpMapScales != "undefined")
            {
                if (typeof obj.material != "undefined")
                {
                    if (obj.material.bumpMap != undefined)
                    {
                        if (ValterRef.vlab.vlabNature.altBumpMapScales[obj.material.name] != undefined)
                        {
                            obj.material.bumpScale = ValterRef.vlab.vlabNature.altBumpMapScales[obj.material.name];
                        }
                    }
                }
            }



            var shadowCasted = [
                                "ValterBase", "baseFrame", "rightWheel", "rightWheelDiskBack", "leftWheel", "leftWheelDiskBack",
                                "manGripperFrame", "valterBodyP1", "valterBodyP2", "bodyFrame", "bodyFrameL", "bodyFrameR",
                                "pg20RMiddle", "pg20LMiddle", "bodyFrameRFixed", "bodyFrameLFixed", "neckFabrickCover", "headFrame",
                                "kinectBodyHead", "wifiAntennaLeft", "wifiAntennaCenter", "wifiAntennaRight",
                                "armfixtureRight", "armRightShoulderAxis", "armCover1R", "armCover2R", "armActuatorP1Right", "armp1mR",
                                "armCover3R", "armCover4R", "armCover5R", "armCover6R", "forearmCoverR", "rHandCover", "rightPalmLiftFixtureP2", "rightPalmFixtureP14",
                                "r_0_finger_p1", "r_0_finger_p2", "r_0_finger_p3", "r_0_finger_nail",
                                "r_1_finger_p1", "r_1_finger_p2", "r_1_finger_p3", "r_1_finger_nail",
                                "r_2_finger_p1", "r_2_finger_p2", "r_2_finger_p3", "r_2_finger_nail",
                                "r_3_finger_p1", "r_3_finger_p2", "r_3_finger_p3", "r_3_finger_nail",
                                "r_4_finger_p1", "r_4_finger_p2", "r_4_finger_p3", "r_4_finger_nail",
                                "r_5_finger_p1", "r_5_finger_p2", "r_5_finger_p3", "r_5_finger_nail",
                                "armfixtureLeft", "armLeftShoulderAxis", "armCover1L", "armCover2L", "armActuatorP1Left", "armp1mL",
                                "armCover3L", "armCover4L", "armCover5L", "armCover6L", "forearmCoverL", "lHandCover", "leftPalmLiftFixtureP2", "leftPalmFixtureP14",
                                "l_0_finger_p1", "l_0_finger_p2", "l_0_finger_p3", "l_0_finger_nail",
                                "l_1_finger_p1", "l_1_finger_p2", "l_1_finger_p3", "l_1_finger_nail",
                                "l_2_finger_p1", "l_2_finger_p2", "l_2_finger_p3", "l_2_finger_nail",
                                "l_3_finger_p1", "l_3_finger_p2", "l_3_finger_p3", "l_3_finger_nail",
                                "l_4_finger_p1", "l_4_finger_p2", "l_4_finger_p3", "l_4_finger_nail",
                                "l_5_finger_p1", "l_5_finger_p2", "l_5_finger_p3", "l_5_finger_nail",
                                "armAxisBearingR", "armAxisBearingL",
                                "pg20BodyTop", "pg20Head", "pg20RTop", "pg20LTop", "pg20RBot", "pg20LBot", "pg20Head_nut", "pg20BodyTop_nut",
                                "pg20RTop_nut", "pg20LTop_nut",
                                "rightArm", "leftArm",
                                "forearmFixtureRP1", "rightForearmTilt", "forearmYawFixtureRP1", "SY85STH65Right", "forearmFrameRight",
                                "forearmFixtureLP1", "leftForearmTilt", "forearmYawFixtureLP1", "SY85STH65Left", "forearmFrameLeft",
                                "armActuatorP1RightStock", "armActuatorP1RightStockFixture1", "armActuatorP1RightStockFixture2",
                                "armActuatorP1LeftStock", "armActuatorP1LeftStockFixture1", "armActuatorP1LeftStockFixture2",
                                "forearmActuatorR", "forearmActuatorRStock", "forearmActuatorRTopFixture",
                                "forearmActuatorL", "forearmActuatorLStock", "forearmActuatorLTopFixture"
                               ];
           var doubleSide = [
                               "valterBodyP1", "valterBodyP2", "bodyKinectFrame", "neckFabrickCover",
                               "armCover1R", "armCover2R", "armCover3R", "armCover4R", "armCover5R", "armCover6R", "forearmCoverR",
                               "armCover1L", "armCover2L", "armCover3L", "armCover4L", "armCover5L", "armCover6L", "forearmCoverL"
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

            //by default render shader only on a front side of a mesh
            if (obj.material != undefined)
            {
                obj.material.side = THREE.FrontSide;
            }
            //double side shader on predefined
            if (doubleSide.indexOf(obj.name) > -1)
            {
                obj.material.side = THREE.DoubleSide;
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
                default:
                break;
            }
        });
        this.model = valterScene.children[0];
        if (typeof this.scale != "undefined")
        {
            this.model.scale.set(this.scale, this.scale, this.scale);
        }
        else
        {
            this.scale = this.scaleFactor;
            this.model.scale.set(this.scale, this.scale, this.scale);
        }
        this.model.position.copy(this.initialModelPosition);
        this.vlab.getVlabScene().add(this.model);

        this.model.updateMatrixWorld();

        this.activeObjects["ValterBase"] = this.vlab.getVlabScene().getObjectByName("ValterBase");
        this.activeObjects["valterBodyP1"] = this.vlab.getVlabScene().getObjectByName("valterBodyP1");
        this.activeObjects["bodyFrameAxisR"] = this.vlab.getVlabScene().getObjectByName("bodyFrameAxisR");
        this.activeObjects["bodyFrameR"] = this.vlab.getVlabScene().getObjectByName("bodyFrameR");
        this.activeObjects["bodyFrameL"] = this.vlab.getVlabScene().getObjectByName("bodyFrameL");

        this.activeObjects["armRightShoulderAxis"] = this.vlab.getVlabScene().getObjectByName("armRightShoulderAxis");
        this.activeObjects["armLeftShoulderAxis"] = this.vlab.getVlabScene().getObjectByName("armLeftShoulderAxis");

        this.activeObjects["rightArm"] = this.vlab.getVlabScene().getObjectByName("rightArm");
        this.activeObjects["armActuatorP1Right"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1Right");
        this.activeObjects["armActuatorP1RightFixture"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1RightFixture");
        this.activeObjects["armActuatorP1RightFixture1"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1RightFixture1");
        this.activeObjects["armActuatorP1RightStock"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1RightStock");
        this.activeObjects["armCover1R"] = this.vlab.getVlabScene().getObjectByName("armCover1R");
        this.activeObjects["armCover2R"] = this.vlab.getVlabScene().getObjectByName("armCover2R");
        this.activeObjects["armCover3R"] = this.vlab.getVlabScene().getObjectByName("armCover3R");
        this.activeObjects["armCover4R"] = this.vlab.getVlabScene().getObjectByName("armCover4R");
        this.activeObjects["armCover5R"] = this.vlab.getVlabScene().getObjectByName("armCover5R");
        this.activeObjects["armCover6R"] = this.vlab.getVlabScene().getObjectByName("armCover6R");
        this.activeObjects["armCover7R"] = this.vlab.getVlabScene().getObjectByName("armCover7R");
        this.activeObjects["armCover8R"] = this.vlab.getVlabScene().getObjectByName("armCover8R");
        this.activeObjects["armCover9R"] = this.vlab.getVlabScene().getObjectByName("armCover9R");
        this.activeObjects["armCover10R"] = this.vlab.getVlabScene().getObjectByName("armCover10R");
        this.activeObjects["armCover11R"] = this.vlab.getVlabScene().getObjectByName("armCover11R");
        this.activeObjects["forearmCoverR"] = this.vlab.getVlabScene().getObjectByName("forearmCoverR");

        this.activeObjects["leftArm"] = this.vlab.getVlabScene().getObjectByName("leftArm");
        this.activeObjects["armActuatorP1Left"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1Left");
        this.activeObjects["armActuatorP1LeftFixture"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1LeftFixture");
        this.activeObjects["armActuatorP1LeftFixture1"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1LeftFixture1");
        this.activeObjects["armActuatorP1LeftStock"] = this.vlab.getVlabScene().getObjectByName("armActuatorP1LeftStock");
        this.activeObjects["armCover1L"] = this.vlab.getVlabScene().getObjectByName("armCover1L");
        this.activeObjects["armCover2L"] = this.vlab.getVlabScene().getObjectByName("armCover2L");
        this.activeObjects["armCover3L"] = this.vlab.getVlabScene().getObjectByName("armCover3L");
        this.activeObjects["armCover4L"] = this.vlab.getVlabScene().getObjectByName("armCover4L");
        this.activeObjects["armCover5L"] = this.vlab.getVlabScene().getObjectByName("armCover5L");
        this.activeObjects["armCover6L"] = this.vlab.getVlabScene().getObjectByName("armCover6L");
        this.activeObjects["armCover7L"] = this.vlab.getVlabScene().getObjectByName("armCover7L");
        this.activeObjects["armCover8L"] = this.vlab.getVlabScene().getObjectByName("armCover8L");
        this.activeObjects["armCover9L"] = this.vlab.getVlabScene().getObjectByName("armCover9L");
        this.activeObjects["armCover10L"] = this.vlab.getVlabScene().getObjectByName("armCover10L");
        this.activeObjects["armCover11L"] = this.vlab.getVlabScene().getObjectByName("armCover11L");
        this.activeObjects["forearmCoverL"] = this.vlab.getVlabScene().getObjectByName("forearmCoverL");

        this.activeObjects["rightForearmYaw"] = this.vlab.getVlabScene().getObjectByName("rightForearmYaw");
        this.activeObjects["leftForearmYaw"] = this.vlab.getVlabScene().getObjectByName("leftForearmYaw");

        this.activeObjects["rightForearmTilt"] = this.vlab.getVlabScene().getObjectByName("rightForearmTilt");
        this.activeObjects["leftForearmTilt"] = this.vlab.getVlabScene().getObjectByName("leftForearmTilt");

        this.activeObjects["forearmFrameRight"] = this.vlab.getVlabScene().getObjectByName("forearmFrameRight");
        this.activeObjects["forearmFrameLeft"] = this.vlab.getVlabScene().getObjectByName("forearmFrameLeft");

        this.activeObjects["headTiltFrame"] = this.vlab.getVlabScene().getObjectByName("headTiltFrame");
        this.activeObjects["headYawFrame"] = this.vlab.getVlabScene().getObjectByName("headYawFrame");

        this.activeObjects["pg20Head"] = this.vlab.getVlabScene().getObjectByName("pg20Head");
        this.activeObjects["pg20BodyTop"] = this.vlab.getVlabScene().getObjectByName("pg20BodyTop");
        this.activeObjects["pg20RBot"] = this.vlab.getVlabScene().getObjectByName("pg20RBot");
        this.activeObjects["pg20RTop"] = this.vlab.getVlabScene().getObjectByName("pg20RTop");
        this.activeObjects["pg20LBot"] = this.vlab.getVlabScene().getObjectByName("pg20LBot");
        this.activeObjects["pg20LTop"] = this.vlab.getVlabScene().getObjectByName("pg20LTop");
        this.activeObjects["pg20RMiddle"] = this.vlab.getVlabScene().getObjectByName("pg20RMiddle");
        this.activeObjects["pg20RBodyTop"] = this.vlab.getVlabScene().getObjectByName("pg20RBodyTop");
        this.activeObjects["pg20LMiddle"] = this.vlab.getVlabScene().getObjectByName("pg20LMiddle");
        this.activeObjects["pg20LBodyTop"] = this.vlab.getVlabScene().getObjectByName("pg20LBodyTop");

        this.activeObjects["torsoHingeRTop"] = this.vlab.getVlabScene().getObjectByName("torsoHingeRTop");
        this.activeObjects["torsoHingeRBottom"] = this.vlab.getVlabScene().getObjectByName("torsoHingeRBottom");
        this.activeObjects["torsoHingeLTop"] = this.vlab.getVlabScene().getObjectByName("torsoHingeLTop");
        this.activeObjects["torsoHingeLBottom"] = this.vlab.getVlabScene().getObjectByName("torsoHingeLBottom");

        this.activeObjects["forearmActuatorR"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorR");
        this.activeObjects["forearmActuatorRStock"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorRStock");
        this.activeObjects["forearmActuatorRFixture1"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorRFixture1");
        this.activeObjects["forearmActuatorRFixture"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorRFixture");
        this.activeObjects["forearmActuatorL"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorL");
        this.activeObjects["forearmActuatorLStock"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorLStock");
        this.activeObjects["forearmActuatorLFixture"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorLFixture");
        this.activeObjects["forearmActuatorLFixture1"] = this.vlab.getVlabScene().getObjectByName("forearmActuatorLFixture1");

        this.activeObjects["rightPalmFixtureP14"] = this.vlab.getVlabScene().getObjectByName("rightPalmFixtureP14");
        this.activeObjects["leftPalmFixtureP14"] = this.vlab.getVlabScene().getObjectByName("leftPalmFixtureP14");

        this.activeObjects["mouthPanel"] = this.vlab.getVlabScene().getObjectByName("mouthPanel");

        this.activeObjects["rightWheelDisk"] = this.vlab.getVlabScene().getObjectByName("rightWheelDisk");
        this.activeObjects["leftWheelDisk"] = this.vlab.getVlabScene().getObjectByName("leftWheelDisk");

        this.activeObjects["smallWheelArmatureRF"] = this.vlab.getVlabScene().getObjectByName("smallWheelArmatureRF");
        this.activeObjects["smallWheelArmatureLF"] = this.vlab.getVlabScene().getObjectByName("smallWheelArmatureLF");
        this.activeObjects["smallWheelArmatureRR"] = this.vlab.getVlabScene().getObjectByName("smallWheelArmatureRR");
        this.activeObjects["smallWheelArmatureLR"] = this.vlab.getVlabScene().getObjectByName("smallWheelArmatureLR");

        this.activeObjects["smallWheelRF"] = this.vlab.getVlabScene().getObjectByName("smallWheelRF");
        this.activeObjects["smallWheelLF"] = this.vlab.getVlabScene().getObjectByName("smallWheelLF");
        this.activeObjects["smallWheelRR"] = this.vlab.getVlabScene().getObjectByName("smallWheelRR");
        this.activeObjects["smallWheelLR"] = this.vlab.getVlabScene().getObjectByName("smallWheelLR");

        this.activeObjects["rPalmPad"] = this.vlab.getVlabScene().getObjectByName("rPalmPad");
        this.activeObjects["lPalmPad"] = this.vlab.getVlabScene().getObjectByName("lPalmPad");

        this.activeObjects["rightHand"] = {
            f0_0: {obj: this.vlab.getVlabScene().getObjectByName("r_0_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_0_finger_p1").rotation.x},
            f0_1: {obj: this.vlab.getVlabScene().getObjectByName("r_0_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_0_finger_p2").rotation.z},
            f0_2: {obj: this.vlab.getVlabScene().getObjectByName("r_0_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_0_finger_p3").rotation.z},
            f1_0: {obj: this.vlab.getVlabScene().getObjectByName("r_1_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_1_finger_p1").rotation.x},
            f1_1: {obj: this.vlab.getVlabScene().getObjectByName("r_1_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_1_finger_p2").rotation.z},
            f1_2: {obj: this.vlab.getVlabScene().getObjectByName("r_1_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_1_finger_p3").rotation.z},
            f2_0: {obj: this.vlab.getVlabScene().getObjectByName("r_2_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_2_finger_p1").rotation.x},
            f2_1: {obj: this.vlab.getVlabScene().getObjectByName("r_2_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_2_finger_p2").rotation.z},
            f2_2: {obj: this.vlab.getVlabScene().getObjectByName("r_2_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_2_finger_p3").rotation.z},
            f3_0: {obj: this.vlab.getVlabScene().getObjectByName("r_3_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_3_finger_p1").rotation.x},
            f3_1: {obj: this.vlab.getVlabScene().getObjectByName("r_3_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_3_finger_p2").rotation.z},
            f3_2: {obj: this.vlab.getVlabScene().getObjectByName("r_3_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_3_finger_p3").rotation.z},
            f4_0: {obj: this.vlab.getVlabScene().getObjectByName("r_4_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_4_finger_p1").rotation.x},
            f4_1: {obj: this.vlab.getVlabScene().getObjectByName("r_4_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_4_finger_p2").rotation.z},
            f4_2: {obj: this.vlab.getVlabScene().getObjectByName("r_4_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_4_finger_p3").rotation.z},
            f5_0: {obj: this.vlab.getVlabScene().getObjectByName("r_5_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("r_5_finger_p1").rotation.x},
            f5_1: {obj: this.vlab.getVlabScene().getObjectByName("r_5_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("r_5_finger_p2").rotation.z},
            f5_2: {obj: this.vlab.getVlabScene().getObjectByName("r_5_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("r_5_finger_p3").rotation.z}
        };

        this.activeObjects["leftHand"] = {
            f0_0: {obj: this.vlab.getVlabScene().getObjectByName("l_0_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_0_finger_p1").rotation.x},
            f0_1: {obj: this.vlab.getVlabScene().getObjectByName("l_0_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_0_finger_p2").rotation.z},
            f0_2: {obj: this.vlab.getVlabScene().getObjectByName("l_0_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_0_finger_p3").rotation.z},
            f1_0: {obj: this.vlab.getVlabScene().getObjectByName("l_1_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_1_finger_p1").rotation.x},
            f1_1: {obj: this.vlab.getVlabScene().getObjectByName("l_1_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_1_finger_p2").rotation.z},
            f1_2: {obj: this.vlab.getVlabScene().getObjectByName("l_1_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_1_finger_p3").rotation.z},
            f2_0: {obj: this.vlab.getVlabScene().getObjectByName("l_2_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_2_finger_p1").rotation.x},
            f2_1: {obj: this.vlab.getVlabScene().getObjectByName("l_2_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_2_finger_p2").rotation.z},
            f2_2: {obj: this.vlab.getVlabScene().getObjectByName("l_2_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_2_finger_p3").rotation.z},
            f3_0: {obj: this.vlab.getVlabScene().getObjectByName("l_3_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_3_finger_p1").rotation.x},
            f3_1: {obj: this.vlab.getVlabScene().getObjectByName("l_3_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_3_finger_p2").rotation.z},
            f3_2: {obj: this.vlab.getVlabScene().getObjectByName("l_3_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_3_finger_p3").rotation.z},
            f4_0: {obj: this.vlab.getVlabScene().getObjectByName("l_4_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_4_finger_p1").rotation.x},
            f4_1: {obj: this.vlab.getVlabScene().getObjectByName("l_4_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_4_finger_p2").rotation.z},
            f4_2: {obj: this.vlab.getVlabScene().getObjectByName("l_4_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_4_finger_p3").rotation.z},
            f5_0: {obj: this.vlab.getVlabScene().getObjectByName("l_5_finger_p1"), angle: this.vlab.getVlabScene().getObjectByName("l_5_finger_p1").rotation.x},
            f5_1: {obj: this.vlab.getVlabScene().getObjectByName("l_5_finger_p2"), angle: this.vlab.getVlabScene().getObjectByName("l_5_finger_p2").rotation.z},
            f5_2: {obj: this.vlab.getVlabScene().getObjectByName("l_5_finger_p3"), angle: this.vlab.getVlabScene().getObjectByName("l_5_finger_p3").rotation.z}
        };

        //collision meshes
        this.vlab.addMeshToCollidableMeshList(this.vlab.getVlabScene().getObjectByName("bodyFrame"));
        this.vlab.addMeshToCollidableMeshList(this.vlab.getVlabScene().getObjectByName("bodyFrameR"));
        this.vlab.addMeshToCollidableMeshList(this.vlab.getVlabScene().getObjectByName("bodyFrameL"));

        if (this.testMode)
        {
            if (!this.executeScriptOnStart)
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
            }

            //dummy manipulation object
            var manipulationObjectGeometry = new THREE.SphereGeometry(0.25 * this.scale / this.scaleFactor, 24, 24);
            var manipulationObjectMaterial = new THREE.MeshLambertMaterial({color: 0x00ff00});
            this.manipulationObject = new THREE.Mesh(manipulationObjectGeometry, manipulationObjectMaterial);
            this.manipulationObject.name = "manipulationObject";
            this.vlab.getVlabScene().add(this.manipulationObject);
            this.manipulationObject.position.z = 12.0;
            this.manipulationObject.position.y = 15.0;
            if (this.executeScriptOnStart)
            {
                this.manipulationObject.visible = false;
            }

            if (!this.executeScriptOnStart)
            {
                this.manipulationObjectControl = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
                this.manipulationObjectControl.addEventListener("change", function(){
                                                                if (this.settings.annIK)
                                                                {
                                                                    self.rightArmFollowManipulationObject();
                                                                }
                                                                if (this.vlab.pressedKey != null)
                                                                {
                                                                    if (this.vlab.pressedKey == 17) //ctrlKey
                                                                    {
                                                                        console.log(this.manipulationObject.position);
                                                                    }
                                                                }
                                                            }.bind(this));
                this.manipulationObjectControl.attach(this.manipulationObject);
                this.manipulationObjectControl.setSize(1.0);
                this.vlab.getVlabScene().add(this.manipulationObjectControl);
            }

            if (!this.executeScriptOnStart)
            {
                var matrix = new THREE.Matrix4();
                matrix.extractRotation(this.model.matrix);
                var valterForwardDirection = new THREE.Vector3(0, 1, 0);
                valterForwardDirection.applyMatrix4(matrix);
                this.activeObjects["valterForwardDirectionVector"] = new THREE.ArrowHelper(valterForwardDirection, this.model.position, 10.0 * (this.scale / this.scaleFactor), 0x0000ff, 1.0 * (this.scale / this.scaleFactor), 0.3 * (this.scale / this.scaleFactor));
                this.vlab.getVlabScene().add(this.activeObjects["valterForwardDirectionVector"]);

                var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
                manipulationObjectXZProjPos.y = this.model.position.y;
                var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
                var valterToManipulationObjectDirectionVectorLength = valterToManipulationObjectDirectionVector.clone().length();
                valterToManipulationObjectDirectionVector.normalize();
                this.activeObjects["valterToManipulationObjectDirectionVector"] = new THREE.ArrowHelper(valterToManipulationObjectDirectionVector, this.model.position, valterToManipulationObjectDirectionVectorLength * (this.scale / this.scaleFactor), 0xffffff, 1.0 * (this.scale / this.scaleFactor), 0.3 * (this.scale / this.scaleFactor));
                this.vlab.getVlabScene().add(this.activeObjects["valterToManipulationObjectDirectionVector"]);

                // var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["rPalmPad"].matrixWorld);
                // var valterBaseToRightPalmPadDirectionVector = this.model.position.clone().sub(rPalmPadPosition.clone()).negate();
                // var valterBaseToRightPalmPadDirectionVectorLength = valterBaseToRightPalmPadDirectionVector.clone().length();
                // valterBaseToRightPalmPadDirectionVector.normalize();
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"] = new THREE.ArrowHelper(valterBaseToRightPalmPadDirectionVector, this.model.position, valterBaseToRightPalmPadDirectionVectorLength, 0x00ff00, 1.0, 0.3);
                // this.vlab.getVlabScene().add(this.activeObjects["valterBaseToRightPalmPadDirectionVector"]);
            }


        this.jointLimits = {
            baseYawMin: -6.28,
            baseYawMax: 0.0,
            bodyYawMin: -1.57,
            bodyYawMax: 1.57,
            bodyTiltMin: -0.8,
            bodyTiltMax: 0.0,
            headYawMin: -4.42,
            headYawMax: -1.86,
            headTiltMin: -2.85,
            headTiltMax: -1.8,
            rightArmMin: -2.57,
            rightArmMax: -1.22,
            leftArmMin: -2.57,
            leftArmMax: -1.22,
            rightLimbMin: -0.85,
            rightLimbMax: 1.4,
            leftLimbMin: -0.85,
            leftLimbMax: 1.4,
            rightShoulderMin: 0.0,
            rightShoulderMax: 1.0,
            leftShoulderMin: -1.0,
            leftShoulderMax: 0.0,
            rightForearmMin: -0.5,
            rightForearmMax: 1.0,
            leftForearmMin: -0.5,
            leftForearmMax: 1.0,
            leftPalmYawMin: -0.5,
            leftPalmYawMax: 0.5,
            rightPalmYawMin: -0.5,
            rightPalmYawMax: 0.5,
            rightForearmRollMin: -3.14,
            rightForearmRollMax: 0.0,
            leftForearmRollMin: -3.14,
            leftForearmRollMax: 0.0,
            rightForearmYawMin: -0.25,
            rightForearmYawMax: 0.4,
            leftForearmYawMin: -0.25,
            leftForearmYawMax: 0.4
        };


            var GUIcontrols1 = new dat.GUI();
            GUIcontrols1.add(this.model.rotation, 'z', this.jointLimits.baseYawMin, this.jointLimits.baseYawMax).name("Base Yaw").step(0.01).listen().onChange(this.baseRotation.bind(this));
            GUIcontrols1.add(this.activeObjects["valterBodyP1"].rotation, 'z', this.jointLimits.bodyYawMin, this.jointLimits.bodyYawMax).name("Body Yaw").step(0.01).onChange(this.baseToBodyCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.activeObjects["bodyFrameAxisR"].rotation, 'x', this.jointLimits.bodyTiltMin, this.jointLimits.bodyTiltMax).name("Body Tilt").step(0.01).onChange(this.bodyToTorsoCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.joints, 'rightShoulder', this.jointLimits.rightShoulderMin, this.jointLimits.rightShoulderMax).name("Right Shoulder").step(0.01).onChange(this.rightShoulderRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftShoulder', this.jointLimits.leftShoulderMin, this.jointLimits.leftShoulderMax).name("Left Shoulder").step(0.01).onChange(this.leftShoulderRotate.bind(this));
            GUIcontrols1.add(this.activeObjects["armRightShoulderAxis"].rotation, 'x', this.jointLimits.rightLimbMin, this.jointLimits.rightLimbMax).name("Right Limb").step(0.01);
            GUIcontrols1.add(this.activeObjects["armLeftShoulderAxis"].rotation, 'x', this.jointLimits.leftLimbMin, this.jointLimits.leftLimbMax).name("Left Limb").step(0.01);
            GUIcontrols1.add(this.joints, 'rightArm', this.jointLimits.rightArmMin, this.jointLimits.rightArmMax).name("Right Arm").step(0.01).onChange(this.rightArmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftArm', this.jointLimits.leftArmMin, this.jointLimits.leftArmMax).name("Left Arm").step(0.01).onChange(this.leftArmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'rightForearm', this.jointLimits.rightForearmMin, this.jointLimits.rightForearmMax).name("Right Forearm Tilt").step(0.01).onChange(this.rightForearmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftForearm', this.jointLimits.leftForearmMin, this.jointLimits.leftForearmMax).name("Left Forearm Tilt").step(0.01).onChange(this.leftForearmRotate.bind(this));

            GUIcontrols1.add(this.activeObjects["rightForearmYaw"].rotation, 'z', this.jointLimits.rightForearmYawMin, this.jointLimits.rightForearmYawMax).name("Right Forearm Yaw").step(0.01);
            GUIcontrols1.add(this.activeObjects["leftForearmYaw"].rotation, 'z', this.jointLimits.leftForearmYawMin, this.jointLimits.leftForearmYawMax).name("Left Forearm Yaw").step(0.01);

            GUIcontrols1.add(this.activeObjects["forearmFrameRight"].rotation, 'y', this.jointLimits.rightForearmRollMin, this.jointLimits.rightForearmRollMax).name("Right Forearm Roll").step(0.01);
            GUIcontrols1.add(this.activeObjects["forearmFrameLeft"].rotation, 'y', this.jointLimits.leftForearmRollMin, this.jointLimits.leftForearmRollMax).name("Left Forearm Roll").step(0.01);
            GUIcontrols1.add(this.activeObjects["headTiltFrame"].rotation, 'x', this.jointLimits.headTiltMin, this.jointLimits.headTiltMax).name("Head Tilt").step(0.01).onChange(this.headToBodyCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.activeObjects["headYawFrame"].rotation, 'z', this.jointLimits.headYawMin, this.jointLimits.headYawMax).name("Head Yaw").step(0.01).onChange(this.headToBodyCableSleeveAnimation.bind(this));

            GUIcontrols1.add(this.joints, 'leftPalmYaw',  this.jointLimits.rightPalmYawMin, this.jointLimits.rightPalmYawMax).name("Right Palm Yaw").step(0.01).onChange(this.rightPalmYaw.bind(this));
            GUIcontrols1.add(this.joints, 'rightPalmYaw', this.jointLimits.leftPalmYawMin, this.jointLimits.leftPalmYawMax).name("Left Palm Yaw").step(0.01).onChange(this.leftPalmYaw.bind(this));

            GUIcontrols1.add(this.handGrasping, 'right', 0.0, 1.0).name("Right Hand Grasping").step(0.01).onChange(this.rightHandGrasping.bind(this));
            GUIcontrols1.add(this.handGrasping, 'left', 0.0, 1.0).name("Left Hand Grapsing").step(0.01).onChange(this.leftHandGrasping.bind(this));
            GUIcontrols1.add(this.settings, 'coveringsVisibility').name("Coverings Visibility").onChange(this.setCoveringsVisibility.bind(this));
            GUIcontrols1.add(this.guiControls, 'say').name("Valter says");
            GUIcontrols1.add(this.guiControls, 'talk').name("Valter talks");
            GUIcontrols1.add(this.guiControls, 'navigate').name("Navigate");
            GUIcontrols1.add(this.guiControls, 'rightArmIK').name("Solve Right Arm IK");
            GUIcontrols1.add(this.settings, 'annIK').name("ANN Right Arm IK");
            if (typeof executeScriptDialog !== 'undefined')
            {
                GUIcontrols1.add(this.guiControls, 'executeScript').name("Execute Script");
                if (this.executeScriptOnStart)
                {
                    var scriptText = $("#scriptText").val()
                    this.scriptLines = scriptText.split("\n");
                    this.scriptExecution();
                    dat.GUI.toggleHide();
                }
            }
        }

        var self = this;
        var loader = new THREE.TextureLoader();
        loader.load(
            "/vl/js/vlab/maps/valter/carbon_fibre.jpg",
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(4, 1);
                self.cableSleeveMaterial = new THREE.MeshPhongMaterial({wireframe: false, shading:THREE.SmoothShading, map: texture});
                self.cableSleeveMaterial.bumpMap = texture;
                self.cableSleeveMaterial.bumpScale = 0.05;

                //Head to Body cable sleeve
                self.headToBodyCableSleeveAnimation();
                self.baseToBodyCableSleeveAnimation();
                self.bodyToTorsoCableSleeveAnimation();
        });

        for (var i = 1; i < 5; i++)
        {
            var loader = new THREE.TextureLoader();
            loader.load(
                "/vl/js/vlab/maps/valter/mouthPanelMaterial-f" + i + ".jpg",
                function (texture) {
                    self.mouthPanelFrames.push(texture);
            });
        }

        this.prevValterBasePosition.copy(this.activeObjects["ValterBase"].position);

        this.activeObjects["armCover2R"].geometry = new THREE.Geometry().fromBufferGeometry(this.activeObjects["armCover2R"].geometry);
        this.activeObjects["armCover2R"].initialGeometry = [];
        for (var i = 0; i < this.activeObjects["armCover2R"].geometry.vertices.length; i++)
        {
            this.activeObjects["armCover2R"].initialGeometry[i] = new THREE.Vector3();
            this.activeObjects["armCover2R"].initialGeometry[i].copy(this.activeObjects["armCover2R"].geometry.vertices[i]);
        }

        this.activeObjects["armCover4R"].geometry = new THREE.Geometry().fromBufferGeometry(this.activeObjects["armCover4R"].geometry);
        this.activeObjects["armCover4R"].initialGeometry = [];
        for (var i = 0; i < this.activeObjects["armCover4R"].geometry.vertices.length; i++)
        {
            this.activeObjects["armCover4R"].initialGeometry[i] = new THREE.Vector3();
            this.activeObjects["armCover4R"].initialGeometry[i].copy(this.activeObjects["armCover4R"].geometry.vertices[i]);
        }

        this.activeObjects["armCover2L"].geometry = new THREE.Geometry().fromBufferGeometry(this.activeObjects["armCover2L"].geometry);
        this.activeObjects["armCover2L"].initialGeometry = [];
        for (var i = 0; i < this.activeObjects["armCover2L"].geometry.vertices.length; i++)
        {
            this.activeObjects["armCover2L"].initialGeometry[i] = new THREE.Vector3();
            this.activeObjects["armCover2L"].initialGeometry[i].copy(this.activeObjects["armCover2L"].geometry.vertices[i]);
        }

        this.activeObjects["armCover4L"].geometry = new THREE.Geometry().fromBufferGeometry(this.activeObjects["armCover4L"].geometry);
        this.activeObjects["armCover4L"].initialGeometry = [];
        for (var i = 0; i < this.activeObjects["armCover4L"].geometry.vertices.length; i++)
        {
            this.activeObjects["armCover4L"].initialGeometry[i] = new THREE.Vector3();
            this.activeObjects["armCover4L"].initialGeometry[i].copy(this.activeObjects["armCover4L"].geometry.vertices[i]);
        }

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1RightFixture1"].matrixWorld);
        var dir1 = this.activeObjects["armActuatorP1RightFixture1"].getWorldDirection();
        var rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        dir1.applyMatrix4(rotationMatrix);
        dir1.normalize();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1RightFixture"].matrixWorld);
        var dirPos1Pos2 = pos1.clone().sub(pos2);
        dirPos1Pos2.normalize().negate();
        this.initialValuesArray["armActuatorP1RightAngle"] = dirPos1Pos2.angleTo(dir1);

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1LeftFixture1"].matrixWorld);
        var dir1 = this.activeObjects["armActuatorP1LeftFixture1"].getWorldDirection();
        var rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        dir1.applyMatrix4(rotationMatrix);
        dir1.normalize();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1LeftFixture"].matrixWorld);
        var dirPos1Pos2 = pos1.clone().sub(pos2);
        dirPos1Pos2.normalize().negate();
        this.initialValuesArray["armActuatorP1LeftAngle"] = dirPos1Pos2.angleTo(dir1);

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorRFixture1"].matrixWorld);
        var dir1 = this.activeObjects["forearmActuatorRFixture1"].getWorldDirection();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorRFixture"].matrixWorld);
        var dir2 = pos1.clone().sub(pos2);
        dir2.normalize();
        this.initialValuesArray["forearmActuatorRAngle"] = dir1.angleTo(dir2);

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorLFixture1"].matrixWorld);
        var dir1 = this.activeObjects["forearmActuatorLFixture1"].getWorldDirection();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorLFixture"].matrixWorld);
        var dir2 = pos1.clone().sub(pos2);
        dir2.normalize();
        this.initialValuesArray["forearmActuatorLAngle"] = dir1.angleTo(dir2);

        //initial values
        this.initialValuesArray["rightArm_rot_y"] = this.activeObjects["rightArm"].rotation.y;
        this.initialValuesArray["leftArm_rot_y"] = this.activeObjects["leftArm"].rotation.y;
        this.initialValuesArray["armActuatorP1Right_rot_x"] = this.activeObjects["armActuatorP1Right"].rotation.x;
        this.initialValuesArray["armActuatorP1Left_rot_x"] = this.activeObjects["armActuatorP1Left"].rotation.x;
        this.initialValuesArray["forearmActuatorR_rot_x"] = this.activeObjects["forearmActuatorR"].rotation.x;
        this.initialValuesArray["rightForearmTilt"] = this.activeObjects["rightForearmTilt"].rotation.y;
        this.initialValuesArray["forearmActuatorRStock_rot_y"] = this.activeObjects["forearmActuatorRStock"].rotation.y;
        this.initialValuesArray["forearmActuatorL_rot_x"] = this.activeObjects["forearmActuatorL"].rotation.x;
        this.initialValuesArray["leftForearmTilt"] = this.activeObjects["leftForearmTilt"].rotation.y;
        this.initialValuesArray["forearmActuatorLStock_rot_y"] = this.activeObjects["forearmActuatorLStock"].rotation.y;

        this.joints.baseYaw = this.model.rotation.z;
        this.joints.bodyYaw = this.activeObjects["valterBodyP1"].rotation.z;
        this.joints.bodyTilt = this.activeObjects["bodyFrameAxisR"].rotation.x;
        this.joints.headYaw = this.activeObjects["headYawFrame"].rotation.z;
        this.joints.headTilt = this.activeObjects["headTiltFrame"].rotation.x;
        this.joints.leftArm = this.initialValuesArray["leftArm_rot_y"];
        this.joints.rightArm = this.initialValuesArray["rightArm_rot_y"];
        this.joints.rightLimb = this.activeObjects["armRightShoulderAxis"].rotation.x;
        this.joints.leftLimb = this.activeObjects["armLeftShoulderAxis"].rotation.x;
        this.joints.rightShoulder = this.activeObjects["bodyFrameR"].rotation.z;
        this.joints.leftShoulder = this.activeObjects["bodyFrameL"].rotation.z;
        this.joints.rightForearm = this.activeObjects["rightForearmTilt"].rotation.y;
        this.joints.leftForearm = this.activeObjects["leftForearmTilt"].rotation.y;
        this.joints.leftPalmYaw = this.activeObjects["rightPalmFixtureP14"].rotation.y;
        this.joints.rightPalmYaw = this.activeObjects["leftPalmFixtureP14"].rotation.y;
        this.joints.rightForearmRoll = this.activeObjects["forearmFrameRight"].rotation.y;
        this.joints.leftForearmRoll = this.activeObjects["forearmFrameLeft"].rotation.y;

        this.eliza.reset();

        this.initialized = true;
    }

    simulationStep(event)
    {
        if (this.initialized)
        {
            var valterRef = this;

            if (this.prevValterBasePosition.distanceTo(this.activeObjects["ValterBase"].position) > 0.0001)
            {
                this.prevValterBasePosition.copy(this.activeObjects["ValterBase"].position);
            }
            for (var i = 0; i < this.delayedCalls.length; i++)
            {
                this.delayedCalls[i].bind(this).call();
            }
            this.delayedCalls = [];

            if (this.testMode && !this.executeScriptOnStart)
            {
                var matrix = new THREE.Matrix4();
                matrix.extractRotation(this.model.matrix);
                var valterForwardDirection = new THREE.Vector3(0, 1, 0);
                valterForwardDirection.applyMatrix4(matrix);
                this.activeObjects["valterForwardDirectionVector"].setDirection(valterForwardDirection);
                this.activeObjects["valterForwardDirectionVector"].position.copy(this.model.position.clone());

                var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
                manipulationObjectXZProjPos.y = this.model.position.y;
                if (this.model.position.distanceTo(manipulationObjectXZProjPos) > 1.0 * (this.scale / this.scaleFactor))
                {
                    var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
                    var valterToManipulationObjectDirectionVectorLength = valterToManipulationObjectDirectionVector.clone().length();
                    valterToManipulationObjectDirectionVector.normalize().negate();
                    this.activeObjects["valterToManipulationObjectDirectionVector"].position.copy(this.model.position);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setDirection(valterToManipulationObjectDirectionVector);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setLength(valterToManipulationObjectDirectionVectorLength, 1.0 * (this.scale / this.scaleFactor), 0.3 * (this.scale / this.scaleFactor));
                }

                // var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["rPalmPad"].matrixWorld);
                // var valterBaseToRightPalmPadDirectionVector = this.model.position.clone().sub(rPalmPadPosition.clone()).negate();
                // var valterBaseToRightPalmPadDirectionVectorLength = valterBaseToRightPalmPadDirectionVector.clone().length();
                // valterBaseToRightPalmPadDirectionVector.normalize();
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].position.copy(this.model.position);
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].setDirection(valterBaseToRightPalmPadDirectionVector);
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].setLength(valterBaseToRightPalmPadDirectionVectorLength, 1.0, 0.3);
            }

            if (this.bodyKinectPCLEnabled)
            {
                valterRef.bodyKinectPCL();
            }
        }
    }

    headToBodyCableSleeveAnimation()
    {
        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20BodyTop"].matrixWorld);
        var dir1 = this.activeObjects["pg20BodyTop"].getWorldDirection();
        dir1.normalize();

        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20Head"].matrixWorld);
        var dir2 = this.activeObjects["pg20Head"].getWorldDirection();
        dir2.normalize();

        var pos1_1 = new THREE.Vector3();
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.25 * (this.scale / this.scaleFactor)));
        var pos1_2 = new THREE.Vector3();
        pos1_2.addVectors(pos1, dir1.clone().multiplyScalar(1.75 * (this.scale / this.scaleFactor)));
        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.25 * (this.scale / this.scaleFactor)));

        var dir2_1 = pos2_1.clone().sub(pos1_2);
        dir2_1.normalize().negate();

        var pos2_2 = new THREE.Vector3();
        pos2_2.addVectors(pos2_1, dir2_1.clone().multiplyScalar(1.0 * (this.scale / this.scaleFactor)));

        var dir1_1 = pos1_1.clone().sub(pos2_2);
        dir1_1.normalize().negate();

        // if (this.activeObjects["pg20BodyTopArrowHelper"] == undefined)
        // {
        //     this.activeObjects["pg20BodyTopArrowHelper"] = new THREE.ArrowHelper(dir1, pos1, 0.4, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pg20BodyTopArrowHelper"]);
        //     this.activeObjects["pos1_1ArrowHelper"] = new THREE.ArrowHelper(dir1_1, pos1_1, 1.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pos1_1ArrowHelper"]);
        //
        //     this.activeObjects["pg20HeadArrowHelper"] = new THREE.ArrowHelper(dir2, pos2, 0.4, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pg20HeadArrowHelper"]);
        //     this.activeObjects["pos2_1ArrowHelper"] = new THREE.ArrowHelper(dir2_1, pos2_1, 1.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pos2_1ArrowHelper"]);
        // }
        // else
        // {
        //     this.activeObjects["pg20BodyTopArrowHelper"].position.copy(pos1);
        //     this.activeObjects["pg20BodyTopArrowHelper"].setDirection(dir1);
        //     this.activeObjects["pos1_1ArrowHelper"].position.copy(pos1_1);
        //     this.activeObjects["pos1_1ArrowHelper"].setDirection(dir1_1);
        //
        //     this.activeObjects["pg20HeadArrowHelper"].position.copy(pos2);
        //     this.activeObjects["pg20HeadArrowHelper"].setDirection(dir2);
        //     this.activeObjects["pos2_1ArrowHelper"].position.copy(pos2_1);
        //     this.activeObjects["pos2_1ArrowHelper"].setDirection(dir2_1);
        // }

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_2,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12 * (this.scale / this.scaleFactor), 8, false);

        if (this.headToBodyCableSleeve != null)
        {
            this.activeObjects["pg20BodyTop"].remove(this.headToBodyCableSleeve);
        }
        this.headToBodyCableSleeve = new THREE.Mesh(geometry, this.cableSleeveMaterial);
        this.headToBodyCableSleeve.castShadow = true;
        this.activeObjects["pg20BodyTop"].updateMatrixWorld();
        this.headToBodyCableSleeve.applyMatrix(new THREE.Matrix4().getInverse(this.activeObjects["pg20BodyTop"].matrixWorld));
        this.activeObjects["pg20BodyTop"].add(this.headToBodyCableSleeve);

        geometry = null;
    }

    baseToBodyCableSleeveAnimation()
    {
        // Right cable sleeve
        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20RBot"].matrixWorld);
        var dir1 = this.activeObjects["pg20RBot"].getWorldDirection();
        dir1.normalize();

        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20RTop"].matrixWorld);
        var dir2 = this.activeObjects["pg20RTop"].getWorldDirection();
        dir2.normalize();

        var pos1_1 = new THREE.Vector3();
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.25 * (this.scale / this.scaleFactor)));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.4 * (this.scale / this.scaleFactor)));

        // var pos2_2 = new THREE.Vector3();
        // pos2_2.addVectors(pos2, dir2.clone().multiplyScalar(1.0));
        //
        // var dir1_2 = pos1_1.clone().sub(pos2_2);
        // dir1_2.normalize().negate();

        // if (this.activeObjects["pg20RBotArrowHelper"] == undefined)
        // {
        //     this.activeObjects["pg20RBotArrowHelper"] = new THREE.ArrowHelper(dir1, pos1, 0.4, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pg20RBotArrowHelper"]);
        //     this.activeObjects["pos1_1ArrowHelper"] = new THREE.ArrowHelper(dir1_2, pos1_1, 3.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pos1_1ArrowHelper"]);
        //
        //     this.activeObjects["pg20RTopArrowHelper"] = new THREE.ArrowHelper(dir2, pos2, 0.4, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["pg20RTopArrowHelper"]);
        // }
        // else
        // {
        //     this.activeObjects["pg20RBotArrowHelper"].position.copy(pos1);
        //     this.activeObjects["pg20RBotArrowHelper"].setDirection(dir1);
        //     this.activeObjects["pos1_1ArrowHelper"].position.copy(pos1_1);
        //     this.activeObjects["pos1_1ArrowHelper"].setDirection(dir1_2);
        //
        //     this.activeObjects["pg20RTopArrowHelper"].position.copy(pos2);
        //     this.activeObjects["pg20RTopArrowHelper"].setDirection(dir2);
        // }

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12 * (this.scale / this.scaleFactor), 8, false);

        if (this.baseToBodyRCableSleeve != null)
        {
            this.activeObjects["pg20RBot"].remove(this.baseToBodyRCableSleeve);
        }
        this.baseToBodyRCableSleeve = new THREE.Mesh(geometry, this.cableSleeveMaterial);
        this.baseToBodyRCableSleeve.castShadow = true;
        this.activeObjects["pg20RBot"].updateMatrixWorld();
        this.baseToBodyRCableSleeve.applyMatrix(new THREE.Matrix4().getInverse(this.activeObjects["pg20RBot"].matrixWorld));
        this.activeObjects["pg20RBot"].add(this.baseToBodyRCableSleeve);

        geometry = null;

        // Left cable sleeve
        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20LBot"].matrixWorld);
        var dir1 = this.activeObjects["pg20LBot"].getWorldDirection();
        dir1.normalize();

        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20LTop"].matrixWorld);
        var dir2 = this.activeObjects["pg20LTop"].getWorldDirection();
        dir2.normalize();

        var pos1_1 = new THREE.Vector3();
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.3 * (this.scale / this.scaleFactor)));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.2 * (this.scale / this.scaleFactor)));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12 * (this.scale / this.scaleFactor), 8, false);

        if (this.baseToBodyRCableSleeve != null)
        {
            this.activeObjects["pg20LBot"].remove(this.baseToBodyLCableSleeve);
        }
        this.baseToBodyLCableSleeve = new THREE.Mesh(geometry, this.cableSleeveMaterial);
        this.baseToBodyLCableSleeve.castShadow = true;
        this.activeObjects["pg20LBot"].updateMatrixWorld();
        this.baseToBodyLCableSleeve.applyMatrix(new THREE.Matrix4().getInverse(this.activeObjects["pg20LBot"].matrixWorld));
        this.activeObjects["pg20LBot"].add(this.baseToBodyLCableSleeve);

        geometry = null;
    }

    bodyToTorsoCableSleeveAnimation()
    {
        // Right cable sleeve
        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20RMiddle"].matrixWorld);
        var dir1 = this.activeObjects["pg20RMiddle"].getWorldDirection();
        dir1.normalize();

        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20RBodyTop"].matrixWorld);
        var dir2 = this.activeObjects["pg20RBodyTop"].getWorldDirection();
        dir2.normalize();

        var pos1_1 = new THREE.Vector3();
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.8 * (this.scale / this.scaleFactor)));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.25 * (this.scale / this.scaleFactor)));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12 * (this.scale / this.scaleFactor), 8, false);

        if (this.baseToBodyRCableSleeve != null)
        {
            this.activeObjects["pg20RMiddle"].remove(this.bodyToTorsoRCableSleeve);
        }
        this.bodyToTorsoRCableSleeve = new THREE.Mesh(geometry, this.cableSleeveMaterial);
        this.bodyToTorsoRCableSleeve.castShadow = true;
        this.activeObjects["pg20RMiddle"].updateMatrixWorld();
        this.bodyToTorsoRCableSleeve.applyMatrix(new THREE.Matrix4().getInverse(this.activeObjects["pg20RMiddle"].matrixWorld));
        this.activeObjects["pg20RMiddle"].add(this.bodyToTorsoRCableSleeve);

        geometry = null;

        // Left cable sleeve
        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20LMiddle"].matrixWorld);
        var dir1 = this.activeObjects["pg20RMiddle"].getWorldDirection();
        dir1.normalize();

        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["pg20LBodyTop"].matrixWorld);
        var dir2 = this.activeObjects["pg20RBodyTop"].getWorldDirection();
        dir2.normalize();

        var pos1_1 = new THREE.Vector3();
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.75 * (this.scale / this.scaleFactor)));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.4 * (this.scale / this.scaleFactor)));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12 * (this.scale / this.scaleFactor), 8, false);

        if (this.bodyToTorsoLCableSleeve != null)
        {
            this.activeObjects["pg20LMiddle"].remove(this.bodyToTorsoLCableSleeve);
        }
        this.bodyToTorsoLCableSleeve = new THREE.Mesh(geometry, this.cableSleeveMaterial);
        this.bodyToTorsoLCableSleeve.castShadow = true;
        this.activeObjects["pg20LMiddle"].updateMatrixWorld();
        this.bodyToTorsoLCableSleeve.applyMatrix(new THREE.Matrix4().getInverse(this.activeObjects["pg20LMiddle"].matrixWorld));
        this.activeObjects["pg20LMiddle"].add(this.bodyToTorsoLCableSleeve);

        geometry = null;
    }

    setCoveringsVisibility(value)
    {
        this.settings.coveringsVisibility = value;

        this.activeObjects["armCover1R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover2R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover3R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover4R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover5R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover6R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover7R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover8R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover9R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover10R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover11R"].visible = this.settings.coveringsVisibility;
        this.activeObjects["forearmCoverR"].visible = this.settings.coveringsVisibility;

        this.activeObjects["armCover1L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover2L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover3L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover4L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover5L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover6L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover7L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover8L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover9L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover10L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["armCover11L"].visible = this.settings.coveringsVisibility;
        this.activeObjects["forearmCoverL"].visible = this.settings.coveringsVisibility;
    }

    rightArmRotate(value)
    {
        if (value != undefined)
        {
            if (this.activeObjects["rightArm"].rotation.y == value) return;
            this.rightArmRotateDirection = (this.activeObjects["rightArm"].rotation.y > value) ? true : false;
            this.activeObjects["rightArm"].rotation.y = value;
            this.delayedCalls.push(this.rightArmRotate);
            if (this.rightArmRotateDirection)
            {
                this.activeObjects["armActuatorP1RightStock"].rotateY(-0.05);
            }
            return;
        }
        if (this.rightArmRotateDirection)
        {
            this.activeObjects["armActuatorP1RightStock"].rotateY(0.05);
        }

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1RightFixture1"].matrixWorld);
        var dir1 = this.activeObjects["armActuatorP1RightFixture1"].getWorldDirection();
        dir1.normalize();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1RightFixture"].matrixWorld);
        var dirPos1Pos2 = pos1.clone().sub(pos2);
        dirPos1Pos2.normalize().negate();
        var newAngle = dirPos1Pos2.angleTo(dir1) + 0.06;
        var angle = this.initialValuesArray["armActuatorP1Right_rot_x"] + (this.initialValuesArray["armActuatorP1RightAngle"] - newAngle);
        this.activeObjects["armActuatorP1Right"].rotation.x = angle;

        // if (this.activeObjects["arrowHelper1"] == undefined)
        // {
        //     this.activeObjects["arrowHelper1"] = new THREE.ArrowHelper(dir1, pos2, 8.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["arrowHelper1"]);
        // }
        // else
        // {
        //     this.activeObjects["arrowHelper1"].position.copy(pos2);
        //     this.activeObjects["arrowHelper1"].setDirection(dir1);
        // }

        if (!this.settings.coveringsVisibility) return;

        var shift = Math.abs(this.initialValuesArray["rightArm_rot_y"] - this.activeObjects["rightArm"].rotation.y) * newAngle;
        var xdiv = 28;

        this.activeObjects["armCover4R"].geometry.vertices[7].x = this.activeObjects["armCover4R"].initialGeometry[7].x  - shift / xdiv / 2;
        this.activeObjects["armCover4R"].geometry.vertices[8].x = this.activeObjects["armCover4R"].initialGeometry[8].x  - shift / xdiv / 2;
        this.activeObjects["armCover4R"].geometry.vertices[9].x = this.activeObjects["armCover4R"].initialGeometry[9].x  - shift / xdiv / 2;
        this.activeObjects["armCover4R"].geometry.vertices[21].x = this.activeObjects["armCover4R"].initialGeometry[21].x  - shift / xdiv / 2;
        this.activeObjects["armCover4R"].geometry.vertices[22].x = this.activeObjects["armCover4R"].initialGeometry[22].x  - shift / xdiv / 2;
        this.activeObjects["armCover4R"].geometry.vertices[23].x = this.activeObjects["armCover4R"].initialGeometry[23].x  - shift / xdiv / 2;

        this.activeObjects["armCover4R"].geometry.verticesNeedUpdate = true;

        this.activeObjects["armCover2R"].geometry.vertices[1].x  = this.activeObjects["armCover2R"].initialGeometry[1].x  - shift / xdiv;
        this.activeObjects["armCover2R"].geometry.vertices[2].x  = this.activeObjects["armCover2R"].initialGeometry[2].x  - shift / xdiv;
        for (var i = 12; i < 24; i++)
        {
            this.activeObjects["armCover2R"].geometry.vertices[i].x = this.activeObjects["armCover2R"].initialGeometry[i].x - shift / xdiv;
        }

        var zdiv = 30;
        this.activeObjects["armCover2R"].geometry.vertices[1].z  = this.activeObjects["armCover2R"].initialGeometry[1].z  + shift / zdiv * 0.65;
        this.activeObjects["armCover2R"].geometry.vertices[2].z  = this.activeObjects["armCover2R"].initialGeometry[2].z  + shift / zdiv * 0.65;
        this.activeObjects["armCover2R"].geometry.vertices[12].z = this.activeObjects["armCover2R"].initialGeometry[12].z + shift / zdiv * 0.65;
        this.activeObjects["armCover2R"].geometry.vertices[13].z = this.activeObjects["armCover2R"].initialGeometry[13].z + shift / zdiv * 0.65;
        for (var i = 14; i < 24; i++)
        {
            this.activeObjects["armCover2R"].geometry.vertices[i].z = this.activeObjects["armCover2R"].initialGeometry[i].z + shift / zdiv;
        }

        this.activeObjects["armCover2R"].geometry.verticesNeedUpdate = true;
    }

    leftArmRotate(value)
    {
        if (value != undefined)
        {
            if (this.activeObjects["leftArm"].rotation.y == value) return;
            this.leftArmRotateDirection = (this.activeObjects["leftArm"].rotation.y > value) ? true : false;
            this.activeObjects["leftArm"].rotation.y = value;
            this.delayedCalls.push(this.leftArmRotate);
            if (this.leftArmRotateDirection)
            {
                this.activeObjects["armActuatorP1LeftStock"].rotateY(-0.05);
            }
            return;
        }
        if (this.leftArmRotateDirection)
        {
            this.activeObjects["armActuatorP1LeftStock"].rotateY(0.05);
        }

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1LeftFixture1"].matrixWorld);
        var dir1 = this.activeObjects["armActuatorP1LeftFixture1"].getWorldDirection();
        dir1.normalize();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["armActuatorP1LeftFixture"].matrixWorld);
        var dirPos1Pos2 = pos1.clone().sub(pos2);
        dirPos1Pos2.normalize().negate();
        var newAngle = dirPos1Pos2.angleTo(dir1) + 0.06;
        var angle = this.initialValuesArray["armActuatorP1Left_rot_x"] + (this.initialValuesArray["armActuatorP1LeftAngle"] - newAngle);
        this.activeObjects["armActuatorP1Left"].rotation.x = angle;

        var shift = Math.abs(this.initialValuesArray["leftArm_rot_y"] - this.activeObjects["leftArm"].rotation.y) * newAngle;

        if (!this.settings.coveringsVisibility) return;

        var xdiv = -28;
        this.activeObjects["armCover4L"].geometry.vertices[21].x = this.activeObjects["armCover4L"].initialGeometry[21].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.vertices[22].x = this.activeObjects["armCover4L"].initialGeometry[22].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.vertices[47].x = this.activeObjects["armCover4L"].initialGeometry[47].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.vertices[46].x = this.activeObjects["armCover4L"].initialGeometry[46].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.vertices[5].x = this.activeObjects["armCover4L"].initialGeometry[5].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.vertices[30].x = this.activeObjects["armCover4L"].initialGeometry[30].x  - shift / xdiv / 2;
        this.activeObjects["armCover4L"].geometry.verticesNeedUpdate = true;

        this.activeObjects["armCover2L"].geometry.vertices[1].x  = this.activeObjects["armCover2L"].initialGeometry[1].x  - shift / xdiv;
        this.activeObjects["armCover2L"].geometry.vertices[2].x  = this.activeObjects["armCover2L"].initialGeometry[2].x  - shift / xdiv;
        for (var i = 12; i < 24; i++)
        {
            this.activeObjects["armCover2L"].geometry.vertices[i].x = this.activeObjects["armCover2L"].initialGeometry[i].x - shift / xdiv;
        }

        var zdiv = -30;
        this.activeObjects["armCover2L"].geometry.vertices[1].z  = this.activeObjects["armCover2L"].initialGeometry[1].z  + shift / zdiv * 0.65;
        this.activeObjects["armCover2L"].geometry.vertices[2].z  = this.activeObjects["armCover2L"].initialGeometry[2].z  + shift / zdiv * 0.65;
        this.activeObjects["armCover2L"].geometry.vertices[12].z = this.activeObjects["armCover2L"].initialGeometry[12].z + shift / zdiv * 0.65;
        this.activeObjects["armCover2L"].geometry.vertices[13].z = this.activeObjects["armCover2L"].initialGeometry[13].z + shift / zdiv * 0.65;
        for (var i = 14; i < 24; i++)
        {
            this.activeObjects["armCover2L"].geometry.vertices[i].z = this.activeObjects["armCover2L"].initialGeometry[i].z + shift / zdiv;
        }

        this.activeObjects["armCover2L"].geometry.verticesNeedUpdate = true;
    }

    rightShoulderRotate(value)
    {
        if (this.activeObjects["bodyFrameR"].rotation.z == value) return;

        this.activeObjects["bodyFrameR"].rotation.z = value;

        this.activeObjects["torsoHingeRTop"].rotation.z = this.activeObjects["bodyFrameR"].rotation.z;
        this.activeObjects["torsoHingeRBottom"].rotation.z = this.activeObjects["bodyFrameR"].rotation.z;
    }

    leftShoulderRotate(value)
    {
        if (this.activeObjects["bodyFrameL"].rotation.z == value) return;

        this.activeObjects["bodyFrameL"].rotation.z = value;

        this.activeObjects["torsoHingeLTop"].rotation.z = this.activeObjects["bodyFrameL"].rotation.z;
        this.activeObjects["torsoHingeLBottom"].rotation.z = this.activeObjects["bodyFrameL"].rotation.z;
    }

    rightForearmRotate(value)
    {
        if (this.activeObjects["rightForearmTilt"].rotation.y == value) return;
        this.activeObjects["rightForearmTilt"].rotation.y = value;

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorRFixture1"].matrixWorld);
        var dir1 = this.activeObjects["forearmActuatorRFixture1"].getWorldDirection();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorRFixture"].matrixWorld);
        var dir2 = pos1.clone().sub(pos2);
        dir2.normalize();
        var newAngle = dir1.angleTo(dir2);
        var angle = this.initialValuesArray["forearmActuatorR_rot_x"] - (this.initialValuesArray["forearmActuatorRAngle"] - newAngle);
        this.activeObjects["forearmActuatorR"].rotation.x = angle;

        var rot_dy = this.initialValuesArray["rightForearmTilt"] - this.activeObjects["rightForearmTilt"].rotation.y;
        this.activeObjects["forearmActuatorRStock"].rotation.y = this.initialValuesArray["forearmActuatorRStock_rot_y"] - rot_dy * 0.82;

        // if (this.activeObjects["arrowHelper1"] == undefined)
        // {
        //     this.activeObjects["arrowHelper1"] = new THREE.ArrowHelper(dir2, pos1, 5.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["arrowHelper1"]);
        //
        //     this.activeObjects["arrowHelper2"] = new THREE.ArrowHelper(dir1, pos1, 5.0, 0xffffff, 0.3, 0.05);
        //     this.vlab.getVlabScene().add(this.activeObjects["arrowHelper2"]);
        // }
        // else
        // {
        //     this.activeObjects["arrowHelper1"].position.copy(pos1);
        //     this.activeObjects["arrowHelper1"].setDirection(dir2);
        //     this.activeObjects["arrowHelper2"].position.copy(pos1);
        //     this.activeObjects["arrowHelper2"].setDirection(dir1);
        // }
    }

    leftForearmRotate(value)
    {
        if (this.activeObjects["leftForearmTilt"].rotation.y == value) return;

        this.activeObjects["leftForearmTilt"].rotation.y = value;

        var pos1 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorLFixture1"].matrixWorld);
        var dir1 = this.activeObjects["forearmActuatorLFixture1"].getWorldDirection();
        var pos2 = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["forearmActuatorLFixture"].matrixWorld);
        var dir2 = pos1.clone().sub(pos2);
        dir2.normalize();
        var newAngle = dir1.angleTo(dir2);
        var angle = this.initialValuesArray["forearmActuatorL_rot_x"] - (this.initialValuesArray["forearmActuatorLAngle"] - newAngle);
        this.activeObjects["forearmActuatorL"].rotation.x = angle;

        var rot_dy = this.initialValuesArray["leftForearmTilt"] - this.activeObjects["leftForearmTilt"].rotation.y;
        this.activeObjects["forearmActuatorLStock"].rotation.y = this.initialValuesArray["forearmActuatorLStock_rot_y"] - rot_dy * 0.82;
    }

    rightPalmYaw(value)
    {
        if (this.activeObjects["rightPalmFixtureP14"].rotation.z == value) return;

        this.activeObjects["rightPalmFixtureP14"].rotation.z = value;
    }

    leftPalmYaw(value)
    {
        if (this.activeObjects["leftPalmFixtureP14"].rotation.z == value) return;

        this.activeObjects["leftPalmFixtureP14"].rotation.z = value;
    }

    rightHandGrasping(value)
    {
        this.activeObjects["rightHand"].f0_0.obj.rotation.x = this.activeObjects["rightHand"].f0_0.angle - value * 0.75;
        this.activeObjects["rightHand"].f0_1.obj.rotation.z = this.activeObjects["rightHand"].f0_1.angle + value * 0.5;
        this.activeObjects["rightHand"].f0_2.obj.rotation.z = this.activeObjects["rightHand"].f0_2.angle + value * 0.75;

        this.activeObjects["rightHand"].f1_0.obj.rotation.x = this.activeObjects["rightHand"].f1_0.angle + value * 1.75;
        this.activeObjects["rightHand"].f1_1.obj.rotation.z = this.activeObjects["rightHand"].f1_1.angle + value * 1.3;
        this.activeObjects["rightHand"].f1_2.obj.rotation.z = this.activeObjects["rightHand"].f1_2.angle + value;
        this.activeObjects["rightHand"].f2_0.obj.rotation.x = this.activeObjects["rightHand"].f2_0.angle + value * 1.75;
        this.activeObjects["rightHand"].f2_1.obj.rotation.z = this.activeObjects["rightHand"].f2_1.angle + value * 1.3;
        this.activeObjects["rightHand"].f2_2.obj.rotation.z = this.activeObjects["rightHand"].f2_2.angle + value;
        this.activeObjects["rightHand"].f3_0.obj.rotation.x = this.activeObjects["rightHand"].f3_0.angle + value * 1.75;
        this.activeObjects["rightHand"].f3_1.obj.rotation.z = this.activeObjects["rightHand"].f3_1.angle + value * 1.3;
        this.activeObjects["rightHand"].f3_2.obj.rotation.z = this.activeObjects["rightHand"].f3_2.angle + value;
        this.activeObjects["rightHand"].f4_0.obj.rotation.x = this.activeObjects["rightHand"].f4_0.angle + value * 1.75;
        this.activeObjects["rightHand"].f4_1.obj.rotation.z = this.activeObjects["rightHand"].f4_1.angle + value * 1.3;
        this.activeObjects["rightHand"].f4_2.obj.rotation.z = this.activeObjects["rightHand"].f4_2.angle + value;

        this.activeObjects["rightHand"].f5_0.obj.rotation.x = this.activeObjects["rightHand"].f5_0.angle - value * 0.75;
        this.activeObjects["rightHand"].f5_1.obj.rotation.z = this.activeObjects["rightHand"].f5_1.angle + value * 0.5;
        this.activeObjects["rightHand"].f5_2.obj.rotation.z = this.activeObjects["rightHand"].f5_2.angle + value * 0.75;
    }

    leftHandGrasping(value)
    {
        this.activeObjects["leftHand"].f0_0.obj.rotation.x = this.activeObjects["leftHand"].f0_0.angle - value * 0.75;
        this.activeObjects["leftHand"].f0_1.obj.rotation.z = this.activeObjects["leftHand"].f0_1.angle + value * 0.5;
        this.activeObjects["leftHand"].f0_2.obj.rotation.z = this.activeObjects["leftHand"].f0_2.angle + value * 0.75;

        this.activeObjects["leftHand"].f1_0.obj.rotation.x = this.activeObjects["leftHand"].f1_0.angle + value * 1.75;
        this.activeObjects["leftHand"].f1_1.obj.rotation.z = this.activeObjects["leftHand"].f1_1.angle + value * 1.3;
        this.activeObjects["leftHand"].f1_2.obj.rotation.z = this.activeObjects["leftHand"].f1_2.angle + value;
        this.activeObjects["leftHand"].f2_0.obj.rotation.x = this.activeObjects["leftHand"].f2_0.angle + value * 1.75;
        this.activeObjects["leftHand"].f2_1.obj.rotation.z = this.activeObjects["leftHand"].f2_1.angle + value * 1.3;
        this.activeObjects["leftHand"].f2_2.obj.rotation.z = this.activeObjects["leftHand"].f2_2.angle + value;
        this.activeObjects["leftHand"].f3_0.obj.rotation.x = this.activeObjects["leftHand"].f3_0.angle + value * 1.75;
        this.activeObjects["leftHand"].f3_1.obj.rotation.z = this.activeObjects["leftHand"].f3_1.angle + value * 1.3;
        this.activeObjects["leftHand"].f3_2.obj.rotation.z = this.activeObjects["leftHand"].f3_2.angle + value;
        this.activeObjects["leftHand"].f4_0.obj.rotation.x = this.activeObjects["leftHand"].f4_0.angle + value * 1.75;
        this.activeObjects["leftHand"].f4_1.obj.rotation.z = this.activeObjects["leftHand"].f4_1.angle + value * 1.3;
        this.activeObjects["leftHand"].f4_2.obj.rotation.z = this.activeObjects["leftHand"].f4_2.angle + value;

        this.activeObjects["leftHand"].f5_0.obj.rotation.x = this.activeObjects["leftHand"].f5_0.angle - value * 0.75;
        this.activeObjects["leftHand"].f5_1.obj.rotation.z = this.activeObjects["leftHand"].f5_1.angle + value * 0.5;
        this.activeObjects["leftHand"].f5_2.obj.rotation.z = this.activeObjects["leftHand"].f5_2.angle + value * 0.75;
    }

    say(text)
    {
        this.sayAudio = new Audio("https://tts.voicetech.yandex.net/generate?text=" + text +"&format=mp3&lang=ru-RU&speaker=ermil&emotion=good&speed=0.5&key=069b6659-984b-4c5f-880e-aaedcfd84102");
        this.sayAudio.addEventListener("ended", this.sayAudioCompleted.bind(this), false);
        this.sayAudio.play();

        this.mouthAnimationTimer = setInterval(this.mouthPanelAnimation.bind(this), 100);
    }

    sayEng(text)
    {
        this.sayAudio = new Audio("https://tts.voicetech.yandex.net/generate?text=" + text +"&format=mp3&lang=en-US&speaker=ermil&emotion=good&speed=0.5&key=069b6659-984b-4c5f-880e-aaedcfd84102");
        this.sayAudio.addEventListener("ended", this.sayAudioCompleted.bind(this), false);
        this.sayAudio.play();

        this.mouthAnimationTimer = setInterval(this.mouthPanelAnimation.bind(this), 100);
    }

    sayAudioCompleted()
    {
        this.activeObjects["mouthPanel"].material.map = this.mouthPanelFrames[0];
    }

    mouthPanelAnimation()
    {
        if (!this.sayAudio.ended)
        {
            if (this.sayAudio.currentTime > 0)
            {
                var min = Math.ceil(1);
                var max = Math.floor(4);

                this.activeObjects["mouthPanel"].material.map = this.mouthPanelFrames[Math.floor(Math.random() * (max - min)) + min];
            }
        }
        else
        {
            clearInterval(this.mouthAnimationTimer);
            this.activeObjects["mouthPanel"].material.map = this.mouthPanelFrames[0];
        }
    }

    talk(inputMessage)
    {
        var resultMessage = this.eliza.transform(inputMessage);
        console.log("Valter talks: " + resultMessage);
        this.sayEng(resultMessage);
    }

    navigate(position)
    {
        if (typeof position !== "undefined")
        {
            this.manipulationObject.position.x = position.x;
            this.manipulationObject.position.z = position.z;
        }

        this.navigating = true;
        var matrix = new THREE.Matrix4();
        matrix.extractRotation(this.model.matrix);
        var valterForwardDirection = new THREE.Vector3(0, 1, 0);
        valterForwardDirection.applyMatrix4(matrix);

        var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
        console.log("Navigate to: ", manipulationObjectXZProjPos.x, manipulationObjectXZProjPos.z);
        manipulationObjectXZProjPos.y = this.model.position.y;
        var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
        valterToManipulationObjectDirectionVector.normalize().negate();

        var rotationVal = valterForwardDirection.angleTo(valterToManipulationObjectDirectionVector);
        var rotationDir = (valterForwardDirection.clone().cross(valterToManipulationObjectDirectionVector).y > 0) ? 1 : -1;

        var valterTargetZRotation = this.model.rotation.z + rotationVal * rotationDir;
        this.baseRotation(valterTargetZRotation);
    }

    baseRotation(valterTargetZRotation)
    {
        if (!this.navigating)
        {
            return;
        }
        var self = this;
        var speed = Math.abs(this.model.rotation.z - valterTargetZRotation);
        var rotationTween = new TWEEN.Tween(this.model.rotation);
        rotationTween.easing(TWEEN.Easing.Cubic.InOut);
        rotationTween.to({z: valterTargetZRotation}, 4000 * speed);
        rotationTween.onComplete(function(){
            self.baseMovement();
        });
        var prevBaseRotZ = self.model.rotation.clone().z;
        rotationTween.onUpdate(function(){
            var curBaseRotZ = self.model.rotation.z;
            var rotVelAcc = (prevBaseRotZ - curBaseRotZ) * 3.0;
            self.activeObjects["rightWheelDisk"].rotateZ(rotVelAcc);
            self.activeObjects["leftWheelDisk"].rotateZ(rotVelAcc);
            prevBaseRotZ = self.model.rotation.clone().z;
            var speed = Math.abs(rotVelAcc / 5);
            var maxRot = 120 * Math.PI / 180;
            if (Math.abs(self.activeObjects["smallWheelArmatureRF"].rotation.z) < maxRot * (rotVelAcc > 0 ? 1 : 0.5))
            {
                self.activeObjects["smallWheelArmatureRF"].rotation.z += (rotVelAcc > 0 ? -speed : speed);
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLF"].rotation.z) < maxRot * (rotVelAcc > 0 ? 0.5 : 1.5))
            {
                self.activeObjects["smallWheelArmatureLF"].rotation.z += (rotVelAcc > 0 ? -speed : speed);
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureRR"].rotation.z) < maxRot * (rotVelAcc > 0 ? 2 : 0.5))
            {
                self.activeObjects["smallWheelArmatureRR"].rotation.z += (rotVelAcc > 0 ? speed : -speed) * 1.5;
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLR"].rotation.z) < maxRot * (rotVelAcc > 0 ? 0.5 : 1.5))
            {
                self.activeObjects["smallWheelArmatureLR"].rotation.z += (rotVelAcc > 0 ? speed : -speed) * 1.5;
            }
            self.activeObjects["smallWheelRF"].rotateZ(rotVelAcc / 6);
            self.activeObjects["smallWheelLF"].rotateZ(rotVelAcc / 6);
            self.activeObjects["smallWheelRR"].rotateZ(rotVelAcc / 6);
            self.activeObjects["smallWheelLR"].rotateZ(rotVelAcc / 6);
        });
        rotationTween.start();
    }

    baseMovement()
    {
        var self = this;
        var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
        manipulationObjectXZProjPos.y = this.model.position.y;
        var distance = this.model.position.clone().sub(manipulationObjectXZProjPos.clone()).length();

        var movementTween = new TWEEN.Tween(this.model.position);
        movementTween.easing(TWEEN.Easing.Cubic.InOut);
        movementTween.to(manipulationObjectXZProjPos, 400 * (distance > 1 ? distance : 1) / (this.scale / this.scaleFactor));
        movementTween.onComplete(function(){
            //self.say("Цель достигнута");
            console.log("Goal reached");
            self.navigating = false;
        });
        var prevBasePosXZ = Math.sqrt(self.model.position.clone().x * self.model.position.clone().x + self.model.position.clone().z * self.model.position.clone().z);
        movementTween.onUpdate(function(){
            var curBasePosXZ = Math.sqrt(self.model.position.x * self.model.position.x + self.model.position.z * self.model.position.z);
            var movVelAcc = Math.abs(curBasePosXZ - prevBasePosXZ) * 0.85;
            prevBasePosXZ = Math.sqrt(self.model.position.clone().x * self.model.position.clone().x + self.model.position.clone().z * self.model.position.clone().z);
            var scaleImpact = (self.scaleFactor != self.scale) ? 1.15 * (self.scaleFactor / self.scale) : 1;
            self.activeObjects["rightWheelDisk"].rotateZ(-movVelAcc * scaleImpact);
            self.activeObjects["leftWheelDisk"].rotateZ(movVelAcc * scaleImpact);

            var speed = Math.abs(movVelAcc / 2);
            if (Math.abs(self.activeObjects["smallWheelArmatureRF"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureRF"].rotation.z += (self.activeObjects["smallWheelArmatureRF"].rotation.z > 0 ? -speed : speed) * (self.scaleFactor / self.scale)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLF"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureLF"].rotation.z += (self.activeObjects["smallWheelArmatureLF"].rotation.z > 0 ? -speed : speed) * (self.scaleFactor / self.scale)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureRR"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureRR"].rotation.z += (self.activeObjects["smallWheelArmatureRR"].rotation.z > 0 ? -speed : speed) * (self.scaleFactor / self.scale)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLR"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureLR"].rotation.z += (self.activeObjects["smallWheelArmatureLR"].rotation.z > 0 ? -speed : speed) * (self.scaleFactor / self.scale)
            }
            self.activeObjects["smallWheelLR"].rotateZ(movVelAcc * (self.scaleFactor / self.scale) / 4);
            self.activeObjects["smallWheelRR"].rotateZ(movVelAcc * (self.scaleFactor / self.scale) / 4);
            self.activeObjects["smallWheelLF"].rotateZ(movVelAcc * (self.scaleFactor / self.scale) / 4);
            self.activeObjects["smallWheelRF"].rotateZ(movVelAcc * (self.scaleFactor / self.scale) / 4);
        });
        movementTween.start();
    }

    executeScript(scriptText)
    {
        if (typeof executeScriptDialog !== 'undefined')
        {
            executeScriptDialog.dialog("open");
            if (typeof scriptText !== 'undefined')
            {
                if(scriptText != '')
                {
                    this.scriptLines = scriptText.split("\n");
                    this.scriptExecution();
                }
            }
        }
    }

    scriptExecution()
    {
        var valterRef = this;

        if (valterRef.scriptLines.length == 0)
        {
            return;
        }

        console.log("navigating = ", valterRef.navigating);

        if (valterRef.navigating)
        {
            setTimeout(valterRef.scriptExecution.bind(valterRef), 250);
            return;
        }

        var scriptLine = valterRef.scriptLines.shift();

        var scriptLineParts = scriptLine.split("_");

        if (scriptLineParts[0][0] == '#')
        {
            valterRef.scriptExecution();
            return;
        }

        switch(scriptLineParts[0])
        {
            case "Delay":
                var delay = scriptLineParts[1];
                setTimeout(valterRef.scriptExecution.bind(valterRef), delay);
                return;
            break;
            case "Navigate":
                if (typeof scriptLineParts[1] !== undefined && typeof scriptLineParts[2] !== undefined)
                {
                    var navPosition = new THREE.Vector3(parseFloat(scriptLineParts[1]), 0, parseFloat(scriptLineParts[2]));
                    valterRef.navigate(navPosition);
                }
                else
                {
                    valterRef.navigate();
                }
                setTimeout(valterRef.scriptExecution.bind(valterRef), 250);
                return;
            break;
            case "BaseTranslate":
                if (typeof scriptLineParts[1] !== "undefined" && typeof scriptLineParts[2] !== "undefined")
                {
                    var navPosition = new THREE.Vector3(parseFloat(scriptLineParts[1]), 0, parseFloat(scriptLineParts[2]));
                    this.manipulationObject.position.x = navPosition.x;
                    this.manipulationObject.position.z = navPosition.z;
                    valterRef.navigating = true;
                    valterRef.baseMovement();
                }
                if (typeof scriptLineParts[3] != "undefined")
                {
                    if (scriptLineParts[3] == "C") //continue script
                    {
                        valterRef.navigating = false;
                        valterRef.scriptExecution();
                    }
                }
                else
                {
                    setTimeout(valterRef.scriptExecution.bind(valterRef), 250);
                    return;
                }
            break;
            case "Attach":
                THREE.SceneUtils.attach(valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[1]), valterRef.vlab.getVlabScene(), valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[2]));
                valterRef.scriptExecution();
            break;
            case "Detach":
                THREE.SceneUtils.detach(valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[1]), valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[2]), valterRef.vlab.getVlabScene());
                valterRef.scriptExecution();
            break;
            case "BaseYaw": // -180 ~ 180 deg
                if (valterRef.jointsTweens.baseYaw != null)
                {
                    if (valterRef.jointsTweens.baseYaw._isPlaying)
                    {
                        valterRef.jointsTweens.baseYaw.stop();
                    }
                }
                var valueRad = scriptLineParts[1] * Math.PI / 180 - Math.PI;
                valterRef.jointsTweens.baseYaw = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.baseYaw.easing(TWEEN.Easing.Cubic.InOut);
                valterRef.jointsTweens.baseYaw.to({baseYaw: valueRad}, 8000 * 1 - Math.abs(180 - scriptLineParts[1]));
                valterRef.jointsTweens.baseYaw.onUpdate(function(){
                    valterRef.model.rotation.z = valterRef.joints.baseYaw;
                    valterRef.baseRotation();
                });
                valterRef.jointsTweens.baseYaw.start();
                valterRef.scriptExecution();
            break;
            case "BodyYaw": // -75 ~ 75 deg
                if (valterRef.jointsTweens.bodyYaw != null)
                {
                    if (valterRef.jointsTweens.bodyYaw._isPlaying)
                    {
                        valterRef.jointsTweens.bodyYaw.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.bodyYaw = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.bodyYaw.easing(TWEEN.Easing.Cubic.InOut);
                valterRef.jointsTweens.bodyYaw.to({bodyYaw: valueRad}, 4000 * Math.abs(valterRef.joints.bodyYaw - valueRad));
                valterRef.jointsTweens.bodyYaw.onUpdate(function(){
                    valterRef.activeObjects["valterBodyP1"].rotation.z = valterRef.joints.bodyYaw;
                    valterRef.baseToBodyCableSleeveAnimation();
                });
                valterRef.jointsTweens.bodyYaw.start();
                valterRef.scriptExecution();
            break;
            case "BodyTilt": // 0 ~ 30 deg
                if (valterRef.jointsTweens.bodyTilt != null)
                {
                    if (valterRef.jointsTweens.bodyTilt._isPlaying)
                    {
                        valterRef.jointsTweens.bodyTilt.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.bodyTilt = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.bodyTilt.easing(TWEEN.Easing.Cubic.InOut);
                valterRef.jointsTweens.bodyTilt.to({bodyTilt: valueRad}, 8000 * Math.abs(valterRef.joints.bodyTilt - valueRad));
                valterRef.jointsTweens.bodyTilt.onUpdate(function(){
                    valterRef.activeObjects["bodyFrameAxisR"].rotation.x = valterRef.joints.bodyTilt;
                    valterRef.bodyToTorsoCableSleeveAnimation();
                    // console.log("Body Tilt", valterRef.activeObjects["bodyFrameAxisR"].rotation.x);
                });
                valterRef.jointsTweens.bodyTilt.start();
                valterRef.scriptExecution();
            break;
            case "HeadYaw": // -85 ~ 85 deg
                if (valterRef.jointsTweens.headYaw != null)
                {
                    if (valterRef.jointsTweens.headYaw._isPlaying)
                    {
                        valterRef.jointsTweens.headYaw.stop();
                    }
                }
                var valueRad = scriptLineParts[1] * Math.PI / 180 - Math.PI;
                valterRef.jointsTweens.headYaw = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.headYaw.to({headYaw: valueRad}, 2000);
                valterRef.jointsTweens.headYaw.onUpdate(function(){
                    valterRef.activeObjects["headYawFrame"].rotation.z = valterRef.joints.headYaw;
                    valterRef.headToBodyCableSleeveAnimation();
                });
                valterRef.jointsTweens.headYaw.start();
                valterRef.scriptExecution();
            break;
            case "HeadTilt": // 0 ~ 30 deg
                if (valterRef.jointsTweens.headTilt != null)
                {
                    if (valterRef.jointsTweens.headTilt._isPlaying)
                    {
                        valterRef.jointsTweens.headTilt.stop();
                    }
                }
                var valueRad = scriptLineParts[1] * Math.PI / 180 - 2.85;
                valterRef.jointsTweens.headTilt = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.headTilt.to({headTilt: valueRad}, 2000);
                valterRef.jointsTweens.headTilt.onUpdate(function(){
                    valterRef.activeObjects["headTiltFrame"].rotation.x = valterRef.joints.headTilt;
                    valterRef.headToBodyCableSleeveAnimation();
                });
                valterRef.jointsTweens.headTilt.start();
                valterRef.scriptExecution();
            break;
            case "RightForearmRoll": // 0 ~ 180 deg
                if (valterRef.jointsTweens.rightForearmRoll != null)
                {
                    if (valterRef.jointsTweens.rightForearmRoll._isPlaying)
                    {
                        valterRef.jointsTweens.rightForearmRoll.stop();
                    }
                }
                var valueRad = -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.rightForearmRoll = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.rightForearmRoll.to({rightForearmRoll: valueRad}, 2000);
                valterRef.jointsTweens.rightForearmRoll.onUpdate(function(){
                    valterRef.activeObjects["forearmFrameRight"].rotation.y = valterRef.joints.rightForearmRoll;
                });
                valterRef.jointsTweens.rightForearmRoll.start();
                valterRef.scriptExecution();
            break;
            case "LeftForearmRoll": // 0 ~ 180 deg
                if (valterRef.jointsTweens.leftForearmRoll != null)
                {
                    if (valterRef.jointsTweens.leftForearmRoll._isPlaying)
                    {
                        valterRef.jointsTweens.leftForearmRoll.stop();
                    }
                }
                var valueRad = -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.leftForearmRoll = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.leftForearmRoll.to({leftForearmRoll: valueRad}, 2000);
                valterRef.jointsTweens.leftForearmRoll.onUpdate(function(){
                    valterRef.activeObjects["forearmFrameLeft"].rotation.y = valterRef.joints.leftForearmRoll;
                });
                valterRef.jointsTweens.leftForearmRoll.start();
                valterRef.scriptExecution();
            break;
            case "RightLimb": // -48 ~ 80 deg
                if (valterRef.jointsTweens.rightLimb != null)
                {
                    if (valterRef.jointsTweens.rightLimb._isPlaying)
                    {
                        valterRef.jointsTweens.rightLimb.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.rightLimb = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.rightLimb.to({rightLimb: valueRad}, 2000);
                valterRef.jointsTweens.rightLimb.onUpdate(function(){
                    valterRef.activeObjects["armRightShoulderAxis"].rotation.x = valterRef.joints.rightLimb;
                });
                valterRef.jointsTweens.rightLimb.start();
                valterRef.scriptExecution();
            break;
            case "LeftLimb": // -48 ~ 80 deg
                if (valterRef.jointsTweens.leftLimb != null)
                {
                    if (valterRef.jointsTweens.leftLimb._isPlaying)
                    {
                        valterRef.jointsTweens.leftLimb.stop();
                    }
                }
                var valueRad = scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.leftLimb = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.leftLimb.to({leftLimb: valueRad}, 2000);
                valterRef.jointsTweens.leftLimb.onUpdate(function(){
                    valterRef.activeObjects["armLeftShoulderAxis"].rotation.x = valterRef.joints.leftLimb;
                });
                valterRef.jointsTweens.leftLimb.start();
                valterRef.scriptExecution();
            break;
            case "RightForearm": // -28 ~ 57 deg
                if (valterRef.jointsTweens.rightForearm != null)
                {
                    if (valterRef.jointsTweens.rightForearm._isPlaying)
                    {
                        valterRef.jointsTweens.rightForearm.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.rightForearm = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.rightForearm.to({rightForearm: valueRad}, 2000);
                valterRef.jointsTweens.rightForearm.onUpdate(function(){
                    valterRef.rightForearmRotate(valterRef.joints.rightForearm);
                });
                valterRef.jointsTweens.rightForearm.start();
                valterRef.scriptExecution();
            break;
            case "LeftForearm": // -28 ~ 57 deg
                if (valterRef.jointsTweens.leftForearm != null)
                {
                    if (valterRef.jointsTweens.leftForearm._isPlaying)
                    {
                        valterRef.jointsTweens.leftForearm.stop();
                    }
                }
                var valueRad = scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.leftForearm = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.leftForearm.to({leftForearm: valueRad}, 2000);
                valterRef.jointsTweens.leftForearm.onUpdate(function(){
                    valterRef.leftForearmRotate(valterRef.joints.leftForearm);
                });
                valterRef.jointsTweens.leftForearm.start();
                valterRef.scriptExecution();
            break;
            case "RightHandGrasp": // 0.0 ~ 1.0
                if (valterRef.jointsTweens.rightHandGrasp != null)
                {
                    if (valterRef.jointsTweens.rightHandGrasp._isPlaying)
                    {
                        valterRef.jointsTweens.rightHandGrasp.stop();
                    }
                }
                var value = scriptLineParts[1];
                valterRef.jointsTweens.rightHandGrasp = new TWEEN.Tween(valterRef.handGrasping);
                valterRef.jointsTweens.rightHandGrasp.to({right: value}, 350);
                valterRef.jointsTweens.rightHandGrasp.onUpdate(function(){
                    valterRef.rightHandGrasping(valterRef.handGrasping.right);
                });
                valterRef.jointsTweens.rightHandGrasp.start();
                valterRef.scriptExecution();
            break;
            case "LefttHandGrasp": // 0.0 ~ 1.0
                if (valterRef.jointsTweens.leftHandGrasp != null)
                {
                    if (valterRef.jointsTweens.leftHandGrasp._isPlaying)
                    {
                        valterRef.jointsTweens.leftHandGrasp.stop();
                    }
                }
                var value = scriptLineParts[1];
                valterRef.jointsTweens.leftHandGrasp = new TWEEN.Tween(valterRef.handGrasping);
                valterRef.jointsTweens.leftHandGrasp.to({left: value}, 350);
                valterRef.jointsTweens.leftHandGrasp.onUpdate(function(){
                    valterRef.leftHandGrasping(valterRef.handGrasping.left);
                });
                valterRef.jointsTweens.leftHandGrasp.start();
                valterRef.scriptExecution();
            break;
            case "RightShoulder":
                if (valterRef.jointsTweens.rightShoulder != null)
                {
                    if (valterRef.jointsTweens.rightShoulder._isPlaying)
                    {
                        valterRef.jointsTweens.rightShoulder.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.rightShoulder = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.rightShoulder.to({rightShoulder: valueRad}, 2000);
                valterRef.jointsTweens.rightShoulder.onUpdate(function(){
                    valterRef.rightShoulderRotate(valterRef.joints.rightShoulder);
                });
                valterRef.jointsTweens.rightShoulder.start();
                valterRef.scriptExecution();
            break;
            case "LeftShoulder":
                if (valterRef.jointsTweens.leftShoulder != null)
                {
                    if (valterRef.jointsTweens.leftShoulder._isPlaying)
                    {
                        valterRef.jointsTweens.leftShoulder.stop();
                    }
                }
                var valueRad = -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.leftShoulder = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.leftShoulder.to({leftShoulder: valueRad}, 2000);
                valterRef.jointsTweens.leftShoulder.onUpdate(function(){
                    valterRef.leftShoulderRotate(valterRef.joints.leftShoulder);
                });
                valterRef.jointsTweens.leftShoulder.start();
                valterRef.scriptExecution();
            break;
            case "RightArm":
                if (valterRef.jointsTweens.rightArm != null)
                {
                    if (valterRef.jointsTweens.rightArm._isPlaying)
                    {
                        valterRef.jointsTweens.rightArm.stop();
                    }
                }
                var valueRad = (scriptLineParts[2] == "rad") ? scriptLineParts[1] * 1.0 : -1.22 - scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.rightArm = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.rightArm.to({rightArm: valueRad}, 2000);
                valterRef.jointsTweens.rightArm.onUpdate(function(){
                    valterRef.rightArmRotate(valterRef.joints.rightArm);
                });
                valterRef.jointsTweens.rightArm.start();
                valterRef.scriptExecution();
            break;
            case "LeftArm":
                if (valterRef.jointsTweens.leftArm != null)
                {
                    if (valterRef.jointsTweens.leftArm._isPlaying)
                    {
                        valterRef.jointsTweens.leftArm.stop();
                    }
                }
                var valueRad = -1.22 - scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.leftArm = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.leftArm.to({leftArm: valueRad}, 2000);
                valterRef.jointsTweens.leftArm.onUpdate(function(){
                    valterRef.leftArmRotate(valterRef.joints.leftArm);
                });
                valterRef.jointsTweens.leftArm.start();
                valterRef.scriptExecution();
            break;
            case "ObjRot":
                var rotValueRad = parseFloat(scriptLineParts[3]);
                var objRotation = valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[1]).rotation;
                var objectRotTween = new TWEEN.Tween(objRotation);
                var axis = scriptLineParts[2];
                switch (axis)
                {
                    case "x":
                        objectRotTween.to({x: rotValueRad}, parseInt(scriptLineParts[4]));
                    break;
                    case "y":
                        objectRotTween.to({y: rotValueRad}, parseInt(scriptLineParts[4]));
                    break;
                    case "z":
                        objectRotTween.to({z: rotValueRad}, parseInt(scriptLineParts[4]));
                    break;
                }
                objectRotTween.start();
                valterRef.scriptExecution();
            break;
            case "ObjTranslate": //ObjTranslate_screwHead1_x_20.23_100
                var translateValue = parseFloat(scriptLineParts[3]);
                var objPosition = valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[1]).position;
                console.log(objPosition);
                var objPosTween = new TWEEN.Tween(objPosition);
                var axis = scriptLineParts[2];
                switch (axis)
                {
                    case "x":
                        objPosTween.to({x: translateValue}, parseInt(scriptLineParts[4]));
                    break;
                    case "y":
                        objPosTween.to({y: translateValue}, parseInt(scriptLineParts[4]));
                    break;
                    case "z":
                        objPosTween.to({z: translateValue}, parseInt(scriptLineParts[4]));
                    break;
                }
                objPosTween.start();
                valterRef.scriptExecution();
            break;
            case "ObjVisibility": //ObjTranslate_screwHead1_0
                var visibilityValue = parseFloat(scriptLineParts[2]);
                var obj = valterRef.vlab.getVlabScene().getObjectByName(scriptLineParts[1]);
                obj.visible = (parseInt(visibilityValue) == 1) ? true : false;
                valterRef.scriptExecution();
            break;
            case "GetRightPalmPadPosition":
                var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(valterRef.activeObjects["rPalmPad"].matrixWorld);
                console.log(rPalmPadPosition);
            break;
            case "GetRightArmIKPCL":
                var valterRef = this;
                $.ajax({
                    url: "/srv/rightarmikpcl",
                    type: 'POST',
                    contentType: "application/json"
                }).done(function(results){
                    var pclGeometry = new THREE.Geometry();
                    for (var i = 0; i < results.length; i++)
                    {
                        var vertex = new THREE.Vector3();
                        vertex.x = parseFloat(results[i].eefX);
                        vertex.y = parseFloat(results[i].eefY);
                        vertex.z = parseFloat(results[i].eefZ);
                        vertex.multiplyScalar(1 / valterRef.model.scale.x);
                        pclGeometry.vertices.push(vertex);
                    }
                    var pclMaterial = new THREE.PointsMaterial({
                      color: 0x00ff00,
                      size: 0.025
                    });
                    if (typeof valterRef.pointCloud != "undefined")
                    {
                        valterRef.model.remove(valterRef.pointCloud);
                    }
                    valterRef.pointCloud = new THREE.Points(pclGeometry, pclMaterial);
                    valterRef.model.add(valterRef.pointCloud);
                });
            break;
        }
    }

    rightArmIK()
    {
        var eefPos = new THREE.Vector3().setFromMatrixPosition(this.manipulationObject.matrixWorld);
        // console.log("Global RArm EEF: ",  eefPos);
        this.model.worldToLocal(eefPos);
        eefPos.multiply(this.model.scale);
        // console.log("Local RArm EEF: ",  eefPos);

        eefPos.x = eefPos.x.toFixed(3);
        eefPos.y = eefPos.y.toFixed(3);
        eefPos.z = eefPos.z.toFixed(3);

        var valterRef = this;

        $.ajax({
            url: "/srv/solverarmik",
            type: 'POST',
            contentType: "application/json",
            data: JSON.stringify(eefPos)
        }).done(function(rArmIK){
            if (rArmIK)
            {
                console.log("Solution found for RArm EEF");
                // console.log(rArmIK);

                var rArmIK_rightArm = ((parseFloat(rArmIK.rightArm) + 0.15) < -1.22) ? (parseFloat(rArmIK.rightArm) + 0.15) : (parseFloat(rArmIK.rightArm));

                valterRef.scriptLines = [];
                valterRef.scriptLines.push("BodyYaw_" +         (rArmIK.bodyYaw)                            + "_rad");
                valterRef.scriptLines.push("BodyTilt_" +        (rArmIK.bodyTilt)                           + "_rad");
                valterRef.scriptLines.push("RightArm_" +        (rArmIK_rightArm)                           + "_rad");
                valterRef.scriptLines.push("RightForearm_" +    (rArmIK.rightForearm)                       + "_rad");
                valterRef.scriptLines.push("RightLimb_" +       (rArmIK.rightLimb)                          + "_rad");
                valterRef.scriptLines.push("RightShoulder_" +   (rArmIK.rightShoulder)                      + "_rad");
                valterRef.scriptLines.push("RightForearmRoll_90");
                console.log(valterRef.scriptLines);
                valterRef.scriptExecution();
            }
            else
            {
                console.log("Solution not found for RArm EEF");
            }
        });
    }

    rightArmIKANN(eefLocalPos)
    {
        var eefPosN = eefLocalPos.multiplyScalar(this.scaleFactor / this.scale);

        var net = {"layers":[
            {
                    "name":"hl1",
                    "biases":[-1.005043864250183105e+00,-1.974901556968688965e+00,8.129239082336425781e+00,1.171565532684326172e+00,2.973031282424926758e+00,-4.427392005920410156e+00,5.967142581939697266e+00,-2.659092426300048828e+00,6.710699558258056641e+00,-4.339516639709472656e+00,-7.307592630386352539e-01,-2.010443061590194702e-01,5.427761077880859375e+00,1.351929068565368652e+00,-1.134873867034912109e+00,8.349522948265075684e-01,-3.390970945358276367e+00,-2.773213863372802734e+00,5.346754074096679688e+00,8.114897012710571289e-01,4.098882675170898438e+00,-3.321793317794799805e+00,6.227631092071533203e+00,7.814331054687500000e-01,-2.045678496360778809e-01,-8.233208060264587402e-01,1.270706892013549805e+00,4.252742826938629150e-01,-3.554858446121215820e+00,4.396818637847900391e+00],
                    "weights":[
                            [1.988732963800430298e-01,1.048268556594848633e+00,-2.044992148876190186e-01,6.996268630027770996e-01,1.164360761642456055e+00,-6.651749014854431152e-01,8.125234246253967285e-01,-8.665813803672790527e-01,-3.418073803186416626e-02,6.008637547492980957e-01,-1.033906918019056320e-02,-6.139186024665832520e-01,-5.529413223266601562e-01,8.612536191940307617e-01,5.686804652214050293e-01,7.571677565574645996e-01,2.064733982086181641e+00,1.317127227783203125e+00,9.726855158805847168e-01,-6.977433711290359497e-02,9.715463519096374512e-01,-2.698085010051727295e-01,-8.595658838748931885e-02,-6.868239026516675949e-03,1.224547505378723145e+00,-7.909610867500305176e-01,-2.153452396392822266e+00,2.853038311004638672e-01,8.109939098358154297e-01,-6.959025859832763672e-01],
                            [1.011490583419799805e+00,-5.030699968338012695e-01,4.063829421997070312e+00,5.500172376632690430e-01,1.118279695510864258e+00,7.719451785087585449e-01,-9.013237953186035156e-01,-5.788684487342834473e-01,-5.811613984405994415e-03,2.066654920578002930e+00,4.344787895679473877e-01,-1.621841669082641602e+00,5.685939788818359375e-01,1.956455945968627930e+00,-3.545179590582847595e-02,-4.417437314987182617e-01,-1.058966159820556641e+00,-1.834839135408401489e-01,-4.819688796997070312e-01,-1.329408138990402222e-01,5.125699639320373535e-01,1.602130830287933350e-01,-5.355594307184219360e-02,-1.661585927009582520e+00,-2.149134427309036255e-01,6.340884566307067871e-01,2.636005163192749023e+00,-1.405014514923095703e+00,1.520579218864440918e+00,-3.993362784385681152e-01],
                            [-5.055170655250549316e-01,-2.010370939970016479e-01,6.395244002342224121e-01,-5.695245862007141113e-01,6.424236297607421875e-01,-3.077581524848937988e-01,1.916915178298950195e-02,-2.703519761562347412e-01,-3.632486462593078613e-01,-3.987063467502593994e-01,2.201132535934448242e+00,2.454582750797271729e-01,-1.113422393798828125e+00,-4.820126574486494064e-03,1.585215091705322266e+00,-2.462084405124187469e-02,9.073413610458374023e-01,-5.857092142105102539e-01,-1.087994575500488281e+00,-2.430680751800537109e+00,-1.115234613418579102e+00,1.919804453849792480e+00,-6.346720457077026367e-01,1.712622880935668945e+00,6.028929352760314941e-01,1.942392736673355103e-01,-3.765862882137298584e-01,-2.736266851425170898e-01,1.110986709594726562e+00,-1.264561712741851807e-01]
                    ]
            },
            {
                    "name":"hl2",
                    "biases":[-2.606761932373046875e+00,-1.661515235900878906e+00,-1.393800377845764160e+00,-7.105423808097839355e-01,-2.854960680007934570e+00,-1.605071902275085449e+00,1.061176434159278870e-01,2.291968762874603271e-01,-7.390841245651245117e-01,-1.577725112438201904e-01,-4.613068401813507080e-01,2.589079856872558594e+00,-6.829792261123657227e-01,-9.242942333221435547e-01,-1.012678027153015137e+00,3.021359205245971680e+00,9.726659655570983887e-01,3.579096868634223938e-02,-7.868475914001464844e-01,-8.254387378692626953e-01,5.545502305030822754e-01,8.455908894538879395e-01,4.152773320674896240e-01,-5.940722823143005371e-01,-1.145307064056396484e+00,-3.126370012760162354e-01,3.230302631855010986e-01,8.964655995368957520e-01,2.819392830133438110e-02,1.134482026100158691e+00],
                    "weights":[
                            [-9.096075296401977539e-01,-5.994585156440734863e-01,-3.747902870178222656e+00,2.759192705154418945e+00,-7.958686351776123047e-01,-8.847690582275390625e+00,-1.783966064453125000e+00,-3.992567360401153564e-01,-5.657044053077697754e-01,-2.272829055786132812e+00,-1.086410140991210938e+01,5.376568436622619629e-01,1.116207242012023926e-02,4.439703464508056641e+00,1.898783802986145020e+00,1.022911548614501953e+01,3.819822967052459717e-01,-6.333344429731369019e-02,4.642320871353149414e-01,-1.225874543190002441e+00,1.091355551034212112e-02,5.017431259155273438e+00,1.291168332099914551e+00,-5.619159698486328125e+00,-3.111468076705932617e+00,2.956449747085571289e+00,8.570806980133056641e-01,3.654130935668945312e+00,2.755712985992431641e+00,-4.514101028442382812e+00],
                            [5.610732436180114746e-01,1.311984300613403320e+00,1.261317491531372070e+00,-3.397009074687957764e-01,3.676896691322326660e-01,-1.657939314842224121e+00,-2.739047527313232422e+00,-2.203423976898193359e+00,3.533143699169158936e-01,2.276133745908737183e-01,-2.279547452926635742e+00,-1.911431550979614258e+00,-2.530822992324829102e+00,5.780482292175292969e-01,5.841034412384033203e+00,-1.808238923549652100e-01,8.805036544799804688e-01,7.359364032745361328e-01,-1.129472255706787109e+00,3.944873809814453125e-02,3.863603830337524414e+00,2.387887835502624512e-01,-2.013661414384841919e-01,-1.227944731712341309e+00,-1.141253471374511719e+00,-9.425563812255859375e-01,-1.998901247978210449e+00,6.366027593612670898e-01,-4.095560073852539062e+00,-1.229405641555786133e+00],
                            [2.939879298210144043e-01,-7.064481973648071289e-01,2.191472649574279785e-01,-1.292160630226135254e+00,8.068425059318542480e-01,-9.255381822586059570e-01,-1.507731795310974121e+00,1.346344470977783203e+00,6.041372418403625488e-01,4.403229951858520508e-01,-1.852110147476196289e+00,-6.552665233612060547e-01,1.078356862068176270e+00,-1.753732442855834961e+00,1.769323945045471191e-01,-1.743634790182113647e-01,3.614357113838195801e-01,-1.490161269903182983e-01,1.620167136192321777e+00,1.689131498336791992e+00,-3.488261997699737549e-01,1.967232584953308105e+00,1.102925658226013184e+00,-4.333175122737884521e-01,1.974800944328308105e+00,-9.861832261085510254e-01,1.030893087387084961e+00,1.642637968063354492e+00,-6.394458413124084473e-01,1.353427767753601074e+00],
                            [3.703003168106079102e+00,5.935513377189636230e-01,-3.913742601871490479e-01,2.095626115798950195e+00,-1.464427709579467773e+00,-6.049085617065429688e+00,-2.513421475887298584e-01,1.401138752698898315e-01,-1.077163696289062500e+00,-1.125392019748687744e-01,-5.676393985748291016e+00,1.087032318115234375e+00,1.114106178283691406e+00,2.857090950012207031e+00,-3.049563169479370117e+00,6.554110050201416016e+00,4.988591670989990234e-01,3.393594324588775635e-01,1.868058443069458008e+00,3.262126445770263672e+00,-5.524279475212097168e-01,8.326349258422851562e-01,-1.026022076606750488e+00,-4.220024585723876953e+00,9.527703523635864258e-01,2.002714395523071289e+00,1.020531535148620605e+00,-7.801513671875000000e-01,-7.705753445625305176e-01,-4.008028030395507812e+00],
                            [2.455329746007919312e-01,9.330703616142272949e-01,-6.891735643148422241e-02,-2.111444711685180664e+00,2.614139318466186523e+00,-2.577442862093448639e-02,-7.864351868629455566e-01,1.019811868667602539e+00,-1.567786097526550293e+00,6.474514007568359375e-01,5.755811557173728943e-02,-1.492914408445358276e-01,-1.262643218040466309e+00,-7.240336537361145020e-01,8.353745341300964355e-01,7.051610946655273438e-01,-1.103255033493041992e+00,1.069311499595642090e+00,-3.673421740531921387e-01,1.385327816009521484e+00,7.267733216285705566e-01,1.085531413555145264e-01,-1.204586505889892578e+00,1.249768495559692383e+00,-2.836064398288726807e-01,-1.927729725837707520e+00,4.943912327289581299e-01,3.927802443504333496e-01,-7.303528785705566406e-01,1.224979639053344727e+00],
                            [-1.114151763916015625e+01,-1.139616966247558594e+00,-4.558127403259277344e+00,1.818755149841308594e+00,-2.375235795974731445e+00,-4.924261093139648438e+00,4.609329402446746826e-01,-2.087911844253540039e+00,-2.555925130844116211e+00,-3.002979040145874023e+00,-2.536683320999145508e+00,-3.160168826580047607e-01,1.180605068802833557e-01,3.389295101165771484e+00,-1.150469660758972168e+00,1.097064399719238281e+01,3.201789557933807373e-01,1.493512272834777832e+00,1.566017627716064453e+00,-6.586791276931762695e-01,-2.827823877334594727e+00,-2.472672462463378906e+00,-3.344423055648803711e+00,-5.511691570281982422e+00,2.961926698684692383e+00,1.904979467391967773e+00,5.181027889251708984e+00,1.350000762939453125e+01,-3.719458341598510742e+00,-5.026849746704101562e+00],
                            [2.466806411743164062e+00,-1.146489858627319336e+00,4.244518578052520752e-01,-4.135972261428833008e-01,6.458542346954345703e-01,7.701138257980346680e-01,-2.662245035171508789e-01,-1.083343267440795898e+00,3.207441329956054688e+00,-4.671790301799774170e-01,-9.071589708328247070e-01,-1.152422785758972168e+00,1.846881985664367676e+00,-6.945161819458007812e-01,6.766386032104492188e-01,-1.735487282276153564e-01,-2.341879755258560181e-01,-1.116827130317687988e+00,-5.962914824485778809e-01,-4.813109338283538818e-01,2.728708505630493164e+00,3.117499828338623047e+00,1.130134105682373047e+00,9.056006669998168945e-01,1.305627226829528809e+00,-1.183761239051818848e+00,4.268979132175445557e-01,1.487629771232604980e+00,2.148538827896118164e+00,-7.189776515588164330e-04],
                            [-1.089300394058227539e+00,-4.388524293899536133e-01,-1.261861324310302734e+00,-4.855484962463378906e+00,-1.260743260383605957e+00,-1.270495057106018066e+00,1.268571496009826660e+00,1.975027322769165039e+00,3.210842907428741455e-01,-1.557820916175842285e+00,-2.559006810188293457e-01,1.815818071365356445e+00,9.770779013633728027e-01,3.300462007522583008e+00,-7.092522978782653809e-01,7.992392539978027344e+00,-8.418505787849426270e-01,1.563628792762756348e+00,1.738021612167358398e+00,1.702771782875061035e+00,4.800847530364990234e+00,1.332764029502868652e+00,8.872821927070617676e-01,-4.855126380920410156e+00,-4.916929244995117188e+00,1.724637746810913086e+00,2.246679544448852539e+00,8.081830024719238281e+00,2.382527589797973633e+00,-4.451947212219238281e+00],
                            [2.428821325302124023e+00,-4.402447700500488281e+00,8.611746430397033691e-01,-1.137450575828552246e+00,-2.959434688091278076e-01,-2.989493608474731445e+00,9.383018314838409424e-02,-2.660233676433563232e-01,2.302381277084350586e+00,-1.367123246192932129e+00,1.607960462570190430e+00,2.026988029479980469e+00,2.939750552177429199e-01,-1.892724156379699707e+00,-4.893691837787628174e-01,-9.717093110084533691e-01,-3.349334239959716797e+00,-1.928526997566223145e+00,-2.417737960815429688e+00,5.261701941490173340e-01,2.750798702239990234e+00,-5.071241855621337891e-01,-8.907248973846435547e-01,5.263145446777343750e+00,2.590100526809692383e+00,2.638875961303710938e+00,-9.310284852981567383e-01,-3.610687553882598877e-01,1.548632383346557617e+00,2.544426172971725464e-02],
                            [-1.194054028019309044e-03,1.972812116146087646e-01,-7.871075272560119629e-01,1.306351900100708008e+00,1.099888324737548828e+00,-3.551629483699798584e-01,-6.008560657501220703e-01,2.043203592300415039e+00,-2.561129629611968994e-01,-1.260617733001708984e+00,9.255110472440719604e-02,-1.558107733726501465e-01,9.443309307098388672e-01,1.910180300474166870e-01,-8.642590045928955078e-02,5.289766192436218262e-01,-4.446227252483367920e-01,-4.760081470012664795e-01,2.618348896503448486e-01,-3.331835269927978516e+00,-6.133266687393188477e-01,7.621238231658935547e-01,3.237629234790802002e-01,-5.630639195442199707e-01,-1.570756077766418457e+00,-2.231066823005676270e-01,1.351849555969238281e+00,4.554811954498291016e+00,-2.298058271408081055e+00,-9.520305991172790527e-01],
                            [-1.987306594848632812e+00,5.212268233299255371e-01,6.025899648666381836e-01,-1.283493638038635254e-01,-8.896445631980895996e-01,-7.158135175704956055e-01,-9.964985251426696777e-01,-4.978431761264801025e-01,-2.173669099807739258e+00,-1.583955526351928711e+00,-1.228393793106079102e+00,-8.625199198722839355e-01,-7.042744159698486328e-01,2.315576791763305664e+00,1.143783211708068848e+00,8.647063970565795898e-01,-7.726763188838958740e-02,5.428003892302513123e-02,-9.048286676406860352e-01,-1.031172275543212891e+00,-1.026902198791503906e+00,2.910233661532402039e-02,-2.613531649112701416e-01,1.437364816665649414e+00,-1.765086412429809570e+00,-5.539257526397705078e-01,-9.441976547241210938e-01,2.491874456405639648e+00,-1.726166605949401855e+00,2.518680691719055176e-01],
                            [-1.051717065274715424e-02,-2.570268213748931885e-01,1.016263008117675781e+00,-1.274651408195495605e+00,-5.174702405929565430e-01,5.062760710716247559e-01,1.006207704544067383e+00,-2.313772916793823242e+00,3.232452392578125000e+00,1.651676058769226074e+00,3.010123372077941895e-01,3.849050402641296387e-01,-1.797781109809875488e+00,4.020080864429473877e-01,3.421458601951599121e-02,-3.391242772340774536e-02,1.668220013380050659e-01,1.066311478614807129e+00,-1.139526739716529846e-01,-2.082556933164596558e-01,-3.493282198905944824e-02,-1.245190024375915527e+00,-1.033547073602676392e-01,-1.969322413206100464e-01,-1.034459948539733887e+00,2.250481367111206055e+00,-9.628951549530029297e-02,-1.540561169385910034e-01,1.393414735794067383e+00,-4.213327467441558838e-01],
                            [-1.015667819976806641e+01,-1.830277633666992188e+01,-2.798991203308105469e+00,-2.864509820938110352e+00,-5.802865505218505859e+00,-1.789732933044433594e+00,-1.157811522483825684e+00,1.989306092262268066e+00,-2.694215774536132812e-01,5.672310352325439453e+00,2.128052234649658203e+00,-2.363886117935180664e+00,-1.293775811791419983e-02,5.646806716918945312e+00,1.864656805992126465e+00,8.130407333374023438e-01,1.929872989654541016e+00,-1.115585446357727051e+00,2.562149524688720703e+00,-1.707364082336425781e+00,1.766211628913879395e+00,-9.672657847404479980e-01,6.018611431121826172e+00,-9.475364685058593750e+00,-1.765592813491821289e+00,1.249047636985778809e+00,9.145172119140625000e+00,2.160414314270019531e+01,-1.787769645452499390e-01,-3.398255825042724609e+00],
                            [1.274698972702026367e+00,5.570973083376884460e-02,-1.805396556854248047e+00,-7.663695216178894043e-01,-1.761465370655059814e-01,4.754306674003601074e-01,-1.216760277748107910e+00,-7.677873373031616211e-01,-1.077971100807189941e+00,-2.442460536956787109e+00,3.584439158439636230e-01,-1.175933122634887695e+00,1.257383704185485840e+00,4.890303611755371094e-01,5.490946173667907715e-01,-2.495746910572052002e-01,-3.921907395124435425e-02,-1.224744439125061035e+00,-4.220857322216033936e-01,4.150526523590087891e+00,-3.403652906417846680e-01,-2.836662530899047852e+00,-1.509963154792785645e+00,-1.274459622800350189e-02,-2.342513799667358398e+00,-5.780097842216491699e-01,-6.555182337760925293e-01,-2.381448000669479370e-01,-2.643023252487182617e+00,1.163436770439147949e+00],
                            [-3.098833262920379639e-01,-1.733340263366699219e+00,-5.465357899665832520e-01,8.885905742645263672e-01,1.061837196350097656e+00,-5.831980705261230469e-01,-8.449124693870544434e-01,7.213001847267150879e-01,-1.129657745361328125e+00,-1.032878160476684570e+00,-1.161091208457946777e+00,-6.665772795677185059e-01,1.463227272033691406e+00,-5.923758745193481445e-01,2.959604561328887939e-01,6.677679717540740967e-02,-3.068933784961700439e-01,-4.445736706256866455e-01,-5.668113231658935547e-01,-9.316145777702331543e-01,-1.252624273300170898e+00,1.074332714080810547e+00,-1.414728045463562012e+00,4.304287135601043701e-01,7.194288969039916992e-01,-2.775498926639556885e-01,-6.350855827331542969e-01,-1.171359717845916748e-01,-7.535311579704284668e-01,5.492332577705383301e-01],
                            [-8.688785880804061890e-02,5.819825530052185059e-01,1.547319769859313965e+00,-5.143876373767852783e-02,1.310262203216552734e+00,1.683579683303833008e+00,1.343963027000427246e+00,-1.966742634773254395e+00,9.820541739463806152e-01,3.325781822204589844e-01,-4.057588055729866028e-02,5.490447580814361572e-02,-9.711831808090209961e-01,5.559353232383728027e-01,-4.367048144340515137e-01,-1.005096793174743652e+00,8.960738778114318848e-01,-8.671008348464965820e-01,-9.052870795130729675e-03,1.111310243606567383e+00,1.101032271981239319e-01,3.335487246513366699e-01,-3.766780853271484375e+00,-2.882944047451019287e-01,1.277404427528381348e+00,8.948833942413330078e-01,-1.636234760284423828e+00,-7.332935333251953125e-01,1.390784382820129395e-01,9.691625833511352539e-01],
                            [-5.946931362152099609e+00,6.794074922800064087e-02,2.902292311191558838e-01,2.547200918197631836e-01,-1.006546989083290100e-01,-7.379170656204223633e-01,3.323265314102172852e-01,1.441446065902709961e+00,-1.266394704580307007e-01,3.934810161590576172e-01,5.700694918632507324e-01,2.683895826339721680e-01,2.225807666778564453e+00,-7.567793726921081543e-01,1.806077659130096436e-01,-4.493941068649291992e-01,4.283140599727630615e-02,-3.995123803615570068e-01,1.219874322414398193e-01,5.093281865119934082e-01,-3.102945089340209961e-01,4.790363609790802002e-01,6.100379228591918945e-01,-2.011012285947799683e-01,-7.277215719223022461e-01,9.124176502227783203e-01,-6.937600970268249512e-01,-2.129596769809722900e-01,4.928241372108459473e-01,7.396270036697387695e-01],
                            [2.659648060798645020e-01,-6.131152622401714325e-03,2.267040684819221497e-02,2.945908784866333008e+00,4.330092430114746094e+00,-3.106022596359252930e+00,6.169055461883544922e+00,-3.685917139053344727e+00,5.173035264015197754e-01,1.952461838722229004e+00,-1.125809860229492188e+01,-1.419595360755920410e+00,-1.045722723007202148e+00,1.408687829971313477e+00,-3.215038299560546875e+00,1.387282848358154297e+01,1.900819828733801842e-03,1.408063888549804688e+00,1.262733578681945801e+00,2.755897343158721924e-01,-6.471473723649978638e-02,-5.135056495666503906e+00,5.657823562622070312e+00,-5.190320491790771484e+00,-4.816634178161621094e+00,-1.954756379127502441e-01,4.070702075958251953e+00,2.420823425054550171e-01,-4.100842475891113281e+00,-8.073326110839843750e+00],
                            [-6.671396732330322266e+00,-2.005939006805419922e+00,-3.646730482578277588e-01,5.793956279754638672e+00,7.754104584455490112e-02,-3.637466907501220703e+00,-4.377891540527343750e+00,2.488748788833618164e+00,9.932533502578735352e-01,-5.485978722572326660e-01,9.010600298643112183e-02,4.840334355831146240e-01,1.114126443862915039e+00,2.153417170047760010e-01,2.405640363693237305e+00,2.109499168395996094e+01,-4.905137121677398682e-01,7.041023671627044678e-02,1.790845632553100586e+00,-1.382040977478027344e+00,-3.777234077453613281e+00,2.773125410079956055e+00,-8.963921070098876953e-01,-4.372134685516357422e+00,-2.861838102340698242e+00,2.427130222320556641e+00,3.555413007736206055e+00,4.962570190429687500e+00,-1.320079040527343750e+01,-7.671669006347656250e+00],
                            [-2.161709964275360107e-02,-3.908211290836334229e-01,6.145343184471130371e-01,-1.472844839096069336e+00,-1.055201768875122070e+00,-7.350547313690185547e-01,-3.671639859676361084e-01,-5.360994935035705566e-01,3.905594646930694580e-01,-2.270292043685913086e+00,-4.120318293571472168e-01,5.528708696365356445e-01,-8.087257146835327148e-01,9.587872028350830078e-02,-1.830680131912231445e+00,7.511965036392211914e-01,9.036387801170349121e-01,1.113680720329284668e+00,-4.640601277351379395e-01,-4.005021750926971436e-01,1.064205288887023926e+00,3.157466053962707520e-01,5.053527355194091797e-01,-2.650582492351531982e-01,-6.339146494865417480e-01,-2.875600010156631470e-02,-1.060465216636657715e+00,1.506862938404083252e-01,1.147534251213073730e+00,-1.285195708274841309e+00],
                            [-4.629297256469726562e+00,-8.469968795776367188e+00,2.412004917860031128e-01,4.885854721069335938e+00,-6.660814881324768066e-01,-7.850818634033203125e-01,2.652956962585449219e+00,9.044927358627319336e-01,-4.950095713138580322e-02,-1.297484338283538818e-01,3.415971517562866211e+00,-2.107921987771987915e-01,-5.075295925140380859e+00,-4.821550846099853516e-01,4.795157909393310547e+00,5.561640739440917969e+00,3.050132393836975098e-01,7.420109510421752930e-01,-8.663225173950195312e-02,-4.324604988098144531e+00,4.745741486549377441e-01,2.383724212646484375e+00,-1.072090029716491699e+00,-7.844857215881347656e+00,-4.321127891540527344e+00,1.608768701553344727e+00,4.121602535247802734e+00,6.850374698638916016e+00,-2.930737733840942383e+00,-7.507040023803710938e+00],
                            [-4.484467506408691406e-01,-5.005196481943130493e-02,-7.891906499862670898e-01,-7.167971730232238770e-01,6.872429847717285156e-01,-5.249380469322204590e-01,-2.448543608188629150e-01,-2.003267526626586914e+00,2.666100978851318359e+00,1.899287998676300049e-01,4.142151474952697754e-01,-1.406142592430114746e+00,-6.785039901733398438e-01,-2.396954298019409180e-01,2.768148422241210938e+00,-7.181159257888793945e-01,-5.922117829322814941e-01,9.723877310752868652e-01,5.419475436210632324e-01,2.588611125946044922e+00,6.251431256532669067e-02,1.407261252403259277e+00,-6.709873080253601074e-01,5.343233942985534668e-01,-1.587158679962158203e+00,-2.150805473327636719e+00,-4.552055001258850098e-01,5.282867550849914551e-01,-1.698162965476512909e-02,-8.697380423545837402e-01],
                            [1.564012646675109863e+00,-2.074031257629394531e+01,-2.219298839569091797e+00,5.215339660644531250e+00,-1.822692304849624634e-01,-6.777866840362548828e+00,3.006159067153930664e+00,-3.310677289962768555e+00,5.131888985633850098e-01,2.038760185241699219e+00,-5.820244312286376953e+00,-4.314720153808593750e+00,-4.628362655639648438e+00,1.015265655517578125e+01,-4.714756011962890625e+00,5.152601718902587891e+00,-7.776549816131591797e+00,3.989864885807037354e-01,-4.645547389984130859e+00,6.012815952301025391e+00,-7.542376041412353516e+00,1.722745060920715332e+00,-2.992678403854370117e+00,-1.033796215057373047e+01,-7.528435230255126953e+00,9.545277059078216553e-02,1.322616481781005859e+01,-7.901400089263916016e+00,1.047037482261657715e+00,-3.815480947494506836e+00],
                            [-1.079430937767028809e+00,1.121056079864501953e+00,5.939763188362121582e-01,-8.275697827339172363e-01,-1.206786870956420898e+00,5.222880840301513672e-01,-9.871685504913330078e-01,-8.230488896369934082e-01,-1.289706230163574219e-01,-3.357979059219360352e-01,-3.041662275791168213e-01,8.954309225082397461e-01,6.210681200027465820e-01,8.582674264907836914e-01,-1.065529227256774902e+00,-1.234180573374032974e-02,-3.742091655731201172e-01,2.376726269721984863e-01,1.250502467155456543e+00,2.992593646049499512e-01,9.175851345062255859e-01,1.114987492561340332e+00,-2.074959993362426758e+00,-1.130460023880004883e+00,-1.668678879737854004e+00,-1.123586297035217285e+00,7.788264751434326172e-01,9.863801598548889160e-01,3.170423507690429688e-01,-4.228599369525909424e-01],
                            [9.801709055900573730e-01,-7.876698374748229980e-01,-1.423615932464599609e+00,1.127506375312805176e+00,-5.672610402107238770e-01,3.355190157890319824e-01,-3.288717940449714661e-02,6.556670665740966797e-01,1.167915582656860352e+00,4.650455415248870850e-01,1.412276506423950195e+00,2.619191408157348633e-01,1.877412080764770508e+00,-2.151108980178833008e+00,2.613520920276641846e-01,-1.629130393266677856e-01,2.014334313571453094e-02,-5.093049407005310059e-01,-1.085365056991577148e+00,-1.865446686744689941e+00,9.053704142570495605e-01,1.180640086531639099e-01,6.195396780967712402e-01,1.276497006416320801e+00,-6.636319309473037720e-02,7.897955924272537231e-02,5.497345924377441406e-01,-1.888659596443176270e+00,9.432832002639770508e-01,-1.265503764152526855e+00],
                            [-5.188562273979187012e-01,1.158136487007141113e+00,-1.074102640151977539e+00,5.083841457962989807e-02,-6.053194999694824219e-01,-7.272383570671081543e-02,1.566929340362548828e+00,4.165696501731872559e-01,-1.093512535095214844e+00,-1.726719260215759277e+00,1.812523961067199707e+00,5.973575711250305176e-01,-2.512577474117279053e-01,-1.821753859519958496e+00,1.529781222343444824e+00,-6.539044380187988281e-01,8.332093954086303711e-01,4.703978300094604492e-01,-9.235715866088867188e-01,-1.267439842224121094e+00,-7.454595565795898438e-01,1.064938902854919434e+00,-4.529919624328613281e-01,-9.443200826644897461e-01,1.962180256843566895e+00,4.913560152053833008e-01,6.336500644683837891e-01,1.862933397293090820e+00,-3.833018988370895386e-02,-2.016441822052001953e+00],
                            [6.865030527114868164e-01,4.697347879409790039e-01,-7.417875289916992188e+00,-1.278581321239471436e-01,-3.941842615604400635e-01,5.772850289940834045e-02,5.523517727851867676e-02,3.704508841037750244e-01,-1.096291899681091309e+00,-3.255877494812011719e+00,-1.414938092231750488e+00,6.777924895286560059e-01,6.873722076416015625e-01,5.300167798995971680e-01,7.106462121009826660e-02,-4.095791876316070557e-01,2.684599459171295166e-01,-1.840982437133789062e-01,4.264149069786071777e-01,2.463670015335083008e+00,2.315649688243865967e-01,3.370268940925598145e-01,1.892248034477233887e+00,3.179523944854736328e-01,-6.472038570791482925e-03,-4.276878237724304199e-01,4.027145206928253174e-01,4.153771877288818359e+00,2.030687928199768066e-01,-4.509116113185882568e-01],
                            [1.302705645561218262e+00,7.307818531990051270e-01,7.992011308670043945e-01,7.172378897666931152e-01,1.874806880950927734e+00,-1.897930502891540527e+00,4.718726873397827148e-01,-3.933489561080932617e+00,-2.234549522399902344e+00,-4.150942564010620117e-01,1.735414028167724609e+00,-1.778457880020141602e+00,-8.723171949386596680e-01,2.325241267681121826e-01,-5.659717321395874023e-01,4.383369088172912598e-01,-5.653416514396667480e-01,4.732566475868225098e-01,9.518553614616394043e-01,-2.658320903778076172e+00,-2.007835865020751953e+00,-1.063276886940002441e+00,-4.156352579593658447e-01,-3.417628109455108643e-01,3.046053409576416016e+00,3.131156265735626221e-01,-1.071328520774841309e+00,1.569031238555908203e+00,-5.620278358459472656e+00,3.684763610363006592e-01],
                            [-1.241510629653930664e+00,5.403857827186584473e-01,1.133391618728637695e+00,1.169364333152770996e+00,9.496580362319946289e-01,-4.125667810440063477e-01,-7.925636768341064453e-01,-6.139293313026428223e-02,-9.697518497705459595e-02,2.664754390716552734e+00,-1.080751061439514160e+00,-2.183600962162017822e-01,-8.438200354576110840e-01,2.681484520435333252e-01,5.665572285652160645e-01,-7.611274719238281250e-02,7.596325278282165527e-01,7.754221558570861816e-01,-3.580883443355560303e-01,1.863844037055969238e+00,-2.562566995620727539e-01,8.751424401998519897e-02,-3.076302409172058105e-01,-1.988154768943786621e+00,-1.474009394645690918e+00,-2.073549509048461914e+00,-2.217246145009994507e-01,-3.889908492565155029e-01,-9.586743712425231934e-01,7.526671290397644043e-01],
                            [4.882295429706573486e-01,-2.178482246398925781e+01,-4.278581440448760986e-01,-3.658848404884338379e-01,-2.063573837280273438e+00,-2.282415390014648438e+00,8.920557498931884766e-01,-1.125048637390136719e+00,-1.657764673233032227e+00,5.516396760940551758e-01,7.584888935089111328e-01,2.476666212081909180e+00,9.329081177711486816e-01,-1.194811910390853882e-01,-2.127854347229003906e+00,-5.167721956968307495e-02,-7.438881322741508484e-03,8.894063830375671387e-01,2.763901054859161377e-01,-9.631559848785400391e-01,6.130272150039672852e-01,-8.429555296897888184e-01,9.278666973114013672e-02,-3.178469836711883545e-01,-9.151633977890014648e-01,-2.693498849868774414e+00,3.585316658020019531e+00,-2.137243986129760742e+00,2.167493820190429688e+00,1.890642881393432617e+00]
                    ]
            },
            {
                    "name":"outl",
                    "biases":[5.654879808425903320e-01,6.182935237884521484e-01,6.188848018646240234e-01,-8.839012980461120605e-01,-2.146147489547729492e+00],
                    "weights":[
                            [5.203307047486305237e-02,2.749140001833438873e-02,-3.630174994468688965e-01,5.735021829605102539e-02,1.235146403312683105e+00],
                            [-8.527346849441528320e-01,-5.395222902297973633e-01,3.390363231301307678e-02,3.854443550109863281e+00,3.133575916290283203e-01],
                            [-8.435888290405273438e-01,3.040623962879180908e-01,-5.227530002593994141e-01,2.096864208579063416e-02,1.238215789198875427e-01],
                            [-6.278813481330871582e-01,-3.242093026638031006e-01,4.859068691730499268e-01,-7.789705693721771240e-02,-4.914619401097297668e-02],
                            [-7.843276858329772949e-01,4.688925147056579590e-01,1.745877712965011597e-01,-2.851821184158325195e-01,-7.510600239038467407e-02],
                            [-6.646011471748352051e-01,1.433639645576477051e+00,1.757916331291198730e+00,-1.894428253173828125e+00,6.461607813835144043e-01],
                            [-4.541269317269325256e-02,-2.204786092042922974e-01,5.912353396415710449e-01,1.084225893020629883e+00,-3.147471845149993896e-01],
                            [-4.023378789424896240e-01,6.568352133035659790e-02,4.207824766635894775e-01,-2.483497112989425659e-01,1.965450495481491089e-01],
                            [-3.312718272209167480e-01,-9.756879508495330811e-02,-2.776403129100799561e-01,6.734290719032287598e-02,2.807856202125549316e-01],
                            [-3.459634482860565186e-01,-4.181471467018127441e-01,-2.252373248338699341e-01,6.185370730236172676e-04,-3.181049525737762451e-01],
                            [1.007098793983459473e+00,-9.997328519821166992e-01,-6.411675810813903809e-01,-1.736837029457092285e+00,-6.654755473136901855e-01],
                            [-1.568691283464431763e-01,3.760878443717956543e-01,-6.328822374343872070e-01,1.354911774396896362e-01,-1.490824203938245773e-02],
                            [1.351268291473388672e-01,1.604270935058593750e-01,1.786366850137710571e-01,-3.119453489780426025e-01,6.387057900428771973e-02],
                            [-2.086973190307617188e-02,-4.110422134399414062e-01,1.103105768561363220e-01,-4.066763222217559814e-01,9.259402006864547729e-02],
                            [-1.051966771483421326e-01,5.610902905464172363e-01,-1.568816751241683960e-01,1.166021108627319336e+00,-3.272288292646408081e-02],
                            [-1.963494122028350830e-01,-3.085699379444122314e-01,1.395825624465942383e+00,2.513208627700805664e+00,5.452885851263999939e-02],
                            [-1.713249087333679199e-01,-2.095475643873214722e-01,1.910367369651794434e+00,-1.121789067983627319e-01,-1.867222599685192108e-04],
                            [-3.267555311322212219e-02,3.354648947715759277e-01,1.095117807388305664e+00,-4.726366400718688965e-01,3.691878914833068848e-01],
                            [-2.308825105428695679e-01,-8.354794383049011230e-01,9.572423696517944336e-01,1.970723643898963928e-02,-1.788134425878524780e-01],
                            [7.673161029815673828e-01,-1.348677754402160645e+00,3.582590818405151367e-01,-7.633162140846252441e-01,1.696577072143554688e+00],
                            [-1.283944398164749146e-01,2.286717742681503296e-01,4.617984592914581299e-02,-2.259783446788787842e-01,7.066102325916290283e-02],
                            [-2.031378746032714844e+00,3.565260171890258789e-01,-1.337010741233825684e+00,2.108541429042816162e-01,2.708996534347534180e-01],
                            [2.636520564556121826e-01,-2.870907187461853027e-01,9.681032299995422363e-01,-2.618488967418670654e-01,1.720155477523803711e+00],
                            [-9.333165735006332397e-02,-5.325680971145629883e-01,-1.238279044628143311e-01,-1.199990272521972656e+00,-6.010508630424737930e-03],
                            [-2.686413764953613281e+00,-8.495050668716430664e-01,3.868445158004760742e-01,4.552912712097167969e-02,1.173425197601318359e+00],
                            [-2.392120361328125000e-01,-1.022750258445739746e+00,1.930935859680175781e+00,5.152853727340698242e-01,-3.478988632559776306e-02],
                            [7.213408946990966797e-01,2.433655969798564911e-02,-5.200485587120056152e-01,5.766094848513603210e-02,1.792506873607635498e-02],
                            [1.623008966445922852e+00,-5.230094194412231445e-01,-3.271373212337493896e-01,-3.616314232349395752e-01,-2.847707271575927734e-01],
                            [8.022406697273254395e-01,8.804362267255783081e-02,-3.378502558916807175e-03,-2.806864306330680847e-02,2.939421832561492920e-01],
                            [2.188697904348373413e-01,3.020404875278472900e-01,-2.220563292503356934e-01,1.044754832983016968e-01,-3.819759702309966087e-03]
                    ]
            }
        ]}

        var input = [eefPosN.x, eefPosN.y, eefPosN.z]

// console.log("input", input);

        var output = [];

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

// console.log("output", output);


        var jointAngles = {'bodyYaw': output[0], 'bodyTilt': output[1], 'rightLimb': output[2], 'rightForearm': output[3], 'rightShoulder': output[4]}

        //bodyYaw
        if (jointAngles.bodyYaw >= this.jointLimits.bodyYawMin && jointAngles.bodyYaw <= this.jointLimits.bodyYawMax)
        {
            this.activeObjects["valterBodyP1"].rotation.z  = jointAngles.bodyYaw;
            this.baseToBodyCableSleeveAnimation();
        }
        //bodyTilt
        if (jointAngles.bodyTilt >= this.jointLimits.bodyTiltMin && jointAngles.bodyTilt <= this.jointLimits.bodyTiltMax)
        {
            this.activeObjects["bodyFrameAxisR"].rotation.x = jointAngles.bodyTilt;
            this.bodyToTorsoCableSleeveAnimation();
        }
        //rightLimb
        if (jointAngles.rightLimb >= this.jointLimits.rightLimbMin && jointAngles.rightLimb <= this.jointLimits.rightLimbMax)
        {
            this.activeObjects["armRightShoulderAxis"].rotation.x = jointAngles.rightLimb;
        }
        //rightForearm
        if (jointAngles.rightForearm >= this.jointLimits.rightForearmMin && jointAngles.rightForearm <= this.jointLimits.rightForearmMax)
        {
            this.rightForearmRotate(jointAngles.rightForearm);
        }
        //rightShoulder
        if (jointAngles.rightShoulder >= this.jointLimits.rightShoulderMin && jointAngles.rightShoulder <= this.jointLimits.rightShoulderMax)
        {
            this.rightShoulderRotate(jointAngles.rightShoulder);
        }
    }

    rightArmFollowManipulationObject()
    {
        var eefPos = new THREE.Vector3().setFromMatrixPosition(this.manipulationObject.matrixWorld);
        // console.log("Global RArm EEF: ",  eefPos);
        this.model.worldToLocal(eefPos);
        eefPos.multiply(this.model.scale);
        // console.log("Local RArm EEF: ",  eefPos);
        this.rightArmIKANN(eefPos);
    }

    bodyKinectPCL()
    {
        if (this.bodyKinectPCLOriginObject3D == undefined)
        {
            this.bodyKinectPCLOriginObject3D = new THREE.Object3D();
            this.bodyKinectPCLOriginObject3D.position.copy(this.bodyKinectLaserOrigin);
            this.activeObjects["valterBodyP1"].add(this.bodyKinectPCLOriginObject3D);

            this.activeObjects["valterBodyP1"].updateMatrixWorld();

            var bodyKinectPCLOrigin = new THREE.Vector3().setFromMatrixPosition(this.bodyKinectPCLOriginObject3D.matrixWorld);

            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.activeObjects["valterBodyP1"].matrixWorld);

            this.activeObjects["bodyKinectPCLLines"] = [];
            this.activeObjects["bodyKinectPCLRaycasters"] = [];
            var dx = -1.0;
            for (var i = 0; i < 200; i++)
            {
                var bodyKinectPCLBaseDirection = new THREE.Vector3(dx, 1.0, 0);
                bodyKinectPCLBaseDirection.applyMatrix4(matrix);
                dx += 0.01;

                this.activeObjects["bodyKinectPCLLines"][i] = new THREE.ArrowHelper(bodyKinectPCLBaseDirection, bodyKinectPCLOrigin, 3.0, 0xffffff, 0.0001, 0.0001);
                this.vlab.getVlabScene().add(this.activeObjects["bodyKinectPCLLines"][i]);

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
            this.activeObjects["valterBodyP1"].updateMatrixWorld();
            var bodyKinectPCLOrigin = new THREE.Vector3().setFromMatrixPosition(this.bodyKinectPCLOriginObject3D.matrixWorld);
 
            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.activeObjects["valterBodyP1"].matrixWorld);

            this.activeObjects["bodyKinectItersectPCLGeometry"].dispose();
            this.activeObjects["bodyKinectItersectPCLGeometry"] = new THREE.Geometry();

            var dx = -1.0;
            for (var i = 0; i < 200; i++)
            {
                var bodyKinectPCLBaseDirection = new THREE.Vector3(dx, 1.0, 0);
                bodyKinectPCLBaseDirection.applyMatrix4(matrix).normalize();
                dx += 0.01;

                this.activeObjects["bodyKinectPCLLines"][i].position.copy(bodyKinectPCLOrigin);
                this.activeObjects["bodyKinectPCLLines"][i].setDirection(bodyKinectPCLBaseDirection);

                this.activeObjects["bodyKinectPCLRaycasters"][i].set(bodyKinectPCLOrigin, bodyKinectPCLBaseDirection);

                var intersects = this.activeObjects["bodyKinectPCLRaycasters"][i].intersectObjects(this.activeObjects["bodyKinectItersectObjects"]);
                if (intersects.length > 0)
                {
                    if (intersects[0].distance < 4.0)
                    {
                        if (intersects[0].distance > 0.8)
                        {
                            this.activeObjects["bodyKinectPCLLines"][i].setLength(intersects[0].distance, 0.0001, 0.0001);
                            this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xffffff));

                            this.activeObjects["bodyKinectItersectPCLGeometry"].vertices.push(intersects[0].point);
                        }
                        else
                        {
                            this.activeObjects["bodyKinectPCLLines"][i].setLength(intersects[0].distance, 0.0001, 0.0001);
                            this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xbdbdbd));
                        }
                    }
                    else
                    {
                        this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                        this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                    }
                }
                else
                {
                    this.activeObjects["bodyKinectPCLLines"][i].setLength(4.0, 0.0001, 0.0001);
                    this.activeObjects["bodyKinectPCLLines"][i].setColor(new THREE.Color(0xfffc00));
                }
            }
            this.activeObjects["bodyKinectItersectPCL"].geometry = this.activeObjects["bodyKinectItersectPCLGeometry"];
        }
    }
}
