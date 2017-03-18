import { Component, OnInit, ElementRef }    from '@angular/core';
import { Router, ActivatedRoute }           from '@angular/router';

import { User }                 from '../../../models/index';
import { UserService }          from '../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class DashboardComponent implements OnInit
{
    currentUser: User;

    constructor(private router: Router, private userService: UserService, private elementRef: ElementRef)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));

        if (this.currentUser.hasRole('Administrator'))
        {
            this.router.navigate(['/admin-dashboard']);
        }
        else if (this.currentUser.hasRole('Student'))
        {
            this.router.navigate(['/student-dashboard']);
        }
    }

    ngOnInit()
    {

    }

}
