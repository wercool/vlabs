'use strict';

var Sequelize = require('sequelize');

module.exports = function(sequelize)
{
    var User = sequelize.define(
        'User',
        {
            username:   Sequelize.STRING,
            password:   Sequelize.STRING,
            firstname:  Sequelize.STRING,
            lastname:   Sequelize.STRING,
            email:      Sequelize.STRING
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['email']}]
        }
    );

    return User;
};
