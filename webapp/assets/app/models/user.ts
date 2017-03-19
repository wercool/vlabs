import { Role }                 from './index';

export class User {
    id: number;
    email: string;
    password: string;
    firstname: string;
    lastname: string;
    Roles: Role[];
    activated: boolean;
    blocked: boolean;

    constructor(userInfo:any)
    {
        this.id = userInfo.id;
        this.email = userInfo.email;
        this.password = userInfo.password;
        this.firstname = userInfo.firstname;
        this.lastname = userInfo.lastname;
        this.Roles = userInfo.Roles;
        this.activated = userInfo.activated;
        this.blocked = userInfo.blocked;
    }

    hasRole(roleTitle:string)
    {
        for (let role of this.Roles)
        {
            if (role.title == roleTitle)
            {
                return true;
            }
        }
        return false;
    }

    isActive()
    {
        return this.activated;
    }

    isBlocked()
    {
        return this.blocked;
    }
}
