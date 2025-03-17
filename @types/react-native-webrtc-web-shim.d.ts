declare module 'react-native-webrtc-web-shim' {
  export const MediaStream: any;
  export const MediaStreamTrack: any;
  export const RTCPeerConnection: any;
  export const RTCIceCandidate: any;
  export const RTCSessionDescription: any;
  export const mediaDevices: any;
  export const registerGlobals: () => void;
}