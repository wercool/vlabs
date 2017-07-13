"use strict";

class Valter
{
    constructor (vlab, pos, testMode)
    {
        this.vlab = vlab;
        this.initialized = false;
        this.model = undefined;
        this.initialModelPosition = pos;
        this.valterJSON = "/vl/models/valter/valter.json";
        this.testMode = testMode;
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
            coveringsVisibility: true
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

        var self = this;

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
            }
        };

        this.sayAudio = undefined;
        this.mouthAnimationTimer = undefined;

        // initialize with argument 'true': no random choices
        this.eliza = new ElizaBot(true);

        addEventListener("simulationStep", this.simulationStep.bind(this), false);
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
        this.model.scale.set(13.25, 13.25, 13.25);
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
                                        console.log("Position: ", this.model.position);
                                    }.bind(this));
            control.attach(this.model);
            control.setSize(1.0);
            this.vlab.getVlabScene().add(control);

            //dummy manipulation object
            var manipulationObjectGeometry = new THREE.SphereGeometry(0.25, 32, 32);
            var manipulationObjectMaterial = new THREE.MeshLambertMaterial({color: 0x00ff00});
            this.manipulationObject = new THREE.Mesh(manipulationObjectGeometry, manipulationObjectMaterial);
            this.manipulationObject.name = "manipulationObject";
            this.vlab.getVlabScene().add(this.manipulationObject);
            this.manipulationObject.position.z = 12.0;
            this.manipulationObject.position.y = 15.0;
            var manipulationObjectControl = new THREE.TransformControls(this.vlab.getDefaultCamera(), this.vlab.WebGLRenderer.domElement);
            manipulationObjectControl.addEventListener("change", function(){
                                                            if (this.vlab.pressedKey != null)
                                                            {
                                                                if (this.vlab.pressedKey == 17) //ctrlKey
                                                                {
                                                                    console.log(this.manipulationObject.position);
                                                                }
                                                            }
                                                        }.bind(this));
            manipulationObjectControl.attach(this.manipulationObject);
            manipulationObjectControl.setSize(1.0);
            this.vlab.getVlabScene().add(manipulationObjectControl);

            var matrix = new THREE.Matrix4();
            matrix.extractRotation(this.model.matrix);
            var valterForwardDirection = new THREE.Vector3(0, 1, 0);
            valterForwardDirection.applyMatrix4(matrix);
            this.activeObjects["valterForwardDirectionVector"] = new THREE.ArrowHelper(valterForwardDirection, this.model.position, 10.0, 0x0000ff, 1.0, 0.3);
            this.vlab.getVlabScene().add(this.activeObjects["valterForwardDirectionVector"]);

            var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
            manipulationObjectXZProjPos.y = this.model.position.y;
            var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
            var valterToManipulationObjectDirectionVectorLength = valterToManipulationObjectDirectionVector.clone().length();
            valterToManipulationObjectDirectionVector.normalize();
            this.activeObjects["valterToManipulationObjectDirectionVector"] = new THREE.ArrowHelper(valterToManipulationObjectDirectionVector, this.model.position, valterToManipulationObjectDirectionVectorLength, 0xffffff, 1.0, 0.3);
            this.vlab.getVlabScene().add(this.activeObjects["valterToManipulationObjectDirectionVector"]);

            var GUIcontrols1 = new dat.GUI();
            GUIcontrols1.add(this.model.rotation, 'z', -6.28, 0.0).name("Base Yaw").step(0.01).listen().onChange(this.baseRotation.bind(this));;
            GUIcontrols1.add(this.activeObjects["valterBodyP1"].rotation, 'z', -1.57, 1.57).name("Body Yaw").step(0.01).onChange(this.baseToBodyCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.activeObjects["bodyFrameAxisR"].rotation, 'x', -0.8, 0.0).name("Body Tilt").step(0.01).onChange(this.bodyToTorsoCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.joints, 'rightShoulder', 0.0, 1.0).name("Right Shoulder").step(0.01).onChange(this.rightShoulderRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftShoulder', -1.0, 0.0).name("Left Shoulder").step(0.01).onChange(this.leftShoulderRotate.bind(this));;
            GUIcontrols1.add(this.activeObjects["armRightShoulderAxis"].rotation, 'x', -0.85, 1.4).name("Right Limb").step(0.01);
            GUIcontrols1.add(this.activeObjects["armLeftShoulderAxis"].rotation, 'x', -0.85, 1.4).name("Left Limb").step(0.01);
            GUIcontrols1.add(this.joints, 'rightArm', -2.57, -1.22).name("Right Arm").step(0.01).onChange(this.rightArmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftArm', -2.57, -1.22).name("Left Arm").step(0.01).onChange(this.leftArmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'rightForearm', -0.5, 1.0).name("Right Forearm Tilt").step(0.01).onChange(this.rightForearmRotate.bind(this));
            GUIcontrols1.add(this.joints, 'leftForearm', -0.5, 1.0).name("Left Forearm Tilt").step(0.01).onChange(this.leftForearmRotate.bind(this));

            GUIcontrols1.add(this.activeObjects["rightForearmYaw"].rotation, 'z', -0.25, 0.4).name("Right Forearm Yaw").step(0.01);
            GUIcontrols1.add(this.activeObjects["leftForearmYaw"].rotation, 'z', -0.25, 0.4).name("Left Forearm Yaw").step(0.01);

            GUIcontrols1.add(this.activeObjects["forearmFrameRight"].rotation, 'y', -3.14, 0.0).name("Right Forearm Roll").step(0.01);
            GUIcontrols1.add(this.activeObjects["forearmFrameLeft"].rotation, 'y', -3.14, 0.0).name("Left Forearm Roll").step(0.01);
            GUIcontrols1.add(this.activeObjects["headTiltFrame"].rotation, 'x', -2.85, -1.8).name("Head Tilt").step(0.01).onChange(this.headToBodyCableSleeveAnimation.bind(this));
            GUIcontrols1.add(this.activeObjects["headYawFrame"].rotation, 'z', -4.42, -1.86).name("Head Yaw").step(0.01).onChange(this.headToBodyCableSleeveAnimation.bind(this));

            GUIcontrols1.add(this.joints, 'leftPalmYaw',  -0.5, 0.5).name("Right Palm Yaw").step(0.01).onChange(this.rightPalmYaw.bind(this));
            GUIcontrols1.add(this.joints, 'rightPalmYaw', -0.5, 0.5).name("Left Palm Yaw").step(0.01).onChange(this.leftPalmYaw.bind(this));

            GUIcontrols1.add(this.handGrasping, 'right', 0.0, 1.0).name("Right Hand Grasping").step(0.01).onChange(this.rightHandGrasping.bind(this));
            GUIcontrols1.add(this.handGrasping, 'left', 0.0, 1.0).name("Left Hand Grapsing").step(0.01).onChange(this.leftHandGrasping.bind(this));
            GUIcontrols1.add(this.settings, 'coveringsVisibility').name("Coverings Visibility").onChange(this.setCoveringsVisibility.bind(this));
            GUIcontrols1.add(this.guiControls, 'say').name("Valter says");
            GUIcontrols1.add(this.guiControls, 'talk').name("Valter talks");
            GUIcontrols1.add(this.guiControls, 'navigate').name("Navigate");
            if (typeof executeScriptDialog !== 'undefined')
            {
                GUIcontrols1.add(this.guiControls, 'executeScript').name("Execute Script");
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
            if (this.prevValterBasePosition.distanceTo(this.activeObjects["ValterBase"].position) > 0.0001)
            {
                this.prevValterBasePosition.copy(this.activeObjects["ValterBase"].position);
            }
            for (var i = 0; i < this.delayedCalls.length; i++)
            {
                this.delayedCalls[i].bind(this).call();
            }
            this.delayedCalls = [];

            if (this.testMode)
            {
                var matrix = new THREE.Matrix4();
                matrix.extractRotation(this.model.matrix);
                var valterForwardDirection = new THREE.Vector3(0, 1, 0);
                valterForwardDirection.applyMatrix4(matrix);
                this.activeObjects["valterForwardDirectionVector"].setDirection(valterForwardDirection);
                this.activeObjects["valterForwardDirectionVector"].position.copy(this.model.position.clone());

                var manipulationObjectXZProjPos = this.manipulationObject.position.clone();
                manipulationObjectXZProjPos.y = this.model.position.y;
                if (this.model.position.distanceTo(manipulationObjectXZProjPos) > 1.0)
                {
                    var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
                    var valterToManipulationObjectDirectionVectorLength = valterToManipulationObjectDirectionVector.clone().length();
                    valterToManipulationObjectDirectionVector.normalize().negate();
                    this.activeObjects["valterToManipulationObjectDirectionVector"].position.copy(this.model.position);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setDirection(valterToManipulationObjectDirectionVector);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setLength(valterToManipulationObjectDirectionVectorLength, 1.0, 0.3);
                }
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
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.25));
        var pos1_2 = new THREE.Vector3();
        pos1_2.addVectors(pos1, dir1.clone().multiplyScalar(1.75));
        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.25));

        var dir2_1 = pos2_1.clone().sub(pos1_2);
        dir2_1.normalize().negate();

        var pos2_2 = new THREE.Vector3();
        pos2_2.addVectors(pos2_1, dir2_1.clone().multiplyScalar(1.0));

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
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12, 8, false);

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
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.25));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.4));

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
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12, 8, false);

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
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.3));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.2));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12, 8, false);

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
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.8));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.25));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12, 8, false);

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
        pos1_1.addVectors(pos1, dir1.clone().multiplyScalar(0.75));

        var pos2_1 = new THREE.Vector3();
        pos2_1.addVectors(pos2, dir2.clone().multiplyScalar(0.4));

        var path = new THREE.CatmullRomCurve3([
            pos1,
            pos1_1,
            pos2_1,
            pos2
        ]);

        path.type = 'chordal';
        path.closed = false;
        var geometry = new THREE.TubeBufferGeometry(path, 22, 0.12, 8, false);

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
            if (Math.abs(self.activeObjects["smallWheelArmatureLF"].rotation.z) < maxRot * (rotVelAcc > 0 ? 0.5 : 1))
            {
                self.activeObjects["smallWheelArmatureLF"].rotation.z += (rotVelAcc > 0 ? -speed : speed);
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureRR"].rotation.z) < maxRot * (rotVelAcc > 0 ? 2 : 0.5))
            {
                self.activeObjects["smallWheelArmatureRR"].rotation.z += (rotVelAcc > 0 ? speed : -speed) * 1.5;
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLR"].rotation.z) < maxRot * (rotVelAcc > 0 ? 0.5 : 1))
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
        movementTween.to(manipulationObjectXZProjPos, 500 * (distance > 1 ? distance : 1));
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
            self.activeObjects["rightWheelDisk"].rotateZ(-movVelAcc);
            self.activeObjects["leftWheelDisk"].rotateZ(movVelAcc);

            var speed = Math.abs(movVelAcc / 2);
            if (Math.abs(self.activeObjects["smallWheelArmatureRF"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureRF"].rotation.z += (self.activeObjects["smallWheelArmatureRF"].rotation.z > 0 ? -speed : speed)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLF"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureLF"].rotation.z += (self.activeObjects["smallWheelArmatureLF"].rotation.z > 0 ? -speed : speed)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureRR"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureRR"].rotation.z += (self.activeObjects["smallWheelArmatureRR"].rotation.z > 0 ? -speed : speed)
            }
            if (Math.abs(self.activeObjects["smallWheelArmatureLR"].rotation.z) > 0)
            {
                self.activeObjects["smallWheelArmatureLR"].rotation.z += (self.activeObjects["smallWheelArmatureLR"].rotation.z > 0 ? -speed : speed)
            }
            self.activeObjects["smallWheelLR"].rotateZ(movVelAcc / 6);
            self.activeObjects["smallWheelRR"].rotateZ(movVelAcc / 6);
            self.activeObjects["smallWheelLF"].rotateZ(movVelAcc / 6);
            self.activeObjects["smallWheelRF"].rotateZ(movVelAcc / 6);
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
                var valueRad = -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.bodyYaw = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.bodyYaw.easing(TWEEN.Easing.Cubic.InOut);
                valterRef.jointsTweens.bodyYaw.to({bodyYaw: valueRad}, 8000 * (1 - Math.abs(valueRad)));
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
                var valueRad = -1 * scriptLineParts[1] * Math.PI / 180;
                valterRef.jointsTweens.bodyTilt = new TWEEN.Tween(valterRef.joints);
                valterRef.jointsTweens.bodyTilt.easing(TWEEN.Easing.Cubic.InOut);
                valterRef.jointsTweens.bodyTilt.to({bodyTilt: valueRad}, 8000 * (1 - Math.abs(valueRad)));
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
                var valueRad = scriptLineParts[1] * Math.PI / 180;
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
                var valueRad = scriptLineParts[1] * Math.PI / 180;
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
                var valueRad = scriptLineParts[1] * Math.PI / 180;
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
                var valueRad = -1.22 - scriptLineParts[1] * Math.PI / 180;
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
            case "ObjTranslate":
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
        }
    }
}
