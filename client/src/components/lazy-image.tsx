import { useState, useRef, useEffect } from "react";

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    loading?: "lazy" | "eager";
}

export function LazyImage({ src, alt, className = "", loading = "lazy" }: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // Reset state when src changes
        setLoaded(false);
        setError(false);
    }, [src]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Blur placeholder */}
            {!loaded && !error && (
                <div className="absolute inset-0 bg-white/[0.04] animate-pulse rounded-inherit" />
            )}

            {/* Error placeholder */}
            {error && (
                <div className="absolute inset-0 bg-white/[0.04] flex items-center justify-center">
                    <span className="text-white/15 text-xs">No image</span>
                </div>
            )}

            <img
                ref={imgRef}
                src={src}
                alt={alt}
                loading={loading}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
        </div>
    );
}
