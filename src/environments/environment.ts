// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
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
      }
    ]
  }
  // mediaServerConfiguration: {
  //   iceServers: [
  //     {
  //       urls: 'turn:34.123.205.86:1609?transport=udp',
  //       username: 'Ty1',
  //       credential: 'password'
  //     },
  //     {
  //       urls: 'stun:34.123.205.86:1609',
  //     },
  //   ]
  // }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
