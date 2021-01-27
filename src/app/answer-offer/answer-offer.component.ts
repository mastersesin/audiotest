import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';

@Component({
  selector: 'app-answer-offer',
  templateUrl: './answer-offer.component.html',
  styleUrls: ['./answer-offer.component.css']
})
export class AnswerOfferComponent implements OnInit {
  @ViewChild('streamView') streamView: ElementRef;
  @ViewChild('theirStreamView') theirStreamView: ElementRef;

  // Get user media constraint
  constraints = {video: true, audio: true};
  remoteStream = new MediaStream();
  isAddRemoteStream = false;

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
  rtcPeerConn = new RTCPeerConnection(this.configuration);

  constructor(private socket: Socket) {
  }

  ngOnInit(): void {
    this.rtcPeerConn.addEventListener('track', event => {
      this.remoteStream.addTrack(event.track);
      if (!this.isAddRemoteStream) {
        this.theirStreamView.nativeElement.srcObject = this.remoteStream;
        this.isAddRemoteStream = true;
      }
    });
    this.rtcPeerConn.addEventListener('icecandidate', event => {
      this.onIceCandidate(event);
    });
    this.socket.on('offerchannel', response => {
      this.onReceivedOffer(response).then(_ => {
        console.log('setRemoteDescription done...');
        console.log('start init WebRTC dependencies');
        this.initWebRTCDependencies().then(() => {
          console.log('init done');
          this.onCreateAnswerNeeded().then(answer => {
            this.socket.emit('answerchannel', answer);
          });
        });
      });
    });

    this.socket.on('icecandidatechannel', response => {
      console.log('Received ice candidate');
      this.onIceCandidateReceived(response);
    });
  }

  onIceCandidate(event): void {
    if (event.candidate) {
      console.log('Start sending ice candidate');
      this.socket.emit('icecandidatechannel', event.candidate);
    }
  }

  onIceCandidateReceived(data): void {
    this.rtcPeerConn.addIceCandidate(new RTCIceCandidate(data));
  }

  async onCreateAnswerNeeded(): Promise<any> {
    const answer = await this.rtcPeerConn.createAnswer();
    await this.rtcPeerConn.setLocalDescription(answer);
    return answer;
  }

  async initWebRTCDependencies(): Promise<any> {
    console.log('Start getting stream');
    // Start getting stream
    const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    stream.getTracks().forEach(track => {
      this.rtcPeerConn.addTrack(track);
    });
    this.streamView.nativeElement.srcObject = stream;
    console.log('End getting stream');
    return stream;
  }

  onReceivedOffer(response): Promise<any> {
    console.log('Offer received');
    return this.rtcPeerConn.setRemoteDescription(new RTCSessionDescription(response));
  }

}
