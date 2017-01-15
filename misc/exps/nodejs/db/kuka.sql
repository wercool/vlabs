CREATE database kuka;
CREATE user 'kuka'@'localhost' IDENTIFIED BY 'q1w2e3r4t5';
GRANT ALL PRIVILEGES ON kuka.* TO 'kuka'@'localhost' WITH GRANT OPTION;
USE kuka;
DROP TABLE IF EXISTS ikxyz;
CREATE TABLE ikxyz
(
    x  DECIMAL(4, 2),
    y  DECIMAL(4, 2),
    z  DECIMAL(4, 2),
    l1 DECIMAL(4, 2),
    l2 DECIMAL(4, 2),
    l3 DECIMAL(4, 2),
    l4 DECIMAL(4, 2)
);
