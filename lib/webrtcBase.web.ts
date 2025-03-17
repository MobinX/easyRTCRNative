
import { Platform } from 'react-native';
import 'react-native-get-random-values'; 

interface PeerStateChangedHandler {
  (
    peerState: {
      socketId: string;
      info: any;
      isAudioOn: boolean;
      isVideoOn: boolean;
      isScreenShareOn: boolean;
      audioStream: MediaStream | null;
      videoStream: MediaStream | null;
      screenShareStream: MediaStream | null;
      isPolite: boolean;
    }[]
  ): void;
}

export interface peerState {
  socketId: string;
  info: any;
  isAudioOn: boolean;
  isVideoOn: boolean;
  isScreenShareOn: boolean;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  isPolite: boolean;
}
export interface FileState {
  fileId: string;
  totalSize: number;
  completedSize: number;
  progress: number;
  fileName: string;
  transferSpeed: number;
  lastTimeStamp: number;
  peerId: string;
  receivedArrayBuffer: any[];
}

export class WebrtcBase {
  private _iceConfiguration: RTCConfiguration | null = null;
  // local tracks
  private _audioTrack: MediaStreamTrack | null = null;
  private _videoTrack: MediaStreamTrack | null = null;
  private _screenShareTrack: MediaStreamTrack | null = null;
  // peer states

  private _peerConnections: { [id: string]: RTCPeerConnection | null } = {};
  private _peerConnectionsForScreenShare: {
    [id: string]: RTCPeerConnection | null;
  } = {};

  private _peers_ids: { [id: string]: string | null } = {};
  private _peersInfo: { [id: string]: any | null } = {};
  private _politePeerStates: { [id: string]: boolean } = {};
  private _remoteScreenShareTrackIds: { [id: string]: string | null } = {};

  private _offferMakingStatePeers: { [id: string]: boolean } = {};
  private _offferMakingStatePeersForScreenShare: { [id: string]: boolean } = {};

  // file transfers
  private _fileStates: { [fileid: string]: FileState } = {};
  private _fileTransferingDataChennels: {
    [fileid: string]: RTCDataChannel | null;
  } = {};
  private _fileTransferingPeers: { [fileid: string]: string | null } = {}; // get peer id by file id
  private _fileSendingReqCallbacks: Function | null = null;
  private _pendingFiles: { [fileid: string]: any } = {};
  private _fileTransferingFileReaders: { [fileid: string]: FileReader } = {};

  // remote tracks
  private _remoteAudioStreams: { [id: string]: MediaStream | null } = {};
  private _remoteVideoStreams: { [id: string]: MediaStream | null } = {};
  private _remoteScreenShareStreams: { [id: string]: MediaStream | null } = {};
  private _rtpVideoSenders: { [id: string]: any } = {};
  private _rtpScreenShareSenders: { [id: string]: any } = {};
  private _rtpAudioSenders: { [id: string]: any } = {};

  // local controls
  private _isAudioMuted: boolean = true;
  private _isVideoMuted: boolean = true;
  private _isScreenShareMuted: boolean = true;
  // soceket id and msg sending fn
  private _serverFn: Function;
  private _my_connid: string = "";

  private _dataChannels: { [id: string]: RTCDataChannel  | null } = {};

  // callback functions array

  private _onCameraVideoStateChanged: Function[] = [];
  private _onScreenShareVideoStateChanged: Function[] = [];
  private _onAudioStateChanged: Function[] = [];
  private _onPeerStateChanged: PeerStateChangedHandler[] = [];
  private _onDataChannelMsgCallback: Function[] = [];
  private _onFileStateChanged: Function[] = [];
  private _onFileTransferCompleted: Function[] = [];

  private _onError: Function[] = [];

  constructor(
    my_connid: string,
    iceConfiguration: RTCConfiguration,
    serverFn: Function
  ) {
    // Register WebRTC globals if needed
    // registerGlobals();
    
    this._my_connid = my_connid;
    this._serverFn = serverFn;
    this._iceConfiguration = iceConfiguration;
  }

