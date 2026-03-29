/**
 * Max coach accounts creatable in a single UTC calendar day.
 * NOTE: Edge Functions and SQL migrations cannot import this file — those runtimes
 * duplicate the value. This file is the authoritative reference.
 */
export const DAILY_COACH_REGISTRATION_LIMIT = 5;

/**
 * Max athlete accounts creatable in a single UTC calendar day.
 * NOTE: Edge Functions and SQL migrations cannot import this file — those runtimes
 * duplicate the value. This file is the authoritative reference.
 */
export const DAILY_ATHLETE_REGISTRATION_LIMIT = 10;

/**
 * Max coach-athlete invites a coach can create in a single UTC calendar day.
 * NOTE: Edge Functions and SQL migrations cannot import this file — those runtimes
 * duplicate the value. This file is the authoritative reference.
 */
export const DAILY_INVITE_LIMIT = 5;
