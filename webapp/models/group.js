'use strict';

var Sequelize = require('sequelize');

module.exports = function(sequelize)
{
    var Group = sequelize.define(
        'Group',
        {
            name:      Sequelize.STRING,
            blocked:    Sequelize.BOOLEAN
        },
        {
            timestamps: false
        }
    );

    return Group;
};
