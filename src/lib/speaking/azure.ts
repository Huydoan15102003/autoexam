import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

const GUARD_MS = 240_000

// Runs Azure pronunciation assessment (continuous recognition) and returns the raw JSON of every recognized segment.
// Errors are thrown as `Azure Speech <CancellationErrorCode>: <details>` so the route can map auth/quota failures.
export async function assessPronunciation(
  pcm: Uint8Array, // 16 kHz mono s16le, no header
  opts: { referenceText: string }, // '' = unscripted
): Promise<unknown[]> {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) throw new Error('Azure Speech not configured')

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
  speechConfig.speechRecognitionLanguage = 'en-US'
  const stream = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1))
  stream.write(pcm.slice().buffer) // exact copy: the view may sit inside a larger buffer
  stream.close()

  const recognizer = new sdk.SpeechRecognizer(speechConfig, sdk.AudioConfig.fromStreamInput(stream))
  const scripted = opts.referenceText !== ''
  const pa = new sdk.PronunciationAssessmentConfig(
    opts.referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    scripted, // miscue only makes sense against a reference text
  )
  pa.enableProsodyAssessment = true
  pa.phonemeAlphabet = 'IPA'
  pa.applyTo(recognizer)

  const segments: unknown[] = []
  try {
    await new Promise<void>((resolve, reject) => {
      const stop = () => resolve() // keep the segments recognized so far
      const guard = setTimeout(() => recognizer.stopContinuousRecognitionAsync(stop, stop), GUARD_MS)
      const done = (err?: Error) => {
        clearTimeout(guard)
        if (err) reject(err)
        else resolve()
      }
      recognizer.recognized = (_, e) => {
        if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return
        try {
          segments.push(JSON.parse(e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)))
        } catch {
          // malformed segment JSON: skip it
        }
      }
      recognizer.canceled = (_, e) =>
        done(
          e.reason === sdk.CancellationReason.Error
            ? new Error(`Azure Speech ${sdk.CancellationErrorCode[e.errorCode]}: ${e.errorDetails}`)
            : undefined, // EndOfStream = all audio consumed
        )
      recognizer.sessionStopped = () => done()
      recognizer.startContinuousRecognitionAsync(undefined, (err) => done(new Error(`Azure Speech start failed: ${err}`)))
    })
  } finally {
    recognizer.close()
  }
  return segments
}
