import { Component, OnInit, ElementRef }    from '@angular/core';

import { User }                       from '../../../../models/index';
import { UserService }                from '../../../../services/index';
import { AdminUsersViewComponent }    from '../users/index';

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class AdminDashboardComponent implements OnInit
{
    currentUser: User;
    users: User[] = [];
    notActivatedYetUsersNumber: number = 0;

    constructor(private userService: UserService, private elementRef: ElementRef)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    }

    ngOnInit()
    {
        this.loadAllUsers();
    }

    deleteUser(id: number)
    {
        this.userService.delete(id).subscribe(() => { this.loadAllUsers() });
    }

    private loadAllUsers()
    {
        this.userService.getAll().subscribe(users => {
            this.users = users;
            for (let user of this.users)
            {
                user = new User(user);
                if (!user.isActive() && !user.isBlocked())
                {
                    this.notActivatedYetUsersNumber++;
                }
            }
        });
    }

}
