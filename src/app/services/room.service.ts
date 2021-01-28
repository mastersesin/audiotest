import { Injectable } from '@angular/core';

export interface IRoom {
  id: string;
  name: string;
  peer: string | string[];
  status: string;
  hovered?: boolean;
  joined?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private selectedRoom: IRoom | undefined;

  constructor() {
    this.rooms = [...this.dummyRooms];
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

  joinRoom(room: IRoom) {
    this.resetJoined();
    room.joined = true;
    this.setCurrentRoom(room);

    return room;
  }

  getRoomList() {
    return this.rooms;
  }

  addRoom(room: IRoom) {
    this.rooms.push(room);
  }

  updateRoom(room: IRoom) {
    const roomIndex = this.rooms.findIndex((r) => r.id === room.id);
    this.rooms[roomIndex] = { ...room };
  }

  removeRoom(room: IRoom) {
    this.rooms = [...this.rooms].filter(r => r.id !== room.id);
  }
}
