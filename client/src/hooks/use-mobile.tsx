import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === "undefined") return;
    
    // Check if matchMedia is available
    if (!window.matchMedia) {
      setIsMobile(false)
      return
    }
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Check if mql is valid
    if (!mql) {
      setIsMobile(false)
      return
    }
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    return () => {
      if (mql && mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      }
    }
  }, [])

  return !!isMobile
}
