"use strict";
var router_1 = require("@angular/router");
var index_1 = require("./home/index");
var index_2 = require("./about/index");
var index_3 = require("./contact/index");
var index_4 = require("./login/index");
var index_5 = require("./register/index");
var index_6 = require("./dashboard/index");
var index_7 = require("./_guards/index");
var appRoutes = [
    { path: '', component: index_1.HomeComponent },
    { path: 'about', component: index_2.AboutComponent },
    { path: 'contact', component: index_3.ContactComponent },
    { path: 'dashboard', component: index_6.DashboardComponent, canActivate: [index_7.AuthGuard] },
    { path: 'login', component: index_4.LoginComponent },
    { path: 'register', component: index_5.RegisterComponent },
    // otherwise redirect to home
    { path: '**', redirectTo: '' }
];
exports.routing = router_1.RouterModule.forRoot(appRoutes);
//# sourceMappingURL=app.routing.js.map