'use strict';

var Sequelize = require('sequelize');

module.exports = function(sequelize)
{
    var Role = sequelize.define(
        'Role',
        {
            title:      Sequelize.STRING
        },
        {
            timestamps: false
        }
    );

    return Role;
};
