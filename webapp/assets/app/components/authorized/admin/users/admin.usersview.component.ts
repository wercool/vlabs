import
{
    Component,
    OnInit,
    ElementRef
} from '@angular/core';

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

///////////////////////////////////////////////////////////////////////////////

@Component({
    moduleId: module.id,
    templateUrl: 'admin.usersview.component.html',
    selector: 'admin-usersview'
})

export class AdminUsersViewComponent implements OnInit
{
    users: User[] = [];

    constructor(private authenticationService: AuthenticationService,
                private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
                private elementRef: ElementRef)
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

    editUser(id: number)
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-useredit', selectedUserId: id});
    }

    blockUser(user: User)
    {
        var scope = this;
        bootbox.confirm("Are you sure you want to " + (user.blocked ? "unblock" : "block") + " the user <b>" + user.email + "</b>" , function(ok){
            if (ok)
            {
                user.blocked = !user.blocked;
                scope.userService.update(user).subscribe(user => {
                });
            }
        });
    }

    activateUser(user: User)
    {
        // var target = event.target || event.srcElement || event.currentTarget;
        // $(target).hide();
        var scope = this;
        bootbox.confirm("Are you sure you want to activate the user <b>" + user.email + "</b>" , function(ok){
            if (ok)
            {
                user.activated = !user.activated;
                scope.userService.update(user).subscribe(user => {
                });
            }
        });
    }
}
