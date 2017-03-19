import { Component, OnInit, ElementRef }    from '@angular/core';

import { User }                             from '../../../../models/index';
import { UserService,
         GlobalEventsManager}               from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.usersview.component.html',
    selector: 'admin-usersview'
})

export class AdminUsersViewComponent implements OnInit
{
    currentUser: User;
    users: User[] = [];

    constructor(private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
                private elementRef: ElementRef)
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
        });
    }

    public editUser(id)
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-useredit', selectedUserId: id});
    }

    public blockUser(id)
    {
        console.log('block user ', id);
    }

    public activateUser(id)
    {
        console.log('activate user', id);
    }
}
