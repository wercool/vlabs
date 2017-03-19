import { Component,
         OnInit,
         ElementRef,
         Input }                        from '@angular/core';

import { User,
         Role }                         from '../../../../models/index';
import { UserService,
         RoleService,
         AlertService,
         GlobalEventsManager }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.useredit.component.html',
    selector: 'admin-useredit',
    providers: [RoleService]
})

export class AdminUserEditComponent implements OnInit
{
    @Input() selectedUserId: number;

    currentUser: User;
    model: User = new User({Roles:[]});
    roles:Role[];
    loading = false;

    constructor(private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
                private roleService: RoleService,
                private elementRef: ElementRef,
                private alertService: AlertService)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
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
            this.alertService.success("Successfully Updated.", false, true);
            this.loading = false;
        });
    }

    cancel()
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-usersview'});
    }

}
