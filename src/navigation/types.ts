export type AuthStackParamList = {
  Splash: undefined;
  Auth: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
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
  Camera: undefined;
  Processing: { videoUri: string; frontFacing?: boolean };
  Results: { analysisId: string };
  PersonalBest: {
    analysisId: string;
    newScore: number;
    previousBest: number | null;
  };
  Analysis: { analysisId: string };
  EditProfile: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type TabParamList = {
  UploadTab: undefined;
  History: undefined;
  Profile: undefined;
};
