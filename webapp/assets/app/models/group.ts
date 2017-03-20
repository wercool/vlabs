export class Group {
    id: number;
    name: string;
    blocked: boolean;

    constructor(groupInfo:any)
    {
        this.id = groupInfo.id;
        this.name = groupInfo.name;
        this.blocked = groupInfo.blocked;
    }
}
