import { Injectable }         from '@angular/core';
import {
        Http,
        Headers,
        Response,
        RequestOptions }       from '@angular/http';
import { Observable }          from 'rxjs/Observable';
import 'rxjs/add/operator/map'

import { User }                 from '../models/index';

@Injectable()
export class AuthenticationService {

    private authenticated: boolean = false;

    constructor(private http: Http) { }

    login(email: string, password: string) {
        return this.http.post('/api/authenticate', { email: email, password: password })
            .map((response: Response) => {
                // login successful if there's a jwt token in the response
                var user = response.json();
                // console.log(user);
                if (user && user.token)
                {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    this.authenticated = true;
                }
            });
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');
        this.authenticated = false;
    }

    public isAuthenticated() {
        return this.authenticated;
    }

    public jwt() {
        // create authorization header with jwt token
        let currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.token) {
            let headers = new Headers({ 'x-access-token': currentUser.token });
            return new RequestOptions({ headers: headers });
        }
    }
}
