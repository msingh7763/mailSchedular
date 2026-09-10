/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate multiple emails
 */
export const validateEmails = (emails: string[]): { valid: string[]; invalid: string[] } => {
  return {
    valid: emails.filter(isValidEmail),
    invalid: emails.filter((email) => !isValidEmail(email)),
  };
};

/**
 * Subject validation
 */
export const isValidSubject = (subject: string): boolean => {
  return subject.trim().length > 0 && subject.trim().length <= 255;
};

/**
 * Body validation
 */
export const isValidBody = (body: string): boolean => {
  return body.trim().length > 0 && body.trim().length <= 50000;
};

/**
 * Delay validation (in seconds)
 */
export const isValidDelay = (delay: number): boolean => {
  return delay >= 1 && delay <= 86400;
};

/**
 * Hourly limit validation
 */
export const isValidHourlyLimit = (limit: number): boolean => {
  return limit >= 1 && limit <= 1000;
};

/**
 * Start time validation
 */
export const isValidStartTime = (startTime: string): boolean => {
  const date = new Date(startTime);
  return date.getTime() > Date.now();
};

/**
 * Compose email data validation
 */
export interface ComposeFormErrors {
  subject?: string;
  body?: string;
  recipients?: string;
  startTime?: string;
  delayBetweenEmails?: string;
  hourlyLimit?: string;
}

export const validateComposeForm = (data: any): ComposeFormErrors => {
  const errors: ComposeFormErrors = {};

  if (!isValidSubject(data.subject)) {
    errors.subject = 'Subject is required and must be less than 255 characters';
  }

  if (!isValidBody(data.body)) {
    errors.body = 'Body is required and must be less than 50,000 characters';
  }

  if (!data.recipients || data.recipients.length === 0) {
    errors.recipients = 'At least one email recipient is required';
  }

  if (!isValidStartTime(data.startTime)) {
    errors.startTime = 'Start time must be in the future';
  }

  if (!isValidDelay(parseInt(data.delayBetweenEmails, 10))) {
    errors.delayBetweenEmails = 'Delay must be between 1 and 86,400 seconds';
  }

  if (!isValidHourlyLimit(parseInt(data.hourlyLimit, 10))) {
    errors.hourlyLimit = 'Hourly limit must be between 1 and 1,000';
  }

  return errors;
};
