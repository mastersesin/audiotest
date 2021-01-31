import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { WebcamModule } from 'ngx-webcam';
import { NgSelectModule } from '@ng-select/ng-select';
import { DeviceModule } from '@ngx-toolkit/device';

import { AppComponent } from './app.component';
import { WebrtclearnComponent } from './webrtclearn/webrtclearn.component';
import { LoginComponent } from './login/login.component';
import { RoomComponent } from './room/room.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './router.module';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { MergeMultiComponent } from './ty/merge-multi.component';

const config: SocketIoConfig = {
  url: environment.backendUrl, options: {
    withCredentials: true,
    extraHeaders: {
      "Access-Control-Allow-Origin": "*"
    }
  },
};

@NgModule({
  declarations: [
    AppComponent,
    WebrtclearnComponent,
    LoginComponent,
    RoomComponent,
    HomeComponent,
    MergeMultiComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SocketIoModule.forRoot(config),
    WebcamModule,
    AppRoutingModule,
    NgSelectModule,
    DeviceModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
