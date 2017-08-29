"use strict";

class Valter
{
    constructor (vlab, pos, testMode, executeScriptOnStart)
    {
        this.vlab = vlab;
        this.initialized = false;
        this.model = undefined;
        this.initialModelPosition = pos;
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
            },
            rightArmIK:function(){
                self.rightArmIK();
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
            var manipulationObjectGeometry = new THREE.SphereGeometry(0.25, 32, 32);
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
            }

            if (!this.executeScriptOnStart)
            {
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

                // var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["rPalmPad"].matrixWorld);
                // var valterBaseToRightPalmPadDirectionVector = this.model.position.clone().sub(rPalmPadPosition.clone()).negate();
                // var valterBaseToRightPalmPadDirectionVectorLength = valterBaseToRightPalmPadDirectionVector.clone().length();
                // valterBaseToRightPalmPadDirectionVector.normalize();
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"] = new THREE.ArrowHelper(valterBaseToRightPalmPadDirectionVector, this.model.position, valterBaseToRightPalmPadDirectionVectorLength, 0x00ff00, 1.0, 0.3);
                // this.vlab.getVlabScene().add(this.activeObjects["valterBaseToRightPalmPadDirectionVector"]);
            }

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
            GUIcontrols1.add(this.guiControls, 'rightArmIK').name("Solve Right Arm IK");
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
                if (this.model.position.distanceTo(manipulationObjectXZProjPos) > 1.0)
                {
                    var valterToManipulationObjectDirectionVector = this.model.position.clone().sub(manipulationObjectXZProjPos.clone());
                    var valterToManipulationObjectDirectionVectorLength = valterToManipulationObjectDirectionVector.clone().length();
                    valterToManipulationObjectDirectionVector.normalize().negate();
                    this.activeObjects["valterToManipulationObjectDirectionVector"].position.copy(this.model.position);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setDirection(valterToManipulationObjectDirectionVector);
                    this.activeObjects["valterToManipulationObjectDirectionVector"].setLength(valterToManipulationObjectDirectionVectorLength, 1.0, 0.3);
                }

