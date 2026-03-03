import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 md:bottom-6 z-50 w-11 h-11 rounded-2xl liquid-glass flex items-center justify-center text-white/70 hover:text-white hover:border-white/25 hover:scale-110 transition-all duration-300 ${visible ? "opacity-100 translate-y-0 animate-pulse-ring" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      style={{ bottom: window.innerWidth < 768 ? '84px' : '24px' }}
      data-testid="button-scroll-top"
    >
      <ArrowUp className="w-4.5 h-4.5 transition-transform hover:rotate-12" />
    </button>
  );
}
