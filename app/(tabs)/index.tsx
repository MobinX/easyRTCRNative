import { Image, StyleSheet, Platform } from 'react-native';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, {useEffect, useState} from 'react';
import {
  Button,
  SafeAreaView,
  View,
} from 'react-native';
import { mediaDevices, RTCView, MediaStream as WebRTCMediaStream } from 'react-native-webrtc';

export default function HomeScreen() {
  const [localStream, setLocalStream] = useState<WebRTCMediaStream | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const result = await requestMultiple([
        PERMISSIONS.ANDROID.CAMERA,
        PERMISSIONS.ANDROID.RECORD_AUDIO
      ]);
      return result;
    } else if (Platform.OS === 'ios') {
      const result = await requestMultiple([
        PERMISSIONS.IOS.CAMERA,
        PERMISSIONS.IOS.MICROPHONE
      ]);
      return result;
    }
  };

  useEffect(() => {
    const getLocalStream = async () => {
      console.log('Getting local stream');
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        console.log('Local stream obtained');
        console.log(stream);
        console.log(stream.getVideoTracks());
        setLocalStream(stream);
      } catch (error) {
        console.error('Error getting local stream:', error);
      }
    };

    const setupStream = async () => {
      await requestPermissions();
      getLocalStream();
    };
    
    setupStream();

    return () => {
      if (localStream) {
        localStream.release();
      }
    };
  }, []); // Remove localStream from dependencies

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12'
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: </ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this starter app.
        </ThemedText>
      </ThemedView>
    
    
      <SafeAreaView style={styles.videoContainer}>
        {localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.videoStream}
            objectFit="cover"
          />
        )}
      </SafeAreaView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  videoContainer: {
    height: 300,
    width: '100%',
  },
  videoStream: {
    flex: 1,
    height: 300,
    width: '100%',
  },
});
