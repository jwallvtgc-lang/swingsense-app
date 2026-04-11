export type AuthStackParamList = {
  Splash: undefined;
  Auth: undefined;
};

/** Switches between auth, onboarding, and main app (session-driven). */
export type RootBranchParamList = {
  AuthStack: undefined;
  OnboardStack: undefined;
  MainStack: undefined;
};

export type MainStackParamList = {
  MainTabs: { screen?: keyof TabParamList } | undefined;
  Upload: undefined;
  Processing: { videoUri: string };
  Results: { analysisId: string };
  PersonalBest: {
    analysisId: string;
    newScore: number;
    previousBest: number | null;
  };
  Analysis: { analysisId: string };
  EditProfile: undefined;
};

export type TabParamList = {
  UploadTab: undefined;
  History: undefined;
  Profile: undefined;
};
