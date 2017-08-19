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
            result = self.query("SELECT MIN(eefX), MAX(eefX), MIN(eefY), MAX(eefY), MIN(eefZ), MAX(eefZ) FROM rightArm")
            self.eefXMin = result[0][0]
            self.eefXMax = result[0][1]
            self.eefYMin = result[0][2]
            self.eefYMax = result[0][3]
            self.eefZMin = result[0][4]
            self.eefZMax = result[0][5]
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
        def getNormalizedX(self, value):
            eefXn = 2 * ((value - self.eefXMin) / (self.eefXMax - self.eefXMin)) - 1
            return eefXn
        def getNormalizedY(self, value):
            eefYn = 2 * ((value - self.eefYMin) / (self.eefYMax - self.eefYMin)) - 1
            return eefYn
        def getNormalizedZ(self, value):
            eefZn = 2 * ((value - self.eefZMin) / (self.eefZMax - self.eefZMin)) - 1
            return eefZn
        def getNormalizedInput(self, id):
            result = self.query("SELECT eefX, eefY, eefZ FROM rightArm WHERE id = %d" % (id))
            eefXn = self.getNormalizedX(result[0][0])
            eefYn = self.getNormalizedY(result[0][1])
            eefZn = self.getNormalizedZ(result[0][2])
            return (eefXn, eefYn, eefZn)
        def getBatch(self, size):
            normalizedBatch = []
            result = self.query("SELECT * FROM rightArm ORDER BY RAND() LIMIT %d" % (size))
            for row in result:
                sample = []
                sample.append(row[0])
                sample.append(self.getNormalizedX(row[1]))
                sample.append(self.getNormalizedY(row[2]))
                sample.append(self.getNormalizedZ(row[3]))
                sample.append(row[4])
                sample.append(row[5])
                sample.append(row[6])
                sample.append(row[7])
                sample.append(row[8])
                sample.append(row[9])
                normalizedBatch.append(sample)
            return normalizedBatch
        def getFullIKSpace(self):
            fullSet = []
            result = self.query("SELECT * FROM rightArm")
            for row in result:
                sample = []
                sample.append(row[0])
                sample.append(self.getNormalizedX(row[1]))
                sample.append(self.getNormalizedY(row[2]))
                sample.append(self.getNormalizedZ(row[3]))
                sample.append(row[4])
                sample.append(row[5])
                sample.append(row[6])
                sample.append(row[7])
                sample.append(row[8])
                sample.append(row[9])
                fullSet.append(sample)
            return fullSet
