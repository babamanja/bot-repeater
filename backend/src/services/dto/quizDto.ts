export type FullQuizDto = {
  id?: string;
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    correctAnswerIds: string[];
    options: Array<{ answerId: string; text: string }>;
  }>;
};

export type CuttedQuizDto = {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    isMultipleChoice: boolean;
    options: Array<{ answerId: string; text: string }>;
  }>;
};
