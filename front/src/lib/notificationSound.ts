// Beep de notificación generado con Web Audio API (sin assets de audio externos).
// unlockAudio() debe llamarse desde un click real del usuario para cumplir con
// la política de autoplay de los navegadores; playNotificationBeep() reproduce
// un sonido corto tipo "ding-dong" cuando llega un pedido nuevo.

let audioCtx: AudioContext | null = null

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      const Ctor = getAudioContextCtor()
      if (!Ctor) return
      audioCtx = new Ctor()
    }

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
  } catch (e) {
    console.error('[notificationSound] No se pudo desbloquear el audio:', e)
  }
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)

  // Envolvente de ganancia con rampas exponenciales para evitar clicks al empezar/terminar el tono
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.02)
}

export function playNotificationBeep(): void {
  try {
    if (!audioCtx) {
      unlockAudio()
    }
    if (!audioCtx) return

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }

    const now = audioCtx.currentTime
    // "Ding-dong": dos tonos breves, el segundo un poco más grave, con un pequeño solapamiento
    playTone(audioCtx, 880, now, 0.18)
    playTone(audioCtx, 660, now + 0.15, 0.25)
  } catch (e) {
    console.error('[notificationSound] No se pudo reproducir el beep:', e)
  }
}
