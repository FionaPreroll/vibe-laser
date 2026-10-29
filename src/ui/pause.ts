import { useEffect, useState } from 'preact/hooks'

/** Whether `ms` have passed since the component appeared, for dialogs that let a moment pass. */
export function useAfter(ms: number): boolean {
  const [passed, setPassed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setPassed(true), ms)
    return () => clearTimeout(timer)
  }, [ms])
  return passed
}
