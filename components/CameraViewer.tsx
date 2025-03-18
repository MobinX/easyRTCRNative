import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useEasyMeet } from '@/lib/useEasyMeet';
import { Ionicons } from '@expo/vector-icons';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import RTXView from '@/lib/RTXView';
import Ably from "ably";

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

interface CameraViewerProps {
  userId?: string;
}

export const CameraViewer: React.FC<CameraViewerProps> = ({ userId = 'user1' }) => {
  // Initialize Ably client
  const ably = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const isInit = useRef<boolean>(false);

  const {
    isVideoOn,
    videoStream,
    isSystemReady,
    isFrontCamera,
    startCamera,
    toggleCamera,
    switchCamera,
    toggleAudio,
    isAudioOn,
    joinExistingPeer,
    joinNewPeer,
    leavePeer,
    onSocketMessage,
    peers,
    error,
    initSys
  } = useEasyMeet();


  // Request permissions when component mounts
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await requestMultiple([
          PERMISSIONS.ANDROID.CAMERA,
          PERMISSIONS.ANDROID.RECORD_AUDIO
        ]);
      } else if (Platform.OS === 'ios') {
        await requestMultiple([
          PERMISSIONS.IOS.CAMERA,
          PERMISSIONS.IOS.MICROPHONE
        ]);
      }
    };

    requestPermissions();
  }, []);

  // Set up video call connections
  useEffect(() => {
    if (!isInit.current) {
      const init = async () => {
        let IceServers: any = null;
        try {
          const response = await fetch("https://virsys.metered.live/api/v1/turn/credentials?apiKey=9fb58d67a3a41d96bbc3f2450196d0e7125d");
          const servers = await response.json();
          IceServers = servers;
          console.log("1.ICE ", IceServers);

          // Initialize Ably
          if (!ably.current) {
            ably.current = new Ably.Realtime({ key: 'YSXfdw.ksCpsA:Bf6jKYu4LPPpMfiFkSMJrZ4q4ArLDkuBf7bJCPxKQUo', clientId: Math.random().toString(36).substring(7) })
            ably.current.connection.once('connected').then(() => {
              console.log('2. Connected to Ably!');
              // Create a channel if it doesn't exist
              if (!channelRef.current) {
                channelRef.current = ably.current!.channels.get("xvc_xdc");
                async function sendmsg(msg: any, to: any) {
                  console.log("sendmsg", msg, to);
                  try {
                    await channelRef.current?.publish('greeting', { data: msg, clientId: ably.current?.auth.clientId, to: to });
                    console.log('message sent: ', msg);
                  }
                  catch (err) {
                    console.log(err)
                    alert("something went wrong pls , try again or refresh")
                  }
                }
                initSys(
                  ably.current!.auth.clientId,
                  IceServers,
                  sendmsg
                )
                // Enter presence
                channelRef.current?.presence.enter({ name: getRandomInt(1000000).toString() });

                // Subscribe to messages
                channelRef.current?.subscribe('greeting', async (message) => {
                  if (message.clientId === ably.current?.auth.clientId) {
                    return; // Ignore own messages
                  }

                  if (message.data.to === ably.current?.auth.clientId) {
                    console.log('Message received from:', message.clientId);
                    await onSocketMessage(message.data.data, message.clientId!, null);
                  }
                });

                // Listen for users entering
                channelRef.current?.presence.subscribe('enter', async (member) => {
                  if (member.clientId === ably.current?.auth.clientId) {
                    return;
                  }
                  console.log("New user connected:", member);
                  joinNewPeer(member.clientId, { name: member.data.name });
                });

                // Listen for users leaving
                channelRef.current?.presence.subscribe('leave', async (member) => {
                  if (member.clientId === ably.current?.auth.clientId) {
                    return;
                  }
                  console.log("User left:", member);
                  leavePeer(member.clientId);
                });

                // Get existing users
                channelRef.current?.presence.get().then((otherUsers: any) => {
                  console.log("Existing users:", otherUsers);
                  if (otherUsers) {
                    for (let i = 0; i < otherUsers.length; i++) {
                      if (otherUsers[i].clientId !== ably.current?.auth.clientId) {
                        joinExistingPeer(otherUsers[i].clientId, { name: otherUsers[i].data.name });
                      }
                    }
                  }
                });


                isInit.current = true;
              }
            });
          }
        } catch (error) {
          console.error("Failed to fetch ICE servers:", error);
        }
      }
      init();
    }
  }, [isSystemReady, channelRef, ably, joinExistingPeer, joinNewPeer, leavePeer, onSocketMessage]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => startCamera()}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isSystemReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Initializing system...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isVideoOn && videoStream ? (
        <RTXView
          stream={videoStream}
          style={styles.localVideoStream}
        />
      ) : (
        <View style={styles.noVideoContainer}>
          <Ionicons name="videocam-off" size={64} color="#888" />
          <Text style={styles.noVideoText}>Camera is off</Text>
        </View>
      )}

      {/* Remote peer videos */}
      {peers.length > 0 && (
        <ScrollView horizontal style={styles.remoteVideosContainer}>
          {peers.map((peer) => (
            <View key={peer.socketId} style={styles.remotePeerContainer}>
              {peer.videoStream ? (
                <RTXView
                  stream={peer.videoStream}
                  style={styles.remoteVideoStream}
                />
              ) : (
                <View style={styles.remotePeerPlaceholder}>
                  <Ionicons name="person" size={32} color="#888" />
                </View>
              )}
              <Text style={styles.peerName}>{peer.socketId}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isVideoOn ? styles.activeButton : {}]}
          onPress={() => toggleCamera()}
        >
          <Ionicons
            name={isVideoOn ? "videocam" : "videocam-off"}
            size={28}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isVideoOn ? 'Stop Cam' : 'Start Camera'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isAudioOn ? styles.activeButton : {}]}
          onPress={toggleAudio}
        >
          <Ionicons
            name={isAudioOn ? "mic" : "mic-off"}
            size={28}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isAudioOn ? 'Mute' : 'Unmute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isVideoOn ? {} : styles.disabledButton]}
          onPress={switchCamera}
          disabled={!isVideoOn}
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
  localVideoStream: {
    width: '100%',
    height: '70%',
  },
  remoteVideosContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    height: 150,
  },
  remotePeerContainer: {
    width: 120,
    height: 150,
    marginHorizontal: 5,
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
  },
  remoteVideoStream: {
    width: 120,
    height: 120,
  },
  remotePeerPlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#444',
  },
  peerName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    padding: 2,
  },
  // ...existing code...
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

/*i open this app using two android device. when for the first time i start camera (start camra button calls toggleCamera()) on one device vedio is shown to another device . means video is sending and signaling and all things working. BUT when i stop camera (button calls toggle) , the other device shows my vedio is frized and then when i again open the camera, the other device still shows that freeze picture. it also happen whene i switch camera , the other device's video freeze at previous camera. Explain why this is happening and how can i solve this*/