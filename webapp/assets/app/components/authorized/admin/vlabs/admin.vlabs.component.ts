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
    templateUrl: 'admin.vlabs.component.html',
    selector: 'admin-vlabs'
})

export class AdminVLabsComponent implements OnInit
{
    constructor(private authenticationService: AuthenticationService,
                private userService: UserService,
                private elementRef: ElementRef)
    {
    }

    ngOnInit()
    {

    }

}
