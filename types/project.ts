export type PageType = {
  id: string;
  name: string;
  rootStyles: string;
  htmlContent: string;
  isLoading: boolean;
  isTemporary?: boolean;
  error?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
};
