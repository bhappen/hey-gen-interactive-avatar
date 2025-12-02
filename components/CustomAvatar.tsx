import {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar"
import { useEffect, useRef, useState } from "react"
import { useMemoizedFn, useUnmount } from "ahooks"

import { AvatarVideo } from "./AvatarSession/AvatarVideo"
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession"
import { AvatarControls } from "./AvatarSession/AvatarControls"
import { useVoiceChat } from "./logic/useVoiceChat"
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic"
import { LoadingIcon } from "./Icons"
import { MessageHistory } from "./AvatarSession/MessageHistory"

import { AVATARS } from "@/app/lib/constants"

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Medium,
  avatarName: AVATARS[0].avatar_id,
  knowledgeId: process.env.KNOWLEDGE_BASE_ID,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
}

function InteractiveAvatar({
  initialConfig,
  initialPreamble,
}: {
  initialConfig?: StartAvatarRequest
  initialPreamble?: string
}) {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession()
  const { startVoiceChat } = useVoiceChat()

  const [config, setConfig] = useState<StartAvatarRequest>(
    initialConfig ?? DEFAULT_CONFIG
  )

  const mediaStream = useRef<HTMLVideoElement>(null)

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      })
      const token = await response.text()

      console.log("Access Token:", token) // Log the token to verify

      return token
    } catch (error) {
      console.error("Error fetching access token:", error)
      throw error
    }
  }

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken()
      const avatar = initAvatar(newToken)

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e)
      })
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e)
      })
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected")
      })
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail)
        // Say a preamble once the stream is ready
        try {
          const preamble =
            initialPreamble ?? "Hello! I'm ready — how can I help you today?"
          if (preamble) {
            // speak asynchronously so we don't block
            avatar.speak({
              text: preamble,
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.ASYNC,
            })
          }
        } catch (err) {
          console.warn("Failed to send preamble:", err)
        }
      })
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event)
      })
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event)
      })
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log(">>>>> User end message:", event)
      })
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log(">>>>> User talking message:", event)
      })
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log(">>>>> Avatar talking message:", event)
      })
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log(">>>>> Avatar end message:", event)
      })

      await startAvatar(config)

      if (isVoiceChat) {
        await startVoiceChat()
      }
    } catch (error) {
      console.error("Error starting avatar session:", error)
      // ensure UI can retry
      setStartedByUser(false)
    }
  })

  useUnmount(() => {
    stopAvatar()
  })

  const [startedByUser, setStartedByUser] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = async () => {
        try {
          // attempt to play — this should succeed if user previously interacted
          await mediaStream.current!.play()
          setPlaybackError(null)
        } catch (err: any) {
          console.warn("Autoplay blocked or play failed:", err)
          setPlaybackError(
            "Playback blocked by browser. Click the video to start audio."
          )
        }
      }
    }
  }, [stream])

  // Reset started state when the session becomes inactive so users can restart
  useEffect(() => {
    if (sessionState === StreamingAvatarSessionState.INACTIVE) {
      setStartedByUser(false)
      setPlaybackError(null)
    }
  }, [sessionState])

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          <AvatarVideo ref={mediaStream} />
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : (
            <div className="flex items-center gap-3">
              {!startedByUser ? (
                <button
                  className="px-4 py-2 bg-emerald-600 rounded text-white"
                  onClick={async () => {
                    if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
                      return
                    }
                    setStartedByUser(true)
                    await startSessionV2(false)
                  }}
                >
                  Start Session
                </button>
              ) : (
                <LoadingIcon />
              )}
              {playbackError && (
                <div className="text-sm text-yellow-300">{playbackError}</div>
              )}
            </div>
          )}
        </div>
      </div>
      {sessionState === StreamingAvatarSessionState.CONNECTED && (
        <MessageHistory />
      )}
    </div>
  )
}

export default function CustomAvatar({
  basePath,
  initialConfig,
  initialPreamble,
}: {
  basePath?: string
  initialConfig?: StartAvatarRequest
  initialPreamble?: string
}) {
  return (
    <StreamingAvatarProvider
      basePath={basePath ?? process.env.NEXT_PUBLIC_BASE_API_URL}
    >
      <InteractiveAvatar
        initialConfig={initialConfig}
        initialPreamble={initialPreamble}
      />
    </StreamingAvatarProvider>
  )
}