                // var rPalmPadPosition = new THREE.Vector3().setFromMatrixPosition(this.activeObjects["rPalmPad"].matrixWorld);
                // var valterBaseToRightPalmPadDirectionVector = this.model.position.clone().sub(rPalmPadPosition.clone()).negate();
                // var valterBaseToRightPalmPadDirectionVectorLength = valterBaseToRightPalmPadDirectionVector.clone().length();
                // valterBaseToRightPalmPadDirectionVector.normalize();
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].position.copy(this.model.position);
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].setDirection(valterBaseToRightPalmPadDirectionVector);
                // this.activeObjects["valterBaseToRightPalmPadDirectionVector"].setLength(valterBaseToRightPalmPadDirectionVectorLength, 1.0, 0.3);
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
                    var pointCloud = new THREE.Points(pclGeometry, pclMaterial);
                    valterRef.model.add(pointCloud);
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
        // var eefPosN = function(eefPos){
        //     var eefXMin = -3.469000;
        //     var eefXMax = 8.745000;
        //     var eefYMin = -1.355000;
        //     var eefYMax = 9.657000;
        //     var eefZMin = 9.795000;
        //     var eefZMax = 19.645000;
        //
        //     var eefPosXn = 2 * ((eefPos.x - eefXMin) / (eefXMax - eefXMin)) - 1;
        //     var eefPosYn = 2 * ((eefPos.y - eefYMin) / (eefYMax - eefYMin)) - 1;
        //     var eefPosZn = 2 * ((eefPos.z - eefZMin) / (eefZMax - eefZMin)) - 1;
        //
        //     return {'x': eefPosXn, 'y': eefPosYn, 'z': eefPosZn}
        // }(eefPos);

        var eefPosN = eefLocalPos;

        var net = {"layers":[
            {
                    "name":"hl1",
                    "biases":[1.993767261505126953e+00,3.337991476058959961e+00,2.768205642700195312e+00,2.974803209304809570e+00,-2.248441934585571289e+00,1.967043757438659668e+00,1.244325757026672363e+00,2.113714694976806641e+00,-4.208541393280029297e+00,-4.003379046916961670e-01,-4.093718051910400391e+00,1.112977504730224609e+00,-2.229058980941772461e+00,6.130116581916809082e-01,-5.512725114822387695e-01,-2.026671648025512695e+00,-1.206574559211730957e+00,9.257536530494689941e-01,5.606938004493713379e-01,8.023281693458557129e-01,3.588293194770812988e-01,8.399810791015625000e-01,-2.854323625564575195e+00,-1.819146752357482910e+00,-1.251455068588256836e+00,-2.983106970787048340e-01,9.944456219673156738e-01,-6.263369321823120117e-01,2.759898185729980469e+00,1.887193799018859863e+00],
                    "weights":[
                        [9.552668929100036621e-01,2.234468311071395874e-01,-6.375825405120849609e-02,6.492162346839904785e-01,8.812925815582275391e-01,1.715190649032592773e+00,-6.088880896568298340e-01,-2.019032090902328491e-01,2.602253258228302002e-01,2.642994523048400879e-01,-9.443216919898986816e-01,5.305796265602111816e-01,1.204541604965925217e-02,-5.080703496932983398e-01,-5.999953746795654297e-01,9.841414093971252441e-01,1.447832345962524414e+00,8.876473307609558105e-01,1.786950826644897461e-01,-9.726282209157943726e-02,-6.878914833068847656e-01,-2.345207184553146362e-01,-9.682595729827880859e-02,1.775909900665283203e+00,-6.154899001121520996e-01,-1.049522757530212402e+00,-4.534858465194702148e-01,-4.617463648319244385e-01,-8.947758004069328308e-03,-2.794139087200164795e-01],
                        [-2.688922882080078125e-01,8.416532278060913086e-01,-6.905776262283325195e-02,-6.925483942031860352e-01,5.849279165267944336e-01,-8.374284505844116211e-01,5.817654728889465332e-01,-4.212193787097930908e-01,1.349127054214477539e+00,4.432934522628784180e-01,1.654187776148319244e-02,2.669642567634582520e-01,-2.267129160463809967e-02,1.122760176658630371e+00,1.254983246326446533e-01,1.209119796752929688e+00,-5.544694066047668457e-01,-6.475339177995920181e-03,-1.505581617355346680e+00,-1.750903606414794922e+00,9.446052908897399902e-01,-2.714470922946929932e-01,2.033491730690002441e-01,-6.273311972618103027e-01,1.033760786056518555e+00,4.736669659614562988e-01,5.624872446060180664e-01,-1.108511805534362793e+00,9.235414117574691772e-02,1.714777499437332153e-01],
                        [1.536780953407287598e+00,-8.846750855445861816e-01,-1.395872980356216431e-01,-4.317491650581359863e-01,-5.505079030990600586e-01,6.732922792434692383e-01,5.703556165099143982e-02,1.088038533926010132e-01,-5.470340847969055176e-01,2.941408455371856689e-01,1.026392936706542969e+00,-2.014398425817489624e-01,1.697251647710800171e-01,1.999426007270812988e+00,-1.067343354225158691e-01,-1.282142847776412964e-01,-2.221830934286117554e-01,3.792546093463897705e-01,1.075435400009155273e+00,-3.253155648708343506e-01,-2.724937498569488525e-01,3.477307735010981560e-03,1.881244480609893799e-01,-2.775591909885406494e-01,-1.900888085365295410e-01,1.915252804756164551e+00,-1.624863892793655396e-01,3.529344201087951660e-01,-3.709482550621032715e-01,1.633972406387329102e+00]
                    ]
            },
            {
                    "name":"hl2",
                    "biases":[-4.685010910034179688e-01,1.500113368034362793e+00,-1.185784816741943359e+00,1.431135654449462891e+00,-5.412178039550781250e-01,4.833477437496185303e-01,6.235042810440063477e-01,-2.168423235416412354e-01,3.498608171939849854e-01,1.462531924247741699e+00,-2.825117409229278564e-01,9.181928634643554688e-01,-1.215526938438415527e+00,8.722209930419921875e-01,9.595457315444946289e-01,2.774063348770141602e-01,4.746796488761901855e-01,2.648241817951202393e-01,2.118866682052612305e+00,-1.298277020454406738e+00,4.369137883186340332e-01,4.451191052794456482e-02,1.659887433052062988e-01,1.439937591552734375e+00,-1.187491655349731445e+00,-2.199204683303833008e+00,-1.427700638771057129e+00,1.165353972464799881e-02,1.612947225570678711e+00,8.866302669048309326e-02],
                    "weights":[
                        [8.462752699851989746e-01,-9.051282703876495361e-02,-9.233221411705017090e-01,4.406033456325531006e-01,5.436470732092857361e-02,2.830151021480560303e-01,7.442444562911987305e-01,-3.403730094432830811e-01,8.277729153633117676e-02,-1.354670882225036621e+00,-7.486217021942138672e-01,8.187483549118041992e-01,-5.332667827606201172e-01,1.071298480033874512e+00,7.705340385437011719e-01,1.005371332168579102e+00,8.992089629173278809e-01,-7.312036156654357910e-01,-1.751080006361007690e-01,-1.053492188453674316e+00,7.963150739669799805e-02,-1.834760785102844238e+00,7.256648540496826172e-01,-2.312361001968383789e+00,-6.930437684059143066e-01,5.876339077949523926e-01,1.496697783470153809e+00,8.702676296234130859e-01,2.131361246109008789e+00,1.311542272567749023e+00],
                        [-7.765432834625244141e+00,-4.644588828086853027e-01,-7.983744144439697266e-01,-1.191455423831939697e-01,-1.783336043357849121e+00,6.069061279296875000e+00,-2.598389625549316406e+00,-5.545694231986999512e-01,5.274154186248779297e+00,6.018443107604980469e-01,-2.264420390129089355e-01,-3.131877422332763672e+00,1.302981019020080566e+00,-1.443078994750976562e+00,-3.006915330886840820e+00,-1.633305996656417847e-01,-1.921032667160034180e+00,-1.126452684402465820e-01,3.395438909530639648e+00,1.654958963394165039e+00,6.611300110816955566e-01,1.782289147377014160e+00,2.651651144027709961e+00,-2.720841169357299805e+00,1.100991249084472656e+00,-6.221665740013122559e-01,-5.960942268371582031e+00,-8.767516016960144043e-01,3.722926676273345947e-01,-8.583096861839294434e-01],
                        [9.526012420654296875e+00,1.847785413265228271e-01,-3.258830010890960693e-01,5.842006206512451172e-01,-8.316022157669067383e-01,3.605664372444152832e-01,-3.470246195793151855e-01,-7.500258684158325195e-01,-1.368110179901123047e-01,-1.969756364822387695e+00,-1.358316779136657715e+00,-1.549310803413391113e+00,-9.744447469711303711e-02,1.941368699073791504e+00,3.526881933212280273e-01,-1.256695032119750977e+00,-1.170755386352539062e+00,-1.594403982162475586e+00,-1.897301316261291504e+00,-3.106860071420669556e-02,3.218886375427246094e+00,-3.595466017723083496e-01,-2.621603965759277344e+00,-1.737063169479370117e+00,1.927091121673583984e+00,1.361694931983947754e+00,1.339131712913513184e+00,-3.110964298248291016e-01,1.183517336845397949e+00,-1.256152987480163574e+00],
                        [-2.646752595901489258e+00,5.217896699905395508e-01,-4.148932993412017822e-01,8.770111799240112305e-01,-4.200057983398437500e-01,1.199226737022399902e+00,-6.534612774848937988e-01,6.501037627458572388e-02,4.558489620685577393e-01,1.413880109786987305e+00,-1.376985549926757812e+00,-1.362307906150817871e+00,2.128358840942382812e+00,-7.421435117721557617e-01,-6.329910755157470703e-01,9.952377676963806152e-01,2.124403715133666992e+00,-9.425558447837829590e-01,-9.004052877426147461e-01,-6.237428784370422363e-01,-6.979809999465942383e-01,-1.470691919326782227e+00,1.452256739139556885e-01,3.132075667381286621e-01,-9.203440546989440918e-01,1.429981708526611328e+00,1.031673192977905273e+00,5.507576465606689453e-01,1.659771054983139038e-01,-6.273345351219177246e-01],
                        [-4.031079292297363281e+00,-3.247827291488647461e+00,-5.495187640190124512e-02,1.099926978349685669e-01,-4.892037212848663330e-01,-2.177002727985382080e-01,-2.344059944152832031e-01,-2.325755357742309570e+00,-9.889747500419616699e-01,1.585522532463073730e+00,1.806454956531524658e-01,4.010113239288330078e+00,8.228639960289001465e-01,2.780524492263793945e+00,-3.660694837570190430e+00,-7.698453664779663086e-01,4.759486019611358643e-01,4.935372769832611084e-01,-5.325605869293212891e-01,-1.802999854087829590e+00,-8.455438017845153809e-01,1.138915896415710449e+00,2.328891515731811523e+00,-1.737739443778991699e-01,8.424103856086730957e-01,-1.288470625877380371e+00,-5.723330020904541016e+00,1.228127479553222656e-01,-3.581777811050415039e-01,-7.079912424087524414e-01],
                        [1.387006521224975586e+00,1.990473270416259766e-01,8.520256876945495605e-01,-3.571484386920928955e-01,1.571357846260070801e-01,2.008948661386966705e-02,1.160700440406799316e+00,9.754704236984252930e-01,1.590895175933837891e+00,-4.760065078735351562e-01,7.650579214096069336e-01,-3.290874660015106201e-01,-6.359454989433288574e-01,1.489841043949127197e-01,3.821431398391723633e-01,-4.684538394212722778e-02,6.506924629211425781e-01,-1.100247144699096680e+00,-3.475788831710815430e-01,9.582465887069702148e-01,3.900480568408966064e-01,-1.524058341979980469e+00,4.899792969226837158e-01,-1.472300142049789429e-01,1.477593898773193359e+00,-1.342901706695556641e+00,6.260697841644287109e-01,-3.370426595211029053e-02,6.958402991294860840e-01,1.193892598152160645e+00],
                        [6.784520149230957031e-01,1.093345999717712402e+00,-1.784345388412475586e+00,-8.291882872581481934e-01,-1.335453510284423828e+00,2.486983984708786011e-01,1.732334017753601074e+00,6.632273793220520020e-01,-1.325595498085021973e+00,-8.826862573623657227e-01,-6.387392878532409668e-01,-1.695854902267456055e+00,7.008247375488281250e-01,1.409962296485900879e+00,-6.349419951438903809e-01,-3.603575527667999268e-01,8.708702921867370605e-01,-2.900088131427764893e-01,-5.852965712547302246e-01,-7.241861312650144100e-04,-1.895474910736083984e+00,2.847886085510253906e+00,-1.156168222427368164e+00,-4.285103678703308105e-01,-1.017743945121765137e+00,-1.059172395616769791e-02,-2.012282013893127441e-01,-2.080917172133922577e-02,1.160084605216979980e-01,1.500289440155029297e+00],
                        [3.175469875335693359e+00,-6.439636349678039551e-01,8.585155606269836426e-01,3.883866667747497559e-01,-1.769893765449523926e+00,1.236462950706481934e+00,1.296695917844772339e-01,2.210515588521957397e-01,1.189045190811157227e+00,2.514226198196411133e+00,-6.155177205801010132e-02,-2.732514441013336182e-01,-1.564945340156555176e+00,4.970704317092895508e-01,-1.229336559772491455e-01,-4.448426663875579834e-01,-7.266095280647277832e-01,-1.635591030120849609e+00,2.948932170867919922e+00,-5.279636979103088379e-01,8.163804411888122559e-01,4.684664309024810791e-01,-9.799926877021789551e-01,1.266240596771240234e+00,8.137577772140502930e-01,8.488699793815612793e-01,-5.073590204119682312e-02,-5.398494005203247070e-01,-1.004232210107147694e-03,-2.354795336723327637e-01],
                        [-2.297976016998291016e+00,-1.879611730575561523e+00,7.622875571250915527e-01,3.404627740383148193e-01,5.543215870857238770e-01,1.366168141365051270e+00,8.108357191085815430e-01,1.185220479965209961e+00,-8.141034096479415894e-02,5.529224872589111328e-01,-6.574764251708984375e-01,2.793972730636596680e+00,-5.336342811584472656e+00,5.941348671913146973e-01,1.845790982246398926e+00,-7.150056958198547363e-01,2.817776441574096680e+00,3.298895955085754395e-01,-3.005426824092864990e-01,4.896561145782470703e+00,3.670640289783477783e-01,-2.236337900161743164e+00,1.567423939704895020e+00,-5.522453784942626953e-01,-1.153605937957763672e+00,-5.231843471527099609e+00,-1.603417515754699707e+00,2.005141824483871460e-01,-7.116965949535369873e-02,-2.344672381877899170e-01],
                        [-1.839163780212402344e+00,-3.389483094215393066e-01,-6.467772126197814941e-01,-6.340903788805007935e-02,-1.107053279876708984e+00,-1.963627815246582031e+00,-1.720201134681701660e+00,-1.773874878883361816e+00,1.215240597724914551e+00,-8.199876546859741211e-01,2.973772585391998291e-01,8.995960950851440430e-01,-9.109691381454467773e-01,-6.429752111434936523e-01,8.237614631652832031e-01,5.073261260986328125e-02,-4.259743690490722656e-01,6.871924400329589844e-01,-1.403887867927551270e+00,6.738123893737792969e-01,3.325907886028289795e-01,7.519057989120483398e-01,1.103206992149353027e+00,-1.273677229881286621e+00,6.217611432075500488e-01,-6.545605510473251343e-02,8.579789400100708008e-01,-8.012158274650573730e-01,-1.272352218627929688e+00,-5.213287472724914551e-01],
                        [-1.128811717033386230e+00,-3.484490513801574707e-01,-1.075383424758911133e+00,-5.317522883415222168e-01,1.030115008354187012e+00,-2.459887027740478516e+00,-7.404296994209289551e-01,7.298677563667297363e-01,2.882796572521328926e-03,8.856755681335926056e-03,-1.402567863464355469e+00,2.687622904777526855e-01,5.211295485496520996e-01,-1.343728661537170410e+00,1.135741710662841797e+00,-6.942529082298278809e-01,-1.050679445266723633e+00,5.414170026779174805e-01,-6.921356916427612305e-01,2.942844927310943604e-01,1.122812151908874512e+00,-1.091885209083557129e+00,-1.634559035301208496e+00,4.659741222858428955e-01,2.818847298622131348e-01,-6.157184839248657227e-01,-5.756820440292358398e-01,-1.774419903755187988e+00,-4.553980529308319092e-01,-3.598948717117309570e-01],
                        [1.737352013587951660e+00,2.201928198337554932e-01,-1.837001293897628784e-01,2.282806634902954102e+00,1.674489974975585938e+00,-5.019196867942810059e-01,6.831844449043273926e-01,-1.131467103958129883e+00,-3.158501386642456055e+00,7.727401256561279297e-01,1.463564991950988770e+00,7.544993758201599121e-01,1.063390135765075684e+00,3.266035616397857666e-01,5.415509939193725586e-01,3.731103837490081787e-01,2.054737806320190430e+00,-1.335449069738388062e-01,-1.582816839218139648e+00,-4.029758647084236145e-02,1.019273400306701660e+00,1.576121687889099121e+00,-1.197183132171630859e+00,-3.316920101642608643e-01,1.083099961280822754e+00,-1.795399308204650879e+00,-2.015134096145629883e+00,4.341591894626617432e-01,-7.511759400367736816e-01,2.308173477649688721e-01],
                        [-4.111435890197753906e+00,-1.048156544566154480e-01,1.379817724227905273e+00,-9.852185249328613281e-01,-1.083616614341735840e+00,-2.854236066341400146e-01,-3.496475517749786377e-01,1.890885531902313232e-01,1.080861806869506836e+00,1.673853516578674316e+00,4.808037355542182922e-02,1.647226095199584961e+00,-1.702427983283996582e+00,-8.616245388984680176e-01,5.252292752265930176e-01,1.862210154533386230e+00,-1.114407405257225037e-01,-6.406265497207641602e-01,5.277928709983825684e-01,1.163207888603210449e+00,1.777308702468872070e+00,1.456001549959182739e-01,-9.067369252443313599e-02,1.529874324798583984e+00,-6.514117717742919922e-01,-5.693552494049072266e-01,-3.185903787612915039e+00,7.236344218254089355e-01,2.019471883773803711e+00,1.722702234983444214e-01],
                        [4.064267277717590332e-01,-1.453095078468322754e+00,5.773323178291320801e-01,-3.863086998462677002e-01,-7.701680660247802734e-01,1.232782006263732910e+00,-1.615700274705886841e-01,6.215204596519470215e-01,7.529564201831817627e-02,7.517509460449218750e-01,-1.860364228487014771e-01,2.122780084609985352e+00,-9.751492738723754883e-01,-1.759720206260681152e+00,-8.242130279541015625e-01,1.745004415512084961e+00,-1.165705919265747070e+00,1.363023161888122559e+00,-1.398913025856018066e+00,-2.978989481925964355e-01,1.348167896270751953e+00,-5.659739375114440918e-01,1.113852620124816895e+00,4.067325592041015625e-02,5.408380627632141113e-01,3.752014338970184326e-01,2.777767479419708252e-01,-8.958538770675659180e-01,-1.051950812339782715e+00,1.126137256622314453e+00],
                        [-2.380283832550048828e+00,-8.418868184089660645e-01,-7.615380883216857910e-01,1.437045574188232422e+00,-5.650662422180175781e+00,3.167564392089843750e+00,1.507539510726928711e+00,-1.326340079307556152e+00,1.383273243904113770e+00,-5.784733295440673828e-01,-8.277173042297363281e-01,-7.672789692878723145e-01,-1.114910721778869629e+00,4.232455730438232422e+00,1.197319149971008301e+00,2.567213475704193115e-01,2.153538465499877930e+00,3.884376287460327148e-01,-3.914653778076171875e+00,2.307334184646606445e+00,-2.011747121810913086e+00,-3.563920736312866211e+00,1.164161562919616699e+00,9.531426429748535156e-01,2.884976267814636230e-01,2.514008045196533203e+00,4.300818443298339844e-01,1.178009986877441406e+00,-1.892553060315549374e-03,-1.373287200927734375e+00],
                        [-6.759624481201171875e-01,-1.679350018501281738e+00,6.553674936294555664e-01,-3.925491273403167725e-01,-4.515443146228790283e-01,-1.928530931472778320e+00,4.715375900268554688e-01,-9.616807699203491211e-01,-1.736785888671875000e+00,-1.062712192535400391e+00,1.056195735931396484e+00,-9.281482696533203125e-01,-1.578366041183471680e+00,-5.596667528152465820e-01,-1.256745755672454834e-01,-1.264148205518722534e-01,1.048073172569274902e-01,-2.020783424377441406e+00,8.150107264518737793e-01,7.186604738235473633e-01,-9.894983768463134766e-01,3.256828784942626953e-01,-9.355962872505187988e-01,1.105230569839477539e+00,7.696591615676879883e-01,-2.035898208618164062e+00,-1.621400952339172363e+00,6.767942905426025391e-01,-5.643420815467834473e-01,1.914577633142471313e-01],
                        [-1.064551115036010742e+00,1.019269376993179321e-01,4.806642532348632812e-01,-1.384072899818420410e+00,9.392018914222717285e-01,5.400060415267944336e-01,1.898689717054367065e-01,9.211920499801635742e-01,-1.023970842361450195e+00,-3.057271838188171387e-01,1.288780331611633301e+00,1.309333443641662598e-01,-4.523844122886657715e-01,3.568502068519592285e-01,-1.714729964733123779e-01,6.793729066848754883e-01,-2.843773066997528076e-01,-5.907225012779235840e-01,-1.649795658886432648e-02,-7.568228244781494141e-02,6.187470257282257080e-02,-8.599274158477783203e-01,7.201635837554931641e-01,-7.281631231307983398e-01,-8.606112003326416016e-01,8.303058147430419922e-01,-1.418353438377380371e+00,-1.204475045204162598e+00,1.527604341506958008e+00,-1.091338396072387695e+00],
                        [-2.071073651313781738e-01,1.185817480087280273e+00,-4.743313193321228027e-01,-7.030628919601440430e-01,8.847746849060058594e-01,1.850059442222118378e-02,-1.374539375305175781e+00,-1.490886062383651733e-01,-5.618923902511596680e-01,1.248141407966613770e+00,1.205613970756530762e+00,-4.393072128295898438e-01,-8.007621020078659058e-02,1.379506587982177734e+00,-1.851750135421752930e+00,-4.526861906051635742e-01,-6.648796200752258301e-01,2.121246099472045898e+00,-6.007540225982666016e-01,2.237712442874908447e-01,-2.456587791442871094e+00,-4.614617526531219482e-01,3.796385824680328369e-01,-1.103416442871093750e+00,2.792643010616302490e-01,-4.690931141376495361e-01,-3.676291704177856445e-01,3.330663740634918213e-01,-1.190249681472778320e+00,-2.310192346572875977e+00],
                        [-3.784192800521850586e-01,-1.452299952507019043e-01,-5.803606510162353516e-01,9.298809766769409180e-01,-5.390889048576354980e-01,3.543540239334106445e-01,-1.753828078508377075e-01,-6.708760261535644531e-01,2.412337064743041992e-02,-1.132316946983337402e+00,1.809680610895156860e-01,-6.155888438224792480e-01,8.765414357185363770e-01,-5.210226774215698242e-01,-3.936164081096649170e-02,5.444498062133789062e-01,1.644919157028198242e+00,-1.948879003524780273e+00,-6.600244045257568359e-01,8.477383852005004883e-01,-4.267742037773132324e-01,4.884017109870910645e-01,-1.573044657707214355e+00,-1.013363838195800781e+00,-3.885973691940307617e-01,-1.953554630279541016e+00,-6.818726658821105957e-01,6.897111535072326660e-01,1.746610403060913086e-01,9.542207717895507812e-01],
                        [4.199534416198730469e+00,-1.543815255165100098e+00,2.503443136811256409e-02,4.010456502437591553e-01,-2.180073499679565430e+00,-1.112111568450927734e+00,-2.090690851211547852e+00,-1.143709421157836914e+00,5.404057502746582031e-01,-1.327119350433349609e+00,-6.577768921852111816e-01,1.293463706970214844e+00,2.009090900421142578e+00,3.056349992752075195e+00,1.034996271133422852e+00,1.691354632377624512e+00,-2.194751739501953125e+00,2.326920986175537109e+00,2.725041389465332031e+00,-3.771463632583618164e-01,1.253220438957214355e-01,-5.466489315032958984e+00,-5.253802537918090820e-01,-9.750198125839233398e-01,-9.046056866645812988e-01,3.341600596904754639e-01,7.071609050035476685e-02,8.683642745018005371e-01,-3.026829242706298828e+00,1.107557058334350586e+00],
                        [2.188402414321899414e-01,1.978714466094970703e+00,5.599665045738220215e-01,1.251355528831481934e+00,1.288176774978637695e+00,4.024872481822967529e-01,-2.174510993063449860e-02,9.888522326946258545e-02,-6.348689794540405273e-01,-5.374875664710998535e-01,-8.084717988967895508e-01,-3.042742609977722168e-01,-1.533260345458984375e-01,-1.614270955324172974e-01,-5.068122148513793945e-01,-1.239264488220214844e+00,1.211845993995666504e+00,-1.040874838829040527e+00,8.158465474843978882e-02,6.818938255310058594e-01,-1.289025902748107910e+00,-9.330089688301086426e-01,5.558575987815856934e-01,-3.449868857860565186e-01,1.311745762825012207e+00,1.200547575950622559e+00,-1.920808911323547363e+00,4.865379631519317627e-01,-2.237771898508071899e-01,-6.704335808753967285e-01],
                        [1.407459378242492676e+00,3.781140327453613281e+00,9.575014561414718628e-02,1.082558631896972656e+00,-1.155717849731445312e+00,-8.470574021339416504e-01,-5.938740447163581848e-02,1.210579395294189453e+00,-1.376456022262573242e+00,-2.352723330259323120e-01,-9.829263091087341309e-01,-1.937522768974304199e+00,9.454051405191421509e-02,7.962179780006408691e-01,-2.816289901733398438e+00,-5.197852253913879395e-01,-1.712497830390930176e+00,-1.385939598083496094e+00,-3.927262723445892334e-01,1.442041039466857910e+00,3.527815341949462891e+00,-5.906602144241333008e-01,-1.369557857513427734e+00,-7.141282558441162109e-01,2.217467784881591797e+00,1.393305778503417969e+00,2.815675973892211914e+00,-1.135063409805297852e+00,-1.143331050872802734e+00,-2.235232830047607422e+00],
                        [-2.052028894424438477e+00,-1.656717896461486816e+00,3.168137967586517334e-01,1.845426112413406372e-01,-9.246383309364318848e-01,-6.624295115470886230e-01,7.914899587631225586e-01,1.189820542931556702e-01,-2.554834365844726562e+00,2.592947244644165039e+00,-1.374850630760192871e+00,2.081683397293090820e+00,9.725455045700073242e-01,1.313642382621765137e+00,1.886424541473388672e+00,-8.862403631210327148e-01,4.527846276760101318e-01,1.546982526779174805e+00,1.177121520042419434e+00,6.360746622085571289e-01,5.089985206723213196e-02,1.930354833602905273e-01,-5.517389178276062012e-01,9.410481452941894531e-01,1.019491910934448242e+00,-9.741168022155761719e-01,-1.625872850418090820e+00,-2.449370920658111572e-01,5.313161611557006836e-01,1.622345894575119019e-01],
                        [6.459568738937377930e-01,-1.285002350807189941e+00,3.937202990055084229e-01,1.037403583526611328e+00,-1.794021368026733398e+00,3.563034236431121826e-01,-1.197655797004699707e+00,-1.054214358329772949e+00,8.604739308357238770e-01,3.620285987854003906e-01,-4.761576354503631592e-01,1.151722431182861328e+00,1.714484095573425293e-01,-1.988427042961120605e+00,1.140679955482482910e+00,-1.524526000022888184e+00,1.006085872650146484e+00,-1.094174757599830627e-02,-5.235432982444763184e-01,-4.210739731788635254e-01,6.187860965728759766e-01,3.390659391880035400e-01,-6.673581600189208984e-01,5.343289375305175781e-01,-3.604401648044586182e-01,1.329282164573669434e+00,-3.209051847457885742e+00,1.281152725219726562e+00,1.357801795005798340e+00,-4.860444068908691406e-01],
                        [-5.827450752258300781e-01,-1.723965287208557129e+00,-3.888310194015502930e-01,4.057539105415344238e-01,6.380212903022766113e-01,-2.966034710407257080e-01,7.080992311239242554e-02,-3.142805099487304688e-01,1.640631437301635742e+00,9.849824309349060059e-01,-1.127272751182317734e-02,7.332900166511535645e-01,-8.731955885887145996e-01,2.444775253534317017e-01,1.013723969459533691e+00,-3.691849708557128906e-01,1.585633516311645508e+00,-4.563973248004913330e-01,7.962737232446670532e-03,1.913328170776367188e+00,1.117931678891181946e-01,2.750770449638366699e-01,-6.373610496520996094e-01,-7.169005870819091797e-01,-6.765385270118713379e-01,1.060745239257812500e+00,-3.183780014514923096e-01,1.033197879791259766e+00,-1.055541872978210449e+00,4.037231802940368652e-01],
                        [3.647978305816650391e-01,-1.918125271797180176e+00,1.921156287193298340e+00,-1.106339693069458008e+00,-1.249581217765808105e+00,-3.285855352878570557e-01,-4.236952215433120728e-02,-1.421743392944335938e+00,-1.739055037498474121e+00,-8.702782988548278809e-01,1.476022362709045410e+00,1.123329401016235352e+00,5.464484170079231262e-02,2.989004373550415039e+00,1.611173629760742188e+00,5.327553153038024902e-01,-9.017165303230285645e-01,7.213600873947143555e-01,-1.483893752098083496e+00,-4.020343124866485596e-01,-1.673794686794281006e-01,-1.216802954673767090e+00,7.377273440361022949e-01,6.022851467132568359e-01,-6.054291129112243652e-01,1.093326568603515625e+00,1.404495686292648315e-01,-9.786156415939331055e-01,-1.439462006092071533e-01,-1.010009571909904480e-01],
                        [9.538016915321350098e-01,9.679300338029861450e-02,-1.365068912506103516e+00,-1.650399088859558105e+00,3.633154034614562988e-01,-8.708013892173767090e-01,2.223583221435546875e+00,1.392438292503356934e+00,3.723975419998168945e-01,-5.921357870101928711e-01,-4.840603768825531006e-01,-1.696219444274902344e-01,-5.953499674797058105e-01,-9.619666337966918945e-01,-1.294105172157287598e+00,1.188682913780212402e+00,5.320057868957519531e-01,-2.452559024095535278e-01,-1.320454835891723633e+00,1.699280619621276855e+00,-7.184573411941528320e-01,-1.998557299375534058e-01,-9.015201926231384277e-01,-1.031868219375610352e+00,-1.676727175712585449e+00,-1.587119221687316895e+00,-7.807191014289855957e-01,2.958684861660003662e-01,8.480731248855590820e-01,3.843771219253540039e-01],
                        [-6.119198799133300781e-01,9.566457271575927734e-01,8.010054826736450195e-01,5.982633829116821289e-01,-1.432068198919296265e-01,-3.279155790805816650e-01,-2.055027186870574951e-01,8.832232356071472168e-01,2.239257574081420898e+00,-8.567815646529197693e-03,5.163600444793701172e-01,-2.559965610504150391e+00,2.052339792251586914e+00,3.350712656974792480e-01,-1.322917580604553223e+00,-1.688544511795043945e+00,7.428331971168518066e-01,-7.421767115592956543e-01,6.059831976890563965e-01,-6.031193137168884277e-01,-1.125032186508178711e+00,-2.153204679489135742e+00,-2.116972059011459351e-01,6.789866685867309570e-01,1.386155247688293457e+00,1.219501495361328125e+00,3.804266452789306641e+00,8.415679931640625000e-01,-3.142469227313995361e-01,2.489406988024711609e-02],
                        [5.822566986083984375e+00,-4.365361690521240234e+00,2.327693223953247070e+00,-1.056449294090270996e+00,7.700476646423339844e-01,2.110083580017089844e+00,-2.392842531204223633e+00,1.023361682891845703e+00,1.908344745635986328e+00,-6.717550158500671387e-01,3.239197731018066406e+00,-2.517680168151855469e+00,-2.265869617462158203e+00,-2.268732547760009766e+00,-2.095995664596557617e+00,5.453047156333923340e-01,5.302784919738769531e+00,4.186557292938232422e+00,-3.498310089111328125e+00,1.715996742248535156e+00,-1.925876259803771973e+00,4.295988559722900391e+00,2.066590547561645508e+00,1.355993986129760742e+00,-1.370757222175598145e-01,-9.774268269538879395e-01,1.143650040030479431e-01,2.217070341110229492e+00,3.987432479858398438e+00,1.519438385963439941e+00],
                        [1.390525221824645996e+00,-1.768805384635925293e+00,-6.396550536155700684e-01,-1.803401231765747070e+00,-2.530485689640045166e-01,-1.509683299809694290e-02,-2.068916410207748413e-01,3.635416328907012939e-01,-1.489379048347473145e+00,-9.433069229125976562e-01,-1.109446525573730469e+00,1.616420149803161621e+00,-1.140523791313171387e+00,-6.775127649307250977e-01,2.387878596782684326e-01,-4.074568152427673340e-01,4.381329938769340515e-02,1.383143067359924316e+00,1.173078894615173340e+00,-3.077653050422668457e-01,-5.077365636825561523e-01,-1.384047389030456543e+00,1.627555966377258301e+00,9.266908764839172363e-01,5.797570347785949707e-01,-8.852356672286987305e-02,3.097064197063446045e-01,-6.032137572765350342e-02,7.970033288002014160e-01,-5.152208805084228516e-01]
                    ]
            },
            {
                    "name":"outl",
                    "biases":[-6.440132260322570801e-01,-1.721390336751937866e-01,1.473673224449157715e+00],
                    "weights":[
                        [-8.675257116556167603e-02,-6.694556474685668945e-01,-1.884199142456054688e+00],
                        [3.080075085163116455e-01,-1.603310465812683105e+00,-6.478493213653564453e-01],
                        [-1.029918551445007324e+00,-2.435055226087570190e-01,-1.411606371402740479e-01],
                        [-1.347691535949707031e+00,-1.753527522087097168e+00,9.421149492263793945e-01],
                        [-1.189097046852111816e+00,1.065708994865417480e+00,-2.001176595687866211e+00],
                        [-8.713931590318679810e-02,5.032177567481994629e-01,1.396836400032043457e+00],
                        [6.272324323654174805e-01,-3.030520975589752197e-01,-1.024337649345397949e+00],
                        [1.295124292373657227e+00,7.699188590049743652e-01,5.307544488459825516e-03],
                        [-1.778943777084350586e+00,8.623425960540771484e-01,5.230360031127929688e-01],
                        [-3.276195824146270752e-01,7.395633459091186523e-01,-1.211234211921691895e+00],
                        [-7.461963891983032227e-01,6.413544416427612305e-01,6.251371502876281738e-01],
                        [-3.904203474521636963e-01,-1.964227914810180664e+00,5.096536502242088318e-02],
                        [2.633281946182250977e-01,2.508621811866760254e-01,-6.864312291145324707e-01],
                        [3.081210255622863770e-01,-7.699435353279113770e-01,1.353121101856231689e-01],
                        [-1.906767249107360840e+00,9.243559241294860840e-01,-2.026863813400268555e+00],
                        [9.929101914167404175e-02,1.300091624259948730e+00,1.373035430908203125e+00],
                        [6.665950417518615723e-01,9.881436228752136230e-01,1.084039449691772461e+00],
                        [-3.938775882124900818e-02,1.037938237190246582e+00,1.674077033996582031e+00],
                        [-5.459611415863037109e-01,1.617992997169494629e+00,6.500308215618133545e-02],
                        [2.743229866027832031e-01,-2.008325457572937012e-01,5.520601272583007812e-01],
                        [7.979613542556762695e-01,-7.537230849266052246e-01,-6.778833270072937012e-01],
                        [-8.684571385383605957e-01,9.818419814109802246e-01,-8.632317781448364258e-01],
                        [-1.401380002498626709e-01,1.006706953048706055e+00,2.392642974853515625e+00],
                        [8.567337393760681152e-01,8.918798565864562988e-01,2.967290766537189484e-02],
                        [1.561868786811828613e+00,-2.813575565814971924e-01,-9.587510228157043457e-01],
                        [-1.297302842140197754e+00,1.289731979370117188e+00,-9.378790259361267090e-01],
                        [2.172081232070922852e+00,-1.553418278694152832e+00,-1.370512694120407104e-01],
                        [1.387827634811401367e+00,2.227591514587402344e+00,1.695454597473144531e+00],
                        [4.775999784469604492e-01,6.933867335319519043e-01,5.322141051292419434e-01],
                        [-1.258141517639160156e+00,-1.103407368063926697e-01,2.454405575990676880e-01]
                    ]
            }
        ]}

        var input = [eefPosN.x, eefPosN.y, eefPosN.z]

