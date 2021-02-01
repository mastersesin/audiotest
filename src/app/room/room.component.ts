import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../auth/auth.service';
import { IRoom, RoomService } from '../services/room.service';

class JamAudio {
  localStream: MediaStream;
  remoteStream: MediaStream;
  sender: RTCRtpSender | undefined;
  localTrack: MediaStreamTrack | undefined;
  constructor() {
    this.localStream = new MediaStream();
    this.remoteStream = new MediaStream();
    this.sender = undefined;
    this.localTrack = undefined;
  }

  mute() {
    this.sender && this.sender.replaceTrack(null);
  }

  unmute() {
    this.sender && this.localTrack && this.sender.replaceTrack(this.localTrack);
  }

  away() {
    const audioTracks = this.remoteStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = false;
    });
  }

  back() {
    const audioTracks = this.remoteStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = true;
    });
  }

  reset() {
    this.localStream = new MediaStream();
    this.remoteStream = new MediaStream();
    this.sender = undefined;
    this.localTrack = undefined;
  }
}
(window as any).jam = new JamAudio();
function jamAudio(): JamAudio {
  return (window as any).jam;
}

export interface RoomObject {
  [key: string]: string[];
}

interface IConnection {
  peerObj: RTCPeerConnection;
  remote_user: string;
  remoteStream?: MediaStream;
}

