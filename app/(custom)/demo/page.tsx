"use client"
import CustomAvatar from "@/components/CustomAvatar"
import {
  AvatarQuality,
  VoiceEmotion,
  VoiceChatTransport,
  STTProvider,
  ElevenLabsModel,
  StartAvatarRequest,
} from "@heygen/streaming-avatar"
import { AVATARS } from "@/app/lib/constants"

export default function App() {
  const initialConfig: StartAvatarRequest = {
    quality: AvatarQuality.Medium,
    avatarName: AVATARS[0].avatar_id,
    knowledgeId: process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID,
    voice: {
      rate: 1.2,
      emotion: VoiceEmotion.EXCITED,
      model: ElevenLabsModel.eleven_flash_v2_5,
    },
    language: "en",
    voiceChatTransport: VoiceChatTransport.WEBSOCKET,
    sttSettings: {
      provider: STTProvider.DEEPGRAM,
    },
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_API_URL

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="w-[900px] flex flex-col items-start justify-start gap-5 mx-auto pt-4 pb-20">
        <div className="w-full">
          <CustomAvatar
            basePath={basePath}
            initialConfig={initialConfig}
            initialPreamble={
              "Hello, I'm Brenda. I'm here to help you understand your rights, obligations and guide you through the processes within the areas of Saskatchewan Human Rights, Occupational Health and Safety, Employment Services and WCB in the province of Saskatchewan."
            }
          />
        </div>
      </div>
    </div>
  )
}
