import { Injectable }                                   from '@angular/core';
import { Http, Headers, RequestOptions, Response }      from '@angular/http';

import {
        AuthenticationService
       }                                                from './index';

@Injectable()
export class RoleService {
    constructor(private http: Http, private authenticationService: AuthenticationService) { }

    getAll() {
        return this.http.get('/api/role', this.authenticationService.jwt()).map((response: Response) => response.json());
    }

    getByTitle(title: string) {
        return this.http.get('/api/role/' + title).map((response: Response) => response.json());
    }

}
