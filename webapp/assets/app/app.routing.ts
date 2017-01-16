import { Routes, RouterModule } from '@angular/router';

import { HomeComponent }            from './home/index';
import { AboutComponent }           from './about/index';
import { ContactComponent }         from './contact/index';
import { LoginComponent }           from './login/index';
import { RegisterComponent }        from './register/index';
import { DashboardComponent }       from './dashboard/index';

import { AuthGuard }                from './_guards/index';

const appRoutes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'about', component: AboutComponent },
    { path: 'contact', component: ContactComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },

    // otherwise redirect to home
    { path: '**', redirectTo: '' }
];

export const routing = RouterModule.forRoot(appRoutes);
