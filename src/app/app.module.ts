import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { WebcamModule } from 'ngx-webcam';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { TestComponent } from './test/test.component';
import { HihiComponent } from './hihi/hihi.component';
import { WebrtclearnComponent } from './webrtclearn/webrtclearn.component';
import { SendOfferComponent } from './send-offer/send-offer.component';
import { AnswerOfferComponent } from './answer-offer/answer-offer.component';
import { MergeComponent } from './merge/merge.component';
import { MergeMultiComponent } from './merge-multi/merge-multi.component';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const config: SocketIoConfig = { url: 'https://simple-sjam.autonomous.ai', options: {} };
const routes: Routes = [
  { path: '', component: MergeMultiComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'offer', component: SendOfferComponent },
  { path: 'answer', component: AnswerOfferComponent },
  { path: 'merge', component: MergeComponent },
  { path: 'merge-multi', component: MergeMultiComponent },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  declarations: [
    AppComponent,
    TestComponent,
    HihiComponent,
    WebrtclearnComponent,
    SendOfferComponent,
    AnswerOfferComponent,
    MergeComponent,
    MergeMultiComponent,
    LoginComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    SocketIoModule.forRoot(config),
    WebcamModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
