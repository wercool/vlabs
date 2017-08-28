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

    rightArmIKANN(eefPos)
    {
        var eefPosN = function(eefPos){
            var eefXMin = -3.469000;
            var eefXMax = 8.745000;
            var eefYMin = -1.355000;
            var eefYMax = 9.657000;
            var eefZMin = 9.795000;
            var eefZMax = 19.645000;

            var eefPosXn = 2 * ((eefPos.x - eefXMin) / (eefXMax - eefXMin)) - 1;
            var eefPosYn = 2 * ((eefPos.y - eefYMin) / (eefYMax - eefYMin)) - 1;
            var eefPosZn = 2 * ((eefPos.z - eefZMin) / (eefZMax - eefZMin)) - 1;

            // var eefPosXn = 0.24;
            // var eefPosYn = -0.06666666666666676;
            // var eefPosZn = -0.06666666666666676;

            return {'x': eefPosXn, 'y': eefPosYn, 'z': eefPosZn}
        }(eefPos);

        // http://harthur.github.io/brain/
        var net = {"layers":[
            {
                    "name":"hl1",
                    "biases":[-1.788238883018493652e+00,-7.483367323875427246e-01,-7.803756594657897949e-01,6.861587613821029663e-02,4.430117309093475342e-01,-3.926074504852294922e-01,1.133027553558349609e+00,-1.732813715934753418e-01,8.820717930793762207e-01,1.179902076721191406e+00,1.598479598760604858e-02,3.291998207569122314e-01,-1.029183268547058105e-01,7.014750838279724121e-01,1.474620819091796875e+00,6.081824302673339844e-01,-8.287209272384643555e-02,5.643938779830932617e-01,-1.853545308113098145e+00,-9.629572182893753052e-02,1.373937726020812988e+00,-4.435238540172576904e-01,-2.779413461685180664e+00,1.051298737525939941e+00,1.451484560966491699e+00,-6.191327571868896484e-01,-2.717006802558898926e-01,4.641699790954589844e-01,-2.933607101440429688e-01,4.536863565444946289e-01],
                    "weights":[
                        [-5.792207121849060059e-01,1.657529175281524658e-01,8.048104643821716309e-01,3.953527212142944336e-01,1.421384334564208984e+00,1.372550964355468750e+00,-1.951633572578430176e+00,-7.125068902969360352e-01,6.810024380683898926e-01,-1.257570236921310425e-01,1.000688433647155762e+00,5.518464446067810059e-01,-6.469842046499252319e-02,1.370130181312561035e-01,8.225848674774169922e-01,-2.170425176620483398e+00,1.131773829460144043e+00,-1.092574834823608398e+00,1.116859793663024902e+00,-7.279976606369018555e-01,-8.406530618667602539e-01,-6.128031611442565918e-01,3.029556989669799805e+00,9.167976379394531250e-01,-4.224188327789306641e-01,-1.151390552520751953e+00,1.102459058165550232e-01,-8.759813308715820312e-01,-1.088299393653869629e+00,-3.672210574150085449e-01],
                        [1.596820116043090820e+00,-3.032542705535888672e+00,1.823651909828186035e+00,-4.513993859291076660e-01,-1.581661105155944824e-01,1.835449337959289551e-01,4.611661136150360107e-01,2.015263319015502930e+00,-7.836614847183227539e-01,3.271336257457733154e-01,5.713245645165443420e-02,3.332288190722465515e-02,-1.023567080497741699e+00,1.488152027130126953e+00,1.556824088096618652e+00,3.099556863307952881e-01,1.159573078155517578e+00,-4.073957726359367371e-02,6.991251707077026367e-01,-8.649655580520629883e-01,-8.781573772430419922e-01,1.097620725631713867e+00,7.148591279983520508e-01,-1.063706159591674805e+00,4.567614197731018066e-01,-3.182398378849029541e-01,-8.541114330291748047e-01,9.712075591087341309e-01,-5.421245098114013672e-01,-1.086066365242004395e+00],
                        [9.744549989700317383e-01,1.612145781517028809e+00,-6.305833458900451660e-01,1.650927424430847168e+00,3.405973911285400391e-01,-3.639800250530242920e-01,7.431980371475219727e-01,7.866288721561431885e-02,1.935197114944458008e+00,-5.739454030990600586e-01,3.515623807907104492e-01,7.562357187271118164e-01,-4.157360196113586426e-01,-3.113363087177276611e-01,9.857420921325683594e-01,2.880910634994506836e-01,1.590137243270874023e+00,1.211121201515197754e+00,-1.466430902481079102e+00,-5.048900842666625977e-02,-5.430430173873901367e-01,-1.437495350837707520e+00,-1.355440616607666016e+00,1.021387577056884766e+00,1.896395087242126465e+00,5.549833178520202637e-01,6.732740998268127441e-01,3.832377195358276367e-01,-3.783880174160003662e-01,-8.350747227668762207e-01]
                    ]
            },
            {
                    "name":"hl2",
                    "biases":[-9.779552817344665527e-01,7.923067212104797363e-01,2.529314756393432617e-01,1.278558015823364258e+00,2.330547332763671875e+00,1.939207911491394043e+00,-9.400400519371032715e-01,-1.377722501754760742e+00,-6.890277862548828125e-01,2.170676589012145996e-01,1.267781138420104980e+00,-8.623727560043334961e-01,-1.382851839065551758e+00,-1.129708886146545410e+00,2.280216962099075317e-01,-6.794009208679199219e-01,5.531651377677917480e-01,-2.612141668796539307e-01,-8.187598735094070435e-02,-1.142427563667297363e+00,1.078104019165039062e+00,9.626677632331848145e-01,-2.389672994613647461e+00,1.360581398010253906e+00,-9.874559044837951660e-01,5.399208068847656250e-01,8.662851452827453613e-01,-3.625305369496345520e-02,1.110398650169372559e+00,6.586148738861083984e-01],
                    "weights":[
                        [-1.276276469230651855e+00,-1.182868406176567078e-01,1.994499564170837402e-01,2.143473386764526367e+00,8.140706419944763184e-01,-2.447823286056518555e-01,-7.573255896568298340e-01,-2.686629772186279297e+00,7.425059080123901367e-01,-1.422643542289733887e+00,-7.678685188293457031e-01,1.097299456596374512e+00,2.592290937900543213e-01,1.887362003326416016e-01,9.648512303829193115e-02,7.607802003622055054e-02,5.538013577461242676e-01,-1.262098848819732666e-01,-1.881119489669799805e+00,-6.461301445960998535e-02,6.524150371551513672e-01,7.174521088600158691e-01,-2.259634256362915039e+00,1.899699211120605469e+00,2.381407469511032104e-01,1.040701195597648621e-01,-1.929723501205444336e+00,1.028259634971618652e+00,-3.399422168731689453e-01,-1.573164939880371094e+00],
                        [-5.797399282455444336e-01,2.487390041351318359e-01,1.995564550161361694e-01,-5.559094548225402832e-01,5.034179091453552246e-01,-2.349799312651157379e-02,-4.345884546637535095e-02,-6.497883200645446777e-01,-4.381023347377777100e-01,-8.460142016410827637e-01,-1.047803282737731934e+00,-4.660445451736450195e-01,1.563704162836074829e-01,4.368719756603240967e-01,4.603478908538818359e-01,4.339636564254760742e-01,2.404175996780395508e-01,9.021385312080383301e-01,2.691847383975982666e-01,1.120020985603332520e+00,7.450112700462341309e-01,-1.553377628326416016e+00,-1.074860215187072754e+00,-1.478153586387634277e+00,2.083894968032836914e+00,-1.819295287132263184e-01,-6.182745695114135742e-01,-2.232571393251419067e-01,1.393009305000305176e+00,4.531120955944061279e-01],
                        [-2.086607933044433594e+00,8.807010054588317871e-01,-8.105684518814086914e-01,4.762111306190490723e-01,-3.754015862941741943e-01,-1.060672521591186523e+00,-2.004264831542968750e+00,5.361343622207641602e-01,-2.737886607646942139e-01,-2.821188867092132568e-01,7.782881855964660645e-01,-5.091797113418579102e-01,1.441188097000122070e+00,6.280640959739685059e-01,5.432502627372741699e-01,3.180420875549316406e+00,-2.079320192337036133e+00,-3.968498110771179199e-01,-5.872565507888793945e-01,8.416006565093994141e-01,3.700796961784362793e-01,6.875223517417907715e-01,6.721350550651550293e-01,2.120271921157836914e-01,1.279499411582946777e+00,1.137499045580625534e-02,1.088329963386058807e-02,8.537361025810241699e-01,-1.351810216903686523e+00,-9.092652201652526855e-01],
                        [-1.719647765159606934e+00,1.083156242966651917e-01,-1.198579788208007812e+00,-5.802463889122009277e-01,-4.539670348167419434e-01,1.483644247055053711e+00,4.793412387371063232e-01,-8.327541947364807129e-01,-9.915016293525695801e-01,-6.772852540016174316e-01,-1.036039590835571289e+00,1.372371613979339600e-01,-3.631596863269805908e-01,-1.126719564199447632e-01,1.131766676902770996e+00,7.222620844841003418e-01,2.567503154277801514e-01,-6.829640269279479980e-02,-1.256346821784973145e+00,-1.181413173675537109e+00,9.393913745880126953e-01,-1.399475336074829102e+00,8.131512403488159180e-01,-3.348888754844665527e-01,-1.627023369073867798e-01,1.737055629491806030e-01,4.989464581012725830e-01,-1.937177300453186035e+00,1.888682246208190918e-01,-2.862431704998016357e-01],
                        [1.060355424880981445e+00,-1.782286465167999268e-01,-1.035996079444885254e+00,7.405557483434677124e-02,1.850423216819763184e-01,2.414564639329910278e-01,-1.131021976470947266e+00,3.028632998466491699e-01,-8.468062281608581543e-01,1.393936872482299805e+00,5.139798521995544434e-01,-1.507968157529830933e-01,1.630199432373046875e+00,-9.234327077865600586e-01,-1.441938400268554688e+00,6.302840113639831543e-01,-6.506714820861816406e-01,-2.730822265148162842e-01,2.137463808059692383e+00,-8.919031620025634766e-01,-1.123270630836486816e+00,1.417818814516067505e-01,-7.730996608734130859e-01,5.477399826049804688e-01,1.857175350189208984e+00,8.913441002368927002e-02,-1.267362594604492188e+00,6.720587015151977539e-01,1.457597494125366211e+00,-3.485338985919952393e-01],
                        [-4.626373052597045898e-01,3.937897682189941406e-01,-5.276975631713867188e-01,-7.093061208724975586e-01,-3.238216400146484375e+00,1.178538799285888672e+00,-1.465454339981079102e+00,-7.436220645904541016e-01,-5.943413972854614258e-01,5.968570709228515625e-01,-5.815325379371643066e-01,1.424696922302246094e+00,-1.377208828926086426e+00,-1.893349736928939819e-01,-7.081245779991149902e-01,1.221834421157836914e-01,1.010988473892211914e+00,-2.969250380992889404e-01,-4.251457154750823975e-01,8.613045811653137207e-01,2.139717578887939453e+00,-1.159317970275878906e+00,-4.644692838191986084e-01,-2.519014179706573486e-01,6.397910714149475098e-01,-1.253756523132324219e+00,-3.768584430217742920e-01,-7.482831180095672607e-02,-2.580719068646430969e-03,2.224571406841278076e-01],
                        [-8.033862113952636719e-01,-1.051405191421508789e+00,1.280910611152648926e+00,-9.396625757217407227e-01,-1.730394810438156128e-01,-2.799154222011566162e-01,-6.643262505531311035e-01,1.229882121086120605e+00,3.128192424774169922e-01,-4.330269396305084229e-01,-3.945370018482208252e-01,-4.254607260227203369e-01,-1.740261614322662354e-01,6.967239379882812500e-01,1.717884421348571777e+00,1.166460156440734863e+00,1.524850606918334961e+00,1.071472883224487305e+00,1.089588642120361328e+00,-1.963160276412963867e+00,2.076465129852294922e+00,-9.203784465789794922e-01,-4.983671307563781738e-01,1.497349381446838379e+00,-6.063300371170043945e-01,-1.533827424049377441e+00,4.587075710296630859e-01,1.432339668273925781e+00,6.132176518440246582e-01,2.955132909119129181e-02],
                        [-3.987135887145996094e-01,1.415252447128295898e+00,1.713536083698272705e-01,3.684608936309814453e-01,1.435966253280639648e+00,-9.733136892318725586e-01,1.047918349504470825e-01,-6.707229018211364746e-01,3.669377565383911133e-01,-3.404259979724884033e-01,-1.425399035215377808e-01,-4.021544456481933594e-01,-8.067347407341003418e-01,-6.962798237800598145e-01,-2.263880372047424316e-01,-4.419986903667449951e-01,-2.915176749229431152e-01,-7.461202740669250488e-01,1.215478330850601196e-01,-1.535057067871093750e+00,1.683233380317687988e+00,1.883558988571166992e+00,-1.605267882347106934e+00,7.778786420822143555e-01,7.063301205635070801e-01,2.197666406631469727e+00,-1.534354329109191895e+00,3.291886672377586365e-02,1.976480931043624878e-01,1.085403561592102051e+00],
                        [9.369392991065979004e-01,6.221343278884887695e-01,-1.979101777076721191e+00,-2.518172860145568848e-01,-1.267702341079711914e+00,-5.234795212745666504e-01,2.040403842926025391e+00,9.026455283164978027e-01,7.174448370933532715e-01,-1.549195289611816406e+00,-2.335894584655761719e+00,1.379029393196105957e+00,-2.595617808401584625e-02,4.285157620906829834e-01,-6.283044815063476562e-01,-3.405403494834899902e-01,2.146456956863403320e+00,-2.439076900482177734e-01,-1.321776986122131348e+00,-5.999531745910644531e-01,1.058605611324310303e-01,-5.117165446281433105e-01,1.208859682083129883e+00,-1.285620212554931641e+00,-2.236650735139846802e-01,-1.028602004051208496e+00,1.230387669056653976e-02,5.633487105369567871e-01,-8.392877578735351562e-01,-5.969332531094551086e-02],
                        [-2.619446277618408203e+00,1.044988274574279785e+00,-9.109206497669219971e-02,-1.390823006629943848e+00,-1.816605329513549805e-01,-7.055040597915649414e-01,1.340481758117675781e+00,-1.877912998199462891e+00,-1.157561540603637695e+00,5.850519537925720215e-01,-1.462668627500534058e-01,-1.202819824218750000e+00,5.763597488403320312e-01,2.042770534753799438e-01,-1.352077484130859375e+00,-4.930097758769989014e-01,3.028179109096527100e-01,-2.547401785850524902e-01,-2.647668719291687012e-01,3.513796925544738770e-01,6.498872488737106323e-02,-7.420833706855773926e-01,9.185072183609008789e-01,2.944086790084838867e-01,-1.259369850158691406e+00,-1.050514101982116699e+00,-1.439012289047241211e+00,-1.161778450012207031e+00,3.496152162551879883e-01,-1.182776451110839844e+00],
                        [5.346888899803161621e-01,2.008093357086181641e+00,4.516201317310333252e-01,2.675618231296539307e-01,-1.350523710250854492e+00,-2.011664390563964844e+00,4.896556437015533447e-01,-3.922698199748992920e-01,1.072093248367309570e+00,2.080637514591217041e-01,4.070746600627899170e-01,2.337892532348632812e+00,-7.189625408500432968e-03,3.919058442115783691e-01,1.248447299003601074e+00,7.413212060928344727e-01,-6.469092965126037598e-01,8.845322728157043457e-01,-2.752653509378433228e-02,1.555741310119628906e+00,-4.568104743957519531e-01,-1.447701454162597656e+00,-6.992710828781127930e-01,1.006909385323524475e-01,-9.519939422607421875e-01,2.687230110168457031e-01,2.798868715763092041e-01,6.079141795635223389e-02,-1.256325483322143555e+00,1.739073991775512695e+00],
                        [6.417673081159591675e-02,6.132736206054687500e-01,-1.847714304924011230e+00,-1.672024369239807129e+00,-2.240603268146514893e-01,2.165418863296508789e+00,-6.002984642982482910e-01,-1.061738356947898865e-01,-6.222975254058837891e-02,-1.807136535644531250e-01,-2.780789732933044434e-01,4.830618575215339661e-02,5.175673365592956543e-01,-6.990357041358947754e-01,-9.214243292808532715e-01,-1.081779599189758301e+00,1.783623814582824707e+00,1.392720699310302734e+00,2.955721616744995117e-01,-1.236016631126403809e+00,5.873983502388000488e-01,-2.898122966289520264e-01,-1.049512386322021484e+00,7.386596798896789551e-01,-7.080688327550888062e-02,7.631400227546691895e-02,1.147579193115234375e+00,-1.904820054769515991e-01,1.283567428588867188e+00,2.081313848495483398e+00],
                        [7.004868388175964355e-01,7.098652720451354980e-01,-1.515177488327026367e+00,-1.106516122817993164e-01,1.472666859626770020e+00,1.909663677215576172e+00,-9.550854563713073730e-01,2.691689491271972656e+00,7.628653049468994141e-01,-1.247530817985534668e+00,-6.624637842178344727e-01,9.889791011810302734e-01,1.183078765869140625e+00,-9.869104027748107910e-01,-5.569601655006408691e-01,-8.228055834770202637e-01,1.635217070579528809e-01,-1.245720505714416504e+00,-8.352748751640319824e-01,2.275704383850097656e+00,8.662663698196411133e-01,-5.285742282867431641e-01,1.250930309295654297e+00,1.547382235527038574e+00,-2.500030994415283203e+00,2.104144096374511719e-01,-4.329357445240020752e-01,-1.162652850151062012e+00,-7.180097699165344238e-01,3.130346834659576416e-01],
                        [-7.800845801830291748e-02,6.032578945159912109e-01,2.088487386703491211e+00,-3.700109720230102539e-01,-8.620134592056274414e-01,2.336664438247680664e+00,-9.712143540382385254e-01,1.526054590940475464e-01,2.173825740814208984e+00,2.727807164192199707e-01,1.418161034584045410e+00,-6.020251512527465820e-01,2.239144034683704376e-02,7.219429016113281250e-01,-6.425904631614685059e-01,1.028566002845764160e+00,3.736466467380523682e-01,-4.317611753940582275e-01,6.575285196304321289e-01,4.659826755523681641e-01,1.595258712768554688e-01,8.570940047502517700e-02,4.410764276981353760e-01,2.950446307659149170e-01,-7.710731774568557739e-02,-8.997441828250885010e-02,-2.972609400749206543e-01,-1.307671785354614258e+00,-1.542407512664794922e+00,1.336290359497070312e+00],
                        [-1.081176102161407471e-01,-2.394426316022872925e-01,-7.141155600547790527e-01,-3.743788719177246094e+00,-1.713803768157958984e+00,1.905911087989807129e+00,6.313301324844360352e-01,6.564374566078186035e-01,-1.311077922582626343e-01,1.310784816741943359e-01,-1.961197614669799805e+00,-1.038415789604187012e+00,-1.052375316619873047e+00,-1.788572221994400024e-01,-1.727703809738159180e+00,7.270292639732360840e-01,-4.305528998374938965e-01,-2.304086387157440186e-01,-1.906919032335281372e-01,-3.399366438388824463e-01,2.543796539306640625e+00,4.731549322605133057e-01,-7.494823634624481201e-02,1.957685947418212891e+00,6.354311108589172363e-01,1.149628281593322754e+00,7.676035165786743164e-01,-1.311654090881347656e+00,-1.354478001594543457e+00,6.288287639617919922e-01],
                        [1.623609066009521484e+00,7.467377930879592896e-02,9.606340527534484863e-01,-1.757068872451782227e+00,-7.527111172676086426e-01,1.282891631126403809e+00,-1.270041346549987793e+00,1.469228148460388184e+00,3.036666214466094971e-01,1.544465780258178711e+00,-8.650308251380920410e-01,2.611189782619476318e-01,1.016770601272583008e+00,-3.918374776840209961e-01,7.030832767486572266e-01,-1.918391942977905273e+00,9.263061285018920898e-01,2.181505560874938965e-01,2.353149890899658203e+00,-8.822044730186462402e-01,-2.659742236137390137e-01,5.783330202102661133e-01,1.793156027793884277e+00,-3.282203972339630127e-01,1.546478509902954102e+00,-9.956319332122802734e-01,2.862190246582031250e+00,5.597699284553527832e-01,-1.144949197769165039e+00,6.746864914894104004e-01],
                        [3.240137994289398193e-01,1.189008951187133789e+00,1.522318571805953979e-01,-6.136916875839233398e-01,-1.731384277343750000e+00,6.822377443313598633e-01,-2.666884660720825195e-01,-4.848964512348175049e-01,-2.961338758468627930e-01,1.519776225090026855e+00,-2.652468442916870117e+00,4.749540686607360840e-01,-9.774432778358459473e-01,5.765932202339172363e-01,-1.086029112339019775e-01,1.511546969413757324e+00,8.384584188461303711e-01,-1.055766344070434570e+00,6.111789345741271973e-01,7.985619306564331055e-01,-5.414514541625976562e-01,-2.436407804489135742e+00,-1.615753471851348877e-01,1.849353671073913574e+00,-3.547497987747192383e-01,2.797153294086456299e-01,-8.665480613708496094e-01,9.569868445396423340e-02,-2.234975576400756836e+00,1.653348922729492188e+00],
                        [8.981024026870727539e-01,-5.633799731731414795e-02,9.802554249763488770e-01,-1.748274803161621094e+00,5.487791299819946289e-01,-4.633333086967468262e-01,1.329152733087539673e-01,-4.848473370075225830e-01,-6.913125514984130859e-02,-2.215457856655120850e-01,-5.283689498901367188e-01,-7.047291994094848633e-01,1.969215750694274902e+00,-3.282626867294311523e-01,-1.622513495385646820e-02,8.164270520210266113e-01,1.001969337463378906e+00,4.483510255813598633e-01,-1.874240279197692871e+00,-3.284923732280731201e-01,-2.497669681906700134e-02,-5.422011017799377441e-01,-9.081242606043815613e-03,9.691578745841979980e-01,-1.057634234428405762e+00,-1.061047911643981934e-01,7.204279303550720215e-01,7.113141417503356934e-01,4.484506323933601379e-02,8.425025343894958496e-01],
                        [-1.420939564704895020e+00,-9.037744998931884766e-01,-1.928628206253051758e+00,1.856088042259216309e+00,-4.245378971099853516e-01,-1.104485511779785156e+00,7.230030894279479980e-01,-1.268007993698120117e+00,8.851706981658935547e-02,-1.356268972158432007e-01,2.400909423828125000e+00,-6.115668416023254395e-01,4.746371209621429443e-01,2.230101585388183594e+00,1.705540657043457031e+00,1.596427083015441895e+00,4.110426902770996094e-01,4.301780462265014648e-01,6.392490267753601074e-01,5.613180994987487793e-01,5.492230653762817383e-01,-1.016250252723693848e-01,8.292376995086669922e-01,1.017286062240600586e+00,-1.274784684181213379e+00,1.726027846336364746e+00,-1.469394266605377197e-01,-8.700956106185913086e-01,1.380634009838104248e-01,9.755984544754028320e-01],
                        [-9.654375314712524414e-01,7.544614672660827637e-01,-6.831160187721252441e-02,2.649304568767547607e-01,2.147549867630004883e+00,2.560831904411315918e-01,4.625776708126068115e-01,-5.454053878784179688e-01,-8.603472709655761719e-01,-2.388675510883331299e-01,9.533337950706481934e-01,-7.440184950828552246e-01,1.186441302299499512e+00,8.612521290779113770e-01,6.950398087501525879e-01,1.372234940528869629e+00,-8.772091865539550781e-01,-5.951100587844848633e-01,4.977242648601531982e-01,-8.067918419837951660e-01,-1.010678172111511230e+00,-7.663308978080749512e-01,4.094204902648925781e-01,6.033493876457214355e-01,9.418905973434448242e-01,-6.421723365783691406e-01,1.179516434669494629e+00,9.055895805358886719e-01,-9.559260010719299316e-01,1.327606081962585449e+00],
                        [9.999777674674987793e-01,1.590375542640686035e+00,1.549027800559997559e+00,1.553757041692733765e-01,-1.438100337982177734e+00,-3.916191160678863525e-01,5.393901467323303223e-01,6.710531711578369141e-01,-1.686182469129562378e-01,-5.692380070686340332e-01,4.148760735988616943e-01,7.669644057750701904e-02,-2.453259527683258057e-01,-1.743285179138183594e+00,-1.638431102037429810e-01,-4.026548564434051514e-01,-1.864247202873229980e+00,-1.423417776823043823e-01,1.187795758247375488e+00,-8.400030434131622314e-02,9.974112510681152344e-01,-9.954067319631576538e-02,1.112211793661117554e-01,1.048385739326477051e+00,1.441336750984191895e+00,-5.932499766349792480e-01,-7.724159955978393555e-01,1.665592908859252930e+00,2.598879337310791016e-01,8.685588240623474121e-01],
                        [1.096702694892883301e+00,-5.773675441741943359e-01,1.311619758605957031e+00,8.789370656013488770e-01,-1.352429270744323730e+00,1.498072743415832520e+00,-1.199329853057861328e+00,-6.023117899894714355e-01,9.782326221466064453e-01,-1.382628798484802246e+00,-7.672019600868225098e-01,9.991287589073181152e-01,-5.989537239074707031e-01,1.216364145278930664e+00,6.284322738647460938e-01,-7.183379530906677246e-01,-1.747858405113220215e+00,9.021080732345581055e-01,-9.880610108375549316e-01,1.798305511474609375e-01,-1.074335575103759766e+00,-7.628631591796875000e-02,-8.176841735839843750e-01,1.686891078948974609e+00,-1.658218502998352051e+00,-8.068718314170837402e-01,-4.839369654655456543e-01,7.407864332199096680e-01,-1.755476593971252441e+00,-4.796482622623443604e-01],
                        [-9.506926536560058594e-01,-8.580351471900939941e-01,-2.626031875610351562e+00,1.385767340660095215e+00,6.965023875236511230e-01,6.442108005285263062e-02,1.081133604049682617e+00,3.570663034915924072e-01,-5.966080427169799805e-01,-2.058612108230590820e+00,8.418444991111755371e-01,-5.938284397125244141e-01,3.136116862297058105e-01,2.258295297622680664e+00,-2.275942564010620117e+00,1.561505794525146484e+00,1.113955259323120117e+00,-7.850927859544754028e-02,-1.407767057418823242e+00,-1.627290099859237671e-01,9.379974007606506348e-01,1.235471844673156738e+00,-2.575282752513885498e-01,1.758226156234741211e+00,1.599288463592529297e+00,1.080015659332275391e+00,5.760554224252700806e-02,3.489382863044738770e-01,-2.082148790359497070e+00,9.549354314804077148e-01],
                        [2.393447399139404297e+00,-2.184793233871459961e+00,5.594505667686462402e-01,1.366198539733886719e+00,-1.346495270729064941e+00,-7.318832278251647949e-01,-6.674700379371643066e-01,-1.222298368811607361e-01,-1.175984144210815430e+00,9.841611385345458984e-01,-6.284853816032409668e-01,-2.572705745697021484e-01,1.666767150163650513e-01,-1.042445749044418335e-01,-3.775376379489898682e-01,-1.183690667152404785e+00,8.349357843399047852e-01,-8.851231932640075684e-01,2.105735689401626587e-01,1.095809578895568848e+00,2.869917154312133789e-01,-2.862125635147094727e-01,3.203276991844177246e-01,-1.152829453349113464e-01,-7.055575847625732422e-01,6.441399455070495605e-01,1.627891063690185547e+00,7.470741271972656250e-01,8.831764459609985352e-01,1.455210328102111816e+00],
                        [1.387889027595520020e+00,7.767831087112426758e-01,8.185938000679016113e-01,-1.637329608201980591e-01,8.223679661750793457e-01,3.614136874675750732e-01,-1.994371712207794189e-01,5.951427817344665527e-01,-2.908032238483428955e-01,-1.811551332473754883e+00,-1.208757758140563965e+00,2.576807886362075806e-02,-4.219133034348487854e-02,-1.379791498184204102e-01,-1.694817185401916504e+00,-2.138946503400802612e-01,-6.183758378028869629e-01,2.178441137075424194e-01,-1.206811666488647461e+00,-6.218865513801574707e-01,-3.295740485191345215e-02,9.735167026519775391e-01,-1.912939995527267456e-01,6.768822073936462402e-01,-1.317445516586303711e+00,-4.527788609266281128e-02,5.451300740242004395e-01,1.645007287152111530e-03,-6.359083056449890137e-01,1.092680320143699646e-01],
                        [-2.104899644851684570e+00,8.256020545959472656e-01,1.090692520141601562e+00,7.800859212875366211e-01,-1.205929398536682129e+00,1.016957998275756836e+00,2.551438808441162109e+00,-5.077694654464721680e-01,2.244519472122192383e+00,1.363166570663452148e+00,-6.610737442970275879e-01,-6.932917237281799316e-01,-1.603227972984313965e+00,-9.416325092315673828e-01,2.296905517578125000e+00,-5.296520590782165527e-01,1.316655278205871582e+00,9.907337427139282227e-01,-1.984048932790756226e-01,-4.737335741519927979e-01,6.006889939308166504e-01,-1.087751150131225586e+00,9.735550880432128906e-01,-1.903155297040939331e-01,2.608013451099395752e-01,6.205544471740722656e-01,-2.892958223819732666e-01,1.858360469341278076e-01,6.823195815086364746e-01,1.579242706298828125e+00],
                        [1.459396600723266602e+00,1.815401434898376465e+00,2.920418083667755127e-01,8.635278344154357910e-01,1.438945531845092773e+00,1.184793829917907715e+00,-2.096012115478515625e+00,8.015351891517639160e-01,-1.175779104232788086e-01,-1.317433238029479980e+00,-9.765494465827941895e-01,-1.680884122848510742e+00,9.235938787460327148e-01,6.809681057929992676e-01,-6.591677665710449219e-01,4.866758882999420166e-01,-2.230552732944488525e-01,-1.145525097846984863e+00,-9.258462488651275635e-02,-8.303006291389465332e-01,-4.832146763801574707e-01,-1.596114158630371094e+00,1.713538885116577148e+00,-7.796114683151245117e-01,1.485723495483398438e+00,2.561580419540405273e+00,2.555994093418121338e-01,1.691293865442276001e-01,4.468135535717010498e-01,6.277067661285400391e-01],
                        [6.880599260330200195e-01,2.564720436930656433e-02,-4.071972668170928955e-01,-5.858297944068908691e-01,7.604256868362426758e-01,-8.715908527374267578e-01,-1.304613500833511353e-01,1.378637075424194336e+00,1.172533988952636719e+00,-1.136021852493286133e+00,-8.067976683378219604e-02,-4.984862636774778366e-03,4.779975116252899170e-01,1.577928543090820312e+00,-9.722219705581665039e-01,-6.012663841247558594e-01,1.362899422645568848e+00,-2.823711037635803223e-01,-1.046603202819824219e+00,-1.578264594078063965e+00,-2.096935510635375977e+00,3.822067677974700928e-01,-7.656367421150207520e-01,7.689785361289978027e-01,7.546390891075134277e-01,-3.870278224349021912e-02,-7.077144384384155273e-01,-1.898687779903411865e-01,-1.215314030647277832e+00,3.740111887454986572e-01],
                        [-2.191716879606246948e-01,1.343916535377502441e+00,1.169711828231811523e+00,1.248712539672851562e+00,-9.899722933769226074e-01,3.406082093715667725e-01,-7.268297076225280762e-01,3.311370313167572021e-01,-8.922995328903198242e-01,5.729237794876098633e-01,-2.087923526763916016e+00,7.960709333419799805e-01,5.268319845199584961e-01,-1.135289430618286133e+00,1.143848061561584473e+00,-1.635142087936401367e+00,-1.056683659553527832e+00,-1.096278548240661621e+00,7.965324521064758301e-01,1.295039951801300049e-01,-1.419075489044189453e+00,1.150640368461608887e+00,-5.836405158042907715e-01,7.337574958801269531e-01,-3.925161361694335938e-01,6.258718669414520264e-02,-2.052100300788879395e-01,1.045564293861389160e+00,-2.271954566240310669e-01,1.610557317733764648e+00],
                        [1.988137841224670410e+00,-1.164612546563148499e-01,-7.939250469207763672e-01,-1.708396553993225098e+00,3.847243785858154297e-01,2.074327707290649414e+00,9.382395744323730469e-01,-5.558013319969177246e-01,1.941583037376403809e+00,-8.159792423248291016e-01,9.666340947151184082e-01,-6.951547265052795410e-01,-1.148317813873291016e+00,-2.194869667291641235e-01,3.838973641395568848e-01,1.993009299039840698e-01,-6.207484602928161621e-01,5.709390640258789062e-01,1.639781117439270020e+00,9.814293682575225830e-02,5.153852701187133789e-01,-1.426558732986450195e+00,2.943387627601623535e-01,7.003554105758666992e-01,-2.384460687637329102e+00,1.179553747177124023e+00,-3.040530085563659668e-01,-1.263891696929931641e+00,-4.585103988647460938e-01,4.988104999065399170e-01]
                    ]
            },
            {
                    "name":"outl",
                    "biases":[2.318907260894775391e+00,-1.101705908775329590e+00,-1.155244231224060059e+00],
                    "weights":[
                        [6.513140797615051270e-01,-7.049990296363830566e-01,-2.828610181808471680e+00],
                        [-8.850657343864440918e-01,1.354733854532241821e-01,2.014040470123291016e+00],
                        [1.821340769529342651e-01,-3.808628618717193604e-01,3.500300049781799316e-01],
                        [-1.319549381732940674e-01,1.485730409622192383e+00,2.436871454119682312e-02],
                        [-8.580034971237182617e-02,1.155948400497436523e+00,-7.905123233795166016e-01],
                        [-1.166713476181030273e+00,1.782576441764831543e-01,6.180011034011840820e-01],
                        [2.194449663162231445e+00,1.321206688880920410e+00,-3.024406671524047852e+00],
                        [7.721911668777465820e-01,6.189231202006340027e-02,-1.680284261703491211e+00],
                        [1.863730072975158691e+00,1.121721602976322174e-02,-1.229747056961059570e+00],
                        [-5.549595952033996582e-01,4.905447661876678467e-01,-4.837840795516967773e-01],
                        [1.379846215248107910e+00,-9.810278415679931641e-01,1.017694115638732910e+00],
                        [-1.362280488014221191e+00,-8.151047825813293457e-01,4.625269770622253418e-01],
                        [-4.386534169316291809e-02,-6.448160409927368164e-01,4.032196104526519775e-01],
                        [1.206134676933288574e+00,5.484348535537719727e-01,2.599687814712524414e+00],
                        [1.458201289176940918e+00,-1.691063642501831055e-01,1.488863229751586914e+00],
                        [-6.129639744758605957e-01,6.942282915115356445e-01,-9.630717635154724121e-01],
                        [1.400353163480758667e-01,-1.518240332603454590e+00,-6.798654198646545410e-01],
                        [1.607889652252197266e+00,1.139894127845764160e+00,9.922710806131362915e-02],
                        [-7.946486473083496094e-01,-1.456232428550720215e+00,4.602571725845336914e-01],
                        [-6.710089445114135742e-01,1.427936553955078125e+00,1.792807579040527344e+00],
                        [-9.631403684616088867e-01,-5.447860956192016602e-01,1.303507238626480103e-01],
                        [-4.947777092456817627e-01,1.066972255706787109e+00,1.279842972755432129e+00],
                        [3.529774248600006104e-01,-1.172443866729736328e+00,5.383070707321166992e-01],
                        [-1.639979332685470581e-02,1.089471340179443359e+00,1.865419030189514160e+00],
                        [5.204474329948425293e-01,1.495231270790100098e+00,4.426284879446029663e-02],
                        [-1.235992670059204102e+00,8.799529075622558594e-01,3.341217339038848877e-01],
                        [1.939483135938644409e-01,2.293855510652065277e-02,-8.364306688308715820e-01],
                        [-5.904633998870849609e-01,9.111999869346618652e-01,-5.686867237091064453e-01],
                        [-2.082159042358398438e+00,-5.456411242485046387e-01,-7.122163772583007812e-01],
                        [-5.447162389755249023e-01,1.556807279586791992e+00,6.766246557235717773e-01]
                    ]
            }
        ]}

        var input = [eefPosN.x, eefPosN.y, eefPosN.z]
console.log("input", input);
        var output = [];

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
            input = output;
        }

console.log("output", output);

        var jointAngles = function(output){
            var bodyYawMin = -0.750000;
            var bodyYawMax = 0.750000;
            var rightLimbMin = -0.500000;
            var rightLimbMax = 1.000000;
            var rightForearmMin = -0.500000;
            var rightForearmMax = 1.000000;

            var bodyYawDN       = bodyYawMin + (output[0] + 1) * (bodyYawMax - bodyYawMin) / 2;
            var rightLimbDN     = rightLimbMin + (output[1] + 1) * (rightLimbMax - rightLimbMin) / 2;
            var rightForearmDN  = rightForearmMin + (output[2] + 1) * (rightForearmMax - rightForearmMin) / 2;

            return {'bodyYaw': bodyYawDN, 'rightLimb': rightLimbDN, 'rightForearm': rightForearmDN}
        }(output);

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
