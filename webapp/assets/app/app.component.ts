import { Component } from '@angular/core';

import {
        AlertService,
        AuthenticationService
       }                                       from './services/index';

import { User, Role }                             from './models/index';

@Component({
    moduleId: module.id,
    selector: 'vlabs-app',
    templateUrl: 'app.component.html'
})

export class AppComponent
{
    constructor( private authenticationService: AuthenticationService,
                 private alertService: AlertService)
    {

    }
}
