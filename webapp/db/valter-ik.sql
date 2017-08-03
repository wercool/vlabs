DROP DATABASE IF EXISTS valterik;
CREATE DATABASE valterik;
CREATE USER 'valterik'@'localhost' IDENTIFIED BY 'valterik';
GRANT ALL PRIVILEGES ON valterik.* TO 'valterik'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;

DROP TABLE IF EXISTS rightArm;
CREATE TABLE rightArm
(
    id INT(11) NOT NULL AUTO_INCREMENT,
    eefX  DOUBLE(5,3),
    eefY  DOUBLE(5,3),
    eefZ  DOUBLE(5,3),
    bodyYaw  DOUBLE(5,3),
    bodyTilt DOUBLE(5,3),
    rightLimb  DOUBLE(5,3),
    rightForearm  DOUBLE(5,3),
    rightShoulder  DOUBLE(5,3),
    rightArm  DOUBLE(5,3),
    PRIMARY KEY (`id`)
);
