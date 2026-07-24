import React from "react"
import ChatInterface from "@/components/chat"

const Page = async ({ params }: { params: Promise<{ slugId: string }> }) => {
  const { slugId } = await params
  return (
    <div>
      <ChatInterface key={slugId} isProjectPage={true} slugId={slugId} />
    </div>
  )
}

export default Page
