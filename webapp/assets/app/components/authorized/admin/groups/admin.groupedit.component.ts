import
{
    Component,
    OnInit,
    ElementRef,
    Input
} from '@angular/core';

import
{
    Group,
    User
} from '../../../../models/index';

import
{
    AuthenticationService,
    GroupService,
    UserService,
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
    groupMembers: User[] = [];
    potentialGroupMembers: User[] = [];
    loading = false;

    constructor(private authenticationService: AuthenticationService,
                private globalEventsManager: GlobalEventsManager,
                private groupService: GroupService,
                private userService: UserService,
                private elementRef: ElementRef,
                private alertService: AlertService)
    {
    }

    ngOnInit()
    {
        this.loadGroup(this.selectedGroupId);
        this.loadGroupMemebers(this.selectedGroupId);
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

    loadGroupMemebers(groupId: number)
    {
        if (groupId != undefined)
        {
            this.groupService.getMemebers(groupId).subscribe(groupAndUsers => {
                this.groupMembers = groupAndUsers.Users;
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

    addMember()
    {
        var excludeUserIds:number[] = this.groupMembers.length > 0 ? [] : [0];
        for (var member of this.groupMembers)
        {
            excludeUserIds.push(member.id);
        }
        var excludeUserIds_stringified = excludeUserIds.join('-');
        this.userService.getAllExcept(excludeUserIds_stringified).subscribe(users => {
            this.potentialGroupMembers = users;
        });
    }

    addMemberToGroup(user:User)
    {
        this.groupService.addMemeberToGroup(user, this.model.id).subscribe(() => {
            this.potentialGroupMembers.splice(this.potentialGroupMembers.indexOf(user), 1);
            this.alertService.success("User [" + user.email + "] successfully added to the group " + this.model.name + ".", false, true);
            this.ngOnInit();
        });
    }

    excludeMember(user: User)
    {
        var scope = this;
        bootbox.confirm("Are you sure you want to exclude <b>"
                        + user.email + "</b> (" + user.firstname + " " + user.lastname + ")"
                        + " user from the group <b>" + scope.model.name + "</b>?" , function(ok){
            if (ok)
            {
                scope.groupService.excludeMemeberFromGroup(user.id, scope.model.id).subscribe(() => {
                    scope.alertService.success("User [" + user.email + "] successfully excluded.", false, true);
                    scope.ngOnInit();
                });
            }
        });
    }

    cancel()
    {
        this.globalEventsManager.showComponent.emit({componentName: 'admin-groupsview'});
    }

}
