import React from 'react';
import { RTCView as OriginalRTCView, MediaStream } from 'react-native-webrtc';

export default function RTCView({ stream, ...props }: { stream: MediaStream, [key: string]: any }) {
  return <OriginalRTCView streamURL={stream.toURL()} {...props} />;
}