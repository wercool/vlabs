import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AlertService, UserService, RoleService } from '../../../services/index';
import { User, Role }                             from '../../../models/index';

@Component({
    moduleId: module.id,
    templateUrl: 'register.component.html',
    providers: [RoleService]
})

export class RegisterComponent {
    model: User = new User({Roles:[]});
    loading = false;

    constructor(private router: Router,
                private userService: UserService,
                private alertService: AlertService,
                private roleService: RoleService)
    {
        this.roleService.getByTitle('Student').subscribe(role => {
             this.model.Roles.push(role);
             this.model.activated = false;
             this.model.blocked = false;
         });
    }

    register()
    {
        this.loading = true;
        this.userService.create(this.model)
            .subscribe(
                data => {
                    if (!data.success)
                    {
                        this.alertService.error(data.message);
                        this.loading = false;
                    }
                    else
                    {
                        this.alertService.success('Registration successful. You will be informed once your registration request will be confirmed by VLabs team.', true);
                        this.router.navigate(['/login']);
                    }
                },
                error => {
                    this.alertService.error(error);
                    this.loading = false;
                });
    }
}
