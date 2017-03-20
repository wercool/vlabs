import { Component, OnInit, ElementRef }    from '@angular/core';

import { User,
         Group }                        from '../../../../models/index';
import { GroupService,
         GlobalEventsManager }          from '../../../../services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'admin.groupsview.component.html',
    selector: 'admin-groupsview',
    providers: [GroupService]
})

export class AdminGroupsViewComponent implements OnInit
{
    currentUser: User;
    groups: Group[] = [];

    constructor(private globalEventsManager: GlobalEventsManager,
                private groupService: GroupService,
                private elementRef: ElementRef)
    {
        this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    }

    ngOnInit()
    {
        this.loadAllGroups();
    }

    loadAllGroups()
    {
        this.groupService.getAll().subscribe(groups => {
            this.groups = groups;
        });
    }

    editGroup(id: number)
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-groupedit', selectedGroupId: id});
    }

    blockGroup(group: Group)
    {
        var scope = this;
        bootbox.confirm("Are you sure you want to " + (group.blocked ? "unblock" : "block") + " the group <b>" + group.name + "</b>" , function(ok){
            if (ok)
            {
                group.blocked = !group.blocked;
                scope.groupService.update(group).subscribe(group => {
                    this.group = group;
                });
            }
        });
    }
}
