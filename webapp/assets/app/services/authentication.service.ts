import
{
    Injectable
}
from '@angular/core';

import
{
    Http,
    Headers,
    Response,
    RequestOptions
}
from '@angular/http';

import
{
    Observable
}
from 'rxjs/Observable';

import 'rxjs/add/operator/map'

import
{
    User
}
from '../models/index';

@Injectable()
export class AuthenticationService
{
    private encLocalStorage = cryptio;
    private currentUser: User;
    private authenticated: boolean = false;
    private token: string = '';

    constructor(private http: Http)
    {

    }

    login(email: string, password: string)
    {
        return this.http.post('/api/authenticate', { email: email, password: password })
            .map((response: Response) => {
                // login successful if there's a jwt token in the response
                var user = response.json();
                if (user && user.token)
                {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    // localStorage.setItem('currentUser', JSON.stringify(user));

                    this.token = user.token;
                    var scope = this;
                    // store user details and jwt token in encrypted session storage to keep user logged in between page refreshes
                    this.encLocalStorage.set({storage:'session'}, 'currentUser', user,
                                                                    function(err, results){
                                                                        if (err) throw err;
                                                                        // scope.currentUser = new User(user);
                                                                    });
                    var scope = this;
                    this.encLocalStorage.get({storage:'session'}, 'currentUser',
                                                                    function(err, result){
                                                                            if (err) throw err;
                                                                            scope.currentUser = new User(result);
                                                                    });
                    this.authenticated = true;
                }
            });
    }

    logout()
    {
        // remove user from local storage to log user out
        // localStorage.removeItem('currentUser');
        this.encLocalStorage.set({storage:'session'}, 'currentUser', {},
                                                        function(err, results){
                                                            if (err) throw err;
                                                            // console.log(results);
                                                        });
        this.authenticated = false;
    }

    isAuthenticated()
    {
        return this.authenticated;
    }

    getCurrentUser()
    {
        return this.currentUser;

        // return new User(JSON.parse(localStorage.getItem('currentUser')));
    }

    jwt()
    {
        // create authorization header with jwt token
        // let currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (this.currentUser && this.token)
        {
            let headers = new Headers({ 'x-access-token': this.token });
            return new RequestOptions({ headers: headers });
        }
    }
}
