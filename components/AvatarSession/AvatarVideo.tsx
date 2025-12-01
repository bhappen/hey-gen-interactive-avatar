import React, { forwardRef } from "react"
import { ConnectionQuality } from "@heygen/streaming-avatar"

import { useConnectionQuality } from "../logic/useConnectionQuality"
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession"
import { StreamingAvatarSessionState } from "../logic"
import { CloseIcon } from "../Icons"
import { Button } from "../Button"

export const AvatarVideo = forwardRef<HTMLVideoElement>(({}, ref) => {
  const { sessionState, stopAvatar } = useStreamingAvatarSession()
  const { connectionQuality } = useConnectionQuality()

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED

  return (
    <>
      {connectionQuality !== ConnectionQuality.UNKNOWN && (
        <div className="absolute top-3 left-3 bg-black text-white rounded-lg px-3 py-2">
          Connection Quality: {connectionQuality}
        </div>
      )}
      {isLoaded && (
        <Button
          className="absolute top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-10"
          onClick={() => {
            stopAvatar()
          }}
        >
          <CloseIcon />
        </Button>
      )}
      <video
        ref={ref}
        autoPlay
        playsInline
        onClick={async () => {
          try {
            // try to play on user click to recover from autoplay block
            // @ts-ignore
            await (ref as any)?.current?.play()
          } catch (err) {
            console.warn("Click-to-play failed:", err)
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      >
        <track kind="captions" />
      </video>
    </>
  )
})
AvatarVideo.displayName = "AvatarVideo"
