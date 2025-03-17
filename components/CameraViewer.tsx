import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';

// import { useEasyMeet } from '../lib/useEasyMeet';
import { Ionicons } from '@expo/vector-icons';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
// import RTXView from '@/lib/RTXView';

interface CameraViewerProps {
  userId?: string;
}

export const CameraViewer: React.FC<CameraViewerProps> = ({ userId = 'user1' }) => {
  // const {
  //   isVideoOn,
  //   videoStream,
  //   isSystemReady,
  //   isFrontCamera,
  //   startCamera,
  //   toggleCamera,
  //   switchCamera,
  //   error,
  // } = useEasyMeet(
  //   userId,
  //   [{ urls: 'stun:stun.l.google.com:19302' }],
  //   (msg:any) => console.log(msg)
    
  // );

  // // Request permissions when component mounts
  // useEffect(() => {
  //   const requestPermissions = async () => {
  //     if (Platform.OS === 'android') {
  //       await requestMultiple([
  //         PERMISSIONS.ANDROID.CAMERA,
  //         PERMISSIONS.ANDROID.RECORD_AUDIO
  //       ]);
  //     } else if (Platform.OS === 'ios') {
  //       await requestMultiple([
  //         PERMISSIONS.IOS.CAMERA,
  //         PERMISSIONS.IOS.MICROPHONE
  //       ]);
  //     }
  //   };
    
  //   requestPermissions();
  // }, []);

  // Auto-start camera when system is ready
//   useEffect(() => {
//     if (isSystemReady && !isVideoOn) {
//       startCamera();
//     }
//   }, [isSystemReady, isVideoOn, startCamera]);

  // if (error) {
  //   return (
  //     <View style={styles.errorContainer}>
  //       <Text style={styles.errorText}>Error: {error.message}</Text>
  //       <TouchableOpacity style={styles.button} onPress={() => startCamera()}>
  //         <Text style={styles.buttonText}>Try Again</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // }

  // if (!isSystemReady) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#0000ff" />
  //       <Text style={styles.loadingText}>Initializing camera...</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      {/* {isVideoOn && videoStream ? (
        // <RTXView
        //   stream={videoStream as MediaStream}
         
        //   style={styles.videoStream}
        // />
        <View
          style={styles.videoStream}
          >
            </View>
      ) : ( */}
        <View style={styles.noVideoContainer}>
          <Ionicons name="videocam-off" size={64} color="#888" />
          <Text style={styles.noVideoText}>Camera is </Text>
        </View>
      {/* )} */}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, true ? styles.activeButton : {}]}
          onPress={() => {}}
          // onPress={isVideoOn ? toggleCamera : startCamera}
        >
          <Ionicons
            // name={isVideoOn ? "videocam" : "videocam-off"}
            name="videocam"
            size={28}
            color="white"
          />
          <Text style={styles.buttonText}>
            {/* {isVideoOn ? 'Stop Cam' : 'Start Camera'}
             */}
            Start Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          // style={[styles.controlButton, isVideoOn ? {} : styles.disabledButton]}
          // onPress={switchCamera}
          // disabled={!isVideoOn}
          style={[styles.controlButton, {}]}
        >
          <Ionicons name="camera-reverse" size={28} color="white" />
          <Text style={styles.buttonText}>Switch Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoStream: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 15,
    borderRadius: 30,
    marginHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  activeButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#888',
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  noVideoText: {
    color: '#888',
    marginTop: 10,
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
});
