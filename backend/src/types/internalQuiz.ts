/** Stored quiz JSON shape (title + full question key). */
export type InternalQuizPayload = {
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    correctAnswerIds: string[];
    options: Array<{
      answerId: string;
      text: string;
    }>;
  }>;
};
