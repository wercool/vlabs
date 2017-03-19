import { Component,
         OnInit,
         ElementRef,
         Input }                        from '@angular/core';

import { User }                         from '../../../../models/index';
import { UserService,
         AlertService,
         GlobalEventsManager }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.useredit.component.html',
    selector: 'admin-useredit'
})

export class AdminUserEditComponent implements OnInit
{
    currentUser: User;
    @Input() selectedUserId: number;
    model: User = new User({Roles:[]});
    loading = false;

    constructor(private globalEventsManager: GlobalEventsManager,
                private userService: UserService,
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
            this.model = user;
            this.loading = false;
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
