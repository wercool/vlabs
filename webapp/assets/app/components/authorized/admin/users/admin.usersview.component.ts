import { Component, OnInit, ElementRef }    from '@angular/core';

import { User }                 from '../../../../models/index';
import { UserService }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.usersview.component.html'
})

export class AdminUsersViewComponent implements OnInit
{
    users: User[] = [];

    constructor(private userService: UserService, private elementRef: ElementRef)
    {

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
        });
    }

}
