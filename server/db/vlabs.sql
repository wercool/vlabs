CREATE database vlabs;
CREATE user 'vlabs'@'localhost' IDENTIFIED BY 'vlabs';
GRANT ALL PRIVILEGES ON vlabs.* TO 'vlabs'@'localhost' WITH GRANT OPTION;
USE vlabs;
