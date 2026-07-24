export type ProjectEngineSettings = {
  contentDepth: string
  creativityLevel: string
  generationMode: string
  generationPlatform?: string
  layoutComplexity: string
  modelProvider: string
  styleIntensity: string
}

export type ProjectMetadata = {
  engineSettings?: ProjectEngineSettings
}

export type PageViewport = {
  id: string
  label: string
  width: number
  height: number
}

export type PageMetadata = {
  tags?: string[]
  viewports?: PageViewport[]
}

export type PageType = {
  id: string
  name: string
  rootStyles: string
  htmlContent: string
  metadata?: PageMetadata
  position?: number
  isLoading: boolean
  isTemporary?: boolean
  error?: string
  projectId?: string
  createdAt?: string
  updatedAt?: string
}
