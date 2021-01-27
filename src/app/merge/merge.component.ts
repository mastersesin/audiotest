import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';
import {v4 as uuidgen} from 'uuid';


export interface UserSDPInfo {
  user_identity: string;
  sdp_offer: {
    type: string,
    offer: string
  };
}

export interface AnswerResponse {
  receive_offer_from: string;
  answer: {
    type: string,
    offer: string
  };
  receive_answer_from: string;
}

export interface IceResponse {
  candidate: any;
  send_to: string;
  send_from: string;
}

@Component({
  selector: 'app-merge',
  templateUrl: './merge.component.html',
  styleUrls: ['./merge.component.css']
})

export class MergeComponent implements OnInit {
  @ViewChild('streamView') streamView: ElementRef;
  @ViewChild('theirStreamView') theirStreamView: ElementRef;

  // Get user media constraint
  constraints = {video: true, audio: true};
  remoteStream = new MediaStream();
  isAddRemoteStream = false;
  identity = null;
  iceCandidate = [];
  isSentIceCandidate = false;
  peerConnList = [];

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

    // After rtcPeerConn finishing add track function, a negotiationneeded event will occurred
    this.rtcPeerConn.addEventListener('negotiationneeded', event => {
      // Start create sdp offer type
      console.log('negotiationneeded triggered');
      this.onCreateOfferNeeded().then(offer => {
        console.log('Offer created ... now starting setLocalDescription');
        this.rtcPeerConn.setLocalDescription(offer).then(value => {
          console.log('setLocalDescription done...now starting send offer to signaling server');
          this.socket.emit('room', {identity: this.identity, offer});
          console.log('Offer has been sent');
        });
      });
    });

    // Get user offer if room already have someone else
    this.socket.on('room', (response: UserSDPInfo[]) => {
      response.forEach(personSdp => {
        if (personSdp.user_identity !== this.identity) {
          console.log('Found someone else in this room need to connect');
          this.onReceivedOffer(personSdp.sdp_offer).then(_ => {
            this.onCreateAnswerNeeded().then(answer => {
              this.socket.emit('answerchannel', {receive_offer_from: personSdp.user_identity, answer, receive_answer_from: this.identity});
              console.log('Receiving icecandidate data now will emit it');
              if (!this.isSentIceCandidate) {
                this.isSentIceCandidate = true;
                this.socket.emit('icecandidatechannel', {
                  candidate: this.iceCandidate,
                  send_to: personSdp.user_identity,
                  send_from: this.identity
                });
              }
            });
          });
        }
      });
    });

    // When receive someone else answerchannel we check if they answer to us or someone else and start reacting
    this.socket.on('answerchannel', (response: AnswerResponse) => {
      if (response.receive_offer_from === this.identity) {
        this.onAnswerChannel(response.answer);
      }
    });

    // And when we receiving ice candidate from remote when setup last piece
    this.socket.on('icecandidatechannel', (response: IceResponse) => {
      if (response.send_to === this.identity) {
        console.log('Received ice candidate');
        console.log(response);
        if (!this.isSentIceCandidate) {
          this.socket.emit('icecandidatechannel', {candidate: this.iceCandidate, send_from: this.identity, send_to: response.send_from});
        }
        response.candidate.forEach(candidate => {
          this.rtcPeerConn.addIceCandidate(new RTCIceCandidate(candidate));
        });
      }
    });

    // After both side finishing setLocalDesc and setRemoteDesc this will trigger
    this.rtcPeerConn.addEventListener('icecandidate', event => {
      console.log('here');
      if (event.candidate) {
        this.iceCandidate.push(event.candidate);
      }
    });
  }

  onAnswerChannel(answer): void {
    console.log('Received answer start processing');
    const sessionDesc = new RTCSessionDescription(answer);
    this.rtcPeerConn.setRemoteDescription(sessionDesc);
    console.log('setRemoteDesc done');
  }

  async onCreateAnswerNeeded(): Promise<any> {
    const answer = await this.rtcPeerConn.createAnswer();
    await this.rtcPeerConn.setLocalDescription(answer);
    return answer;
  }

  onReceivedOffer(response): Promise<any> {
    console.log('Start processing offer message');
    return this.rtcPeerConn.setRemoteDescription(new RTCSessionDescription(response));
  }

  initIdentity(identity): void {
    this.identity = identity;

    this.initWebRTCDependencies().then(stream => {
      console.log('negotiationneeded should trigger now');
    });
  }

  onCreateOfferNeeded(): Promise<any> {
    return this.rtcPeerConn.createOffer();
  }

  async initWebRTCDependencies(): Promise<any> {
    console.log('Start getting stream');
    // Start getting stream
    const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    stream.getTracks().forEach(track => {
      console.log(track);
      if (track.kind === 'video') {
        const localStream = new MediaStream();
        localStream.addTrack(track);
        this.streamView.nativeElement.srcObject = localStream;
      }
      this.rtcPeerConn.addTrack(track);
    });
    console.log('End getting stream');
    return stream;
  }

}
