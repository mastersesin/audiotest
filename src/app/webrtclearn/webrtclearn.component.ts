import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';

@Component({
  selector: 'app-webrtclearn',
  templateUrl: './webrtclearn.component.html',
  styleUrls: ['./webrtclearn.component.css']
})

export class WebrtclearnComponent implements OnInit, OnDestroy {
  @ViewChild('streamView') streamView: ElementRef;
  @ViewChild('theirStreamView') theirStreamView: ElementRef;
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
  userConstrains = {audio: false, video: true};
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
    this.socket.on('announcement', (response) => {
      if (!this.rtcPeerConn) {
        this.startSignaling();
      }
      if (response.type !== 'user_here') {
        if (response.sdp && response.type === 'offer') {
          this.rtcPeerConn.setRemoteDescription(new RTCSessionDescription(response));
          this.rtcPeerConn.createAnswer().then((answer) => {
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
    this.rtcPeerConn.addEventListener('icecandidate', event => {
      if (event.candidate) {
        this.socket.emit('signal', event.candidate);
      }
    });
    this.rtcPeerConn.addEventListener('track', async (event) => {
      this.remoteStream.addTrack(event.track);
    });
    this.rtcPeerConn.addEventListener('signalingstatechange', event => {
      if (this.rtcPeerConn.connectionState === 'connected') {
      }
    });
    this.rtcPeerConn.addEventListener('negotiationneeded', () => {
      this.rtcPeerConn.createOffer().then((offer) => {
        this.rtcPeerConn.setLocalDescription(offer);
        this.socket.emit('signal', offer);
      });
    });
    this.rtcPeerConn.addEventListener('onaddstream', (evt) => {
      this.theirStreamView.nativeElement.srcObject = evt.stream;
    });
    this.rtcPeerConn.createOffer().then((offer) => {
      this.rtcPeerConn.setLocalDescription(offer);
      this.socket.emit('room', offer);
    });
  }

  joinRoom(username): void {
    navigator.getUserMedia({
      video: true, audio: true
    }, stream => {
      this.streamView.nativeElement.srcObject = stream;
      this.rtcPeerConn.addStream(stream);
      this.localStream = stream;
      this.theirStreamView.nativeElement.srcObject = this.remoteStream;
      stream.getTracks().forEach(track => {
        this.rtcPeerConn.addTrack(track);
      });
    }, err => {
    });
    this.startSignaling();
  }

  onSuccess(stream): void {
    this.streamView.nativeElement.srcObject = stream;
  }

  onError(err): void {
    const errArea = document.getElementById('PermissionErr');
    // errArea.innerText = 'You denied our request to use your camera or audio';
    errArea.innerText = err;
  }

}
