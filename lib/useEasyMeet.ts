import {
    MutableRefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
  } from "react";
  import { FileState, peerState, WebrtcBase } from "./webrtcBase";
  import { MediaStream as NMediaStream, registerGlobals } from "react-native-webrtc";
import { Platform } from "react-native";
  
if(Platform.OS !== "web"){  

  registerGlobals();
}

  export interface easyMeetInterface {
    webRTCBaseRef: MutableRefObject<WebrtcBase | null>;
    error: { type: "sys-error" | "webrtc-error"; message: string } | null;
    onSocketMessage: (message: string, from_connid: string, extraInfo: any | null) => Promise<void>;
    startCamera: (cameraConfig?: { width: number; height: number; facingMode: "user" | "environment" }) => Promise<void>;
    stopCamera: Function;
    isFrontCamera: boolean;
    switchCamera: () => Promise<void>;
    startScreenShare: (screenConfig?: { video: { width: number; height: number; }; audio: boolean; }) => Promise<void>;
    stopScreenShare: Function;
    toggleCamera: (cameraConfig?: { video: boolean| { width: number; height: number; } }) => Promise<void>;
    toggleScreenShare: (screenConfig?: { video: boolean | { width: number; height: number; }; audio: boolean; }) => Promise<void>;
    startAudio: Function;
    stopAudio: Function;
    toggleAudio: () => Promise<void>;
    isLocalAudioOn: () => boolean | undefined;
    isLocalVideoOn: () => boolean | undefined;
    isLocalScreenShareOn: () => boolean | undefined;
    joinExistingPeer: Function;
    joinNewPeer: Function;
    leavePeer: Function;
    isAudioOn: boolean;
    isVideoOn: boolean;
    isScreenShareOn: boolean;
    audioStream: MediaStream | NMediaStream | null;
    videoStream: MediaStream | NMediaStream | null;
    screenShareStream: MediaStream | NMediaStream | null;
    newDataChannelMsg: { from: string; msg: string } | null;
    fileSharingCompleted: { file: FileState; objectUrl: string } | null;
    fileSharingState: FileState | null;
    isSystemReady: boolean;
    peers: peerState[];
    sendDataChannelMsg: (msg: string, toID: string) => void;
    sendFile: (to: string, file: File) => void;
  }
  
  /**
   * This hook provides the necessary methods and states for easy-to-use webrtc functionality. It is designed to be used in react applications. The hook returns all the necessary states and methods for webrtc functionality.
   * @param selfID The id of the current user.
   * @param iceServers The list of ice servers to be used for webrtc.
   * @param socketMsgFn The function to be called when a webrtc system need to send a message.
   * @param onFileSendingReq The callback function to decide whether to allow or deny a file sending request.
   * @returns {
   * webRTCBaseRef: MutableRefObject<WebrtcBase | null>
   * error: {type:"sys-error"| "webrtc-error", message:string} | null
   * onSocketMessage: Function
   * startCamera: Function
   * stopCamera: Function
   * startScreenShare: Function
   * stopScreenShare: Function
   * toggleCamera: Function
   * toggleScreenShare: Function
   * startAudio: Function
   * stopAudio: Function
   * toggleAudio: Function
   * isLocalAudioOn: () => boolean | undefined
   * isLocalVideoOn: () => boolean | undefined
   * isLocalScreenShareOn: () => boolean | undefined
   * joinExistingPeer: Function
   * joinNewPeer: Function
   * leavePeer: Function
   * isAudioOn: boolean
   * isVideoOn: boolean
   * isScreenShareOn: boolean
   * audioStream: MediaStream | NMediaStream | null
   * videoStream: MediaStream | NMediaStream | null
   * screenShareStream: MediaStream | NMediaStream | null
   * newDataChannelMsg: {from: string; msg: string} | null
   * fileSharingCompleted: {file:FileState , objectUrl: string} | null
   * fileSharingState: FileState | null
   * isSystemReady: boolean  
   * }
   */
  export const useEasyMeet = (
    selfID: string,
    iceServers: any[],
    socketMsgFn: Function,
    onFileSendingReq: (name: string, conId: string) => boolean = () => true
  ): easyMeetInterface => {
    const webRTCBaseRef = useRef<WebrtcBase | null>(null);
    const [isSystemReady, setIsSystemReady] = useState(false);
    const [peers, setPeers] = useState<peerState[]>([]);
    const [isAudioOn, setIsAudioOn] = useState<boolean>(false);
    const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);

    const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
    const [isScreenShareOn, setIsScreenShareOn] = useState<boolean>(false);
    const [audioStream, setAudioStream] = useState<MediaStream | NMediaStream | null>(null);
    const [videoStream, setVideoStream] = useState<MediaStream | NMediaStream | null>(null);
    const [screenShareStream, setScreenShareStream] =
      useState<MediaStream | NMediaStream | null>(null);
    const [newDataChannelMsg, setDataChennelMsg] = useState<{
      from: string;
      msg: string;
    } | null>(null);
    const [fileSharingState, setFileSharingState] = useState<FileState | null>(
      null
    );
    const [fileSharingCompleted, setFileSharingCompleted] = useState<{
      file: FileState;
      objectUrl: string;
    } | null>(null);
    const [error, setError] = useState<{
      type: "sys-error" | "webrtc-error";
      message: string;
    } | null>(null);
  
    //init webrtc system
    useEffect(() => {
      if (!webRTCBaseRef.current) {
        webRTCBaseRef.current = new WebrtcBase(
          selfID,
          { iceServers: iceServers },
          socketMsgFn
        );
        webRTCBaseRef.current.onError((err:any) => {
          setError({ type: "webrtc-error", message: err });
        });
        webRTCBaseRef.current.onPeerStateChange((peersState: peerState[]) => {
          setPeers(peersState);
        });
        webRTCBaseRef.current.onAudioStateChange(
          (state: boolean, stream: MediaStream | NMediaStream | null) => {
            setIsAudioOn(state);
            setAudioStream(stream);
          }
        );
        webRTCBaseRef.current.onCameraVideoStateChange(
          (state: boolean, stream: MediaStream | NMediaStream | null) => {
            setIsVideoOn(state);
            setVideoStream(stream);
          }
        );
        webRTCBaseRef.current.onScreenShareVideoStateChange(
          (state: boolean, stream: MediaStream | NMediaStream | null) => {
            setIsScreenShareOn(state);
            setScreenShareStream(stream);
          }
        );
        webRTCBaseRef.current.onDataChannelMsg((fromId:any, msg:any) => {
          setDataChennelMsg({ from: fromId, msg: msg });
        });
        webRTCBaseRef.current.onFileSendingReq((name, conId) => {
          return onFileSendingReq(name, conId);
        });
        webRTCBaseRef.current.onFileStateChange((fileState) => {
          setFileSharingState(fileState);
        });
        webRTCBaseRef.current.onFileTransferCompleted((fileState, objectURl) => {
          console.log("HOOK :onFileTransferCompleted", fileState, objectURl);
          setFileSharingCompleted({ file: fileState, objectUrl: objectURl });
        });
  
        setIsSystemReady(true);
        console.log("Webrtc System is ready");
      }
    }, [iceServers, selfID, socketMsgFn, onFileSendingReq]);
  
    // all functions and callbacks
    const joinExistingPeer = useCallback(
      (peerID: string, extraData: any = null) => {
        if (webRTCBaseRef.current) {
          webRTCBaseRef.current.createConnection(peerID, false, extraData);
        } else {
          setError({ type: "sys-error", message: "Webrtc System is not ready" });
        }
      },
      [webRTCBaseRef]
    );
    const joinNewPeer = useCallback(
      (peerID: string, extraData: any = null) => {
        if (webRTCBaseRef.current) {
          webRTCBaseRef.current.createConnection(peerID, true, extraData);
        } else {
          setError({ type: "sys-error", message: "Webrtc System is not ready" });
        }
      },
      [webRTCBaseRef]
    );
    const leavePeer = useCallback(
      (peerID: string) => {
        if (webRTCBaseRef.current) {
          webRTCBaseRef.current.closeConnection(peerID);
        } else {
          setError({ type: "sys-error", message: "Webrtc System is not ready" });
        }
      },
      [webRTCBaseRef]
    );
  
    const onSocketMessage = useCallback(
      async (message: string, from_connid: string, extraInfo: any = null) => {
        if (webRTCBaseRef.current) {
          await webRTCBaseRef.current.onSocketMessage(message, from_connid, extraInfo);
        } else {
          setError({ type: "sys-error", message: "Webrtc System is not ready" });
        }
      },
      [webRTCBaseRef]
    );
  
    const startCamera = useCallback(
      async (
        cameraConfig:{ width: number; height: number; facingMode?: 'user' | 'environment' } = {
          width: 1280,
          height: 720,
          facingMode: 'user' // or 'environment' based on the context
        }
      ) => {
        if (webRTCBaseRef.current) {
            try{
          await webRTCBaseRef.current.startCamera({
            video: {
              width: cameraConfig.width,
              height: cameraConfig.height,
              facingMode: cameraConfig.facingMode || (isFrontCamera ? 'user' : 'environment')
            }
          });
        } catch (err) {
            console.error("Failed to start camera:", err);
            setError({ type: "sys-error", message: "Failed to start camera" });
          }

        } else {
          setError({ type: "sys-error", message: "Webrtc System is not ready" });
        }
      },
      [webRTCBaseRef,isFrontCamera]
    );
  
    const stopCamera = useCallback(() => {
      if (webRTCBaseRef.current) {
        webRTCBaseRef.current.stopCamera();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);

    const switchCamera = useCallback(async () => {
        if (webRTCBaseRef.current) {
          // First stop current camera
          if (isVideoOn) {
            webRTCBaseRef.current.stopCamera();
          }
          
          // Toggle camera type
          setIsFrontCamera(prev => !prev);
          
          // Wait a moment before starting the new camera
          setTimeout(async () => {
            await webRTCBaseRef.current?.startCamera({
              video: {
                width: 1280,
                height: 720,
                facingMode: !isFrontCamera ? 'user' : 'environment',
              }
            });
          }, 300);
        } else {
          setError({ type: "sys-error", message: "Camera system is not ready" });
        }
      }, [webRTCBaseRef, isFrontCamera, isVideoOn]);
    
  
    const startScreenShare = useCallback(async ( screenConfig: { video: boolean | { width: number; height: number; }; audio: boolean; } = {
      video: true,
      audio: false,
    }) => {
      if (webRTCBaseRef.current) {
        await webRTCBaseRef.current.startScreenShare(screenConfig);
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const stopScreenShare = useCallback(async () => {
      if (webRTCBaseRef.current) {
        webRTCBaseRef.current.stopScreenShare();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const toggleCamera = useCallback(async (cameraConfig: { video: boolean | { width: number; height: number; }} = { video: true }) => {
      if (webRTCBaseRef.current) {
        await webRTCBaseRef.current.toggleCamera(cameraConfig);
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const toggleScreenShare = useCallback(async (screenConfig: { video: boolean | { width: number; height: number; }; audio: boolean; }={ video: true, audio: false }) => {
      if (webRTCBaseRef.current) {
        await webRTCBaseRef.current.toggleScreenShare(screenConfig);
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const startAudio = useCallback(async () => {
      if (webRTCBaseRef.current) {
        await webRTCBaseRef.current.startAudio();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const stopAudio = useCallback(() => {
      if (webRTCBaseRef.current) {
        webRTCBaseRef.current.stopAudio();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const toggleAudio = useCallback(async () => {
      if (webRTCBaseRef.current) {
        await webRTCBaseRef.current.toggleAudio();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const isLocalAudioOn = useCallback(() => {
      if (webRTCBaseRef.current) {
        return webRTCBaseRef.current.isLocalAudioOn();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const isLocalVideoOn = useCallback(() => {
      if (webRTCBaseRef.current) {
        return webRTCBaseRef.current.isLocalVideoOn();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const isLocalScreenShareOn = useCallback(() => {
      if (webRTCBaseRef.current) {
        return webRTCBaseRef.current.isLocalScreenShareOn();
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [webRTCBaseRef]);
  
    const sendDataChannelMsg = useCallback((msg:any,toID:string)=>{
      if (webRTCBaseRef.current) {
        webRTCBaseRef.current.sendDataChannelMsg(toID,msg);
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, [])
  
    const sendFile = useCallback((to: string, file: File) => {
      if (webRTCBaseRef.current) {
        console.log("sendFile", to, file);
        webRTCBaseRef.current.sendFile(to, file);
      } else {
        setError({ type: "sys-error", message: "Webrtc System is not ready" });
      }
    }, []);
  
    return {
      peers,
      webRTCBaseRef,
      error,
      onSocketMessage,
      startCamera,
      stopCamera,
      startScreenShare,
      stopScreenShare,
      toggleCamera,
      toggleScreenShare,
      startAudio,
      isFrontCamera,
      switchCamera,
      stopAudio,
      toggleAudio,
      isLocalAudioOn,
      isLocalVideoOn,
      isLocalScreenShareOn,
      joinExistingPeer,
      joinNewPeer,
      leavePeer,
      isAudioOn,
      isVideoOn,
      isScreenShareOn,
      audioStream,
      videoStream,
      screenShareStream,
      newDataChannelMsg,
      fileSharingCompleted,
      fileSharingState,
      isSystemReady,
      sendDataChannelMsg,
      sendFile
    };
  };