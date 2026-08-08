const PostSkeleton = () => (
  <div className="bg-white border border-stroke rounded-2xl p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-stroke shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-stroke rounded w-28" />
        <div className="h-2.5 bg-stroke rounded w-16" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-2.5 bg-stroke rounded" />
      <div className="h-2.5 bg-stroke rounded w-4/5" />
    </div>
    <div className="h-48 bg-stroke rounded-xl" />
  </div>
);

export default PostSkeleton;
