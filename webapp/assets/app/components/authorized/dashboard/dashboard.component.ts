import
{
    Component,
    OnInit,
    ElementRef
}
from '@angular/core';

import
{
    Router,
    ActivatedRoute
}
from '@angular/router';

///////////////////////////////////////////////////////////////////////////////

import
{
    AuthenticationService,
    UserService
}
from '../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class DashboardComponent implements OnInit
{
    constructor(private router: Router,
                private authenticationService: AuthenticationService,
                private userService: UserService,
                private elementRef: ElementRef)
    {
        if (this.authenticationService.getCurrentUser().hasRole('Administrator'))
        {
            this.router.navigate(['/admin-dashboard']);
        }
        else if (this.authenticationService.getCurrentUser().hasRole('Student'))
        {
            this.router.navigate(['/student-dashboard']);
        }
    }

    ngOnInit()
    {

    }

}
