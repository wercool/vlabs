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

@Component({
    moduleId: module.id,
    templateUrl: 'admin.messages.component.html',
    selector: 'admin-messages'
})

///////////////////////////////////////////////////////////////////////////////

export class AdminMessagesComponent implements OnInit
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
