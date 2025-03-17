import React from 'react';
/* eslint-disable-next-line camelcase */
import { unstable_createElement } from 'react-native-web';



export default function RTCView({ stream, ...props }: { stream: MediaStream | null; [key: string]: any }) {


    interface VideoProps extends React.HTMLProps<HTMLVideoElement> {
    playsInline?: boolean;
  }
  
  const Video = React.forwardRef<HTMLVideoElement, VideoProps>((props, ref) =>
    unstable_createElement('video', { ...props, ref }),
  );
  Video.displayName = 'Video';
  const videoRef = React.createRef<HTMLVideoElement>();
  React.useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <Video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ flex: 1 }}
      {...props}
    />
  );
}