console.log("input", input);

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
                output[bi] = (1 / (1 + Math.exp(-sum)));
            }
            if (net.layers[l].name == "hl1")
            {
                console.log(output);
            }
            input = output;
        }

console.log("output", output);
return;

        // var jointAngles = function(output){
        //     var bodyYawMin = -0.750000;
        //     var bodyYawMax = 0.750000;
        //     var rightLimbMin = -0.500000;
        //     var rightLimbMax = 1.000000;
        //     var rightForearmMin = -0.500000;
        //     var rightForearmMax = 1.000000;
        //
        //     var bodyYawDN       = bodyYawMin + (output[0] + 1) * (bodyYawMax - bodyYawMin) / 2;
        //     var rightLimbDN     = rightLimbMin + (output[1] + 1) * (rightLimbMax - rightLimbMin) / 2;
        //     var rightForearmDN  = rightForearmMin + (output[2] + 1) * (rightForearmMax - rightForearmMin) / 2;
        //
        //     return {'bodyYaw': bodyYawDN, 'rightLimb': rightLimbDN, 'rightForearm': rightForearmDN}
        // }(output);

        var jointAngles = {'bodyYaw': output[0], 'rightLimb': output[1], 'rightForearm': output[2]}

        console.log(jointAngles);

        var valterRef = this;

        valterRef.scriptLines = [];
        valterRef.scriptLines.push("BodyYaw_" +         (jointAngles.bodyYaw)                            + "_rad");
        valterRef.scriptLines.push("RightForearm_" +    (jointAngles.rightForearm)                       + "_rad");
        valterRef.scriptLines.push("RightLimb_" +       (jointAngles.rightLimb)                          + "_rad");
        valterRef.scriptLines.push("RightForearmRoll_90");

        console.log(valterRef.scriptLines);

        valterRef.scriptExecution();
    }
}
