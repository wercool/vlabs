import { Component, OnInit, ElementRef }    from '@angular/core';

import { User }                 from '../../../../models/index';
import { UserService }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.messages.component.html',
    selector: 'admin-messages'
})

export class AdminMessagesComponent implements OnInit
{
    currentUser: User;

    constructor(private userService: UserService, private elementRef: ElementRef)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    }

    ngOnInit()
    {

    }

}
