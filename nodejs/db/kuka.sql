CREATE database kuka;
CREATE user 'kuka'@'localhost' IDENTIFIED BY 'q1w2e3r4t5';
GRANT ALL PRIVILEGES ON kuka.* TO 'kuka'@'localhost' WITH GRANT OPTION;

CREATE TABLE ikxyz
(
    x float,
    y float,
    z float,
    l1 float,
    l2 float,
    l3 float,
    l4 float
)
