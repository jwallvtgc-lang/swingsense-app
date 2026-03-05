export type MainStackParamList = {
  MainTabs: { screen?: keyof TabParamList } | undefined;
  Upload: undefined;
  Processing: { videoUri: string };
  Results: { analysisId: string };
  EditProfile: undefined;
};

export type TabParamList = {
  UploadTab: undefined;
  History: undefined;
  Profile: undefined;
};
