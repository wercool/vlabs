﻿import { Routes, RouterModule } from '@angular/router';

// front face components
import { HomeComponent }            from './components/frontface/home/index';
import { AboutComponent }           from './components/frontface/about/index';
import { ContactComponent }         from './components/frontface/contact/index';
import { LoginComponent }           from './components/frontface/login/index';
import { RegisterComponent }        from './components/frontface/register/index';

// authorized components
import { DashboardComponent }               from './components/authorized/dashboard/index';
// admin
import { AdminDashboardComponent }          from './components/authorized/admin/dashboard/index';
// student
import { StudentDashboardComponent }        from './components/authorized/student/dashboard/index';

import { AuthGuard }                        from './guards/index';

const appRoutes: Routes = [
    // front face components
    { path: '',             component: HomeComponent },
    { path: 'about',        component: AboutComponent },
    { path: 'contact',      component: ContactComponent },
    { path: 'login',        component: LoginComponent },
    { path: 'register',     component: RegisterComponent },

    // authorized components
    { path: 'dashboard',            component: DashboardComponent,          canActivate: [AuthGuard] },
    // admin
    { path: 'admin-dashboard',      component: AdminDashboardComponent,     canActivate: [AuthGuard] },
    // student
    { path: 'student-dashboard',    component: StudentDashboardComponent,   canActivate: [AuthGuard] },

    // otherwise redirect to home
    { path: '**', redirectTo: '' }
];

export const routing = RouterModule.forRoot(appRoutes);
