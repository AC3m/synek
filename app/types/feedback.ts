export interface FeedbackSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  userId: string | null;
  createdAt: string;
}

export interface CreateFeedbackInput {
  name: string;
  email: string;
  message: string;
  userId?: string | null;
}
