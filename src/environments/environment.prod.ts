export const environment = {
  production: true,
  // backendUrl: 'https://192.168.1.181:5000',
  backendUrl: 'https://simple-sjam.autonomous.ai',
  // backendUrl: 'https://35.238.40.36:5000',
  mediaServerConfiguration: {
    iceServers: [
      {
        urls: 'turn:35.214.95.239:1609?transport=udp',
        username: 'Ty1',
        credential: 'password'
      },
      {
        urls: 'stun:35.214.95.239:1609',
      },
    ]
  }
};
