import { Component, OnInit, ElementRef }    from '@angular/core';

import { User }                 from '../../../../models/index';
import { UserService }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class StudentDashboardComponent implements OnInit
{
    currentUser: User;

    constructor(private elementRef: ElementRef)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    }

    ngOnInit()
    {
    }

}
