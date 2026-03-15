export interface Profile {
  id: string;
  first_name: string;
  age: number;
  primary_position: Position;
  height_feet: number | null;
  height_inches: number | null;
  batting_side: BattingSide;
  role: 'player' | 'coach' | 'team_admin';
  leaderboard_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export type Position =
  | 'catcher'
  | 'first_base'
  | 'second_base'
  | 'shortstop'
  | 'third_base'
  | 'outfield'
  | 'pitcher'
  | 'dh_utility';

export type BattingSide = 'left' | 'right' | 'switch';

export interface SwingAnalysis {
  id: string;
  user_id: string;
  video_url: string;
  video_duration_seconds: number | null;
  keypoint_data: KeypointData | null;
  coaching_output: CoachingOutput | null;
  bat_speed_mph: number | null;
  similarity_score: number | null;
  similarity_breakdown: SimilarityBreakdown | null;
  key_frames: KeyFrame[] | null;
  status: AnalysisStatus;
  created_at: string;
}

export type AnalysisStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface KeypointData {
  video_file: string;
  fps: number;
  total_frames: number;
  frames_processed: number;
  frames: FrameKeypoints[];
}

export interface FrameKeypoints {
  frame_number: number;
  timestamp_ms: number;
  keypoints: Record<string, { x: number; y: number; confidence: number }>;
}

export interface CoachingOutput {
  primary_mechanical_issue: PrimaryMechanicalIssue | null;
  drill: string | null;
  bat_speed_estimate: BatSpeedEstimate;
  similarity_scores: SimilarityBreakdown;
  overall_summary: string;
  /** @deprecated Legacy format — use primary_mechanical_issue and drill */
  observations?: Observation[];
  /** @deprecated Legacy format — use primary_mechanical_issue */
  priority_fixes?: PriorityFix[];
  /** @deprecated Legacy format — use drill */
  drill_recommendations?: DrillRecommendation[];
}

export interface PrimaryMechanicalIssue {
  title: string;
  description: string;
}

export interface Observation {
  title: string;
  description: string;
  frame_range?: string;
  type: 'strength' | 'improvement';
}

export interface PriorityFix {
  title: string;
  description: string;
  what_it_should_look_like: string;
}

export interface DrillRecommendation {
  name: string;
  description: string;
  how_to: string;
  targets: string;
}

export interface BatSpeedEstimate {
  mph: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface SimilarityBreakdown {
  hip_rotation: number;
  weight_transfer: number;
  bat_path: number;
  contact_point: number;
  overall: number;
}

export interface KeyFrame {
  frame_number: number;
  timestamp_ms: number;
  label: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro';
  status: 'active' | 'expired' | 'cancelled';
  analyses_used_this_month: number;
  month_reset_date: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export const POSITION_LABELS: Record<Position, string> = {
  catcher: 'Catcher',
  first_base: 'First Base',
  second_base: 'Second Base',
  shortstop: 'Shortstop',
  third_base: 'Third Base',
  outfield: 'Outfield',
  pitcher: 'Pitcher',
  dh_utility: 'DH / Utility',
};

export const BATTING_SIDE_LABELS: Record<BattingSide, string> = {
  left: 'Left',
  right: 'Right',
  switch: 'Switch',
};
