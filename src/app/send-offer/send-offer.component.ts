import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';

@Component({
  selector: 'app-send-offer',
  templateUrl: './send-offer.component.html',
  styleUrls: ['./send-offer.component.css']
})
export class SendOfferComponent implements OnInit {
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
    // Init some mandatory event listener
    this.rtcPeerConn.addEventListener('track', event => {
      this.remoteStream.addTrack(event.track);
      if (!this.isAddRemoteStream) {
        this.theirStreamView.nativeElement.srcObject = this.remoteStream;
        this.isAddRemoteStream = true;
      }
    });
    this.socket.on('icecandidatechannel', response => {
      console.log('Received ice candidate');
      this.onIceCandidateReceived(response);
    });


    // After rtcPeerConn finishing add track function, a negotiationneeded event will occurred
    this.rtcPeerConn.addEventListener('negotiationneeded', event => {
      // Start create sdp offer type
      this.onCreateOfferNeeded();
    });

    // After both side add remoteDesc done both trigger this event
    this.rtcPeerConn.addEventListener('icecandidate', event => {
      this.onIceCandidate(event);
    });

    // We will get answer from remote client at some point so add event listener
    this.socket.on('answerchannel', answer => {
      this.onAnswerChannel(answer);
    });

    this.onCall();

  }

  onIceCandidateReceived(data): void {
    this.rtcPeerConn.addIceCandidate(new RTCIceCandidate(data));
  }

  onIceCandidate(event): void {
    if (event.candidate) {
      console.log('Start sending ice candidate');
      this.socket.emit('icecandidatechannel', event.candidate);
    }
  }

  onAnswerChannel(answer): void {
    console.log('Received answer start processing');
    const sessionDesc = new RTCSessionDescription(answer);
    this.rtcPeerConn.setRemoteDescription(sessionDesc);
    console.log('setRemoteDesc done');
  }

  onCreateOfferNeeded(): void {
    this.rtcPeerConn.createOffer().then((offer) => {
      console.log('Offer created ... now starting setLocalDescription');
      this.rtcPeerConn.setLocalDescription(offer).then(value => {
        console.log('setLocalDescription done...now starting send offer to signaling server');
        this.socket.emit('offerchannel', offer);
        console.log('Offer sent');
      });
    });
  }

  onCall(): void {
    this.initWebRTCDependencies().then(stream => {
      console.log(stream);
    });
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

}
