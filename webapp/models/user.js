'use strict';

var Sequelize = require('sequelize');

module.exports = function(sequelize)
{
    var User = sequelize.define(
        'User',
        {
            email:      Sequelize.STRING,
            password:   Sequelize.STRING,
            firstname:  Sequelize.STRING,
            lastname:   Sequelize.STRING,
            activated:  Sequelize.BOOLEAN
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['email']}]
        }
    );

    return User;
};
