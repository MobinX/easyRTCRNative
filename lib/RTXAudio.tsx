import React, { useEffect } from 'react';
import { View } from 'react-native';
import { MediaStream } from 'react-native-webrtc';

interface RTXAudioProps {
  stream: MediaStream;
  [key: string]: any;
}

export default function RTXAudio({ stream }: RTXAudioProps) {
  useEffect(() => {
    // Audio tracks are automatically handled by react-native-webrtc
    // This component just serves as a wrapper for organization
    return () => {
      // Cleanup if needed when component unmounts
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = false;
        track.stop();
      });
    };
  }, [stream]);

  // Return empty view with zero dimensions
  return <View style={{ width: 0, height: 0 }} />;
}