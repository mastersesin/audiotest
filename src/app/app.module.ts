import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {SocketIoModule, SocketIoConfig} from 'ngx-socket-io';
import {WebcamModule} from 'ngx-webcam';
import {RouterModule, Routes} from '@angular/router';

import {AppComponent} from './app.component';
import {TestComponent} from './test/test.component';
import {HihiComponent} from './hihi/hihi.component';
import {WebrtclearnComponent} from './webrtclearn/webrtclearn.component';
import {SendOfferComponent} from './send-offer/send-offer.component';
import {AnswerOfferComponent} from './answer-offer/answer-offer.component';
import {MergeComponent} from './merge/merge.component';
import { MergeMultiComponent } from './merge-multi/merge-multi.component';

const config: SocketIoConfig = {url: 'https://192.168.0.138:5000', options: {}};
const routes: Routes = [
  {path: 'offer', component: SendOfferComponent},
  {path: 'answer', component: AnswerOfferComponent},
  {path: 'merge', component: MergeComponent},
  {path: 'merge-multi', component: MergeMultiComponent},
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
    MergeMultiComponent
  ],
  imports: [
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
