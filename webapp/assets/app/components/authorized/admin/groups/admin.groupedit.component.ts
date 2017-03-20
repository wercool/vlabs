import
{
    Component,
    OnInit,
    ElementRef,
    Input
} from '@angular/core';

import
{
    Group
} from '../../../../models/index';

import
{
    AuthenticationService,
    GroupService,
    GlobalEventsManager,
    AlertService
}
from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.groupedit.component.html',
    selector: 'admin-groupedit',
    providers: [GroupService]
})

///////////////////////////////////////////////////////////////////////////////

export class AdminGroupEditComponent implements OnInit
{
    @Input() selectedGroupId: number;

    model: Group = new Group({});
    loading = false;

    constructor(private authenticationService: AuthenticationService,
                private globalEventsManager: GlobalEventsManager,
                private groupService: GroupService,
                private elementRef: ElementRef,
                private alertService: AlertService)
    {
    }

    ngOnInit()
    {
        this.loadGroup(this.selectedGroupId);
    }

    loadGroup(groupId: number)
    {
        if (groupId != undefined)
        {
            this.groupService.getById(groupId).subscribe(group => {
                this.model = new Group(group);
            });
        }
    }

    updateGroup()
    {
        this.loading = true;
        if (this.selectedGroupId != undefined)
        {
            this.groupService.update(this.model).subscribe(group => {
                this.alertService.success("Successfully updated.", false, true);
                this.loading = false;
            });
        }
        //create new group
        else
        {
            this.groupService.create(this.model).subscribe(group => {
                this.alertService.success("Group [" + this.model.name + "] successfully created.", false, true);
                this.globalEventsManager.showComponent.emit({componentName: 'admin-groupsview'});
                this.loading = false;
            });
        }
    }

    cancel()
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-groupsview'});
    }

}