type RoomStatus = 'connected' | 'connecting' | 'disconnect';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {

  @ViewChild('streamView') streamView: ElementRef | undefined;
  @ViewChild('theirStreamView') theirStreamView: ElementRef | undefined;

  allowedGetUserMedia = false;

  // Get user media constraint
  constraints = { video: false, audio: true };
  remoteStream = new MediaStream();
  isAddRemoteStream = false;
  identity: any = null;
  isDuplicatedIdentity: boolean = false;
  iceCandidate = [];
  isSentIceCandidate = false;
  peerConnList: IConnection[] = [];
  toggle = false;
  currentRoomName: any = null;

  configuration = environment.mediaServerConfiguration;

  get selectedRoom() {
    return this.roomService.getCurrentRoom();
  }

  showRoomTips(room: IRoom) {
    if (this.selectedRoom?.id === room?.id || this.selectedRoom?.status === 'connected') {
      return 'Joined!';
    }
    return '';
  }

  getRoomList() {
    return this.roomService.getRoomList();
  }

  getRoomListUI() {
    const roomByGroup = this.getRoomList()
      .filter((room) => room.peer.length >= 2 || room.peer[0] !== this.identity)
      .sort((a, b) => a.peer.length < b.peer.length ? 1 : -1);

    const activeRoomIndex = roomByGroup.findIndex((room) => room.name === this.currentRoomName);

    if (activeRoomIndex !== -1) {
      // move this room to top
      const [activeRoom] = roomByGroup.splice(activeRoomIndex, 1);
      roomByGroup.unshift(activeRoom);
    }

    (window as any).roomListUI = roomByGroup;
    return roomByGroup;
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
    const clickedRoom = {
      ...room,
      status: 'connecting'
    }
    const joinedRoom = this.roomService.joinRoom(clickedRoom);
    this.joinAudioRoom(joinedRoom.name, this.currentRoomName);
  }

  public leaveRoomChecker = new Subject();

  constructor(private socket: Socket,
    private authService: AuthService, private roomService: RoomService) {
    this.askForMicrophonePermission();
  }



  connect() {
    const email = this.authService.getProfile().email;
    this.initIdentity(email);
    this.socket.on('icecandidatechannel', (response: any) => {
      console.log(response);
      if (response.send_to === this.identity) {
        console.log('Received ice candidate');
        this.peerConnList.forEach((peerObj: any) => {
          if (peerObj.remote_user === response.send_from) {
            const rtcPeerConn = peerObj.peerObj;
            (rtcPeerConn as RTCPeerConnection).getSenders().forEach((sender) => {
              if (sender.track !== null) {
                console.log('set local track = sender track');
                jamAudio().localTrack = sender.track;
                jamAudio().sender = sender;
              }
            })
            rtcPeerConn.addIceCandidate(new RTCIceCandidate(response.candidate));
          }
        });
      }
    });
    this.socket.on('listallroom1', (response: RoomObject[]) => {
      console.log(response);
      // this.leaveRoomChecker.next();
      this.roomService.removeAllRooms();

      /**
       * If a new list rooms dont have room name that stored in `this.currentRoomName`
       * we need to leave that room named `currentRoomName`
       */
      // remove this, because on a room of two people, if one person leaves, then he/she can not rejoin
      // if (this.status === 'connected' && !response.find((room) => Object.keys(room)[0] == this.currentRoomName)) {
      //   this.leaveRoom();
      // }

      response.forEach(room => {
        const key = Object.keys(room)[0];
        const values = Object.keys(room).map(key1 => room[key1]);
        // console.log('list room ', room);
        const thisRoom = {
          room_name: key,
          peer: values[0],
          status: 'disconnect'
        } as any;
        const check1 = thisRoom.room_name === this.currentRoomName;
        console.log('Check if the current room is existed ', thisRoom.room_name, this.currentRoomName);
        if (check1) {
          console.log('Current Room is existed. ');
          const check2 = this.checkForUnusedConnection(thisRoom.peer);
          if (check2.length > 0) {
            console.log('There are unused connections, close & remove them ', check2);
            check2.forEach((removeConn) => {
              removeConn.peerObj.close();
              console.log('Remove connection', removeConn);
              this.peerConnList = this.peerConnList.filter((peerConnItem) => peerConnItem.remote_user !== removeConn.remote_user);
            });
          }
        }

        this.roomService.addRoom({
          id: new Date().getTime().toString(),
          name: thisRoom.room_name,
          peer: thisRoom.peer,
          // fix bug - status is always disconnected
          status: thisRoom.room_name === this.currentRoomName ? this.status : thisRoom.status,
          displayName: this.displayName(thisRoom.room_name),
          peerString: (thisRoom.peer as string[]).join(', ')
        });
      });

      // when the current connected room only has the current user as the last user, leave the room
      const currentRoom = this.roomService.getRoomList().find((r) => r.name === this.currentRoomName);
      console.log('Latest Current Room', currentRoom);
      if (currentRoom) {
        console.log('Set latest current room to local state.');
        this.roomService.setCurrentRoom(currentRoom);
        console.log('Check Local Current Room ', this.selectedRoom);
        console.log('Check for leave room, ', this.status, this.selectedRoom, this.currentRoomName, this.selectedRoom?.peer);
        if (this.status === 'connected' && this.selectedRoom?.name === this.currentRoomName && this.selectedRoom?.peer.length === 1) {
          console.log('leave room when status is connected && current room name === currentRoomName && the number of users in the room is 1');
          this.leaveRoom();
        } else {
          console.log('No need to execute leave room');
        }
      }

      /**
       * The app currently has an issue about duplicate identity, this issue should be fixed on backend side
       * But now we can temporary fix it on frontend for the demo
       */
      // this.cleanDuplicateIdentity();
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
                console.log('Track add', track);
                rtcPeerConn.addTrack(track, stream);
                if (track.kind === 'video') {
                  localStream.addTrack(track);
                }
              });
              if (this.streamView) {
                this.streamView.nativeElement.srcObject = localStream;
                jamAudio().localStream = localStream;
              }
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
            console.log('Track add', track);
            rtcPeerConnAnswer.addTrack(track, stream);
            if (track.kind === 'video') {
              localStream.addTrack(track);
            }
          });
          if (this.streamView) {
            this.streamView.nativeElement.srcObject = localStream;
            jamAudio().localStream = localStream;
          }
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

  public getPeerName(p: string) {
    if (p.includes('@')) {
      return p.split('@')[0];
    }
    return p;
  }

  public showPeers(peers: string | string[]) {
    // console.log(peers);
    if (typeof peers == 'object') {
      const usernames = peers.map(this.getPeerName);
      return usernames.join(', ');
    }
    return peers;
  }

  checkForUnusedConnection(latestPeerList: Array<string>): IConnection[] {
    let diff: IConnection[] = [];
    console.log('Current connection list. ', this.peerConnList);
    // loop through the local peer connection list to find the identity of removed user
    for (let currentPeerItem of this.peerConnList) {
      const currentUser = (currentPeerItem.remote_user as string);
      const check = latestPeerList.includes(currentUser);
      console.log('Check if the current user is in the latest peer list ', check, latestPeerList, currentPeerItem);
      if (!check) {
        console.log(`User ${currentUser} is not existed in the current peer`, currentPeerItem);
        diff.push(currentPeerItem);
      } else {
        console.log(`User ${currentUser} is existed in the current peer`, currentPeerItem);
      }
    }
    return diff;
  }

  showGreenOval(room: IRoom) {
    return room.status !== 'connected' && room?.peer?.length > 1;
  }
  showRedOval(room: IRoom) {
    return room.status === 'connected';
  }

  // add mute/unmute - start

  muted = false;
  mute() {
    console.log('mute');
    this.muted = true;
    jamAudio().mute();
  }

  unmute() {
    console.log('unmute');
    this.muted = false;
    jamAudio().unmute();
  }
  available = true;
  busy() {
    console.log('busy');
    this.available = false;
    jamAudio().away();
  }

  online() {
    console.log('online');
    this.available = true;
    jamAudio().back();
  }
  // add mute/unmute - end

  ngOnInit(): void {
    // FOR DEV, REMOVE FOR PROD
    if (!environment.production) {
      (window as any).room = this;
    }

    this.connect();
  }

  showLeaveRoomButton() {
    if (this.identity && this.currentRoomName && this.status === 'connected') {
      return true;
    }
    return false;
  }

  search(keyword: string) {
    this.roomService.setKeyword(keyword);
  }

  sendLeaveRequest(roomName: string) {
    this.socket.emit('leave', { user_identity: this.identity, current_room: roomName });
  }

  leaveRoom(roomName = this.currentRoomName) {
    console.log('leave room', this.currentRoomName);
    this.sendLeaveRequest(roomName);
    this.status = 'disconnect';
    //  add leave room handler
    // this.peerConnList.forEach((peerConnItem) => {
    //   peerConnItem.peerObj.close();
    // });
    // this.peerConnList = [];
    // console.log('Reconnect after leave.');
    // this.connect();

    // reload on leave
    window.location.reload();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: Event): any {
    // Your logic on beforeunload
    console.log(event);
    this.leaveRoom();
  }

  async onCreateAnswerNeeded(rtcPeerConn: RTCPeerConnection): Promise<any> {
    const answer = await rtcPeerConn.createAnswer();
    await rtcPeerConn.setLocalDescription(answer);
    return answer;
  }

  onAnswerReceive(rtcPeerConn: RTCPeerConnection, answer: any): void {
    console.log('Start processing answer');
    const sessionDesc = new RTCSessionDescription(answer);
    console.log('set remote description ', sessionDesc);
    rtcPeerConn.setRemoteDescription(sessionDesc);
    console.log('setRemoteDesc done');
  }

  private userMedia() {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  askForMicrophonePermission(): any {
    this.userMedia().then((res) => {
      console.log(res);
      if (res.active === true) {
        this.allowedGetUserMedia = true;
      }
    }).catch((err) => {
      console.warn(err);
    });
  }

  joinAudioRoom(roomName: string, currentRoomName: string): void {

    this.peerConnList = [];
    this.status = 'connecting';
    this.socket.emit('room', {
      command: 'join',
      args: {
        user_identity: this.identity,
        room_name: roomName,
        current_room_name: currentRoomName
      }
    });
    console.log('join room ', roomName, currentRoomName);
    this.currentRoomName = roomName;

    console.log(this.currentRoomName);
  }

  initIdentity(identity: any): void {
    this.identity = identity;
    this.currentRoomName = uuidv4();
    this.socket.emit('createnewroom',
      {
        user_identity: this.identity,
        room_name: this.currentRoomName
      }
    );
  }

  /**
  * Need to check whether this identity is being duplicated
  * If yes, leave those rooms
  */
  cleanDuplicateIdentity() {
    const joinedRooms = this.roomService.getRoomOfPeer(this.identity);

    joinedRooms?.forEach((joinedRoom) => {
      const isDuplicatedRoom = joinedRoom.name !== this.currentRoomName;
      if (this.allowedGetUserMedia) {
        if (isDuplicatedRoom) {
          this.isDuplicatedIdentity = true;
          this.sendLeaveRequest(joinedRoom.name);
        }
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
      jamAudio().remoteStream = remoteStreamObj;
    });

    rtcPeerConn.addEventListener('connectionstatechange', event => {
      if (rtcPeerConn.connectionState === 'connected') {
        // Peers connected!
        console.log('connected');
        this.status = 'connected';
        this.roomService.getRoomList().forEach((room: IRoom) => {
          if (room.name === this.currentRoomName) {
            this.roomService.updateRoom({
              ...room,
              status: 'connected',
              joined: true
            })
          }
        });
      }
    });
  }

  status: RoomStatus = 'disconnect';

  showList() {
    return this.identity;
    // && this.status !== 'connecting';
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
