import { Component, OnInit }                   from '@angular/core';
import { Router, ActivatedRoute }              from '@angular/router';

import {
        AlertService,
        AuthenticationService
       }                                       from '../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'login.component.html'
})

export class LoginComponent implements OnInit {
    model: any = {};
    loading = false;
    returnUrl: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authenticationService: AuthenticationService,
        private alertService: AlertService) { }

    ngOnInit()
    {
        // reset login status
        this.authenticationService.logout();

        // get return url from route parameters or default to '/dashboard'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    }

    login() {
        this.loading = true;
        this.authenticationService.login(this.model.email, this.model.password)
            .subscribe(
                data => {
                    if (!this.authenticationService.isAuthenticated())
                    {
                        this.alertService.error("Authentication failed. Check you email and password.");
                    }
                    else
                    {
                        if (this.authenticationService.getCurrentUser().isActive())
                        {
                            if (!this.authenticationService.getCurrentUser().isBlocked())
                            {
                                this.router.navigate(['/dashboard']);
                            }
                            else
                            {
                                this.authenticationService.logout();
                                this.alertService.error("Authentication failed. You account has been blocked.");
                            }
                        }
                        else
                        {
                            this.authenticationService.logout();
                            this.alertService.error("Authentication failed. You account has not been activated yet.");
                        }
                    }
                    this.loading = false;
                },
                error => {
                    this.alertService.error(error);
                    this.loading = false;
                });
    }
}
