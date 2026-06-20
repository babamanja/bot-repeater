export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizAnswer[];
  isMultipleChoice: boolean;
};

export type QuizQuestionExtended = QuizQuestion & {
  correctAnswerIds?: string[];
  options: QuizAnswerExtended[];
};

export const QUIZ_STATUSES = [
  "generating",
  "ready_to_edit",
  "published",
  "failed",
] as const;

export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export type Quiz = {
  id: string;
  title: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  createdAt?: string;
  createdBy?: number | null;
  /** 1-based section number when the quiz was generated from a document chunk. */
  chunkNumber?: number | null;
  canRegenerate?: boolean;
  canRefundTokens?: boolean;
  tokensRefunded?: boolean;
};

export type QuizGenerateStartedQuiz = {
  id: string;
  status: QuizStatus;
  chunkId?: string;
  tokensCharged: number;
  questionCount: number;
};

export type QuizGenerateStarted = {
  id: string;
  status: QuizStatus;
  tokensCharged: number;
  totalTokensCharged?: number;
  questionCount: number;
  language: string;
  documentId?: string;
  chunkId?: string;
  quizzes?: QuizGenerateStartedQuiz[];
};

export type QuizExtended = {
  id: string;
  title: string;
  questions: QuizQuestionExtended[];
  createdBy?: number | null;
};

export type QuizAnswer = {
  answerId: string;
  text: string;
};

export type QuizAnswerExtended = QuizAnswer;

export type QuizCheckAnswer = {
  questionId: string;
  answerIds: string[];
};

export type QuizCheckResponse = {
  quiz: QuizExtended;
  answers: QuizCheckAnswer[];
  acceptedAt: string;
  score?: { correct: number; total: number };
  attemptId?: string;
  userId?: number | null;
};

export type UserDashboardStats = {
  quizzesGenerated: number;
  quizzesCompleted: number;
  averageScorePercent: number | null;
  bestScorePercent: number | null;
};

export type User = {
  id: number;
  userName: string;
  email: string;
  role: "user" | "admin" | "guest";
  /** Present when the API includes verification state (password signup / Google). */
  emailVerified?: boolean;
  /** Temporary landing-demo account before signup. */
  isGuest?: boolean;
};

export type AuthSession = {
  token: string;
  user: User;
  providers: {
    password: boolean;
    google: boolean;
  };
  /** Present after Google login/signup: first-time account (new user row) vs returning. */
  isNewUser?: boolean;
};
