module.exports = function(sequelize)
{
    var model = require("../models/user")(sequelize);
    console.log(model);
    /*
    var User  = model.User;
    return
    {
        var findAll = function()
        {
            User.findAll().success(function (users) {
                console.log("!!!!!");
            });
        }
    };
    */
};
