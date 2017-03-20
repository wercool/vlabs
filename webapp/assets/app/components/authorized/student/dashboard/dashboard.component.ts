import
{
    Component,
    OnInit,
    ElementRef
}
from '@angular/core';

import
{
    AuthenticationService,
    UserService
}
from '../../../../services/index';

///////////////////////////////////////////////////////////////////////////////

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class StudentDashboardComponent implements OnInit
{
    constructor(private authenticationService: AuthenticationService,
                private elementRef: ElementRef)
    {
    }

    ngOnInit()
    {
    }

}
