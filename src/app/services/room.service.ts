import { Injectable } from '@angular/core';

export interface IRoom {
  id: string;
  name: string;
  peer: string | string[];
  status: string;
  hovered?: boolean;
  joined?: boolean;
  displayName?: string;
  peerString?: string;
}

export interface IFilter {
  keyword: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private selectedRoom: IRoom | undefined;

  constructor() {
    (window as any).rooms = this.rooms;
    // this.rooms = [...this.dummyRooms];
  }

  private dummyRooms: IRoom[] = [
    {
      id: '1',
      name: 'duc',
      peer: '',
      status: ''
    },
    {
      id: '2',
      name: 'duy',
      peer: '',
      status: ''
    },
    {
      id: '3',
      name: 'vuong',
      peer: '',
      status: ''
    },
    {
      id: '4',
      name: 'ty',
      peer: '',
      status: ''
    },
    {
      id: '5',
      name: 'kien',
      peer: '',
      status: ''
    },
    {
      id: '6',
      name: 'bao',
      peer: '',
      status: ''
    },
  ]

  private rooms: IRoom[] = [];

  getCurrentRoom() {
    return this.selectedRoom;
  }

  private setCurrentRoom(room: IRoom) {
    this.selectedRoom = { ...room };
    this.updateRoom(room);
  }

  private resetJoined() {
    this.rooms = [...this.rooms].map((r) => ({
      ...r,
      joined: false
    }));
  }

  createNewRoomList(roomList: IRoom[]) {
    this.rooms = [];
    this.rooms = [...roomList];
    console.log('this rooms ', this.rooms);
  }

  removeAllRooms() {
    this.rooms = [];
  }

  joinRoom(room: IRoom) {
    this.resetJoined();
    room.joined = true;
    this.setCurrentRoom(room);

    return room;
  }

  private filter: IFilter = {
    keyword: ''
  };

  setKeyword(value: string) {
    this.filter.keyword = value + '';
  }

  private roomList() {
    // console.log('get room list');
    if (this.filter.keyword === '') {
      // console.log(this.rooms);
      return this.rooms;
    }
    // console.log(this.rooms);
    const filtered = this.rooms.filter((r) => r.peerString?.includes(this.filter.keyword));
    // console.log(filtered);
    return filtered;
  }

  getRoomList() {
    const connectedRoom = this.roomList().find((r) => r.status === 'connected');
    if (connectedRoom) {
      // console.log('connected room ', connectedRoom);
      const disconnectRooms = this.roomList().filter((r) => r.status !== 'connected');
      return [connectedRoom, ...disconnectRooms];
    }
    return this.roomList();
  }

  addRoom(room: IRoom) {
    console.log('current rooms', this.rooms);
    console.log('added room', room);
    const existedRoom = this.rooms.find((r) => r.name === room.name);
    console.log(existedRoom);
    if (existedRoom) {
      console.log('update room (1)', room);
      this.updateRoom(room);
    } else {
      const check = this.rooms.find((r) => r.peerString === room.peerString);
      if (check) {
        console.log('update room (2)', room);
        this.updateRoom(room);
        return;
      }
      console.log('add new room', room);
      this.rooms.push(room);
    }
  }

  updateRoom(room: IRoom) {
    const roomIndex = this.rooms.findIndex((r) => r.name === room.name);
    if (roomIndex < 0) {
      const roomIndex = this.rooms.findIndex((r) => r.peerString === room.peerString);
      this.rooms[roomIndex] = { ...room };
    } else {
      this.rooms[roomIndex] = { ...room };
    }
  }

  removeRoom(room: IRoom) {
    this.rooms = [...this.rooms].filter(r => r.name !== room.name);
  }
}
