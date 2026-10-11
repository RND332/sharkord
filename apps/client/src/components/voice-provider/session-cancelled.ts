// Cancellation is not an initialization failure: the caller must not issue an
// unscoped leave RPC that could disconnect the replacement voice session.
export class VoiceSessionCancelledError extends Error {
  constructor() {
    super('Voice session ended during initialization');
    this.name = 'VoiceSessionCancelledError';
  }
}
