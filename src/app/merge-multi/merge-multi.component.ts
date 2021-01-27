import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Socket} from 'ngx-socket-io';
import {IceResponse} from '../merge/merge.component';

@Component({
  selector: 'app-merge-multi',
  templateUrl: './merge-multi.component.html',
  styleUrls: ['./merge-multi.component.css']
})
export class MergeMultiComponent implements OnInit {

  @ViewChild('streamView') streamView: ElementRef;
  @ViewChild('theirStreamView') theirStreamView: ElementRef;

  // Get user media constraint
  constraints = {video: true, audio: false};
  remoteStream = new MediaStream();
  isAddRemoteStream = false;
  identity = null;
  iceCandidate = [];
  isSentIceCandidate = false;
  peerConnList = [];
  toggle = false;

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

  constructor(private socket: Socket) {
  }

  ngOnInit(): void {

  }

  async onCreateAnswerNeeded(rtcPeerConn: RTCPeerConnection): Promise<any> {
    const answer = await rtcPeerConn.createAnswer();
    await rtcPeerConn.setLocalDescription(answer);
    return answer;
  }

  onAnswerReceive(rtcPeerConn: RTCPeerConnection, answer): void {
    console.log('Start processing answer');
    const sessionDesc = new RTCSessionDescription(answer);
    rtcPeerConn.setRemoteDescription(sessionDesc);
    console.log('setRemoteDesc done');
  }

  initIdentity(identity): void {
    this.identity = identity;

    this.socket.on('room', (response) => {
      if (response.command === 'info' && response.args) {
        console.log(response);
        response.args.forEach((userIdentity) => {
          if (userIdentity !== this.identity) {
            const rtcPeerConn = new RTCPeerConnection(this.configuration);
            this.peerConnList.push({peerObj: rtcPeerConn, remote_user: userIdentity});
            this.initMandatoryEventListener(rtcPeerConn, userIdentity, false);
            this.initWebRTCDependencies(rtcPeerConn).then(stream => {
              stream.getTracks().forEach(track => {
                console.log('Track add');
                rtcPeerConn.addTrack(track, stream);
              });
              this.streamView.nativeElement.srcObject = stream;
              console.log('End getting stream');
              console.log('negotiationneeded should trigger now');
            });
          }
        });
      } else if (
        response.command === 'connectmessage' &&
        response.args.to_user === this.identity &&
        response.args.message.type === 'offer'
      ) {
        console.log('Receive an offer');
        console.log(response);
        const rtcPeerConnAnswer = new RTCPeerConnection(this.configuration);
        rtcPeerConnAnswer.createOffer().then(a => {
          this.peerConnList.push({peerObj: rtcPeerConnAnswer, remote_user: response.args.from_user});
          this.initMandatoryEventListener(rtcPeerConnAnswer, response.args.from_user, true);
          this.initWebRTCDependencies(rtcPeerConnAnswer).then(stream => {
            stream.getTracks().forEach(track => {
              console.log('Track add');
              rtcPeerConnAnswer.addTrack(track, stream);
            });
            this.streamView.nativeElement.srcObject = stream;
            console.log('End getting stream');
            console.log('negotiationneeded should trigger now');
          });
          rtcPeerConnAnswer.setRemoteDescription(new RTCSessionDescription(response.args.message)).then(_ => {
            this.onCreateAnswerNeeded(rtcPeerConnAnswer).then((answer) => {
              console.log('Send answer');
              this.socket.emit('room', {
                command: 'connectmessage',
                args: {
                  to_user: response.args.from_user,
                  from_user: this.identity,
                  message: answer
                }
              });
            });
          });
        });
      } else if (
        response.command === 'connectmessage' &&
        response.args.to_user === this.identity &&
        response.args.message.type === 'answer'
      ) {
        console.log(response);
        console.log('Receive an answer');
        console.log(this.peerConnList);
        this.peerConnList.forEach(peerObj => {
          if (peerObj.remote_user === response.args.from_user) {
            const rtcPeerConn = peerObj.peerObj;
            this.onAnswerReceive(rtcPeerConn, response.args.message);
          }
        });
      }
      this.socket.emit('room', {
        command: 'join',
        args: {
          user_identity: this.identity,
          room_name: 'default'
        }
      });
    });

    this.socket.emit('room', {
      command: 'checkroom',
      args: {
        room_name: 'default'
      }
    });

    // And when we receiving ice candidate from remote when setup last piece
    this.socket.on('icecandidatechannel', (response) => {
      console.log(response);
      if (response.send_to === this.identity) {
        console.log('Received ice candidate');
        this.peerConnList.forEach(peerObj => {
          if (peerObj.remote_user === response.send_from) {
            const rtcPeerConn = peerObj.peerObj;
            rtcPeerConn.addIceCandidate(new RTCIceCandidate(response.candidate));
          }
        });
      }
    });
  }

  initWebRTCDependencies(rtcPeerConn: RTCPeerConnection): Promise<any> {
    console.log('Start getting stream');
    // Start getting stream
    return navigator.mediaDevices.getUserMedia(this.constraints);
  }

  initMandatoryEventListener(rtcPeerConn: RTCPeerConnection, userIdentity: string, isAnswer: boolean): void {
    if (!isAnswer) {
      rtcPeerConn.addEventListener('negotiationneeded', event => {
        // Start create sdp offer type
        console.log('negotiationneeded triggered');
        this.onCreateOfferNeeded(rtcPeerConn).then(offer => {
          console.log('Offer created ... now starting setLocalDescription');
          rtcPeerConn.setLocalDescription(offer).then(value => {
            console.log('setLocalDescription done...now starting send offer to signaling server');
            this.socket.emit('room', {
              command: 'connectmessage',
              args: {
                to_user: userIdentity,
                from_user: this.identity,
                message: offer
              }
            });
            console.log('Offer has been sent');
          });
        });
      });
    }

    rtcPeerConn.addEventListener('icecandidate', event => {
      if (event.candidate) {
        this.socket.emit('icecandidatechannel', {
          candidate: event.candidate,
          send_to: userIdentity,
          send_from: this.identity
        });
      }
    });

    rtcPeerConn.addEventListener('track', event => {
      const remoteStreamObj = new MediaStream();
      remoteStreamObj.addTrack(event.track);
      this.peerConnList.forEach(peerObj => {
        if (peerObj.remote_user === userIdentity) {
          peerObj.remoteStream = remoteStreamObj;
        }
      });
    });

    rtcPeerConn.addEventListener('connectionstatechange', event => {
      if (rtcPeerConn.connectionState === 'connected') {
        // Peers connected!
        console.log('connected');
      }
    });
  }

  check(): void {
    this.peerConnList.forEach(a => {
      console.log(a);
    });
    this.toggle = true;
  }


  onCreateOfferNeeded(rtcPeerConn: RTCPeerConnection): Promise<any> {
    return rtcPeerConn.createOffer();
  }

}
