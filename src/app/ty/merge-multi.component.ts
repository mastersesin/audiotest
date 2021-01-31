import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { environment } from 'src/environments/environment';
// import { IceResponse } from '../merge/merge.component';

export interface RoomObject {
  [key: string]: string[];
}

@Component({
  selector: 'app-merge-multi',
  templateUrl: './merge-multi.component.html',
  styleUrls: ['./merge-multi.component.css']
})
export class MergeMultiComponent implements OnInit {

  @ViewChild('streamView') streamView: ElementRef | undefined;
  @ViewChild('theirStreamView') theirStreamView: ElementRef | undefined;

  // Get user media constraint
  constraints = { video: false, audio: true };
  remoteStream = new MediaStream();
  isAddRemoteStream = false;
  identity = null;
  iceCandidate = [];
  isSentIceCandidate = false;
  peerConnList: any[] = [];
  toggle = false;
  roomList: any[] = [];
  currentRoomName = null;

  // configuration = {
  //   iceServers: [
  //     {
  //       urls: [
  //         'stun:stun1.l.google.com:19302',
  //         'stun:stun2.l.google.com:19302',
  //       ],
  //     },
  //   ],
  //   iceCandidatePoolSize: 10,
  // };
  configuration = environment.mediaServerConfiguration;

  constructor(private socket: Socket) {
  }

  ngOnInit(): void {
    this.socket.on('icecandidatechannel', (response: any) => {
      console.log(response);
      if (response.send_to === this.identity) {
        console.log('Received ice candidate');
        this.peerConnList.forEach((peerObj: any) => {
          if (peerObj.remote_user === response.send_from) {
            const rtcPeerConn = peerObj.peerObj;
            rtcPeerConn.addIceCandidate(new RTCIceCandidate(response.candidate));
          }
        });
      }
    });
    this.socket.on('listallroom1', (response: RoomObject[]) => {
      console.log(response);
      this.roomList = [];
      response.forEach(room => {
        const key = Object.keys(room)[0];
        const values = Object.keys(room).map(key1 => room[key1]);
        this.roomList.push({
          room_name: key,
          peer: values[0],
          status: 'disconnect'
        });
      });
    });
    this.socket.on('room', (response: any) => {
      if (response.command === 'info' && response.args) {
        console.log(this.roomList);
        response.args.forEach((userIdentity: any) => {
          let isMessageComeFromUserInCurrentRoom = false;
          let isAlreadyHavePeerConn = false;
          this.roomList.forEach(room => {
            if (
              room.room_name === this.currentRoomName &&
              room.peer.includes(userIdentity)) {
              isMessageComeFromUserInCurrentRoom = true;
            }
          });
          this.peerConnList.forEach((conn: any) => {
            if (conn.remote_user === userIdentity) {
              isAlreadyHavePeerConn = true;
            }
          });
          if (userIdentity !== this.identity && isMessageComeFromUserInCurrentRoom && !isAlreadyHavePeerConn) {
            const rtcPeerConn = new RTCPeerConnection(this.configuration);
            this.peerConnList.push({ peerObj: rtcPeerConn, remote_user: userIdentity });
            this.initMandatoryEventListener(rtcPeerConn, userIdentity, false);
            const localStream = new MediaStream();
            this.initWebRTCDependencies(rtcPeerConn).then(stream => {
              stream.getTracks().forEach((track: any) => {
                console.log('Track add');
                rtcPeerConn.addTrack(track, stream);
                if (track.kind === 'video') {
                  localStream.addTrack(track);
                }
              });
              this.streamView && (this.streamView.nativeElement.srcObject = localStream);
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
        const localStream = new MediaStream();
        this.initWebRTCDependencies(rtcPeerConnAnswer).then(stream => {
          stream.getTracks().forEach((track: any) => {
            console.log('Track add');
            rtcPeerConnAnswer.addTrack(track, stream);
            if (track.kind === 'video') {
              localStream.addTrack(track);
            }
          });
          this.streamView && (this.streamView.nativeElement.srcObject = localStream);
          rtcPeerConnAnswer.createOffer().then(a => {
            this.peerConnList.push({ peerObj: rtcPeerConnAnswer, remote_user: response.args.from_user });
            this.initMandatoryEventListener(rtcPeerConnAnswer, response.args.from_user, true);
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
          console.log('End getting stream');
          console.log('negotiationneeded should trigger now');
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
    });
  }


  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: Event): any {
    // Your logic on beforeunload
    console.log(event);
    this.socket.emit('leave', { user_identity: this.identity, current_room: this.currentRoomName });
  }

  async onCreateAnswerNeeded(rtcPeerConn: RTCPeerConnection): Promise<any> {
    const answer = await rtcPeerConn.createAnswer();
    await rtcPeerConn.setLocalDescription(answer);
    return answer;
  }

  onAnswerReceive(rtcPeerConn: RTCPeerConnection, answer: any): void {
    console.log('Start processing answer');
    const sessionDesc = new RTCSessionDescription(answer);
    rtcPeerConn.setRemoteDescription(sessionDesc);
    console.log('setRemoteDesc done');
  }

  test(): any {
    navigator.mediaDevices.getUserMedia({ audio: true });
  }

  joinAudioRoom(roomName: any, currentRoomName: any): void {

    // this.peerConnList.forEach(conn => {
    //   conn.remoteStream = null;
    // });
    this.peerConnList = [];

    this.socket.emit('room', {
      command: 'join',
      args: {
        user_identity: this.identity,
        room_name: roomName,
        current_room_name: currentRoomName
      }
    });
    this.currentRoomName = roomName;

    console.log(this.currentRoomName);

    // this.socket.emit('room', {
    //   command: 'checkroom',
    //   args: {
    //     room_name: 'default'
    //   }
    // });

    // And when we receiving ice candidate from remote when setup last piece
  }

  initIdentity(identity: any): void {
    this.identity = identity;
    this.currentRoomName = identity;
    this.socket.emit('createnewroom',
      {
        user_identity: this.identity,
        room_name: this.identity
      }
    );
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
        console.log(userIdentity);
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
        const type = event.candidate.candidate.split(' ')[7];
        if (type === 'relay') {
          this.socket.emit('icecandidatechannel', {
            candidate: event.candidate,
            send_to: userIdentity,
            send_from: this.identity
          });
        }
      }
    });

    rtcPeerConn.addEventListener('track', event => {
      console.log(event);
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
        this.roomList.forEach(room => {
          if (room.room_name === this.currentRoomName) {
            room.status = 'connected';
          }
        });
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
