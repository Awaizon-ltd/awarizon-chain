// Lightweight toast notification. No dependencies — pure DOM.

const TOAST_STYLES = `
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: linear-gradient(135deg, #FFD700, #E6C200);
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont,
    'Inter', sans-serif;
  font-weight: 700;
  font-size: 15px;
  padding: 14px 24px;
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(255,215,0,0.4);
  z-index: 999999;
  transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1),
              opacity 0.3s ease;
  opacity: 0;
  white-space: nowrap;
  pointer-events: none;
`

export function showToast(
  message: string,
  durationMs = 3000
): void {
  if (typeof document === 'undefined') return

  const existing = document.getElementById('__awz_toast')
  existing?.remove()

  const toast = document.createElement('div')
  toast.id = '__awz_toast'
  toast.textContent = message
  toast.setAttribute('style', TOAST_STYLES)
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)'
      toast.style.opacity = '1'
    })
  })

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 400)
  }, durationMs)
}

export function showRewardToast(amount: string): void {
  showToast(`🎉 You earned ${amount}!`)
}

export function showConnectToast(): void {
  showToast('💛 Open from Awarizon inbox to earn RIZ')
}
