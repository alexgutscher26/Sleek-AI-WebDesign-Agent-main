export type ProjectEngineSettings = {
  contentDepth: string;
  creativityLevel: string;
  generationMode: string;
  layoutComplexity: string;
  modelProvider: string;
  styleIntensity: string;
};

export type ProjectMetadata = {
  engineSettings?: ProjectEngineSettings;
};

export type PageType = {
  id: string;
  name: string;
  rootStyles: string;
  htmlContent: string;
  position?: number;
  isLoading: boolean;
  isTemporary?: boolean;
  error?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
};
