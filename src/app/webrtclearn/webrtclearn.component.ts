import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-webrtclearn',
  templateUrl: './webrtclearn.component.html',
  styleUrls: ['./webrtclearn.component.scss']
})

export class WebrtclearnComponent implements OnInit, OnDestroy {
  @ViewChild('streamView') streamView: ElementRef | undefined;
  @ViewChild('theirStreamView') theirStreamView: ElementRef | undefined;
  configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };
  rtcPeerConn: any;
  userConstrains = { audio: false, video: true };
  localStream: any;
  remoteStream = new MediaStream();

  constructor(
    private elementRef: ElementRef,
    private socket: Socket,
    private router: Router
  ) {
  }

  ngOnDestroy(): void {
    this.socket.emit('a', 'Bye');
  }

  ngOnInit(): void {
    this.socket.connect();
    this.socket.on('announcement', (response: any) => {
      if (!this.rtcPeerConn) {
        this.startSignaling();
      }
      if (response.type !== 'user_here') {
        if (response.sdp && response.type === 'offer') {
          this.rtcPeerConn.setRemoteDescription(new RTCSessionDescription(response));
          this.rtcPeerConn.createAnswer().then((answer: any) => {
            this.rtcPeerConn.setLocalDescription(answer).then(() => {
              this.socket.emit('signal', answer);
            });
          });
        } else if (response.sdp && response.type === 'answer') {
          const remoteDesc = new RTCSessionDescription(response);
          this.rtcPeerConn.setRemoteDescription(remoteDesc);
        } else {
          this.rtcPeerConn.addIceCandidate(new RTCIceCandidate(response));
        }
      }
    });
  }

  startSignaling(): void {
    this.rtcPeerConn = new RTCPeerConnection(this.configuration);
    this.rtcPeerConn.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        this.socket.emit('signal', event.candidate);
      }
    });
    this.rtcPeerConn.addEventListener('track', async (event: any) => {
      this.remoteStream.addTrack(event.track);
    });
    this.rtcPeerConn.addEventListener('signalingstatechange', (event: any) => {
      if (this.rtcPeerConn.connectionState === 'connected') {
      }
    });
    this.rtcPeerConn.addEventListener('negotiationneeded', () => {
      this.rtcPeerConn.createOffer().then((offer: any) => {
        this.rtcPeerConn.setLocalDescription(offer);
        this.socket.emit('signal', offer);
      });
    });
    this.rtcPeerConn.addEventListener('onaddstream', (evt: any) => {
      this.theirStreamView && (this.theirStreamView.nativeElement.srcObject = evt.stream);
    });
    this.rtcPeerConn.createOffer().then((offer: any) => {
      this.rtcPeerConn.setLocalDescription(offer);
      this.socket.emit('room', offer);
    });
  }

  joinRoom(username: any): void {
    navigator.getUserMedia({
      video: true, audio: true
    }, stream => {
      this.theirStreamView && (this.theirStreamView.nativeElement.srcObject = stream);
      this.rtcPeerConn.addStream(stream);
      this.localStream = stream;
      this.theirStreamView && (this.theirStreamView.nativeElement.srcObject = this.remoteStream);
      stream.getTracks().forEach(track => {
        this.rtcPeerConn.addTrack(track);
      });
    }, err => {
    });
    this.startSignaling();
  }

  onSuccess(stream: any): void {
    this.theirStreamView && (this.theirStreamView.nativeElement.srcObject = stream);
  }

  onError(err: any): void {
    const errArea = document.getElementById('PermissionErr');
    if (errArea)
      // errArea.innerText = 'You denied our request to use your camera or audio';
      errArea.innerText = err;
  }

}
