import type { FeedbackSubmission } from '~/types/feedback';

let MOCK_FEEDBACK: FeedbackSubmission[] = [];

export function getMockFeedback(): FeedbackSubmission[] {
  return MOCK_FEEDBACK;
}

export function addMockFeedback(submission: FeedbackSubmission): void {
  MOCK_FEEDBACK.push(submission);
}

export function resetMockFeedback(): void {
  MOCK_FEEDBACK = [];
}
