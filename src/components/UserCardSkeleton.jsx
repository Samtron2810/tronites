const UserCardSkeleton = () => (
  <div className="bg-white border border-stroke rounded-2xl p-4 flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-stroke shrink-0" />
      <div className="space-y-2">
        <div className="h-3 bg-stroke rounded w-28" />
        <div className="h-2.5 bg-stroke rounded w-20" />
      </div>
    </div>
    <div className="w-20 h-8 bg-stroke rounded-xl" />
  </div>
);

export default UserCardSkeleton;
