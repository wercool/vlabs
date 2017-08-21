from valterikdb import ValterIKDB

"""
select count(*) from rightArm;
select count(DISTINCT eefX, eefY, eefZ) from rightArm;
create table tmp like rightArm;
ALTER TABLE tmp ADD UNIQUE INDEX(eefX, eefY, eefZ);
insert IGNORE into tmp select * from rightArm;
delete from rightArm where id not in ( select id from tmp);
select count(*) from rightArm;
select count(DISTINCT eefX, eefY, eefZ) from rightArm;
"""


valterIKDB = ValterIKDB('')
valterIKDB.dbConnect()

step = 0

distance = 0.2

while True:
    result = valterIKDB.query("SELECT * FROM rightArm ORDER BY id DESC LIMIT %d, 1" % step)
    if result:
        eefX = float(result[0][1])
        eefY = float(result[0][2])
        eefZ = float(result[0][3])

        eefXn = eefX - distance
        eefXp = eefX + distance
        eefYn = eefY - distance
        eefYp = eefY + distance
        eefZn = eefZ - distance
        eefZp = eefZ + distance

        sql = "SELECT id FROM rightArm WHERE eefX > %f AND eefX < %f AND eefY > %f AND eefY < %f AND eefZ > %f AND eefZ < %f ORDER BY bodyYaw, bodyTilt, rightLimb, rightForearm, rightShoulder, rightArm LIMIT 1, 100000" % (eefXn, eefXp, eefYn, eefYp, eefZn, eefZp)
        result = valterIKDB.query(sql)
        idToDelete = []
        for row in result:
            idToDelete.append(row[0])
        print "selected length: %d" % len(idToDelete)
        if len(idToDelete) > 0:
            idToDeleteStr = ", ".join(map(str, idToDelete))
            sql = "DELETE FROM rightArm WHERE id IN (%s)" % idToDeleteStr
            valterIKDB.query(sql)
            valterIKDB.commit()
        step = step + 1
    else:
        break