import
{
    Component,
    OnInit,
    ElementRef,
    Input
}
from '@angular/core';

import {
    User,
    Role
}
from '../../../../models/index';

import
{
    AuthenticationService,
    UserService,
    RoleService,
    AlertService,
    GlobalEventsManager
}
from '../../../../services/index';

///////////////////////////////////////////////////////////////////////////////

@Component({
    moduleId: module.id,
    templateUrl: 'admin.useredit.component.html',
    selector: 'admin-useredit',
    providers: [RoleService]
})

export class AdminUserEditComponent implements OnInit
{
    @Input() selectedUserId: number;

    model: User = new User({Roles:[]});
    roles:Role[];
    loading = false;

    constructor(private authenticationService: AuthenticationService,
                private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
                private roleService: RoleService,
                private elementRef: ElementRef,
                private alertService: AlertService)
    {
    }

    ngOnInit()
    {
        this.loadUser(this.selectedUserId);
    }

    loadUser(id)
    {
        this.loading = true;
        this.userService.getById(id).subscribe(user => {
            this.model = new User(user);
            this.roleService.getAll().subscribe(roles => {
                this.roles = roles;
                this.loading = false;
            });
        });
    }

    updateUser()
    {
        this.loading = true;
        this.userService.update(this.model).subscribe(user => {
            this.alertService.success("Successfully updated.", false, true);
            this.loading = false;
        });
    }

    addRole(role: Role)
    {
        this.loading = true;
        this.roleService.addRoleToUser(role.id, this.model.id).subscribe(user => {
            this.alertService.success("User role [" + role.title + "] has been successfully added.", false, true);
            this.loading = false;
            this.loadUser(this.model.id);
        });
    }

    removeRole(role: Role)
    {
        this.loading = true;
        this.roleService.removeRoleFromUser(role.id, this.model.id).subscribe(() => {
            this.alertService.success("User role [" + role.title + "] has been successfully removed", false, true);
            this.loading = false;
            this.loadUser(this.model.id);
        });
    }

    cancel()
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-usersview'});
    }

}
