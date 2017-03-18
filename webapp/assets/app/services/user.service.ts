import { Injectable }                                   from '@angular/core';
import { Http, Headers, RequestOptions, Response }      from '@angular/http';

import { User }                                         from '../models/index';

import {
        AuthenticationService
       }                                                from './index';

@Injectable()
export class UserService
{
    constructor(private http: Http, private authenticationService: AuthenticationService)
    {

    }

    getAll()
    {
        return this.http.get('/api/user', this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    getById(id: number)
    {
        return this.http.get('/api/user/' + id, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    create(user: User)
    {
        return this.http.post('/api/user/register', user, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    update(user: User)
    {
        return this.http.put('/api/user/' + user.id, user, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    delete(id: number)
    {
        return this.http.delete('/api/user/' + id, this.authenticationService.jwt()).map((response: Response) => response.json());
    }

}
