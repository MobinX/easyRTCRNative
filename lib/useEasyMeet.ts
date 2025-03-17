import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { WebrtcBase } from "./webrtcBase";
import { MediaStream } from "react-native-webrtc";
import { Platform } from "react-native";

export interface EasyMeetCameraInterface {
  webRTCBaseRef: MutableRefObject<WebrtcBase | null>;
  error: { type: string; message: string } | null;
  isVideoOn: boolean;
  videoStream: MediaStream | null;
  isSystemReady: boolean;
  isFrontCamera: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
}

/**
 * This hook provides simple camera functionality using WebRTC
 * @param selfID The id of the current user
 * @param iceServers The list of ice servers to be used for webrtc
 * @returns Object containing camera controls and state
 */
export const useEasyMeet = (
  selfID: string,
  iceServers: any[] = []
): EasyMeetCameraInterface => {
  const webRTCBaseRef = useRef<WebrtcBase | null>(null);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [error, setError] = useState<{
    type: string;
    message: string;
  } | null>(null);

  // Dummy function for server messages (not used in this simplified version)
  const dummySocketMsgFn = () => {};

  // Initialize webrtc system
  useEffect(() => {
    if (!webRTCBaseRef.current) {
      try {
        webRTCBaseRef.current = new WebrtcBase(
          selfID,
          { iceServers: iceServers },
          dummySocketMsgFn
        );

        webRTCBaseRef.current.onError((err: any) => {
          setError({ type: "webrtc-error", message: err });
        });

        webRTCBaseRef.current.onCameraVideoStateChange(
          (state: boolean, stream: MediaStream | null) => {
            setIsVideoOn(state);
            setVideoStream(stream);
          }
        );

        setIsSystemReady(true);
        console.log("Camera system initialized");
      } catch (e) {
        console.error("Failed to initialize camera system:", e);
        setError({ type: "sys-error", message: "Failed to initialize camera system" });
      }
    }
  }, [iceServers, selfID]);

  // Start camera with specific facing mode
  const startCamera = useCallback(async () => {
    if (webRTCBaseRef.current) {
      try {
        await webRTCBaseRef.current.startCamera({
          video: {
            width: 1280,
            height: 720,
            facingMode: isFrontCamera ? 'user' : 'environment',
          }
        });
      } catch (err) {
        console.error("Failed to start camera:", err);
        setError({ type: "camera-error", message: "Failed to start camera" });
      }
    } else {
      setError({ type: "sys-error", message: "Camera system is not ready" });
    }
  }, [webRTCBaseRef, isFrontCamera]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (webRTCBaseRef.current) {
      webRTCBaseRef.current.stopCamera();
    } else {
      setError({ type: "sys-error", message: "Camera system is not ready" });
    }
  }, [webRTCBaseRef]);

  // Toggle camera on/off
  const toggleCamera = useCallback(async () => {
    if (webRTCBaseRef.current) {
      if (isVideoOn) {
        webRTCBaseRef.current.stopCamera();
      } else {
        await startCamera();
      }
    } else {
      setError({ type: "sys-error", message: "Camera system is not ready" });
    }
  }, [webRTCBaseRef, isVideoOn, startCamera]);

  // Switch between front and back cameras
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

  return {
    webRTCBaseRef,
    error,
    isVideoOn,
    videoStream,
    isSystemReady,
    isFrontCamera,
    startCamera,
    stopCamera,
    toggleCamera,
    switchCamera,
  };
};