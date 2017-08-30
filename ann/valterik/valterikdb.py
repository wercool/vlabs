import MySQLdb

class ValterIKDB:
    instance = None

    def __init__(self, arg):
        if not ValterIKDB.instance:
            ValterIKDB.instance = ValterIKDB.__ValterIKDB(arg)
        else:
            ValterIKDB.instance.val = arg
    def __getattr__(self, name):
        return getattr(self.instance, name)

    class __ValterIKDB:
        def __init__(self, arg):
            self.val = arg
            self.db = None
            self.cur = None # Cursor object. It will let execute all the queries you need

            self.eefXMin = None
            self.eefXMax = None

            self.eefYMin = None
            self.eefYMax = None

            self.eefZMin = None
            self.eefZMax = None

            self.bodyYawMin = None
            self.bodyYawMax = None

            self.bodyTiltMin = None
            self.bodyTiltMax = None

            self.rightLimbMin = None
            self.rightLimbMax = None

            self.rightForearmMin = None
            self.rightForearmMax = None

            self.rightShoulderMin = None
            self.rightShoulderMax = None

            self.rightArmMin = None
            self.rightArmMax = None

        def __str__(self):
            return repr(self) + self.val
        def dbConnect(self):
            self.db = MySQLdb.connect(host="localhost", user="valterik", passwd="valterik", db="valterik")
            self.cur = self.db.cursor()
        def dbConnClose(self):
            self.db.close()
        def query(self, queryStr):
            self.cur.execute(queryStr)
            return self.cur.fetchall()
        def commit(self):
            self.db.commit()
        def retrieveBounds(self):
            result = self.query("""SELECT MIN(eefX), MAX(eefX), 
                                          MIN(eefY), MAX(eefY), 
                                          MIN(eefZ), MAX(eefZ),
                                          MIN(bodyYaw), MAX(bodyYaw),
                                          MIN(bodyTilt), MAX(bodyTilt),
                                          MIN(rightLimb), MAX(rightLimb),
                                          MIN(rightForearm), MAX(rightForearm),
                                          MIN(rightShoulder), MAX(rightShoulder),
                                          MIN(rightArm), MAX(rightArm) FROM rightArm""")
            self.eefXMin = result[0][0]
            self.eefXMax = result[0][1]

            self.eefYMin = result[0][2]
            self.eefYMax = result[0][3]

            self.eefZMin = result[0][4]
            self.eefZMax = result[0][5]

            self.bodyYawMin = result[0][6]
            self.bodyYawMax = result[0][7]

            self.bodyTiltMin = result[0][8]
            self.bodyTiltMax = result[0][9]

            self.rightLimbMin = result[0][10]
            self.rightLimbMax = result[0][11]

            self.rightForearmMin = result[0][12]
            self.rightForearmMax = result[0][13]

            self.rightShoulderMin = result[0][14]
            self.rightShoulderMax = result[0][15]

            self.rightArmMin = result[0][16]
            self.rightArmMax = result[0][17]

        def setBounds(self, boudns):
            self.eefXMin = boudns[0]
            self.eefXMax = boudns[1]
            self.eefYMin = boudns[2]
            self.eefYMax = boudns[3]
            self.eefZMin = boudns[4]
            self.eefZMax = boudns[5]
        def printBounds(self):
            print "EEF coordinate bounds"
            print "eefX [%f, %f]" % (self.eefXMin, self.eefXMax)
            print "eefY [%f, %f]" % (self.eefYMin, self.eefYMax)
            print "eefZ [%f, %f]" % (self.eefZMin, self.eefZMax)
            print "bodyYaw [%f, %f]" % (self.bodyYawMin, self.bodyYawMax)
            print "bodyTilt [%f, %f]" % (self.bodyTiltMin, self.bodyTiltMax)
            print "rightLimb [%f, %f]" % (self.rightLimbMin, self.rightLimbMax)
            print "rightForearm [%f, %f]" % (self.rightForearmMin, self.rightForearmMax)
            print "rightShoulder [%f, %f]" % (self.rightShoulderMin, self.rightShoulderMax)
            print "rightArm [%f, %f]" % (self.rightArmMin, self.rightArmMax)
        # http://neuronus.com/theory/931-sposoby-normalizatsii-peremennykh.html
        def getNormalizedX(self, value):
            eefXn = 2 * ((value - self.eefXMin) / (self.eefXMax - self.eefXMin)) - 1
            return eefXn
        def getNormalizedY(self, value):
            eefYn = 2 * ((value - self.eefYMin) / (self.eefYMax - self.eefYMin)) - 1
            return eefYn
        def getNormalizedZ(self, value):
            eefZn = 2 * ((value - self.eefZMin) / (self.eefZMax - self.eefZMin)) - 1
            return eefZn
        def getNormalizedBodyYaw(self, value):
            bodyYawn = 2 * ((value - self.bodyYawMin) / (self.bodyYawMax - self.bodyYawMin)) - 1
            return bodyYawn
        def getNormalizedBodyTilt(self, value):
            bodyTiltn = 2 * ((value - self.bodyTiltMin) / (self.bodyTiltMax - self.bodyTiltMin)) - 1
            return bodyTiltn
        def getNormalizedRightLimb(self, value):
            rightLimbn = 2 * ((value - self.rightLimbMin) / (self.rightLimbMax - self.rightLimbMin)) - 1
            return rightLimbn
        def getNormalizedRightForearm(self, value):
            rightForearmn = 2 * ((value - self.rightForearmMin) / (self.rightForearmMax - self.rightForearmMin)) - 1
            return rightForearmn
        def getNormalizedRightShoulder(self, value):
            rightShouldern = 2 * ((value - self.rightShoulderMin) / (self.rightShoulderMax - self.rightShoulderMin)) - 1
            return rightShouldern
        def getNormalizedRightArm(self, value):
            rightArmn = 2 * ((value - self.rightArmMin) / (self.rightArmMax - self.rightArmMin)) - 1
            return rightArmn
        def getNormalizedInput(self, id):
            result = self.query("SELECT eefX, eefY, eefZ, bodyYaw, bodyTilt, rightLimb, rightForearm, rightShoulder, rightArm FROM rightArm WHERE id = %d" % (id))
            eefXn           = self.getNormalizedX(result[0][0])
            eefYn           = self.getNormalizedY(result[0][1])
            eefZn           = self.getNormalizedZ(result[0][2])
            bodyYawn        = self.getNormalizedBodyYaw(result[0][3])
            bodyTiltn       = 0 #self.getNormalizedBodyTilt(result[0][4])
            rightLimbn      = self.getNormalizedRightLimb(result[0][5])
            rightForearmn   = self.getNormalizedRightForearm(result[0][6])
            rightShouldern  = 0 #self.getNormalizedRightShoulder(result[0][7])
            rightArmn       = 0 #self.getNormalizedRightArm(result[0][8])
            return (eefXn, eefYn, eefZn, bodyYawn, bodyTiltn, rightLimbn, rightForearmn, rightShouldern, rightArmn)
        def getBatch(self, size):
            normalizedBatch = []
            result = self.query("SELECT * FROM rightArm ORDER BY RAND() LIMIT %d" % (size))
            for row in result:
                sample = []
                sample.append(row[0])
                sample.append(self.getNormalizedX(row[1]))
                sample.append(self.getNormalizedY(row[2]))
                sample.append(self.getNormalizedZ(row[3]))
                sample.append(self.getNormalizedBodyYaw(row[4]))
                sample.append(self.getNormalizedBodyTilt(row[5]))
                sample.append(self.getNormalizedRightLimb(row[6]))
                sample.append(self.getNormalizedRightForearm(row[7]))
                sample.append(self.getNormalizedRightShoulder(row[8]))
                sample.append(self.getNormalizedRightArm(row[9]))
                normalizedBatch.append(sample)
            return normalizedBatch
        # def getFullIKSpace(self):
        #     fullSet = []
        #     result = self.query("SELECT * FROM rightArm")
        #     for row in result:
        #         sample = []
        #         sample.append(row[0])
        #         sample.append(self.getNormalizedX(row[1]))
        #         sample.append(self.getNormalizedY(row[2]))
        #         sample.append(self.getNormalizedZ(row[3]))
        #         sample.append(self.getNormalizedBodyYaw(row[4]))
        #         # sample.append(self.getNormalizedBodyTilt(row[5]))
        #         sample.append(self.getNormalizedRightLimb(row[6]))
        #         sample.append(self.getNormalizedRightForearm(row[7]))
        #         # sample.append(self.getNormalizedRightShoulder(row[8]))
        #         # sample.append(self.getNormalizedRightArm(row[9]))
        #         fullSet.append(sample)
        #     return fullSet

        def getFullIKSpace(self):
            fullSet = []
            result = self.query("SELECT * FROM rightArm")
            for row in result:
                sample = []
                sample.append(row[0])   # id
                sample.append(row[1])   # eefX
                sample.append(row[2])   # eefY
                sample.append(row[3])   # eefZ
                sample.append(row[4])   # bodyYaw
                sample.append(row[5])   # bodyTilt
                sample.append(row[6])   # rightLimb
                sample.append(row[7])   # rightForearm
                sample.append(row[8])   # rightShoulder
                # sample.append(row[9])
                fullSet.append(sample)
            return fullSet
