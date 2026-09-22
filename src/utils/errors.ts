export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.startsWith('Invalid response')) {
      return "The AI couldn't generate a valid form for that description, try rephrasing it.";
    }
    return err.message;
  }
  return 'Something went wrong.';
}
