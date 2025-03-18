import React from 'react';
/* eslint-disable-next-line camelcase */
import { unstable_createElement } from 'react-native-web';



export default function RTCView({ stream, ...props }: { stream: MediaStream | null; [key: string]: any }) {


    interface AudioProps extends React.HTMLProps<HTMLAudioElement> {
    playsInline?: boolean;
  }
  
  const Audio = React.forwardRef<HTMLAudioElement, AudioProps>((props, ref) =>
    unstable_createElement('audio', { ...props, ref }),
  );
  Audio.displayName = 'Audio';
  const audioRef = React.createRef<HTMLAudioElement>();
  React.useEffect(() => {
    if (stream && audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, audioRef]);

  return (
    <Audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ flex: 1 }}
      {...props}
    />
  );
}