  // connections management
  async createConnection(
    connid: string,
    politePeerState: boolean,
    extraInfo: any | null = null
  ) {
    if (this._iceConfiguration && !this._peerConnections[connid]) {
      let connection = new RTCPeerConnection(this._iceConfiguration);

      connection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this._serverFn(
            JSON.stringify({ iceCandidate: event.candidate }),
            connid
          );
        }
      });

      connection.addEventListener('icecandidateerror', (event) => {
        console.log(connid + " onicecandidateerror", event);
        // this._emitError("Failed to Gather ICE Candidate");
      });

      connection.addEventListener('icegatheringstatechange', (event) => {
        console.log(connid + " onicegatheringstatechange", event);
      });

      connection.addEventListener('iceconnectionstatechange', () => {
        console.log(
          connid + " peer ice connection state: ",
          connection.iceConnectionState
        );
        if (connection.iceConnectionState === "failed") {
          connection.restartIce();
        }
      });

      if (politePeerState) {
       (this._dataChannels[connid] as unknown as RTCDataChannel) = connection.createDataChannel(connid);
        if (this._dataChannels[connid]) {
          this._dataChannels[connid].addEventListener('open', () => {
            console.log(connid + " data channel onopen");
          });
          this._dataChannels[connid].addEventListener('close', () => {
            console.log(connid + " data channel onclose");
          });
          this._dataChannels[connid].addEventListener('message', (event) => {
            console.log(connid + " data channel onmessage", event.data);
            this._emitDataChannelMsgCallback(connid, event.data);
          });
          this._dataChannels[connid].addEventListener('error', (event) => {
            console.log(connid + " data channel onerror", event);
            this._emitError("Data Channel Error, please refresh the page");
          });
        }
      }

      //create data channel
      connection.addEventListener('datachannel', (event) => {
        console.log(connid + " ondatachannel", event);
        if (event.channel.label.startsWith("file-")) {
          let fileid = event.channel.label.replace("file-", "");

          this._fileTransferingDataChennels[fileid] = event.channel;
          (this._fileTransferingDataChennels[fileid] as unknown as RTCDataChannel)?.addEventListener('open', () => {
            console.log(connid + " remote file data channel onopen");
          });
          (this._fileTransferingDataChennels[fileid] as unknown as RTCDataChannel)?.addEventListener('close', () => {
            console.log(connid + " remote file data channel onclose");
          });
          (this._fileTransferingDataChennels[fileid] as unknown as RTCDataChannel)?.addEventListener('message', (event) => {
            console.log(
              connid + "remote file data channel onmessage ",
              event.data
            );
            const dataSize = event.data instanceof ArrayBuffer ? event.data.byteLength : 
                            (event.data instanceof Blob ? event.data.size : 
                            (typeof event.data === 'string' ? event.data.length : 0));
            
            this._fileStates[fileid] = {
              ...this._fileStates[fileid],
              receivedArrayBuffer: this._fileStates[
                fileid
              ].receivedArrayBuffer.concat([event.data]),
              completedSize:
                this._fileStates[fileid].completedSize + dataSize,
              progress:
                (this._fileStates[fileid].completedSize /
                  this._fileStates[fileid].totalSize) *
                100,
              transferSpeed:
                dataSize /
                (Date.now() - this._fileStates[fileid].lastTimeStamp),
              lastTimeStamp: Date.now(),
            };
            console.log(
              this._fileStates[fileid].completedSize ==
                this._fileStates[fileid].totalSize
            );
            if (
              this._fileStates[fileid].completedSize ==
              this._fileStates[fileid].totalSize
            ) {
              let contentArrayblob = new Blob(
                this._fileStates[fileid].receivedArrayBuffer
              );
              let objectURL = URL.createObjectURL(contentArrayblob);
              console.log(objectURL);
              this._emitFileTransferCompleted(
                this._fileStates[fileid],
                objectURL
              );
              return;
            }
            this._emitFileStateChange(fileid);

          });
          (this._fileTransferingDataChennels[fileid] as unknown as RTCDataChannel)?.addEventListener('error', (event) => {
            console.log(connid + "file data channel onerror", event);
            this._emitError("Data Channel Error, please refresh the page");
          });

        this._dataChannels[connid] = event.channel;
        if (this._dataChannels[connid]) {
          this._dataChannels[connid].addEventListener('open', () => {
            console.log(connid + " data channel onopen");
          });
          this._dataChannels[connid].addEventListener('close', () => {
            console.log(connid + " data channel onclose");
          });
          this._dataChannels[connid].addEventListener('message', (event) => {
            console.log(connid + " data channel onmessage", event.data);
            this._emitDataChannelMsgCallback(connid, event.data);
          });
          this._dataChannels[connid].addEventListener('error', (event) => {
            console.log(connid + " data channel onerror", event);
            this._emitError("Data Channel Error, please refresh the page");
          });
        }
          this._emitError("Data Channel Error, please refresh the page");
        }
      });

      connection.addEventListener('negotiationneeded', async (event) => {
        console.log(connid + " onnegotiationneeded", event);
        await this._createOffer(connid);
      });

      connection.addEventListener('connectionstatechange', (event) => {
        console.log(
          connid + " onconnectionstatechange",
          connection.connectionState
        );
        if (connection.connectionState === "connected") {
          console.log(connid + " connected");
        }
        if (connection.connectionState === "disconnected") {
          console.log(connid + " disconnected");
        }
      });

      connection.addEventListener('track', (event) => {
        console.log(connid + " ontrack", event);
        if (!this._remoteVideoStreams[connid]) {
          this._remoteVideoStreams[connid] = new MediaStream();
        }

        if (!this._remoteAudioStreams[connid]) {
          this._remoteAudioStreams[connid] = new MediaStream();
        }
        if (!this._remoteScreenShareStreams[connid]) {
          this._remoteScreenShareStreams[connid] = new MediaStream();
        }

        if (event.track && event.track.kind == "video") {
          // if (
          //   this._remoteScreenShareTrackIds[connid] &&
          //   this._remoteScreenShareTrackIds[connid] == "CAMERA OFF"
          // ) {
          //   console.log("CAMERA OFF ", connid);
          //   this._remoteScreenShareStreams[connid]
          //     .getVideoTracks()
          //     .forEach((t) =>
          //       this._remoteScreenShareStreams[connid]?.removeTrack(t)
          //     );
          //   this._remoteScreenShareStreams[connid].addTrack(event.track);
          // } else if (
          //   this._remoteScreenShareTrackIds[connid] &&
          //   this._remoteScreenShareTrackIds[connid]?.startsWith("CAMERA ON")
          // ) {
          //   let cameraTrackId = this._remoteScreenShareTrackIds[connid].replace(
          //     "CAMERA ON-",
          //     ""
          //   );
          //   console.log("CAMERA ON ", connid, cameraTrackId);

          //   if (cameraTrackId != event.track.id) {
          //     console.log("CAMERA ON ", connid);
          //     this._remoteScreenShareStreams[connid]
          //       .getVideoTracks()
          //       .forEach((t) =>
          //         this._remoteScreenShareStreams[connid]?.removeTrack(t)
          //       );
          //     this._remoteScreenShareStreams[connid].addTrack(event.track);
          //   }
          // } else
          if (
            this._remoteScreenShareTrackIds[connid] &&
            event.track &&
            this._remoteScreenShareTrackIds[connid] == event.track.id
          ) {
            let scrID = this._remoteScreenShareTrackIds[connid];
            console.log(
              "SCREEN SHARE ON ",
              connid,
              scrID,
              event.track.id,
              scrID == event.track.id
            );

            this._remoteScreenShareStreams[connid]
              .getVideoTracks()
              .forEach((t) =>
                this._remoteScreenShareStreams[connid]?.removeTrack(t)
              );
            this._remoteScreenShareStreams[connid].addTrack(event.track);
          } else {
            console.log("Camera track", connid);
            this._remoteVideoStreams[connid]
              .getVideoTracks()
              .forEach((t) => this._remoteVideoStreams[connid]?.removeTrack(t));
            this._remoteVideoStreams[connid].addTrack(event.track);
            event.track.addEventListener('unmute', () => {
              console.log("update state: onunmute", connid);
              this._updatePeerState();
            });
            event.track.addEventListener('mute', () => {
              console.log("update state: onmute", connid);
              this._updatePeerState();
            });
            // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
          }
          console.log("update state: by video track");
          this._updatePeerState();
        }
        if (event.track && event.track.kind == "audio") {
          this._remoteAudioStreams[connid]
            .getAudioTracks()
            .forEach((t) => this._remoteAudioStreams[connid]?.removeTrack(t));
          this._remoteAudioStreams[connid].addTrack(event.track);
          // this._remoteAudioStreams[connid].getTracks().forEach(t => console.log(t));
          console.log("update state: by audio track");
          event.track.addEventListener('unmute', () => {
            console.log("update state: onunmute", connid);
            this._updatePeerState();
          });
          event.track.addEventListener('mute', () => {
            console.log("update state: onmute", connid);
            this._updatePeerState();
          });
          this._updatePeerState();
        }
      });

      let connectionForScreenShare = new RTCPeerConnection(
        this._iceConfiguration
      );
      console.log("creating connectionForScreenShare", connid);
      connectionForScreenShare.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this._serverFn(
            JSON.stringify({
              iceCandidate: event.candidate,
              forScreenShare: true,
            }),
            connid
          );
        }
      });

      connectionForScreenShare.addEventListener('icecandidateerror', (event) => {
        console.log(
          connid + " onicecandidateerror connectionForScreenShare",
          event
        );
        // this._emitError("Failed to Gather ICE Candidate");
      });

      connectionForScreenShare.addEventListener('icegatheringstatechange', (event) => {
        console.log(
          connid + " onicegatheringstatechange connectionForScreenShare",
          event
        );
      });

      connectionForScreenShare.addEventListener('iceconnectionstatechange', () => {
        console.log(
          connid + " connectionForScreenShare peer ice connection state: ",
          connectionForScreenShare.iceConnectionState
        );
        if (connectionForScreenShare.iceConnectionState === "failed") {
          connectionForScreenShare.restartIce();
        }
      });

      connectionForScreenShare.addEventListener('negotiationneeded', async (event) => {
        console.log(connid + " onnegotiationneeded", event);
        await this._createOffer(connid, true);
      });

      connectionForScreenShare.addEventListener('connectionstatechange', (event: any) => {
        console.log(
          connid + " connectionForScreenShare onconnectionstatechange",
          event?.currentTarget?.connectionState
        );
        if (event.currentTarget.connectionState === "connected") {
          console.log(connid + " connectionForScreenShare connected");
        }
        if (event.currentTarget.connectionState === "disconnected") {
          console.log(connid + " connectionForScreenShare disconnected");
        }
      });

      connectionForScreenShare.addEventListener('track', (event) => {
              console.log(connid + " connectionForScreenShare ontrack", event);
      
              if (!this._remoteScreenShareStreams[connid]) {
                this._remoteScreenShareStreams[connid] = new MediaStream();
              }
              this._remoteScreenShareStreams[connid]
                .getVideoTracks()
                .forEach((t) =>
                  this._remoteScreenShareStreams[connid]?.removeTrack(t)
                );
              if (event.track) {
                this._remoteScreenShareStreams[connid].addTrack(event.track);
              }
      
              // this._remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));
      
              console.log("update state: by video track");
              this._updatePeerState();
            });

      this._peers_ids[connid] = connid;
      this._peerConnections[connid] = connection;
      this._peerConnectionsForScreenShare[connid] = connectionForScreenShare;
      this._politePeerStates[connid] = politePeerState;

      if (extraInfo) {
        this._peersInfo[connid] = extraInfo;
      }

      if (this._videoTrack) {
        this._AlterAudioVideoSenders(this._videoTrack, this._rtpVideoSenders);
      }
      if (this._screenShareTrack) {
        // this._serverFn(
        //   JSON.stringify({ screenShareTrackId: this._screenShareTrack.id }),
        //   connid
        // );
        this._AlterAudioVideoSenders(
          this._screenShareTrack,
          this._rtpScreenShareSenders,
          true
        );
      }
      if (this._audioTrack) {
        this._AlterAudioVideoSenders(this._audioTrack, this._rtpAudioSenders);
      }

      console.log("createPeerConnection: update state", connid);
      this._updatePeerState();
    }
  }

  async _createOffer(connid: string, forScreenShare = false) {
    try {
      if (forScreenShare) {
        let connectionForScreenShare =
          this._peerConnectionsForScreenShare[connid];
        if (connectionForScreenShare != null) {
          this._offferMakingStatePeersForScreenShare[connid] = true;
          console.log(
            connid +
              " forScreenShare creating offer: connenction.signalingState:" +
              connectionForScreenShare?.signalingState
          );
          let offer = await connectionForScreenShare?.createOffer({});
          await connectionForScreenShare?.setLocalDescription(offer);
          this._serverFn(
            JSON.stringify({
              offer: connectionForScreenShare?.localDescription,
              forScreenShare: true,
            }),
            connid
          );
        }
        return;
      }
      let connection = this._peerConnections[connid];
      if (connection != null) {
        this._offferMakingStatePeers[connid] = true;
        console.log(
          connid +
            " creating offer: connenction.signalingState:" +
            connection?.signalingState
        );
        let offer = await connection?.createOffer({});
        await connection?.setLocalDescription(offer);
        this._serverFn(
          JSON.stringify({
            offer: connection?.localDescription,
            screenid: this._screenShareTrack?.id
              ? this._screenShareTrack?.id
              : null,
          }),
          connid
        );
      }
    } catch (err) {
      console.log(err);
      this._emitError("Internal Webrtc Error , please refresh the page");
    } finally {
      if (forScreenShare) {
        this._offferMakingStatePeersForScreenShare[connid] = false;
      } else {
        this._offferMakingStatePeers[connid] = false;
      }
    }
  }

  async onSocketMessage(
    message: any,
    from_connid: string,
    extraInfo: any | null = null
  ) {
    console.log(from_connid + " onSocketMessage", message);
    let msg = JSON.parse(message);
    if (msg.iceCandidate) {
      if (!this._peerConnections[from_connid]) {
        console.log(
          "peer " +
            from_connid +
            " not found , creating connection for ice candidate"
        );

        await this.createConnection(from_connid, false, extraInfo);
      }
      try {
        if (msg.forScreenShare) {
          await this._peerConnectionsForScreenShare[
            from_connid
          ]?.addIceCandidate(msg.iceCandidate);
        } else
          await this._peerConnections[from_connid]?.addIceCandidate(
            msg.iceCandidate
          );
      } catch (err) {
        console.log(err);
        // this._emitError("falled to add ice candidate");
      }
    } else if (msg.offer) {
      console.log(from_connid, " offer", msg.offer);
      if (!this._peerConnections[from_connid]) {
        console.log(
          "peer " + from_connid + " not found , creating connection for offer"
        );
        await this.createConnection(from_connid, false, extraInfo);
      }
      try {
        if (msg.screenid)
          this._remoteScreenShareTrackIds[from_connid] = msg.screenid;
        if (this._peerConnections[from_connid]) {
          if (
            msg.forScreenShare &&
            this._peerConnectionsForScreenShare[from_connid]
          ) {
            const offerCollision =
              this._offferMakingStatePeersForScreenShare[from_connid] ||
              this._peerConnectionsForScreenShare[from_connid]
                ?.signalingState !== "stable";
            if (offerCollision && !this._politePeerStates[from_connid]) {
              console.log("ignoring Offer", from_connid);
              return;
            }

            await this._peerConnectionsForScreenShare[
              from_connid
            ].setRemoteDescription(new RTCSessionDescription(msg.offer));
            let answer =
              await this._peerConnectionsForScreenShare[
                from_connid
              ].createAnswer();
            await this._peerConnectionsForScreenShare[
              from_connid
            ].setLocalDescription();
            this._serverFn(
              JSON.stringify({
                answer:
                  this._peerConnectionsForScreenShare[from_connid]
                    .localDescription,
                forScreenShare: true,
              }),
              from_connid
            );

            return;
          }

          const offerCollision =
            this._offferMakingStatePeers[from_connid] ||
            this._peerConnections[from_connid]?.signalingState !== "stable";
          if (offerCollision && !this._politePeerStates[from_connid]) {
            console.log("ignoring Offer", from_connid);
            return;
          }

          await this._peerConnections[from_connid].setRemoteDescription(
            new RTCSessionDescription(msg.offer)
          );
          let answer = await this._peerConnections[from_connid].createAnswer();
          await this._peerConnections[from_connid].setLocalDescription();
          this._serverFn(
            JSON.stringify({
              answer: this._peerConnections[from_connid].localDescription,
              screenid: this._screenShareTrack?.id
                ? this._screenShareTrack?.id
                : null,
            }),
            from_connid
          );
        }
      } catch (err) {
        console.log(err);
        this._emitError("Internal Webrtc Error , please refresh the page");
      }
    } else if (msg.answer) {
      try {
        if (this._peerConnections[from_connid]) {
          if (msg.screenid)
            this._remoteScreenShareTrackIds[from_connid] = msg.screenid;

          console.log(from_connid, " answer", msg.answer);
          if (
            msg.forScreenShare &&
            this._peerConnectionsForScreenShare[from_connid]
          ) {
            await this._peerConnectionsForScreenShare[
              from_connid
            ].setRemoteDescription(new RTCSessionDescription(msg.answer));
            return;
          }
          await this._peerConnections[from_connid].setRemoteDescription(
            new RTCSessionDescription(msg.answer)
          );
        }
      } catch (err) {
        console.log(err);
        this._emitError("Internal Webrtc Error , please refresh the page");
      }
    } else if (msg.screenShareTrackId) {
      console.log(from_connid, " screenShareTrackId", msg.screenShareTrackId);
      this._remoteScreenShareTrackIds[from_connid] = msg.screenShareTrackId;
      this._serverFn(JSON.stringify({ startSendingScreen: true }), from_connid);
    } else if (msg.startSendingScreen) {
      console.log(from_connid, " startSendingScreen", msg.startSendingScreen);
      // if (this._screenShareTrack && !this._isScreenShareMuted) {
      //   this._AlterAudioVideoSenders(
      //     this._screenShareTrack,
      //     this._rtpScreenShareSenders
      //   );
      // }
      if (this._isScreenShareMuted) await this._startScreenShare();
    } else if (msg.screenShareOff) {
      console.log(from_connid, " screenShareOff", msg.screenShareOff);
      if (this._remoteScreenShareStreams[from_connid]) {
        this._remoteScreenShareStreams[from_connid]
          .getTracks()
          .forEach((t) => t.stop && t.stop());
        this._remoteScreenShareStreams[from_connid] = null;
        this._updatePeerState();
      }
    }
  }

  _isConnectionAlive(connenction: RTCPeerConnection) {
    if (
      (connenction && connenction.connectionState == "connected") ||
      connenction.connectionState == "new" ||
      connenction.connectionState == "connecting"
    )
      return true;
    else return false;
  }

  closeConnection(connid: string) {
    if (this._peerConnections[connid]) {
      this._peers_ids[connid] = null;
      this._peerConnections[connid].close();
      this._peerConnections[connid] = null;
    }
    if (this._peerConnectionsForScreenShare[connid]) {
      this._peerConnectionsForScreenShare[connid].close();
      this._peerConnectionsForScreenShare[connid] = null;
    }
    if (this._remoteAudioStreams[connid]) {
      this._remoteAudioStreams[connid]
        .getTracks()
        .forEach((t) => t.stop && t.stop());
      this._remoteAudioStreams[connid] = null;
    }
    if (this._remoteVideoStreams[connid]) {
      this._remoteVideoStreams[connid]
        .getTracks()
        .forEach((t) => t.stop && t.stop());
      this._remoteVideoStreams[connid] = null;
    }
    if (this._remoteScreenShareStreams[connid]) {
      this._remoteScreenShareStreams[connid]
        .getTracks()
        .forEach((t) => t.stop && t.stop());
      this._remoteScreenShareStreams[connid] = null;
    }

    console.log("closed connection: updatePeerState", connid);

    this._updatePeerState();
  }

  onPeerStateChange(fn: PeerStateChangedHandler) {
    this._onPeerStateChanged.push(fn);
  }

  sendDataChannelMsg(conId: string, msg: any) {
    if (conId === "all") {
      for (let connid in this._peerConnections) {
        this._dataChannels[connid]?.send(JSON.stringify(msg));
      }
      return;
    }
    this._dataChannels[conId]?.send(JSON.stringify(msg));
  }

  onDataChannelMsg(fn: Function) {
    this._onDataChannelMsgCallback.push(fn);
  }

  onFileSendingReq(fn: (name: string, conId: string) => boolean) {
    this._fileSendingReqCallbacks = fn;
  }

  onFileStateChange(fn: (fileState: FileState) => void) {
    this._onFileStateChanged.push(fn);
  }
  _emitFileStateChange(fileID: string) {
    this._onFileStateChanged.forEach((fn) => fn(this._fileStates[fileID]));
  }

  onFileTransferCompleted(
    fn: (fileState: FileState, objectURl: string) => void
  ) {
    this._onFileTransferCompleted.push(fn);
  }

  _emitFileTransferCompleted(fileState: FileState, objectURl: string) {
    console.log("onFileTransferCompleted", fileState, objectURl);
    this._onFileTransferCompleted.forEach((fn) => fn(fileState, objectURl));
  }

  sendFile(to: string, file: File | Blob) {
    let fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this._fileStates[fileId] = {
      fileName: (file instanceof File) ? file.name : `File-${fileId}`,
      fileId: fileId,
      totalSize: file.size,
      completedSize: 0,
      progress: 0,
      lastTimeStamp: 0,
      transferSpeed: 0,
      peerId: to,
      receivedArrayBuffer: [],
    };
    this._pendingFiles[fileId] = file;
    this._dataChannels[to]?.send(
      JSON.stringify({
        type: "file_sending_request",
        data: this._fileStates[fileId],
      })
    );
  }

  _sendFileUsingDataChannel(conId: string, data: FileState, chunkSize = 10384) {
    try {
      if (!this._fileTransferingDataChennels[data.fileId]) {
        if (this._peerConnections[conId]) {
          this._fileTransferingDataChennels[data.fileId] =
            this._peerConnections[conId].createDataChannel(
              "file-" + data.fileId
            );
          if (this._fileTransferingDataChennels[data.fileId]) {
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.addEventListener('open', () => {
              console.log(conId + "file data channel onopen " + data.fileId);
            });
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.binaryType =
              "arraybuffer";
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.addEventListener('close', () => {
              console.log(conId + "file data channel onclose " + data.fileId);
              delete this._fileTransferingDataChennels[data.fileId];
            });
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.addEventListener('message', (e) => {
              console.log(conId + "file data channel onmessage " + data.fileId);
              let msg = JSON.parse(typeof(e.data) === "string" ? e.data : e.data.toString());
              // this._emitDataChannelMsgCallback(conId, msg);
            }); // though sender never get msg but sends msg

            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.addEventListener('error', (e) => {
              console.log(conId + "file data channel onerror " + data.fileId);
              this._emitError("Failed to transfer file " + data.fileName);
            });
          }
        } else {
          this._emitError(
            "Failed to transfer file " +
              data.fileName +
              " because peer is not connected"
          );
          return;
        }
      }
      //data channel created or existed , now work with file reader
      if (this._pendingFiles[data.fileId]) {
        if (!this._fileTransferingFileReaders[data.fileId]) {
          this._fileTransferingFileReaders[data.fileId] = new FileReader();
          this._fileTransferingFileReaders[data.fileId]!.onerror = (e) => {
            console.log("failed to read file " + data.fileName);
            this._emitError("Failed to read file " + data.fileName);
          };
          this._fileTransferingFileReaders[data.fileId]!.onabort = (e) => {
            console.log("failed to read file ,aborted " + data.fileName);
            this._emitError("Failed to read file , aborted " + data.fileName);
          };
        }
        this._fileTransferingFileReaders[data.fileId]!.onload = (e) => {
          console.log("read file " + data.fileName);
          if (e.target?.result && typeof e.target?.result != null) {
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)?.send(
              e.target?.result as ArrayBuffer
            );
            this._fileStates[data.fileId] = {
              ...this._fileStates[data.fileId],
              completedSize:
                this._fileStates[data.fileId].completedSize +
                (e.target?.result! as ArrayBuffer).byteLength,
              progress:
                (this._fileStates[data.fileId].completedSize /
                  this._fileStates[data.fileId].totalSize) *
                100,
              transferSpeed:
                (chunkSize * 8) /
                (Date.now() - this._fileStates[data.fileId].lastTimeStamp),
              lastTimeStamp: Date.now(),
            };
            
            if (
              this._fileStates[data.fileId].completedSize <
              this._fileStates[data.fileId].totalSize
            ) {
              readSlice(this._fileStates[data.fileId].completedSize);
            }
            if (
              this._fileStates[data.fileId].completedSize ==
              this._fileStates[data.fileId].totalSize
            ) {
              let contentArrayblob = new Blob(
                this._fileStates[data.fileId].receivedArrayBuffer
              );
              console.log(
                "data channel bufferedAmount",
                (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.bufferedAmount
              );

              let objectURL = URL.createObjectURL(this._pendingFiles[data.fileId]);
              this._emitFileTransferCompleted(
                this._fileStates[data.fileId],
                objectURL
              );

              return;
            }
            this._emitFileStateChange(data.fileId);
          }
        };
        const readSlice = (size: number) => {
          console.log("readSlice ", size);
          console.log(
            "data channel bufferedAmount remaining",

            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.bufferedAmount
          );
          if (
            (this._fileTransferingDataChennels[data.fileId] as unknown as RTCDataChannel)!.bufferedAmount >
            955350
          ) {
            // wait until data channel queue is empty by recursively cheking bufferedAmount
            console.log(
              "data channel buffer not empty , waiting for empty bufferedAmount"
            );
            setTimeout(() => readSlice(size), 50);

            return;
          }
          const slice = this._pendingFiles[data.fileId].slice(
            this._fileStates[data.fileId].completedSize,
            size + chunkSize
          );

          // before sending next slice , we need to ensure that data channel queue is not full

          this._fileTransferingFileReaders[data.fileId].readAsArrayBuffer(
            slice
          );
        };
        readSlice(0);
      }
    } catch (e) {
      this._emitError("Failed to transfer file " + data.fileName);
      return;
    }
  }

  _emitDataChannelMsgCallback(conId: string, msg: any) {
    let processedMsg = JSON.parse(msg);
    if (processedMsg.type == "file_sending_request") {
      let shouldContinue = true;

      if (this._fileSendingReqCallbacks) {
        let shouldContinue = this._fileSendingReqCallbacks(
          processedMsg.data.name,
          conId
        );
      }

      console.log("shouldContinue", shouldContinue);
      console.log("oi oiiii", conId);
      if (shouldContinue) {
        let fileData: FileState = processedMsg.data;
        this._fileStates[fileData.fileId] = fileData;
        console.log("shouldContinue", shouldContinue);
        this._dataChannels[conId]?.send(
          JSON.stringify({
            type: "file_sending_response",
            data: processedMsg.data,
          })
        );
      }
    } else if (processedMsg.type == "file_sending_response") {
      this._sendFileUsingDataChannel(conId, processedMsg.data);
    } else if (processedMsg.screenShareTrackId) {
      console.log(
        conId,
        " screenShareTrackId",
        processedMsg.screenShareTrackId
      );
      this._remoteScreenShareTrackIds[conId] = processedMsg.screenShareTrackId;
      this._dataChannels[conId]?.send(
        JSON.stringify({ startSendingScreen: true })
      );
    } else if (processedMsg.startSendingScreen) {
      console.log(
        conId,
        " startSendingScreen",
        processedMsg.startSendingScreen
      );
      if (this._screenShareTrack && !this._isScreenShareMuted) {
        this._AlterAudioVideoSenders(
          this._screenShareTrack,
          this._rtpScreenShareSenders
        );
      }
    } else {
      this._onDataChannelMsgCallback.forEach((fn) => fn(conId, msg));
    }
  }

  _updatePeerState() {
    let peerProperties: {
      socketId: string;
      info: any;
      isAudioOn: boolean;
      isVideoOn: boolean;
      isScreenShareOn: boolean;
      audioStream: MediaStream | null;
      videoStream: MediaStream | null;
      screenShareStream: MediaStream | null;
      isPolite: boolean;
    }[] = [];
    for (let connid in this._peerConnections) {
      if (this._peerConnections[connid]) {
        peerProperties.push({
          socketId: connid,
          info: this._peersInfo[connid],
          isAudioOn:
            this._remoteAudioStreams[connid] != null &&
            this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.enabled &&
            !this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.muted,
          isVideoOn:
            this._remoteVideoStreams[connid] != null &&
            this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.enabled &&
            !this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.muted,
          isScreenShareOn:
            this._remoteScreenShareStreams[connid] != null &&
            this._remoteScreenShareStreams[connid]?.getVideoTracks()[0]
              ?.enabled,
          audioStream: this._remoteAudioStreams[connid],
          videoStream: this._remoteVideoStreams[connid],
          screenShareStream: this._remoteScreenShareStreams[connid],
          isPolite: this._politePeerStates[connid],
        });
      }
    }

    this._onPeerStateChanged.forEach((fn) => fn(peerProperties));
  }

  getAllPeerDetails() {
    let peerProperties: {
      socketId: string;
      info: any;
      isAudioOn: boolean;
      isVideoOn: boolean;
      isScreenShareOn: boolean;
      audioStream: MediaStream | null;
      videoStream: MediaStream | null;
      screenShareStream: MediaStream | null;
      isPolite: boolean;
    }[] = [];
    for (let connid in this._peerConnections) {
      if (this._peerConnections[connid]) {
        peerProperties.push({
          socketId: connid,
          info: this._peersInfo[connid],
          isAudioOn:
            this._remoteAudioStreams[connid] != null &&
            this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.enabled &&
            !this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.muted,
          isVideoOn:
            this._remoteVideoStreams[connid] != null &&
            this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.enabled &&
            !this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.muted,
          isScreenShareOn:
            this._remoteScreenShareStreams[connid] != null &&
            this._remoteScreenShareStreams[connid]?.getVideoTracks()[0]
              ?.enabled,
          audioStream: this._remoteAudioStreams[connid],
          videoStream: this._remoteVideoStreams[connid],
          screenShareStream: this._remoteScreenShareStreams[connid],
          isPolite: this._politePeerStates[connid],
        });
      }
    }

    return peerProperties;
  }

  getPeerDetailsById(connid: string) {
    if (this._peerConnections[connid]) {
      return {
        socketId: connid,
        info: this._peersInfo[connid],
        isAudioOn:
          this._remoteAudioStreams[connid] != null &&
          this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.enabled &&
          !this._remoteAudioStreams[connid]?.getAudioTracks()[0]?.muted,
        isVideoOn:
          this._remoteVideoStreams[connid] != null &&
          this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.enabled &&
          !this._remoteVideoStreams[connid]?.getVideoTracks()[0]?.muted,
        isScreenShareOn:
          this._remoteScreenShareStreams[connid] != null &&
          this._remoteScreenShareStreams[connid]?.getVideoTracks()[0]?.enabled,
        audioStream: this._remoteAudioStreams[connid],
        videoStream: this._remoteVideoStreams[connid],
        screenShareStream: this._remoteScreenShareStreams[connid],
        isPolite: this._politePeerStates[connid],
      };
    } else return null;
  }

  _AlterAudioVideoSenders(
    track: MediaStreamTrack,
    rtpSenders: any,
    forScreenShare: boolean = false
  ) {
    if (forScreenShare) {
      for (let conId in this._peers_ids) {
        if (
          this._peerConnectionsForScreenShare[conId] &&
          this._isConnectionAlive(this._peerConnectionsForScreenShare[conId])
        ) {
          if (rtpSenders[conId] && rtpSenders[conId].track) {
            rtpSenders[conId].replaceTrack(track);
          } else {
            rtpSenders[conId] =
              this._peerConnectionsForScreenShare[conId].addTrack(track);
          }
        }
      }
      return;
    }
    for (let conId in this._peers_ids) {
      if (
        this._peerConnections[conId] &&
        this._isConnectionAlive(this._peerConnections[conId])
      ) {
        if (rtpSenders[conId] && rtpSenders[conId].track) {
          rtpSenders[conId].replaceTrack(track);
        } else {
          rtpSenders[conId] = this._peerConnections[conId].addTrack(track);
        }
      }
    }
  }

  _RemoveAudioVideoSenders(rtpSenders: any, forScreenShare: boolean = false) {
    for (let conId in this._peers_ids) {
      if (forScreenShare) {
        if (
          this._peerConnectionsForScreenShare[conId] &&
          this._isConnectionAlive(this._peerConnectionsForScreenShare[conId])
        ) {
          if (rtpSenders[conId] && rtpSenders[conId].track) {
            this._peerConnectionsForScreenShare[conId].removeTrack(
              rtpSenders[conId]
            );
            rtpSenders[conId] = null;
          }
        }
        return;
      }
      if (
        this._peerConnections[conId] &&
        this._isConnectionAlive(this._peerConnections[conId])
      ) {
        if (rtpSenders[conId] && rtpSenders[conId].track) {
          this._peerConnections[conId].removeTrack(rtpSenders[conId]);
          rtpSenders[conId] = null;
        }
      }
    }
  }

  _ClearCameraVideoStreams(_rtpVideoSenders: any) {
    if (this._videoTrack) {
      this._videoTrack.enabled = false;
      this._videoTrack.stop();
      this._videoTrack = null;
      this._RemoveAudioVideoSenders(_rtpVideoSenders);
    }
  }

  _ClearScreenVideoStreams(_rtpScreenSenders: any) {
    if (this._screenShareTrack) {
      this._screenShareTrack.enabled = false;
      this._screenShareTrack.stop();
      this._screenShareTrack = null;
      this._RemoveAudioVideoSenders(_rtpScreenSenders, true);
    }
  }

  async startCamera(
    cameraConfig: { video: boolean | { width: number; height: number; facingMode?: string }} = {
      video: {
        width: 640,
        height: 480,
        facingMode: 'user', // 'user' for front camera, 'environment' for back camera
      }
    }
  ) {
    try {
      // Using react-native-webrtc's mediaDevices instead of navigator.mediaDevices
      let videoStream = await navigator.mediaDevices.getUserMedia({
        video: cameraConfig.video,
        audio: false, // Handle audio separately
      });

      this._ClearCameraVideoStreams(this._rtpVideoSenders);
      if (videoStream && videoStream.getVideoTracks().length > 0) {
        this._videoTrack = videoStream.getVideoTracks()[0];
        this._emitCameraVideoState(true);
        this._AlterAudioVideoSenders(this._videoTrack, this._rtpVideoSenders);
      }
      this._isVideoMuted = false;
    } catch (e) {
      console.log(e);
      this._emitError(
        "Failed to start camera, maybe permission denied, Please Allow"
      );
    }
  }

  _emitCameraVideoState(state: boolean) {
    this._onCameraVideoStateChanged.forEach((fn) =>
      fn(state, this._videoTrack && new MediaStream([this._videoTrack]))
    );
  }

  onCameraVideoStateChange(
    fn: (state: boolean, stream: MediaStream | null) => void
  ) {
    this._onCameraVideoStateChanged.push(fn);
  }

  _emitScreenShareState(state: boolean) {
    this._onScreenShareVideoStateChanged.forEach((fn) =>
      fn(
        state,
        this._screenShareTrack && new MediaStream([this._screenShareTrack])
      )
    );
  }

  onScreenShareVideoStateChange(
    fn: (state: boolean, stream: MediaStream | null) => void
  ) {
    this._onScreenShareVideoStateChanged.push(fn);
  }

  _emitAudioState(state: boolean) {
    this._onAudioStateChanged.forEach((fn) =>
      fn(state, this._audioTrack && new MediaStream([this._audioTrack]))
    );
  }

  onAudioStateChange(fn: (state: boolean, stream: MediaStream | null) => void) {
    this._onAudioStateChanged.push(fn);
  }

  stopCamera() {
    this._ClearCameraVideoStreams(this._rtpVideoSenders);
    this._emitCameraVideoState(false);
    this._isVideoMuted = true;
  }

  async toggleCamera(
    cameraConfig: { video: boolean | { width: number; height: number; facingMode?: string }} = {
      video: {
        width: 640,
        height: 480,
        facingMode: 'user', // 'user' for front camera, 'environment' for back camera
      }
    }
  ) {
    if (this._isVideoMuted) await this.startCamera(cameraConfig);
    else this.stopCamera();
  }

  async _startScreenShare() {
    let screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
    if (screenStream && screenStream.getVideoTracks().length > 0) {
      this._isScreenShareMuted = false;
      console.log("start screen share");
      this._screenShareTrack = screenStream.getVideoTracks()[0];
      this._emitScreenShareState(true);
      this._AlterAudioVideoSenders(
        this._screenShareTrack,
        this._rtpScreenShareSenders
      );
    }
  }

  async startScreenShare(
    screenConfig: { video: boolean | { width: number; height: number; }; audio: boolean; } = {
      video: true,
      audio: false,
    }
  ) {
    try {
      // Screen sharing implementation differs between iOS and Android
      if (Platform.OS === 'android') {
        // For Android, we may need additional libraries or methods
        // This is a placeholder for actual implementation
        console.log("Screen sharing on Android requires additional setup");
        this._emitError("Screen sharing not fully implemented for this platform");
        return;
      } else if (Platform.OS === 'ios') {
        // For iOS, Broadcast Extension is required
        // This is a placeholder for actual implementation
        console.log("Screen sharing on iOS requires Broadcast Extension");
        this._emitError("Screen sharing not fully implemented for this platform");
        return;
      }

      // Fallback generic approach - may not work on all platforms
      let videoStream = await navigator.mediaDevices.getDisplayMedia?.();
      
      if (!videoStream) {
        this._emitError("Screen sharing not supported on this platform");
        return;
      }

      this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
      if (videoStream && videoStream.getVideoTracks().length > 0) {
        this._screenShareTrack = videoStream.getVideoTracks()[0];

        this._screenShareTrack.addEventListener('ended', () => {
          console.log("onended screen share");
          this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
          this._emitScreenShareState(false);
          this._isScreenShareMuted = true;
          for (let connid in this._peerConnections)
            this._serverFn(
              JSON.stringify({
                screenShareOff: true,
              }),
              connid
            );
        });

        this._emitScreenShareState(true);
        this._AlterAudioVideoSenders(
          this._screenShareTrack,
          this._rtpScreenShareSenders,
          true
        );
      }
      this._isScreenShareMuted = false;
    } catch (e) {
      console.log(e);
      this._emitError(
        "Failed to start screen share, maybe permission denied or not supported"
      );
    }
  }

  stopScreenShare() {
    this._ClearScreenVideoStreams(this._rtpScreenShareSenders);
    this._emitScreenShareState(false);
    this._isScreenShareMuted = true;
    for (let connid in this._peerConnections)
      this._serverFn(
        JSON.stringify({
          screenShareOff: true,
        }),
        connid
      );
  }

  async toggleScreenShare(
    screenConfig: { video: boolean | { width: number; height: number; }; audio: boolean; } = {
      video: true,
      audio: false,
    }
  ) {
    if (this._isScreenShareMuted) await this.startScreenShare(screenConfig);
    else this.stopScreenShare();
  }

  async startAudio() {
    try {
      if (!this._audioTrack) {
        // Using react-native-webrtc's mediaDevices
        let audioStream = await navigator.mediaDevices.getUserMedia({ 
          video: false,
          audio: true,
        });
        this._audioTrack = audioStream.getAudioTracks()[0];
      }

      if (this._isAudioMuted) {
        this._audioTrack.enabled = true;
        this._isAudioMuted = false;
        this._AlterAudioVideoSenders(this._audioTrack, this._rtpAudioSenders);
        this._emitAudioState(true);
      }
    } catch (e) {
      console.log(e);
      this._emitError(
        "Failed to start audio, maybe permission denied, Please Allow"
      );
    }
  }

  async stopAudio() {
    if (this._audioTrack) {
      this._audioTrack.enabled = false;
      this._isAudioMuted = true;
      this._RemoveAudioVideoSenders(this._rtpAudioSenders);
      this._emitAudioState(false);
    }
  }
  async toggleAudio() {
    if (this._isAudioMuted) await this.startAudio();
    else await this.stopAudio();
  }

  isLocalAudioOn() {
    return !this._isAudioMuted;
  }

  isLocalVideoOn() {
    return !this._isVideoMuted;
  }

  isLocalScreenShareOn() {
    return !this._isScreenShareMuted;
  }

  // callback handlers
  onError(fn: Function) {
    this._onError.push(fn);
  }
  _emitError(error: any) {
    this._onError.forEach((fn) => fn(error));
  }
}