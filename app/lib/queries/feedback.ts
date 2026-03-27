import { supabase, isMockMode } from '~/lib/supabase';
import { addMockFeedback } from '~/lib/mock-data/feedback';
import type { FeedbackSubmission, CreateFeedbackInput } from '~/types/feedback';

function toFeedbackSubmission(row: Record<string, unknown>): FeedbackSubmission {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    message: row.message as string,
    userId: (row.user_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createFeedback(input: CreateFeedbackInput): Promise<FeedbackSubmission> {
  if (isMockMode) {
    const submission: FeedbackSubmission = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      message: input.message,
      userId: input.userId ?? null,
      createdAt: new Date().toISOString(),
    };
    addMockFeedback(submission);
    return submission;
  }

  const { error } = await supabase.from('feedback_submissions').insert({
    name: input.name,
    email: input.email,
    message: input.message,
    user_id: input.userId ?? null,
  });

  if (error) throw error;
  return {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    message: input.message,
    userId: input.userId ?? null,
    createdAt: new Date().toISOString(),
  };
}
