import { Injectable }                                   from '@angular/core';
import { Http, Headers, RequestOptions, Response }      from '@angular/http';

import { Group }                                        from '../models/index';

import {
        AuthenticationService
       }                                                from './index';

@Injectable()
export class GroupService
{
    constructor(private http: Http, private authenticationService: AuthenticationService)
    {

    }

    getAll()
    {
        return this.http.get('/api/group', this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    create(group: Group)
    {
        return this.http.post('/api/group', group, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    update(group: Group)
    {
        return this.http.put('/api/group/' + group.id, group, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    getById(id: number)
    {
        return this.http.get('/api/group/' + id, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    getMemebers(id: number)
    {
        return this.http.get('/api/group/' + id + '/members', this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    excludeMemeberFromGroup(userId: number, groupId: number)
    {
        return this.http.delete('/api/group/exclude/' + groupId + '/' + userId, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    //no token required
    getByTitle(title: string)
    {
        return this.http.get('/api/group/' + title).map((response: Response) => response.json());
    }
}
