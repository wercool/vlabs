﻿import
{
    Component,
    OnInit,
    ElementRef
}
from '@angular/core';

import
{
    User
}
from '../../../../models/index';

import
{
    AuthenticationService,
    UserService,
    GlobalEventsManager
}
from '../../../../services/index';

import
{
    AdminUsersViewComponent
}
from '../users/index';

///////////////////////////////////////////////////////////////////////////////

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class AdminDashboardComponent implements OnInit
{
    users: User[] = [];
    notActivatedYetUsersNumber: number = 0;
    selectedView: string = "";
    selectedUserId:number = 0;
    selectedGroupId:number = 0;

    constructor(private authenticationService: AuthenticationService,
                private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
                private elementRef: ElementRef)
    {
        this.setViewContainerComponent('admin-messages');

        this.globalEventsManager.showComponent.subscribe(data => {
            this.setViewContainerComponent(data.componentName);
            this.selectedUserId = data.selectedUserId;
            this.selectedGroupId = data.selectedGroupId;
        });
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

    public setViewContainerComponent(componentSelector: string )
    {
        this.selectedView = componentSelector;
    }
}
