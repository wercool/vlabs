import { NgModule }             from '@angular/core';
import { BrowserModule }        from '@angular/platform-browser';
import { FormsModule }          from '@angular/forms';
import { HttpModule }           from '@angular/http';

import { AppComponent }         from './app.component';
import { routing }              from './app.routing';

import { AuthGuard }                                            from './guards/index';
import {
         AlertService,
         AuthenticationService,
         UserService
       }                                                        from './services/index';

// shared components
import { AlertComponent }                                       from './components/shared/alert/index';

// front face components
import { HomeComponent }                                        from './components/frontface/home/index';
import { AboutComponent }                                       from './components/frontface/about/index';
import { ContactComponent }                                     from './components/frontface/contact/index';
import { LoginComponent }                                       from './components/frontface/login/index';
import { RegisterComponent }                                    from './components/frontface/register/index';

// authorized components
import { DashboardComponent }                                   from './components/authorized/dashboard/index';

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        routing
    ],
    declarations: [
        AppComponent,
        AlertComponent,
        HomeComponent,
        AboutComponent,
        ContactComponent,
        LoginComponent,
        RegisterComponent,
        DashboardComponent
    ],
    providers: [
        AuthGuard,
        AlertService,
        AuthenticationService,
        UserService
    ],
    bootstrap: [AppComponent]
})

export class AppModule { }
