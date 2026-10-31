const PostSkeleton = () => (
  <div className="animate-pulse border-b-2 border-line py-5">
    <div className="mb-4 flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-stroke" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded bg-stroke" />
        <div className="h-2.5 w-16 rounded bg-stroke" />
      </div>
    </div>
    <div className="mb-4 space-y-2">
      <div className="h-2.5 rounded bg-stroke" />
      <div className="h-2.5 w-4/5 rounded bg-stroke" />
    </div>
    <div className="h-48 rounded-xl bg-stroke" />
  </div>
);

export default PostSkeleton;
