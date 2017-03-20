import { Component, OnInit, ElementRef, Input }    from '@angular/core';

import { User,
         Group }                        from '../../../../models/index';
import { GroupService,
         GlobalEventsManager,
         AlertService}                  from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.groupedit.component.html',
    selector: 'admin-groupedit',
    providers: [GroupService]
})

export class AdminGroupEditComponent implements OnInit
{
    @Input() selectedGroupId: number;

    currentUser: User;
    model: Group = new Group({});
    loading = false;

    constructor(private globalEventsManager: GlobalEventsManager,
                private groupService: GroupService,
                private elementRef: ElementRef,
                private alertService: AlertService)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
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
                this.model = group;
                this.loading = false;
            });
        }
    }

    cancel()
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-groupsview'});
    }

}
