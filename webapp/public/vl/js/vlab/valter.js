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
            var eefXMin = -3.361000;
            var eefXMax = 8.719000;
            var eefYMin = -2.252000;
            var eefYMax = 9.510000;
            var eefZMin = 10.593000;
            var eefZMax = 21.281000;

            var eefPosXn = 2 * ((eefPos.x - eefXMin) / (eefXMax - eefXMin)) - 1;
            var eefPosYn = 2 * ((eefPos.y - eefYMin) / (eefYMax - eefYMin)) - 1;
            var eefPosZn = 2 * ((eefPos.z - eefZMin) / (eefZMax - eefZMin)) - 1;

            return {'x': eefPosXn, 'y': eefPosYn, 'z': eefPosZn}
        }(eefPos);

        // http://harthur.github.io/brain/
        var net = {"layers":[
            {
                    "name":"hl1",
                    "biases":[1.258346319198608398e+00,-8.245180845260620117e-01,-1.805163621902465820e-01,-1.730592250823974609e+00,-1.943838119506835938e+00,-4.520133510231971741e-02,-6.324737071990966797e-01,-4.227738678455352783e-01,-1.054307341575622559e+00,1.162102520465850830e-01,-2.040968179702758789e+00,-1.992924571037292480e+00,7.692604064941406250e-01,1.274402856826782227e+00,3.462686538696289062e-01,3.141704797744750977e-01,1.307468175888061523e+00,-1.245017498731613159e-01,-2.311723470687866211e+00,7.156188786029815674e-02,-7.600055336952209473e-01,2.787004411220550537e-01,-9.937598109245300293e-01,-5.839393734931945801e-01,8.850576281547546387e-01,8.072682619094848633e-01,-7.269298434257507324e-01,7.307525724172592163e-02,7.523569464683532715e-01,-1.807089895009994507e-01],
                    "weights":[
                        [9.765162467956542969e-01,-8.739073872566223145e-01,-4.096243381500244141e-01,-6.566783189773559570e-01,1.723740100860595703e+00,1.173100471496582031e+00,-4.255766570568084717e-01,-7.926529645919799805e-01,-2.527501106262207031e+00,-2.092709541320800781e+00,-9.848310351371765137e-01,-6.092143654823303223e-01,4.227091670036315918e-01,-1.317886114120483398e+00,-2.830385863780975342e-01,2.078370332717895508e+00,-9.960674643516540527e-01,-1.177381634712219238e+00,-3.919352311640977859e-03,-1.501321196556091309e+00,-3.234291970729827881e-01,9.107158780097961426e-01,3.726011216640472412e-01,-1.292033195495605469e+00,9.666063785552978516e-01,7.515357732772827148e-01,3.363394439220428467e-01,-1.757003426551818848e+00,6.154589653015136719e-01,2.171445608139038086e+00],
                        [4.636476039886474609e-01,1.428159594535827637e+00,-4.871213063597679138e-02,3.055595159530639648e-01,-1.237376928329467773e+00,-9.949326515197753906e-01,5.402569770812988281e-01,9.199140667915344238e-01,-2.076253652572631836e+00,-4.524215757846832275e-01,-2.278483211994171143e-01,6.356506347656250000e-01,-8.318473696708679199e-01,-9.184612035751342773e-01,-8.255267739295959473e-01,1.754109263420104980e+00,1.678078919649124146e-01,7.893033325672149658e-02,4.201293885707855225e-01,-2.970063090324401855e-01,3.733927607536315918e-01,3.747755587100982666e-01,3.527455925941467285e-01,-2.593122124671936035e-01,-1.019706964492797852e+00,-1.410442948341369629e+00,-9.212893247604370117e-02,7.260836362838745117e-01,5.329278111457824707e-01,5.691394805908203125e-01],
                        [2.455278784036636353e-01,3.424577042460441589e-02,1.482022047042846680e+00,-7.377144098281860352e-01,1.562461555004119873e-01,8.953120559453964233e-02,4.246311485767364502e-01,2.397387176752090454e-01,-8.507633805274963379e-01,6.160748004913330078e-01,-1.616494059562683105e-01,4.731771945953369141e-01,-2.465158104896545410e-01,7.307277917861938477e-01,-4.154411256313323975e-01,-1.516615319997072220e-02,-9.614127278327941895e-01,1.787632703781127930e+00,-5.006557106971740723e-01,4.388915002346038818e-01,-1.777064353227615356e-01,1.121528983116149902e+00,3.030908703804016113e-01,-1.706776499748229980e+00,-1.430846691131591797e+00,-2.794531639665365219e-03,1.372253298759460449e+00,-2.079967021942138672e+00,2.478872090578079224e-01,3.544488251209259033e-01]
                    ]
            },
            {
                    "name":"hl2",
                    "biases":[-3.791259527206420898e-01,3.374836742877960205e-01,1.732333898544311523e+00,4.635490775108337402e-01,2.049845218658447266e+00,9.281108379364013672e-01,-3.217949271202087402e-01,-1.616727113723754883e-01,1.197233796119689941e+00,-7.593756169080734253e-02,1.014179587364196777e+00,1.577020250260829926e-02,-8.056541681289672852e-01,1.966662406921386719e+00,8.897997140884399414e-01,5.851258635520935059e-01,4.456514716148376465e-01,9.034730792045593262e-01,4.358117878437042236e-01,4.056976437568664551e-01,1.694196909666061401e-01,-5.901757478713989258e-01,8.522174954414367676e-01,-1.277801275253295898e+00,-4.914090931415557861e-01,2.148835897445678711e+00,1.923340439796447754e+00,1.503560245037078857e-01,-5.637521743774414062e-01,3.101935982704162598e-01],
                    "weights":[
                        [3.096558749675750732e-01,-1.075837969779968262e+00,1.074508666992187500e+00,8.763713836669921875e-01,-3.060062170028686523e+00,1.396947026252746582e+00,-9.831883907318115234e-01,-2.080435864627361298e-02,9.723301529884338379e-01,1.160836577415466309e+00,-7.701100707054138184e-01,-6.489486098289489746e-01,-1.257777571678161621e+00,1.086478590965270996e+00,-2.178137898445129395e-01,3.752824366092681885e-01,-2.133099555969238281e+00,-1.261966824531555176e+00,-1.097069501876831055e+00,1.558789730072021484e+00,7.322658300399780273e-01,-2.675618827342987061e-01,-1.455318212509155273e+00,-2.931470870971679688e+00,2.931615412235260010e-01,-4.472369551658630371e-01,-2.069529771804809570e+00,-7.697685360908508301e-01,1.325260400772094727e+00,2.722429037094116211e-01],
                        [-1.293124556541442871e-01,6.785406470298767090e-01,1.526266038417816162e-01,-1.459602117538452148e+00,-1.973024010658264160e-01,6.287658810615539551e-01,1.320987492799758911e-01,3.058339357376098633e-01,2.679811716079711914e-01,-7.062000632286071777e-01,4.663212001323699951e-01,-8.554771542549133301e-02,1.197749733924865723e+00,1.735675781965255737e-01,9.665504693984985352e-01,-1.513535857200622559e+00,-1.313596248626708984e+00,7.404018044471740723e-01,-1.131960228085517883e-01,4.979051947593688965e-01,-1.470175266265869141e+00,1.445304602384567261e-01,6.134055852890014648e-01,9.230692982673645020e-01,-8.475647866725921631e-02,-1.693699479103088379e+00,-1.123701095581054688e+00,-1.191524267196655273e+00,-2.956564188003540039e+00,1.951492428779602051e-01],
                        [-7.202522754669189453e-01,1.350201249122619629e+00,-5.185784697532653809e-01,-8.257010579109191895e-01,-3.733394443988800049e-01,-3.310282528400421143e-01,-4.330927506089210510e-03,1.045427918434143066e+00,1.466893553733825684e+00,1.216370582580566406e+00,-4.927264153957366943e-01,-2.278610229492187500e+00,3.967245221138000488e-01,1.260935813188552856e-01,-3.025669790804386139e-02,-4.962425231933593750e-01,4.798560217022895813e-02,6.000562384724617004e-02,-1.078859686851501465e+00,8.636106550693511963e-02,-3.233134150505065918e-01,-1.582748442888259888e-01,-3.704554438591003418e-01,-4.931819736957550049e-01,-6.580964326858520508e-01,-1.186778783798217773e+00,1.087946057319641113e+00,3.864713013172149658e-02,-2.592188417911529541e-01,-1.035514831542968750e+00],
                        [4.918925166130065918e-01,-6.408225297927856445e-01,7.258857488632202148e-01,6.883487105369567871e-01,-1.832870543003082275e-01,-6.755056977272033691e-01,8.763166069984436035e-01,-7.343560457229614258e-02,-2.601208090782165527e-01,-4.253113865852355957e-01,2.344315946102142334e-01,9.187637269496917725e-02,-6.092157959938049316e-01,-1.890840083360671997e-01,6.311514973640441895e-01,-2.548232793807983398e+00,5.466052889823913574e-02,-9.520896077156066895e-01,-7.026082873344421387e-01,3.803594112396240234e-01,-7.350557446479797363e-01,-4.260222017765045166e-01,-1.230348467826843262e+00,-4.372598826885223389e-01,-1.395729899406433105e+00,4.014357030391693115e-01,-4.084737002849578857e-01,3.173683583736419678e-01,-1.637725949287414551e+00,-9.324337840080261230e-01],
                        [-6.397089958190917969e-01,-1.031056523323059082e+00,-1.371083378791809082e+00,-2.556532323360443115e-01,-1.224244117736816406e+00,7.902573943138122559e-01,-1.016144394874572754e+00,3.059361316263675690e-02,3.874375820159912109e-01,-8.462717533111572266e-01,5.420293807983398438e-01,5.222130566835403442e-02,-3.220539391040802002e-01,-9.106096625328063965e-01,-1.949296146631240845e-01,5.984584093093872070e-01,-4.315797388553619385e-01,-9.587445259094238281e-01,-5.970775485038757324e-01,1.579948365688323975e-01,-9.539981484413146973e-01,-1.857456684112548828e+00,-1.000599741935729980e+00,-6.013668179512023926e-01,8.061932772397994995e-02,1.239678144454956055e+00,-8.222451806068420410e-02,-1.437904596328735352e+00,-1.045154213905334473e+00,-1.419794559478759766e+00],
                        [-6.367902159690856934e-01,-1.961632668972015381e-01,-2.996325194835662842e-01,-3.265725374221801758e-01,1.114428997039794922e+00,-8.051338195800781250e-01,-8.030165433883666992e-01,-6.897417306900024414e-01,-1.528891086578369141e+00,-7.393372058868408203e-01,1.689871959388256073e-02,-3.388520479202270508e-01,-2.457757234573364258e+00,-7.964249253273010254e-01,1.616956114768981934e+00,2.149416953325271606e-01,3.502939641475677490e-01,1.283754706382751465e-01,-1.916522979736328125e-01,1.153195276856422424e-01,-2.911313176155090332e-01,-2.706112861633300781e-01,-1.576392769813537598e+00,-1.789072990417480469e+00,3.507264852523803711e-01,1.533491849899291992e+00,1.483991980552673340e+00,-4.478935003280639648e-01,-1.108297035098075867e-01,9.744992852210998535e-01],
                        [3.447137176990509033e-01,2.955881834030151367e+00,-1.163442611694335938e+00,1.105443000793457031e+00,-1.721730470657348633e+00,-1.899387985467910767e-01,-2.443583607673645020e-01,-1.282344937324523926e+00,2.939510047435760498e-01,6.867961287498474121e-01,-4.391098618507385254e-01,-1.761942386627197266e+00,-2.189548909664154053e-01,9.692506790161132812e-01,-1.777477413415908813e-01,6.800144314765930176e-01,-1.881202310323715210e-01,-1.903092414140701294e-01,1.475916206836700439e-01,-3.904991447925567627e-01,2.321613430976867676e-01,3.148935437202453613e-01,-4.011284708976745605e-01,-4.587068557739257812e-01,1.736937046051025391e+00,-6.047553420066833496e-01,-4.250345379114151001e-02,7.997153326869010925e-03,3.268855571746826172e+00,-7.922555208206176758e-01],
                        [-3.025298118591308594e-01,7.865415886044502258e-03,-4.392162431031465530e-03,-1.055394053459167480e+00,-1.329100251197814941e+00,-9.490849375724792480e-01,-9.115717411041259766e-01,1.796531230211257935e-01,-7.350075244903564453e-01,2.724664509296417236e-01,-7.214618921279907227e-01,1.438168138265609741e-01,9.683651924133300781e-01,-7.624205946922302246e-01,4.315667152404785156e-01,1.088227629661560059e+00,7.645120024681091309e-01,-1.198182106018066406e+00,3.882994651794433594e-01,4.378993809223175049e-01,-7.672294229269027710e-02,-1.262349963188171387e+00,-1.382669657468795776e-01,-1.227380514144897461e+00,1.333515763282775879e+00,7.534359097480773926e-01,-1.308068871498107910e+00,3.270340338349342346e-02,-1.864716410636901855e+00,-6.235370039939880371e-01],
                        [-1.304568529129028320e+00,1.215351343154907227e+00,-4.968372881412506104e-01,-1.570222735404968262e+00,8.553938269615173340e-01,4.314832389354705811e-01,3.892871141433715820e-01,6.721906065940856934e-01,1.359451889991760254e+00,-2.092722803354263306e-01,-8.261458873748779297e-01,-6.953395605087280273e-01,-1.315446734428405762e+00,-7.421772181987762451e-02,-1.886684656143188477e+00,-1.157686784863471985e-01,-1.342839598655700684e+00,-2.983814775943756104e-01,6.646182537078857422e-01,4.683180153369903564e-01,-1.073911264538764954e-01,-1.504789352416992188e+00,1.956405162811279297e+00,-4.099135696887969971e-01,-8.145748823881149292e-02,-1.916317224502563477e+00,6.130994558334350586e-01,-8.818198442459106445e-01,8.937503099441528320e-01,1.117609977722167969e+00],
                        [2.786654233932495117e-01,4.336069524288177490e-02,1.106979608535766602e+00,5.667747855186462402e-01,1.006115078926086426e-01,6.447251439094543457e-01,-2.373168230056762695e+00,6.402443051338195801e-01,2.130876302719116211e+00,-6.426383852958679199e-01,9.875060319900512695e-01,9.649057984352111816e-01,1.616099774837493896e-01,3.487862646579742432e-01,-1.766722679138183594e+00,-1.183084726333618164e+00,-4.019670486450195312e-01,1.563568413257598877e-01,2.591619729995727539e+00,-8.090927600860595703e-01,-1.772361993789672852e+00,-1.011996150016784668e+00,5.045127272605895996e-01,1.521497726440429688e+00,5.415512919425964355e-01,-2.603527903556823730e-01,-1.341320276260375977e+00,8.261306881904602051e-01,4.628993272781372070e-01,-4.446339607238769531e-01],
                        [1.304633021354675293e+00,-6.976674199104309082e-01,-9.821424484252929688e-01,-9.731617174111306667e-04,-1.345845818519592285e+00,-5.877920985221862793e-01,2.946343123912811279e-01,-1.002427697181701660e+00,1.809043288230895996e+00,3.819819539785385132e-03,6.659224033355712891e-01,-4.328474700450897217e-01,-1.342702805995941162e-01,-1.498627811670303345e-01,5.707158446311950684e-01,8.121308684349060059e-01,2.376269578933715820e+00,1.438157912343740463e-02,-1.061813607811927795e-01,-7.191972136497497559e-01,-1.169804930686950684e+00,6.942000985145568848e-01,1.958872824907302856e-01,-6.545026898384094238e-01,6.884635090827941895e-01,3.086079657077789307e-01,3.892544507980346680e-01,4.588001072406768799e-01,-5.995081663131713867e-01,-1.206130623817443848e+00],
                        [-1.035173892974853516e+00,1.703495740890502930e+00,-4.095066189765930176e-01,8.949390649795532227e-01,-4.689880311489105225e-01,-1.148402690887451172e+00,4.086948931217193604e-01,-7.987110018730163574e-01,1.607415676116943359e+00,-1.443926334381103516e+00,-6.157897040247917175e-02,-1.181962251663208008e+00,1.983129262924194336e+00,1.651948332786560059e+00,-3.029989302158355713e-01,-2.406767159700393677e-01,8.460762500762939453e-01,1.851432085037231445e+00,2.169149369001388550e-01,-5.893592908978462219e-02,-1.092600822448730469e+00,1.495396494865417480e+00,3.452169895172119141e-01,-1.027220010757446289e+00,1.505634665489196777e+00,-1.833525538444519043e+00,-5.656295418739318848e-01,-1.109891891479492188e+00,-9.904468655586242676e-01,-2.061783224344253540e-01],
                        [2.170364111661911011e-01,3.927435874938964844e-01,-1.200535655021667480e+00,-8.267434835433959961e-01,-1.981681704521179199e+00,7.770758271217346191e-01,-1.010768055915832520e+00,6.614968776702880859e-01,-1.256989955902099609e+00,3.469610810279846191e-01,1.788917630910873413e-01,-3.248811364173889160e-01,1.228378891944885254e+00,-1.075012445449829102e+00,-1.833941340446472168e-01,6.748408675193786621e-01,4.834337234497070312e-01,1.693794280290603638e-01,-6.527578085660934448e-02,1.327422913163900375e-02,-4.664031267166137695e-01,4.361774027347564697e-01,-2.777115702629089355e-01,-3.477541208267211914e-01,-4.684337377548217773e-01,1.002311229705810547e+00,-8.655887842178344727e-01,-9.298152327537536621e-01,1.302776336669921875e+00,-2.695642113685607910e-01],
                        [-6.317532658576965332e-01,1.976929605007171631e-01,-5.391137599945068359e-01,5.568992495536804199e-01,1.265973448753356934e+00,-1.285013914108276367e+00,1.061453819274902344e+00,5.672479271888732910e-01,1.635162830352783203e+00,1.419318914413452148e+00,4.817332029342651367e-01,-1.397324800491333008e+00,-2.851917780935764313e-02,5.841383337974548340e-01,-6.432054042816162109e-01,1.922135949134826660e+00,-8.876727223396301270e-01,8.378263115882873535e-01,4.749925434589385986e-01,-4.011290669441223145e-01,-2.792962454259395599e-02,8.345499634742736816e-01,1.592656731605529785e+00,-8.938143253326416016e-01,-2.730352804064750671e-02,7.255787253379821777e-01,2.578363716602325439e-01,1.039041519165039062e+00,1.708436161279678345e-01,-1.149520635604858398e+00],
                        [1.976171731948852539e+00,1.782817602157592773e+00,1.078158974647521973e+00,1.812304139137268066e+00,-4.355606138706207275e-01,6.090066432952880859e-01,1.347501482814550400e-02,5.569410324096679688e-01,1.333869338035583496e+00,1.127634644508361816e+00,-1.506703376770019531e+00,7.009015083312988281e-01,4.164458811283111572e-01,1.445900499820709229e-01,-5.316026806831359863e-01,2.156646966934204102e+00,1.423843145370483398e+00,-4.919443428516387939e-01,-1.183207273483276367e+00,9.398207664489746094e-01,-1.499222278594970703e+00,3.164290189743041992e-01,1.211911678314208984e+00,5.161714553833007812e-01,8.307470679283142090e-01,1.505211234092712402e+00,-1.227027893066406250e+00,3.740840852260589600e-01,-1.817237436771392822e-01,4.909663498401641846e-01],
                        [1.039147853851318359e+00,4.966233670711517334e-01,-1.544839859008789062e+00,1.156896591186523438e+00,1.340501546859741211e+00,-1.421290934085845947e-01,-3.487804830074310303e-01,-2.429863065481185913e-01,1.116747975349426270e+00,-7.581204175949096680e-01,-5.740416646003723145e-01,-1.274402856826782227e+00,5.183578133583068848e-01,6.003893539309501648e-02,6.354129314422607422e-01,7.236992120742797852e-01,2.044464945793151855e-01,-3.512266874313354492e-01,1.957379698753356934e+00,6.372408866882324219e-01,-9.193920493125915527e-01,1.422231674194335938e+00,-8.433128595352172852e-01,-1.181573033332824707e+00,-1.721045821905136108e-01,1.834444254636764526e-01,1.133856534957885742e+00,1.402056455612182617e+00,1.312359690666198730e+00,1.348205655813217163e-01],
                        [4.886729121208190918e-01,-1.283772587776184082e+00,1.946894407272338867e+00,-1.138614654541015625e+00,-1.330146431922912598e+00,-7.537230253219604492e-01,1.045369029045104980e+00,8.270179629325866699e-01,1.533280611038208008e+00,-7.257705926895141602e-01,-2.773270010948181152e-01,-2.036231011152267456e-01,-1.151778101921081543e+00,-1.150082468986511230e+00,6.759713292121887207e-01,7.450410723686218262e-01,1.812757611274719238e+00,2.525689005851745605e-01,2.724150121212005615e-01,-5.612595081329345703e-01,-4.794405400753021240e-01,-1.717156767845153809e+00,-6.567512154579162598e-01,-1.608690738677978516e+00,1.060145273804664612e-01,2.247531414031982422e+00,-2.181301862001419067e-01,-7.143240571022033691e-01,5.911670327186584473e-01,-1.214958190917968750e+00],
                        [3.011415600776672363e-01,4.278936088085174561e-01,4.755897819995880127e-01,-1.643956750631332397e-01,9.909673929214477539e-01,1.496083378791809082e+00,3.739561140537261963e-01,1.454168796539306641e+00,-8.133470267057418823e-02,-1.804722309112548828e+00,2.136106342077255249e-01,-6.420513987541198730e-01,-3.520146012306213379e-01,-2.205149503424763680e-03,8.528799414634704590e-01,9.447464346885681152e-02,-7.361561059951782227e-01,1.119999811053276062e-01,1.511708050966262817e-01,7.446409463882446289e-01,-7.202427387237548828e-01,6.684470176696777344e-02,-9.087060689926147461e-01,-8.564666658639907837e-02,-6.951985955238342285e-01,-8.312008380889892578e-01,1.272187352180480957e+00,1.875921785831451416e-01,-1.114614486694335938e+00,3.022473156452178955e-01],
                        [6.625654697418212891e-01,2.199762463569641113e-01,-4.687398672103881836e-01,1.043279170989990234e+00,5.150344371795654297e-01,6.088575720787048340e-01,3.515255451202392578e-01,-6.350750327110290527e-01,3.178842365741729736e-01,-2.801376283168792725e-01,-2.585057914257049561e-01,-1.012084364891052246e+00,-1.721631646156311035e+00,5.807678699493408203e-01,-1.340840905904769897e-01,-9.984884262084960938e-01,8.635735511779785156e-01,5.520577430725097656e-01,8.914431333541870117e-01,3.269042074680328369e-01,1.660018324851989746e+00,9.413974285125732422e-01,1.560689926147460938e+00,2.620927989482879639e-01,-2.122256994247436523e+00,1.822591304779052734e+00,1.491899728775024414e+00,-5.815400481224060059e-01,-8.876349329948425293e-01,-2.482224851846694946e-01],
                        [1.189371585845947266e+00,-5.552169308066368103e-02,9.096482396125793457e-02,2.507642507553100586e-01,1.406346440315246582e+00,-8.467931300401687622e-02,-1.669430136680603027e+00,1.025690734386444092e-01,-6.394343376159667969e-01,-2.367570251226425171e-01,1.253069519996643066e+00,1.133530065417289734e-01,-6.033248826861381531e-02,1.978723764419555664e+00,1.157538414001464844e+00,1.124652266502380371e+00,-3.985631465911865234e-01,1.070705175399780273e+00,4.271875321865081787e-01,1.307711839675903320e+00,-1.718911051750183105e+00,7.244907617568969727e-01,-7.864979505538940430e-01,1.282655149698257446e-01,-1.985668241977691650e-01,-6.633344292640686035e-01,-1.035528779029846191e+00,5.575038194656372070e-01,7.135310769081115723e-01,4.426229000091552734e-01],
                        [1.640345215797424316e+00,1.484604239463806152e+00,-1.310205340385437012e+00,1.463165760040283203e+00,2.529946863651275635e-01,-1.010525107383728027e+00,-2.013188004493713379e-01,1.044857978820800781e+00,1.758144050836563110e-01,1.379424691200256348e+00,2.536547482013702393e-01,8.245261013507843018e-02,-2.425860404968261719e+00,9.134035110473632812e-01,-1.480781912803649902e+00,6.693888902664184570e-01,-5.876173973083496094e-01,4.612823128700256348e-01,9.881549514830112457e-03,8.352619409561157227e-01,8.580598831176757812e-01,-9.382585287094116211e-01,5.690060257911682129e-01,1.622482657432556152e+00,-9.393697977066040039e-01,-3.968741893768310547e-01,-1.676120311021804810e-01,-3.350418508052825928e-01,1.478108882904052734e+00,-1.248114556074142456e-01],
                        [-7.992812991142272949e-01,2.643575891852378845e-02,-7.762081027030944824e-01,7.651125192642211914e-01,2.348359346389770508e+00,-1.160868048667907715e+00,5.020684599876403809e-01,2.635896503925323486e-01,9.061428904533386230e-01,-6.233071684837341309e-01,1.316576838493347168e+00,7.801653146743774414e-01,-8.739709109067916870e-02,2.507613658905029297e+00,3.401941061019897461e-01,-1.010847091674804688e-01,4.855355322360992432e-01,5.618462562561035156e-01,-1.360179305076599121e+00,-5.993058681488037109e-01,-2.256249040365219116e-01,2.658317685127258301e-01,-9.193102121353149414e-01,-2.134940475225448608e-01,-5.156989097595214844e-01,-8.251726627349853516e-01,-5.308118462562561035e-01,-9.411112666130065918e-01,-1.890911906957626343e-01,1.644129633903503418e+00],
                        [-1.018332093954086304e-01,2.536128461360931396e-01,1.097335219383239746e+00,4.648826718330383301e-01,-5.413046479225158691e-01,-2.078121453523635864e-01,3.636455833911895752e-01,-5.532997250556945801e-01,1.769492864608764648e+00,-9.594161510467529297e-01,3.432466685771942139e-01,4.062114655971527100e-01,1.152729868888854980e+00,2.090500146150588989e-01,1.422830820083618164e-01,3.011946678161621094e-01,3.305641561746597290e-02,1.629030585289001465e+00,1.400061726570129395e+00,-4.536759853363037109e-02,5.849173665046691895e-01,6.596619486808776855e-01,6.609131693840026855e-01,3.767361864447593689e-02,1.557588815689086914e+00,1.217177033424377441e+00,2.936158776283264160e-01,1.192433118820190430e+00,-1.150138303637504578e-01,-6.065790057182312012e-01],
                        [-3.383417725563049316e-01,-7.257989645004272461e-01,-5.971472263336181641e-01,1.135164499282836914e+00,-1.212912917137145996e+00,6.386579871177673340e-01,2.381902784109115601e-01,-4.527290165424346924e-01,3.731483221054077148e-02,1.083059236407279968e-01,-1.390579581260681152e+00,-3.442938029766082764e-01,8.267838954925537109e-01,-1.275580190122127533e-02,8.847455382347106934e-01,8.058100342750549316e-01,-2.162303328514099121e-01,-2.344443053007125854e-01,-1.035181134939193726e-01,-2.339322268962860107e-01,-7.899003028869628906e-01,-1.365945339202880859e+00,2.180267095565795898e+00,9.386406838893890381e-02,1.571067571640014648e-01,1.105102062225341797e+00,-1.504066586494445801e+00,1.641512036323547363e+00,5.534045696258544922e-01,8.659766316413879395e-01],
                        [9.229146838188171387e-01,-6.343145370483398438e-01,9.525817036628723145e-01,5.119085907936096191e-01,1.000211954116821289e+00,-7.817395329475402832e-01,7.305198907852172852e-02,-3.907580673694610596e-01,5.235230922698974609e-01,-6.785933971405029297e-01,-1.301306605339050293e+00,1.011551916599273682e-01,1.148476600646972656e-01,1.830706477165222168e+00,-8.907815217971801758e-01,5.547244548797607422e-01,-3.149088323116302490e-01,-2.104328721761703491e-01,1.102627754211425781e+00,1.111884019337594509e-03,-1.308874785900115967e-01,-3.291708230972290039e-01,4.162805676460266113e-01,6.358452141284942627e-02,6.331419944763183594e-01,3.281010389328002930e-01,-1.832291960716247559e+00,-5.350902304053306580e-02,-1.738189905881881714e-01,1.288747668266296387e+00],
                        [8.810251951217651367e-01,-4.891399145126342773e-01,1.597133725881576538e-01,-8.330304026603698730e-01,5.475857853889465332e-01,1.265310764312744141e+00,1.034702539443969727e+00,2.016142606735229492e+00,1.698244571685791016e+00,-3.172446787357330322e-01,4.937351346015930176e-01,1.466296195983886719e+00,1.687753319740295410e+00,1.047506570816040039e+00,-4.928800836205482483e-02,-4.280280470848083496e-01,-3.012448549270629883e-01,-2.588218450546264648e-02,-3.919228017330169678e-01,1.821477293968200684e+00,1.083455562591552734e+00,1.066725775599479675e-01,1.310144364833831787e-01,2.232444733381271362e-01,-1.201773047447204590e+00,1.129739999771118164e+00,-1.316078186035156250e+00,1.057318449020385742e+00,-7.660331577062606812e-02,-9.388246536254882812e-01],
                        [-4.773221164941787720e-02,1.395836710929870605e+00,3.536148965358734131e-01,-6.480606198310852051e-01,1.367193460464477539e+00,-1.335249066352844238e+00,8.042849898338317871e-01,1.104606747627258301e+00,5.534699559211730957e-01,-4.540857076644897461e-01,1.219789624214172363e+00,-1.671625077724456787e-01,9.604957699775695801e-01,-2.116679996252059937e-01,6.275421977043151855e-01,8.985041379928588867e-01,-1.296322345733642578e+00,-1.942120432853698730e+00,4.087548851966857910e-01,-3.786915242671966553e-01,4.658478796482086182e-01,-4.461363255977630615e-01,4.088566601276397705e-01,5.092032551765441895e-01,5.252746939659118652e-01,-7.983323335647583008e-01,-4.287563264369964600e-01,-6.131105422973632812e-01,-2.411779761314392090e-01,9.991919398307800293e-01],
                        [-1.980579458177089691e-02,6.621114015579223633e-01,-4.866977930068969727e-01,7.107738852500915527e-01,1.632831096649169922e+00,1.588332653045654297e-01,-6.718813180923461914e-01,1.601953506469726562e+00,-4.490943849086761475e-01,-2.431914061307907104e-01,-1.522996068000793457e+00,-2.181769609451293945e-01,-1.134193062782287598e+00,8.019950389862060547e-01,-4.479498863220214844e-01,1.038891434669494629e+00,1.968979686498641968e-01,8.482915163040161133e-01,-9.950412064790725708e-02,1.847993582487106323e-01,-7.221230864524841309e-01,9.621573686599731445e-01,-1.914144158363342285e+00,1.004854559898376465e+00,7.666313052177429199e-01,3.344149291515350342e-01,-2.066546306014060974e-02,-3.473701179027557373e-01,7.532156705856323242e-01,2.021741867065429688e+00],
                        [1.247479200363159180e+00,2.127035856246948242e+00,1.994031310081481934e+00,1.065319299697875977e+00,1.333717226982116699e+00,-3.356225490570068359e-01,-1.507382869720458984e+00,1.323136091232299805e-01,1.559606671333312988e+00,-1.285317301750183105e+00,5.319576859474182129e-01,1.159956336021423340e+00,-6.898680925369262695e-01,-5.260843038558959961e-01,2.021941900253295898e+00,-1.646004438400268555e+00,-8.453710675239562988e-01,-3.860906064510345459e-01,-1.577556729316711426e+00,-4.975019097328186035e-01,4.665013253688812256e-01,4.226999878883361816e-01,-1.240475699305534363e-01,4.042904451489448547e-02,5.199477672576904297e-01,2.972421407699584961e+00,2.858650684356689453e-01,2.129365354776382446e-01,-1.149163842201232910e+00,1.610565781593322754e-01],
                        [3.837976157665252686e-01,4.663725495338439941e-01,1.177916049957275391e+00,8.530600070953369141e-01,2.787283897399902344e+00,-5.376254916191101074e-01,-2.031642913818359375e+00,5.339016914367675781e-01,-1.144623160362243652e-01,1.656827449798583984e+00,-3.581824898719787598e-01,3.620274662971496582e-01,-1.703568994998931885e-01,2.440991163253784180e+00,-1.450538873672485352e+00,1.347988396883010864e-01,5.284364819526672363e-01,-3.447456359863281250e-01,7.593105435371398926e-01,-2.123534828424453735e-01,6.554558277130126953e-01,-5.485439300537109375e-01,-2.270099401473999023e+00,-7.758289575576782227e-01,-1.965602636337280273e-01,-4.465967044234275818e-02,1.071653738617897034e-01,-3.197456300258636475e-01,-8.640556335449218750e-01,1.811981320381164551e+00]
                    ]
            },
            {
                    "name":"outl",
                    "biases":[-2.144578844308853149e-01,-3.136215209960937500e-01,-1.404275417327880859e+00],
                    "weights":[
                        [-5.293058156967163086e-01,-2.716558873653411865e-01,-1.467654585838317871e+00],
                        [-5.559144075959920883e-03,-1.109869360923767090e+00,1.076136112213134766e+00],
                        [2.153799533843994141e+00,1.508126854896545410e-01,5.870038270950317383e-01],
                        [5.204829573631286621e-01,4.417796432971954346e-01,5.278607010841369629e-01],
                        [-7.446524500846862793e-01,-3.677404522895812988e-01,-1.244452953338623047e+00],
                        [6.852979660034179688e-01,-1.419881224632263184e+00,-1.409180164337158203e+00],
                        [1.698085665702819824e+00,-6.411080360412597656e-01,5.218569040298461914e-01],
                        [4.657857120037078857e-01,-6.050291061401367188e-01,3.105755150318145752e-01],
                        [-1.287163138389587402e+00,-3.584901615977287292e-02,-3.876960575580596924e-01],
                        [1.096642494201660156e+00,-3.540636226534843445e-02,-9.816574454307556152e-01],
                        [6.445079445838928223e-01,5.211774110794067383e-01,-6.103382706642150879e-01],
                        [-2.159499973058700562e-01,2.807064354419708252e-01,3.775441348552703857e-01],
                        [-4.865578114986419678e-01,-9.343181252479553223e-01,-6.572252511978149414e-01],
                        [1.185983538627624512e+00,1.722272634506225586e-01,7.783931493759155273e-01],
                        [6.970104575157165527e-01,4.051927924156188965e-01,-1.331107616424560547e-01],
                        [-6.373284459114074707e-01,1.137377500534057617e+00,-6.568991541862487793e-01],
                        [-5.982843041419982910e-01,4.158047139644622803e-01,-5.350835323333740234e-01],
                        [-3.405708670616149902e-01,4.302213490009307861e-01,-1.100727915763854980e+00],
                        [-1.068467497825622559e+00,2.489884346723556519e-01,1.051614522933959961e+00],
                        [-8.915695548057556152e-01,2.299801588058471680e+00,4.192845523357391357e-01],
                        [-2.685954570770263672e-01,-3.204131722450256348e-01,-8.153145909309387207e-01],
                        [7.866604626178741455e-02,9.318586587905883789e-01,-5.492054224014282227e-01],
                        [1.638848066329956055e+00,-2.998420298099517822e-01,3.072310984134674072e-01],
                        [9.013530015945434570e-01,4.061870574951171875e-01,1.173277497291564941e+00],
                        [6.759071350097656250e-01,8.254830241203308105e-01,3.760002255439758301e-01],
                        [-3.393973410129547119e-01,-1.159808874130249023e+00,4.617452323436737061e-01],
                        [3.904087841510772705e-01,-2.437257468700408936e-01,-1.119917154312133789e+00],
                        [-1.715868473052978516e+00,-4.480565786361694336e-01,8.163514137268066406e-01],
                        [3.271432965993881226e-02,1.604771316051483154e-01,-3.747794032096862793e-01],
                        [-4.941903427243232727e-02,-3.421517014503479004e-01,7.710577249526977539e-01]
                    ]
            }
        ]}

        var input = [eefPosN.x, eefPosN.y, eefPosN.z]
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


        var jointAngles = function(output){
            var bodyYawMin = -0.750000;
            var bodyYawMax = 0.750000;
            var rightLimbMin = -0.400000;
            var rightLimbMax = 1.100000;
            var rightForearmMin = -0.500000;
            var rightForearmMax = 0.500000;

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
