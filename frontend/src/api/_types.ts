export type AcceptQuizRequest = {
  quizId: string;
  answers: {
    questionId: string;
    answerIds: string[];
  }[];
};

export type AcceptQuizResponse = {
  acceptedAt: string;
  attemptId: string;
};

export type AttemptListItem = {
  attemptId: string;
  quizId: string;
  acceptedAt: string;
  correctCount: number;
  questionCount: number;
  quizVersion: number;
  userId: number | null;
  quizTitle: string;
};

export type Attempt = {
  id: string;
  quizId: string;
  acceptedAt: string;
  correctCount: number;
  questionCount: number;
  quizVersion: number;
  userId: number | null;
  quizTitle: string;
  questions: Array<{
    id: string;
    prompt: string;
    isMultipleChoice: boolean;
    correctAnswerIds: string[];
    options: Array<{
      answerId: string;
      text: string;
    }>;
  }>;
  answers: Array<{
    questionId: string;
    answerIds: string[];
  }>;
};
