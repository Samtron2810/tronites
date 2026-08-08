const ChatSkeleton = () => (
  <>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-stroke shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-stroke rounded w-28" />
          <div className="h-2.5 bg-stroke rounded w-40" />
        </div>
      </div>
    ))}
  </>
);

export default ChatSkeleton;
