import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "avatar" | "button" | "card" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className = "",
  variant = "rect",
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 rounded";
  
  const variantClasses = {
    text: "h-4 rounded",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 rounded-lg",
    card: "h-32 rounded-xl",
    circle: "rounded-full",
    rect: "rounded",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  if (count === 1) {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variantClasses[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

// Pre-built skeleton components for common use cases
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? "75%" : "100%"}
          className={i === lines - 1 ? "" : ""}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return <Skeleton variant="avatar" width={size} height={size} className={className} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 border border-gray-200 rounded-xl ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="text" width="100%" className="mb-2" />
      <Skeleton variant="text" width="80%" />
    </div>
  );
}

export function SkeletonChatItem({ className = "" }: { className?: string }) {
  return (
    <div className={`px-4 py-4 flex items-start gap-3 ${className}`}>
      <Skeleton variant="avatar" width={48} height={48} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width={60} height={12} />
        </div>
        <Skeleton variant="text" width="70%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonContactItem({ className = "" }: { className?: string }) {
  return (
    <div className={`px-4 py-4 flex items-center gap-3 ${className}`}>
      <Skeleton variant="avatar" width={48} height={48} />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton variant="text" width="50%" height={16} />
        <Skeleton variant="text" width="70%" height={14} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" width={40} height={40} className="rounded-lg" />
        <Skeleton variant="button" width={40} height={40} className="rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonMessage({ isOwn = false, className = "" }: { isOwn?: boolean; className?: string }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4 ${className}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${isOwn ? "bg-blue-100" : "bg-gray-100"}`}>
        <Skeleton variant="text" width="80%" className="mb-2" />
        <Skeleton variant="text" width="60%" />
        <div className="flex items-center gap-1 mt-2">
          <Skeleton variant="text" width={50} height={12} />
          <Skeleton variant="circle" width={12} height={12} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRequestItem({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-xl border-2 border-gray-200 bg-white ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton variant="avatar" width={48} height={48} />
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <Skeleton variant="text" width="45%" height={16} className="mb-2" />
            <Skeleton variant="text" width="65%" height={14} />
            <Skeleton variant="text" width="35%" height={12} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="button" width={100} height={32} />
            <Skeleton variant="button" width={100} height={32} />
            <Skeleton variant="button" width={100} height={32} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonMeetingCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton variant="rect" width={60} height={60} className="rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height={16} />
          <Skeleton variant="text" width="50%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
        <Skeleton variant="button" width={80} height={36} />
      </div>
    </div>
  );
}

