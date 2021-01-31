import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RoomComponent } from './room/room.component';
import { MergeMultiComponent } from './ty/merge-multi.component';

const routes: Routes = [
  { path: '', component: MergeMultiComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'room', component: MergeMultiComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
