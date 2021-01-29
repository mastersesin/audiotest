import { Component, Inject } from '@angular/core';
import { isChrome } from './helpers';
import { DEVICE, Device, DevicePlatform } from '@ngx-toolkit/device';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'test';
  iOs: boolean = false;
  constructor(
    @Inject(DEVICE) device: Device
  ) {
    console.log(device);
    this.iOs = device.isMobile() && device.platform === DevicePlatform.IOS;
  }
  notSupportBrowser() {
    return !isChrome;
  }
  notSupportOS() {
    return this.iOs;
  }
}
