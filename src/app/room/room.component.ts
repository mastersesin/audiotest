import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { AuthService } from '../auth/auth.service';
import { IRoom, RoomService } from '../services/room.service';

export interface RoomObject {
  [key: string]: string[];
}

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {

  @ViewChild('streamView') streamView: ElementRef | undefined;
  @ViewChild('theirStreamView') theirStreamView: ElementRef | undefined;

  // Get user media constraint
  constraints = { video: false, audio: true };
  remoteStream = new MediaStream();
  isAddRemoteStream = false;
  identity: any = null;
  iceCandidate = [];
  isSentIceCandidate = false;
  peerConnList: any[] = [];
  toggle = false;
  currentRoomName: any = null;

  configuration = {
    iceServers: [
      {
        urls: 'turn:34.123.205.86:1609?transport=udp',
        username: 'Ty1',
        credential: 'password'
      },
      {
        urls: 'stun:34.123.205.86:1609',
      },
    ]
  };

  get selectedRoom() {
    return this.roomService.getCurrentRoom();
  }

  showRoomTips(room: IRoom) {
    // if (room?.hovered === true && this.selectedRoom?.id !== room?.id) {
    //   return '(Click to join)';
    // }
    if (this.selectedRoom?.id === room?.id || this.selectedRoom?.status === 'connected') {
      return 'Joined!';
    }
    // return 'Click to join...';
    return '';
  }

  getRoomList() {
    const allRooms = this.roomService.getRoomList()
    return allRooms;
  }

  onClickOnRoom(room: IRoom) {
    const check = this.identity !== null && !room.peer.includes(this.identity);
    if (!check) {
      return;
    }
    const currentRoom = this.roomService.getCurrentRoom();
    if (currentRoom && currentRoom.joined !== undefined) {
      if (currentRoom.joined === room.joined === true) {
        console.log('Already Joined');
        return;
      }
    }
    const joinedRoom = this.roomService.joinRoom(room);
    this.joinAudioRoom(joinedRoom.name, this.currentRoomName);
  }

  constructor(private socket: Socket,
    private authService: AuthService, private roomService: RoomService) {

  }

  connect() {
    const email = this.authService.getProfile().email;
    this.initIdentity(email);
  }

  private displayName(name: string) {
    if (name) {
      const isEmail = name.includes('@');
      if (isEmail) {
        const username = name.split('@')[0];
        return username;
      }
    }
    return '';
  }

  public showPeers(peers: string | string[]) {
    // console.log(peers);
    if (typeof peers == 'object') {
      const usernames = peers.map((p) => {
        if (p.includes('@')) {
          return p.split('@')[0];
        }
        return p;
      });
      return usernames.join(', ');
    }
    return peers;
  }

  ngOnInit(): void {
    this.connect();
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
      this.roomService.removeAllRooms();
      response.forEach(room => {
        const key = Object.keys(room)[0];
        const values = Object.keys(room).map(key1 => room[key1]);
        const thisRoom = {
          room_name: key,
          peer: values[0],
          status: 'disconnect'
        } as any;
        this.roomService.addRoom({
          id: new Date().getTime().toString(),
          name: thisRoom.room_name,
          peer: thisRoom.peer,
          status: thisRoom.status,
          displayName: this.displayName(thisRoom.room_name),
        });
      });
    });
    this.socket.on('room', (response: any) => {
      if (response.command === 'info' && response.args) {
        response.args.forEach((userIdentity: any) => {
          let isMessageComeFromUserInCurrentRoom = false;
          let isAlreadyHavePeerConn = false;
          this.roomService.getRoomList().forEach((room: IRoom) => {
            if (
              room.name === this.currentRoomName &&
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

  joinAudioRoom(roomName: string, currentRoomName: string): void {

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
        this.roomService.getRoomList().forEach((room: IRoom) => {
          if (room.name === this.currentRoomName) {
            this.roomService.updateRoom({
              ...room,
              status: 'connected'
            })
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
