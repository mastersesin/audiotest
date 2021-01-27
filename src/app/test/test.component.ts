import {Socket} from 'ngx-socket-io';

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';

declare var RecordRTC: any;
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {
  @ViewChild('myVid2') myVid2: ElementRef;
  @ViewChild('myVid') myVid: ElementRef;
  title = 'micRecorder';
// Lets declare Record OBJ
  record;
// Will use this flag for toggeling recording
  recording = false;
// URL of Blob
  error;
  mediaSource = new MediaSource();
  arrayOfBlobs: ArrayBuffer;

  // 2. Create an object URL from the `MediaSource`
  url = null;

  // 4. On the `sourceopen` event, create a `SourceBuffer`
  sourceBuffer = null;
  bfake: any;

  constructor(
    private domSanitizer: DomSanitizer,
    private socket: Socket
  ) {
  }

  sanitize(url: string): SafeUrl {
    return this.domSanitizer.bypassSecurityTrustUrl(url);
  }

  /**
   * Start recording.
   */
  initiateRecording(): void {
    this.recording = true;
    this.url = URL.createObjectURL(this.mediaSource);
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
      .then((stream) => {
        console.log(stream);
        this.myVid2.nativeElement.srcObject = stream;
        const recorder = RecordRTC(stream, {
          type: 'video',
          mimeType: 'video/webm',
          timeSlice: 900,
          bitsPerSecond: 10000,
          audioBitsPerSecond: 10000,
          frameInterval: 30,
          frameRate: 30,
          ondataavailable: (blob) => {
            console.log(blob);
            // blob.arrayBuffer().then((data) => {
            //   this.arrayOfBlobs = data;
            //   this.appendToSourceBuffer();
            // });
            this.socket.emit('message', blob);
          },
        });
        recorder.startRecording();
      })
      .catch((err0r) => {
        console.log('Something went wrong!');
      });
  }

  /**
   * Will be called automatically.
   */
  successCallback(stream): void {
  }

  /**
   * Stop recording.
   */
  stopRecording(): void {
    this.recording = false;
  }

  /**
   * processRecording Do what ever you want with blob
   * @param  {any} blob Blog
   */

  /**
   * Process Error.
   */
  errorCallback(error): void {
    this.error = 'Can not play audio in your browser';
  }

  flag = true;
  flag1 = true;

  appendToSourceBuffer(): void {
    if (
      this.mediaSource &&
      this.sourceBuffer &&
      this.sourceBuffer.updating === false
    ) {
      if (this.arrayOfBlobs) {
        this.sourceBuffer.appendBuffer(this.arrayOfBlobs);
      }
      if (this.flag) {
        setTimeout(() => {
          this.myVid.nativeElement.play();
        }, 1000);

        this.flag = false;
      }
    }
    // Limit the total buffer size to 20 minutes
    // This way we don't run out of RAM
    // if (
    //   this.myVid.nativeElement.buffered.length &&
    //   video.buffered.end(0) - video.buffered.start(0) > 1200
    // ) {
    //   this.sourceBuffer.remove(0, video.buffered.end(0) - 1200);
    // }
  }

  test = null;
  count = 0;

  test1(buffer1, buffer2): any {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

  flag3 = true;
  chunk: ArrayBuffer;

  appendBuffer(buffer1, buffer2): ArrayBuffer {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }

  ngOnInit(): void {
    this.mediaSource.addEventListener('sourceopen', () => {
      console.log('ok');
      this.sourceBuffer = this.mediaSource.addSourceBuffer('video/webm; codecs="opus,vp8"');
      this.sourceBuffer.mode = 'sequence';
      // NOTE: Browsers are VERY picky about the codec being EXACTLY
      // right here. Make sure you know which codecs you're using!
      // If we requested any video data prior to setting up the SourceBuffer,
      // we want to make sure we only append one blob at a time
      this.sourceBuffer.addEventListener('updateend', () => {
        // this.sourceBuffer.appendBuffer(this.arrayOfBlobs);
      });
      this.sourceBuffer.addEventListener('error', () => {
        console.log('fuck');
      });
    });
    this.socket.connect();
    this.socket.on('message', (response) => {
      if (this.flag) {
        setTimeout(() => {
          this.myVid.nativeElement.play();
        }, 500);
        this.flag = false;
      }
      console.log(this.sourceBuffer.updating);
      console.log(this.sourceBuffer);
      if (this.sourceBuffer.updating === false) {
        this.sourceBuffer.appendBuffer(response);
      } else {
        console.log(response);
      }
      // if (this.flag1) {
      //   console.log('wtf');
      //   this.flag1 = false;
      // }

      // const blob = new Blob([response], {type: 'video/webm'});
      // blob.arrayBuffer().then((data) => {
      //   this.arrayOfBlobs = data;
      //   this.appendToSourceBuffer();
      // });
      // this.appendToSourceBuffer();
      // const blob = new Blob([response], {type: 'audio/wav'});
      // this.url = URL.createObjectURL(blob);
    });
  }
}
